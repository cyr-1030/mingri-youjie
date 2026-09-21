const content = require('../../data/content.js')
const { STYLES, buildPlan, buildWardrobeGaps } = require('../../lib/plan.js')
const { normalizeRegion, getRegionColumns, getRegionByIndices, getRegionIndices } = require('../../lib/regions.js')
const { GROUPS: WARDROBE_GROUPS, indicesForCategory, columnsForGroup, categoryAt } = require('../../lib/wardrobe.js')
const { SIGNS, profileForSign } = require('../../lib/zodiac-preference.js')

const STORE = 'xin-xuan-mingri-public-v1'
const DEFAULT = {
  page: 'home', dateMode: 'tomorrow', themeId: 'career', answers: [], qIndex: 0, objectIndex: -1,
  city: '', forecast: null, forecastStatus: 'idle', forecastError: '', forecastFetchedAt: 0,
  environment: '室内为主', occasion: '日常', ageRange: '', zodiacSign: '',
  wardrobeBudget: '500 元内', styles: ['soft', 'french'], wardrobe: [],
  wardrobeName: '', wardrobeCategory: '上装', bookIndex: -1
}
const OCCASIONS = ['日常', '通勤', '约会', '上课', '聚会', '旅行', '居家']
const WARDROBE_BUDGETS = ['200 元内', '500 元内', '1000 元内']
const AGE_RANGES = ['18–24岁', '25–34岁', '35–44岁', '45岁以上']
const PUBLIC_THEME_NAMES = {
  career: '工作机会', love: '亲密关系', money: '消费计划', study: '学习成长',
  social: '人际社交', wellbeing: '身心状态', travel: '出行安排', family: '家庭相处', growth: '自我探索'
}
const NAV = [
  { id: 'home', icon: '◇', name: '心选' },
  { id: 'book', icon: '▣', name: '答案书' },
  { id: 'zodiac', icon: '✦', name: '星座' },
  { id: 'plan', icon: '◈', name: '穿搭' },
  { id: 'profile', icon: '○', name: '衣橱' }
]

const ZODIAC_META = {
  aries: ['ARIES', '3.21–4.19'], taurus: ['TAURUS', '4.20–5.20'], gemini: ['GEMINI', '5.21–6.21'],
  cancer: ['CANCER', '6.22–7.22'], leo: ['LEO', '7.23–8.22'], virgo: ['VIRGO', '8.23–9.22'],
  libra: ['LIBRA', '9.23–10.23'], scorpio: ['SCORPIO', '10.24–11.22'], sagittarius: ['SAGITTARIUS', '11.23–12.21'],
  capricorn: ['CAPRICORN', '12.22–1.19'], aquarius: ['AQUARIUS', '1.20–2.18'], pisces: ['PISCES', '2.19–3.20']
}

function visualTone(value = '', index = 0) {
  if (/奶油|米白|乳白|象牙|白色|浅色/.test(value)) return 'cream'
  if (/黑|深灰|炭灰|藏蓝|深色/.test(value)) return 'ink'
  if (/棕|咖|卡其|驼|燕麦/.test(value)) return 'camel'
  if (/蓝|牛仔/.test(value)) return 'blue'
  if (/粉|杏|桃|红/.test(value)) return 'rose'
  if (/绿|橄榄/.test(value)) return 'green'
  return ['cream', 'green', 'camel', 'blue', 'rose', 'ink'][index % 6]
}

function visualType(item = {}) {
  const label = item.label || ''
  const value = item.value || ''
  if (/连身|套装/.test(label)) return /套装/.test(label) ? 'suit' : 'dress'
  if (/上装/.test(label)) return /衬衫|有领|立领/.test(value) ? 'blouse' : /卫衣|针织|开衫/.test(value) ? 'knit' : 'top'
  if (/下装/.test(label)) return /裙/.test(value) ? 'skirt' : 'trousers'
  if (/外层/.test(label)) return /风衣|大衣|西装/.test(value) ? 'coat' : 'cardigan'
  if (/鞋/.test(label)) return /运动|板鞋/.test(value) ? 'sneaker' : /靴/.test(value) ? 'boot' : 'loafer'
  if (/包/.test(label)) return /托特|手提|文件/.test(value) ? 'tote' : /斜挎/.test(value) ? 'crossbag' : 'shoulderbag'
  return /耳|珍珠/.test(value) ? 'earrings' : /围巾|发带/.test(value) ? 'scarf' : 'jewelry'
}

function decoratePlan(plan) {
  if (!plan) return null
  return {
    ...plan,
    items: plan.items.map((item, index) => ({
      ...item,
      visualType: visualType(item),
      visualTone: visualTone(item.value, index),
      visualPattern: /条纹/.test(item.value) ? 'stripe' : /针织|毛衣|开衫/.test(item.value) ? 'knit' : 'plain'
    }))
  }
}

function localDate(offsetDays = 0) {
  const now = new Date(Date.now() + offsetDays * 86400000)
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

function readingFor(state, theme) {
  if (state.objectIndex < 0 || state.answers.length < 3) return null
  const object = theme.objects[state.objectIndex]
  return {
    object,
    title: `${object.name} · ${object.meaning}`,
    summary: object.guide[0],
    do: object.guide[1],
    avoid: object.guide[2],
    reacts: theme.reactions[state.answers[1]],
    wants: theme.states[state.answers[2]],
    first: theme.questions[0][1][state.answers[0]]
  }
}

function weatherFactorsFor(forecast) {
  if (!forecast) return ''
  const rain = forecast.rain === 'rain' ? '可能有雨' : forecast.rain === 'none' ? '预报无雨' : ''
  const climate = { humid: '偏潮湿', dry: '偏干燥', windy: '风较大' }[forecast.climate]
  return [rain, climate].filter(Boolean).join(' · ')
}

Page({
  data: {
    page: 'home', themeClass: 'theme-neutral', nav: NAV, themes: [], styles: STYLES,
    occasions: OCCASIONS, environments: ['室内为主', '户外较多'], wardrobeBudgets: WARDROBE_BUDGETS, ageRanges: AGE_RANGES,
    zodiacSigns: SIGNS
  },

  onLoad() {
    let saved = {}
    try { saved = wx.getStorageSync(STORE) || {} } catch (e) { saved = {} }
    this.state = Object.assign({}, DEFAULT, saved)
    this.state.wardrobe = (this.state.wardrobe || []).filter(item => item && !item.sample)
    this.state.forecast = null
    this.state.forecastStatus = 'idle'
    this.state.forecastError = ''
    this.state.forecastFetchedAt = 0
    this.state.page = 'home'
    this.state.currentRegionIndices = getRegionIndices(this.state.city)
    this.forecastRequestId = 0
    this.refresh()
  },

  onShow() {
    if (!this.state) return
    const targetDate = localDate(this.state.dateMode === 'tomorrow' ? 1 : 0)
    if (this.data.targetDate !== targetDate) this.invalidateForecast()
    this.refresh()
    if (['conditions', 'plan'].includes(this.state.page)) this.loadForecast()
  },

  save() {
    const s = this.state
    const snapshot = {
      dateMode: s.dateMode, themeId: s.themeId, answers: s.answers, objectIndex: s.objectIndex,
      city: s.city, environment: s.environment, occasion: s.occasion, ageRange: s.ageRange,
      zodiacSign: s.zodiacSign, wardrobeBudget: s.wardrobeBudget, styles: s.styles, wardrobe: s.wardrobe
    }
    try { wx.setStorageSync(STORE, snapshot) } catch (e) { /* 当前会话仍可继续使用 */ }
  },

  refresh() {
    const s = this.state
    const theme = content.themes[s.themeId] || content.themes.career
    const targetDate = localDate(s.dateMode === 'tomorrow' ? 1 : 0)
    const forecast = s.forecastStatus === 'ready' && s.forecast && s.forecast.date === targetDate ? s.forecast : null
    const reading = readingFor(s, theme)
    const zodiacProfile = profileForSign(s.zodiacSign)
    const rawPlan = reading ? buildPlan({
      styles: s.styles,
      weather: {
        temp: forecast && forecast.temp, rain: forecast && forecast.rain, climate: forecast && forecast.climate,
        tempMin: forecast && forecast.tempMin, tempMax: forecast && forecast.tempMax,
        source: forecast ? 'forecast' : 'unavailable', sourceLabel: forecast ? '当地预报' : '暂无天气数据'
      },
      wardrobe: s.wardrobe, environment: s.environment, occasion: s.occasion, city: s.city,
      daily: null, astro: zodiacProfile, ageBand: s.ageRange, themeId: s.themeId,
      objectAction: reading.object.action, reading
    }) : null
    const plan = decoratePlan(rawPlan)
    const question = theme.questions[s.qIndex] || theme.questions[0]
    const questionOptions = question[1].map((text, index) => ({ text, index, selected: s.answers[s.qIndex] === index }))
    const objects = theme.objects.map((item, index) => ({ ...item, index, tileSrc: `../../assets/objects/s${item.sheet}-t${item.tile}.jpg` }))
    const styles = STYLES.map(item => ({ ...item, selected: s.styles.includes(item.id), priority: s.styles.indexOf(item.id) + 1 }))
    const wardrobeCategoryIndices = indicesForCategory(s.wardrobeCategory)
    const wardrobeGaps = buildWardrobeGaps({ styles: s.styles, wardrobe: s.wardrobe, budget: s.wardrobeBudget })
    const themes = content.order.map((id, index) => ({ ...content.themes[id], name: PUBLIC_THEME_NAMES[id], id,
      index: String(index + 1).padStart(2, '0') }))
    const nav = NAV.map(item => ({ ...item, active: s.page === item.id || (item.id === 'home' && ['quiz', 'draw', 'reading', 'conditions'].includes(s.page)) }))
    const currentRegionIndices = s.currentRegionIndices || [0, 0]
    const book = s.bookIndex >= 0 ? content.book[s.bookIndex] : null
    this.setData({
      page: s.page, theme: { ...theme, name: PUBLIC_THEME_NAMES[s.themeId] }, themes, nav, dateMode: s.dateMode, targetDate,
      questionText: question[0], questionOptions, qIndex: s.qIndex, progress: Math.round((s.qIndex + 1) / 3 * 100),
      objects, reading, plan, book, zodiacSigns: SIGNS.map(item => ({
        ...item, short: ZODIAC_META[item.id][0], date: ZODIAC_META[item.id][1], selected: item.id === s.zodiacSign
      })),
      zodiacProfile, zodiacName: zodiacProfile ? zodiacProfile.name : '暂未选择',
      currentRegionColumns: getRegionColumns(currentRegionIndices[0]), currentRegionIndices,
      currentRegionLabel: s.city, city: s.city, forecast, weatherFactors: weatherFactorsFor(forecast),
      forecastStatus: s.forecastStatus, forecastError: s.forecastError,
      environment: s.environment, occasion: s.occasion, wardrobeBudget: s.wardrobeBudget, ageRange: s.ageRange,
      styles, wardrobe: s.wardrobe, wardrobeGaps, wardrobeName: s.wardrobeName,
      wardrobeCategory: s.wardrobeCategory,
      wardrobeCategoryGroup: WARDROBE_GROUPS[wardrobeCategoryIndices[0]].name,
      wardrobeCategoryColumns: columnsForGroup(wardrobeCategoryIndices[0]), wardrobeCategoryIndices,
      styleText: plan ? plan.tags.join(' / ') : STYLES.filter(item => s.styles.includes(item.id)).map(item => item.name).join(' / '),
      canAdvance: s.answers[s.qIndex] != null
    })
    this.save()
  },

  navigate(e) {
    const page = e.currentTarget.dataset.page
    if (page === 'plan' && this.state.objectIndex < 0) {
      wx.showToast({ title: '先完成一次心选测试', icon: 'none' })
      return
    }
    this.state.page = page
    this.refresh()
    wx.pageScrollTo({ scrollTop: 0, duration: 0 })
    if (page === 'conditions' || page === 'plan') this.loadForecast()
  },
  setDateMode(e) { this.state.dateMode = e.currentTarget.dataset.value; this.invalidateForecast(); this.refresh() },
  beginTheme(e) {
    this.state.themeId = e.currentTarget.dataset.id
    this.state.answers = []; this.state.qIndex = 0; this.state.objectIndex = -1; this.state.page = 'quiz'
    this.refresh()
  },
  answer(e) { this.state.answers[this.state.qIndex] = Number(e.currentTarget.dataset.index); this.refresh() },
  nextQuestion() {
    if (this.state.answers[this.state.qIndex] == null) return
    if (this.state.qIndex < 2) this.state.qIndex++
    else this.state.page = 'draw'
    this.refresh(); wx.pageScrollTo({ scrollTop: 0, duration: 0 })
  },
  previousQuestion() {
    if (this.state.page === 'draw') this.state.page = 'quiz'
    else if (this.state.qIndex === 0) this.state.page = 'home'
    else this.state.qIndex--
    this.refresh()
  },
  chooseObject(e) {
    this.state.objectIndex = Number(e.currentTarget.dataset.index); this.state.page = 'reading'
    this.refresh(); wx.pageScrollTo({ scrollTop: 0, duration: 0 })
  },
  setField(e) {
    const key = e.currentTarget.dataset.key
    if (['environment', 'occasion', 'wardrobeBudget', 'ageRange'].includes(key)) {
      this.state[key] = e.currentTarget.dataset.value; this.refresh()
    }
  },
  chooseZodiac(e) { this.state.zodiacSign = e.currentTarget.dataset.id; this.refresh() },
  flipBook() {
    let next = Math.floor(Math.random() * content.book.length)
    if (next === this.state.bookIndex) next = (next + 1) % content.book.length
    this.state.bookIndex = next
    this.refresh()
  },
  copyPlanSearch() {
    const plan = this.data.plan
    if (!plan) return
    const query = `${plan.tags.join(' ')} ${this.state.occasion} ${this.state.environment} 穿搭`
    wx.setClipboardData({ data: query, success: () => wx.showToast({ title: '搜索词已复制', icon: 'success' }) })
  },
  invalidateForecast() {
    this.forecastRequestId = (this.forecastRequestId || 0) + 1
    this.state.forecast = null; this.state.forecastStatus = 'idle'; this.state.forecastError = ''; this.state.forecastFetchedAt = 0
  },
  loadForecast() {
    const region = normalizeRegion(this.state.city)
    if (!region) { this.state.forecastStatus = 'need-city'; this.refresh(); return }
    if (region.isOverseas) { this.state.forecastStatus = 'unsupported'; this.refresh(); return }
    const app = getApp()
    if (!app.globalData.weatherEnabled) { this.state.forecastStatus = 'disabled'; this.refresh(); return }
    if (!app.globalData.cloudEnv || !wx.cloud || !wx.cloud.callFunction) { this.state.forecastStatus = 'not-configured'; this.refresh(); return }
    const targetDate = localDate(this.state.dateMode === 'tomorrow' ? 1 : 0)
    if (this.state.forecastStatus === 'loading') return
    if (this.state.forecastStatus === 'ready' && this.state.forecast && this.state.forecast.date === targetDate && Date.now() - this.state.forecastFetchedAt < 1800000) return
    const requestId = (this.forecastRequestId || 0) + 1
    this.forecastRequestId = requestId
    this.state.forecast = null; this.state.forecastStatus = 'loading'; this.state.forecastError = ''; this.refresh()
    wx.cloud.callFunction({ name: 'getForecast', data: { region, targetDate } }).then(res => {
      if (requestId !== this.forecastRequestId || this.state.city !== region.displayName) return
      const result = res && res.result
      if (!result || !result.ok || !result.forecast) throw new Error(result && result.error || '预报暂不可用')
      const forecast = result.forecast
      if (forecast.date !== targetDate || !Number.isFinite(Number(forecast.tempMin)) || !Number.isFinite(Number(forecast.tempMax))) throw new Error('预报日期或温度无效')
      this.state.forecast = { ...forecast, source: result.source || '', attribution: result.attribution || '数据来自彩云天气' }
      this.state.forecastFetchedAt = Date.now(); this.state.forecastStatus = 'ready'; this.refresh()
    }).catch(error => {
      if (requestId !== this.forecastRequestId) return
      this.state.forecast = null; this.state.forecastFetchedAt = 0; this.state.forecastStatus = 'error'
      this.state.forecastError = error.message || '天气更新失败，请稍后再试。'; this.refresh()
    })
  },
  currentRegionColumnChange(e) {
    const indices = (this.state.currentRegionIndices || [0, 0]).slice()
    indices[e.detail.column] = Number(e.detail.value); if (e.detail.column === 0) indices[1] = 0
    this.state.currentRegionIndices = indices
    this.setData({ currentRegionIndices: indices, currentRegionColumns: getRegionColumns(indices[0]) })
  },
  currentRegionChange(e) {
    const region = getRegionByIndices(e.detail.value); if (!region) return
    this.state.city = region.displayName; this.state.currentRegionIndices = getRegionIndices(region)
    this.invalidateForecast(); this.refresh(); if (this.state.page === 'conditions') this.loadForecast()
  },
  currentRegionCancel() { this.state.currentRegionIndices = getRegionIndices(this.state.city); this.refresh() },
  toggleStyle(e) {
    const id = e.currentTarget.dataset.id; const current = this.state.styles.slice(); const index = current.indexOf(id)
    if (index >= 0 && current.length > 1) current.splice(index, 1)
    else if (index < 0 && current.length < 3) current.push(id)
    else if (index < 0) { wx.showToast({ title: '最多选择 3 种风格', icon: 'none' }); return }
    this.state.styles = current; this.refresh()
  },
  goPlan() { this.state.page = 'plan'; this.refresh(); this.loadForecast(); wx.pageScrollTo({ scrollTop: 0, duration: 0 }) },
  wardrobeName(e) { this.state.wardrobeName = e.detail.value; this.setData({ wardrobeName: e.detail.value }) },
  wardrobeCategoryColumnChange(e) {
    if (e.detail.column !== 0) return
    const groupIndex = Number(e.detail.value)
    this.setData({ wardrobeCategoryColumns: columnsForGroup(groupIndex), wardrobeCategoryIndices: [groupIndex, 0] })
  },
  wardrobeCategory(e) { this.state.wardrobeCategory = categoryAt(e.detail.value); this.refresh() },
  addWardrobe() {
    const name = this.state.wardrobeName.trim()
    if (!name) { wx.showToast({ title: '先写物品名称', icon: 'none' }); return }
    this.state.wardrobe.push({ id: `item-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      name, category: this.state.wardrobeCategory, photo: '' })
    this.state.wardrobeName = ''
    this.refresh()
  },
  removeWardrobe(e) {
    const id = String(e.currentTarget.dataset.id)
    this.state.wardrobe = this.state.wardrobe.filter(item => String(item.id) !== id)
    this.refresh()
  },
  copyWardrobeGap(e) {
    const gap = (this.data.wardrobeGaps || []).find(item => item.id === e.currentTarget.dataset.id); if (!gap) return
    wx.setClipboardData({ data: gap.searchQuery, success: () => wx.showToast({ title: '已复制搜索词', icon: 'none' }), fail: () => wx.showToast({ title: '复制失败，请重试', icon: 'none' }) })
  }
})
