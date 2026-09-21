const content = require('../../data/content.js')
const { chartForBirth, almanacFor, localDate, ageBand, ELEMENT_LABEL } = require('../../lib/calendar.js')
const { ELEMENT_COLORS } = require('../../lib/elements.js')
const { STYLES, buildPlan, buildWardrobeGaps } = require('../../lib/plan.js')
const { recommendInspirations } = require('../../lib/inspiration.js')
const { recommendCreators } = require('../../lib/creator-match.js')
const { dailyFor } = require('../../lib/daily.js')
const { normalizeRegion, getRegionColumns, getRegionByIndices, getRegionIndices } = require('../../lib/regions.js')
const { starChartForBirth } = require('../../lib/astrology.js')
const { astrologyProfile } = require('../../lib/astro-guidance.js')
const { GROUPS: WARDROBE_GROUPS, indicesForCategory, columnsForGroup, categoryAt } = require('../../lib/wardrobe.js')

const STORE = 'mingriyoujie-mvp-v1'
const DEFAULT = {
  page: 'home', dateMode: 'tomorrow', themeId: 'career', answers: [], qIndex: 0, objectIndex: -1,
  birth: null, birthDraft: { date: '', time: '', region: null }, chartMode: 'edit',
  city: '', forecast: null, forecastStatus: 'idle', forecastError: '', forecastFetchedAt: 0,
  environment: '室内为主', occasion: '日常', ageRange: '',
  wardrobeBudget: '500 元内', styles: ['soft', 'french'], wardrobe: [],
  wardrobeName: '', wardrobeCategory: '上装', wardrobePhotoDraft: '', bookIndex: -1
}
const OCCASIONS = ['日常', '通勤', '约会', '上课', '聚会', '旅行', '居家']
const WARDROBE_BUDGETS = ['200 元内', '500 元内', '1000 元内']
const AGE_RANGES = ['18–24岁', '25–34岁', '35–44岁', '45岁以上']
const ELEMENT_ORDER = ['wood', 'fire', 'earth', 'metal', 'water']
const ELEMENT_IDEA = {
  wood: { image: '生长与舒展' },
  fire: { image: '明亮与表达' },
  earth: { image: '稳定与承接' },
  metal: { image: '边界与梳理' },
  water: { image: '流动与观察' }
}
const ZODIAC_SYMBOLS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓']
const PLANET_SYMBOLS = { sun: '☉', moon: '☽', mercury: '☿', venus: '♀', mars: '♂' }
const NAV = [
  { id: 'home', icon: '◇', name: '明日签' },
  { id: 'book', icon: '▣', name: '答案书' },
  { id: 'chart', icon: '✦', name: '命盘' },
  { id: 'plan', icon: '◈', name: '方案' },
  { id: 'profile', icon: '○', name: '我的' }
]

function readingFor(state, theme, almanac) {
  if (state.objectIndex < 0 || state.answers.length < 3) return null
  const object = theme.objects[state.objectIndex]
  const guide = object.guide
  const wants = theme.states[state.answers[2]]
  const reacts = theme.reactions[state.answers[1]]
  return {
    object, title: `${object.sign} · ${object.meaning}`, summary: guide[0], do: guide[1], avoid: guide[2],
    wants, reacts, first: theme.questions[0][1][state.answers[0]]
  }
}

function weatherFactorsFor(forecast) {
  if (!forecast) return ''
  const rain = forecast.rain === 'rain' ? '可能有雨'
    : forecast.rain === 'none' ? '预报无雨' : '降雨待确认'
  const climate = { humid: '偏潮湿', dry: '偏干燥', windy: '风较大' }[forecast.climate]
  return [rain, climate].filter(Boolean).join(' · ')
}

function chartProfileFor(chart) {
  if (!chart) return null
  const min = Math.min(...ELEMENT_ORDER.map(id => chart.counts[id]))
  const light = ELEMENT_ORDER.filter(id => chart.counts[id] === min).slice(0, 2)
  const supportedBy = ELEMENT_ORDER[(ELEMENT_ORDER.indexOf(chart.element) + 4) % 5]
  const supports = ELEMENT_ORDER[(ELEMENT_ORDER.indexOf(chart.element) + 1) % 5]
  return {
    image: ELEMENT_IDEA[chart.element].image,
    supportedBy: ELEMENT_LABEL[supportedBy], supports: ELEMENT_LABEL[supports],
    lightText: light.map(id => ELEMENT_LABEL[id]).join('、')
  }
}

function wheelPoint(angle, radius) {
  const radians = (angle - 90) * Math.PI / 180
  return { left: Math.round((50 + radius * Math.cos(radians)) * 10) / 10,
    top: Math.round((50 + radius * Math.sin(radians)) * 10) / 10 }
}

Page({
  data: {
    page: 'home', themeClass: 'theme-neutral', nav: NAV,
    themes: [], styles: STYLES,
    occasions: OCCASIONS, wardrobeBudgets: WARDROBE_BUDGETS, ageRanges: AGE_RANGES,
    pillarLabels: ['年柱', '月柱', '日柱', '时柱']
  },

  onLoad() {
    let saved = {}
    try { saved = wx.getStorageSync(STORE) || {} } catch (e) { saved = {} }
    this.state = Object.assign({}, DEFAULT, saved)
    this.state.wardrobe = (this.state.wardrobe || []).filter(item => item && !item.sample)
    // Weather is never restored from storage: a fresh visit must use a fresh forecast.
    this.state.forecast = null
    this.state.forecastStatus = 'idle'
    this.state.forecastError = ''
    this.state.forecastFetchedAt = 0
    this.state.page = 'home'
    this.state.chartMode = this.state.birth ? 'view' : 'edit'
    this.state.birthDraft = { date: '', time: '', region: null }
    this.state.birthRegionIndices = [0, 0]
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
      birth: s.birth, city: s.city,
      environment: s.environment, occasion: s.occasion, wardrobeBudget: s.wardrobeBudget, ageRange: s.ageRange,
      styles: s.styles, wardrobe: s.wardrobe
    }
    try { wx.setStorageSync(STORE, snapshot) } catch (e) { /* 资料仍可在当前会话使用 */ }
  },

  refresh() {
    const s = this.state
    const wardrobeCategoryIndices = indicesForCategory(s.wardrobeCategory)
    const theme = content.themes[s.themeId] || content.themes.career
    const birthRegion = s.birth && (s.birth.region || normalizeRegion(s.birth.city))
    let chart = null
    if (s.birth && s.birth.date && (!birthRegion || birthRegion.countryCode !== 'OVERSEAS')) {
      try {
        const historicalTime = s.birth.date < '1992-01-01' && !!s.birth.time
        chart = chartForBirth(historicalTime ? { ...s.birth, time: '' } : s.birth)
        if (historicalTime) chart.historicalTime = true
      } catch (e) { chart = null }
    }
    let starChart = null
    if (s.birth) {
      try {
        starChart = starChartForBirth({ date: s.birth.date, time: s.birth.time,
          location: birthRegion || { countryCode: 'OVERSEAS' } })
      } catch (e) {
        starChart = { status: 'unavailable', message: e.message || '星体位置暂时无法计算。', note: '' }
      }
    }
    const wheelSigns = starChart && starChart.status === 'ready'
      ? starChart.sectors.map((sector, index) => ({ sign: sector.sign,
        symbol: ZODIAC_SYMBOLS[index], ...wheelPoint(sector.startAngle + 15, 41) })) : []
    const wheelBodies = starChart && starChart.status === 'ready'
      ? starChart.bodies.map((body, index) => ({ key: body.key,
        symbol: PLANET_SYMBOLS[body.key], ...wheelPoint(body.wheelAngle, [27, 34, 24, 32, 28][index]) })) : []
    if (starChart && starChart.status === 'ready') {
      starChart.bodies = starChart.bodies.map(body => ({ ...body,
        degreeInSign: Math.round(body.degreeInSign * 10) / 10 }))
    }
    const astroProfile = astrologyProfile(starChart)
    if (starChart && starChart.status === 'ready' && astroProfile) starChart.bodies = astroProfile.cards
    const chartProfile = chartProfileFor(chart)
    const element = chart ? chart.element : 'neutral'
    const elementBars = chart ? Object.keys(ELEMENT_LABEL).map(id => ({
      id, label: ELEMENT_LABEL[id], count: chart.counts[id], hex: ELEMENT_COLORS[id].hex,
      width: Math.round(chart.counts[id] / chart.pillars.length / 2 * 100)
    })) : []
    const targetDate = localDate(s.dateMode === 'tomorrow' ? 1 : 0)
    const forecast = s.forecastStatus === 'ready' && s.forecast && s.forecast.date === targetDate ? s.forecast : null
    const almanac = almanacFor(targetDate)
    const daily = dailyFor(chart, almanac)
    const reading = readingFor(s, theme, almanac)
    const plan = reading ? buildPlan({
      styles: s.styles, weather: {
        temp: forecast && forecast.temp, rain: forecast && forecast.rain,
        climate: forecast && forecast.climate,
        tempMin: forecast && forecast.tempMin, tempMax: forecast && forecast.tempMax,
        source: forecast ? 'forecast' : 'unavailable',
        sourceLabel: forecast ? '当地预报' : '暂无天气数据'
      }, wardrobe: s.wardrobe,
      environment: s.environment, occasion: s.occasion,
      city: s.city, daily, astro: astroProfile, ageBand: s.birth ? ageBand(s.birth.date) : s.ageRange,
      themeId: s.themeId, objectAction: reading.object.action, reading
    }) : null
    const inspirations = recommendInspirations({ styleIds: s.styles, plan, occasion: s.occasion })
    const creatorMatches = plan ? recommendCreators({
      styleIds: s.styles, occasion: s.occasion, environment: s.environment
    }) : []
    const question = theme.questions[s.qIndex] || theme.questions[0]
    const questionOptions = question[1].map((text, index) => ({ text, index, selected: s.answers[s.qIndex] === index }))
    const objects = theme.objects.map((o, index) => ({
      ...o, index, tileSrc: `../../assets/objects/s${o.sheet}-t${o.tile}.jpg`
    }))
    const book = s.bookIndex >= 0 ? content.book[s.bookIndex] : null
    const styles = STYLES.map(x => ({ ...x, selected: s.styles.includes(x.id), priority: s.styles.indexOf(x.id) + 1 }))
    const wardrobeGaps = buildWardrobeGaps({ styles: s.styles, wardrobe: s.wardrobe, budget: s.wardrobeBudget })
    const themes = content.order.map((id, index) => ({ ...content.themes[id], id, index: String(index + 1).padStart(2, '0') }))
    const nav = NAV.map(x => ({ ...x, active: s.page === x.id || (x.id === 'home' && ['quiz', 'draw', 'reading', 'conditions'].includes(s.page)) }))
    const birthRegionIndices = s.birthRegionIndices || [0, 0]
    const currentRegionIndices = s.currentRegionIndices || [0, 0]
    this.setData({
      page: s.page, themeClass: `theme-${element}`, theme, themes, nav,
      dateMode: s.dateMode, targetDate, almanac, chart, chartProfile, starChart, astroProfile, daily,
      wheelSigns, wheelBodies, starSpokes: [0, 30, 60, 90, 120, 150], elementBars,
      elementLabel: chart ? ELEMENT_LABEL[element] : '',
      yiText: almanac.yi.join(' · '), jiText: almanac.ji.join(' · '),
      questionText: question[0], questionOptions, qIndex: s.qIndex, progress: Math.round((s.qIndex + 1) / 3 * 100),
      objects, reading, plan, inspirations, creatorMatches,
      birthDraft: s.birthDraft, birth: !!s.birth, chartMode: s.chartMode,
      birthRegionColumns: getRegionColumns(birthRegionIndices[0]), birthRegionIndices,
      birthRegionLabel: s.birthDraft.region ? s.birthDraft.region.displayName : '',
      currentRegionColumns: getRegionColumns(currentRegionIndices[0]), currentRegionIndices,
      currentRegionLabel: s.city, city: s.city,
      forecast, weatherFactors: weatherFactorsFor(forecast), forecastStatus: s.forecastStatus,
      forecastError: s.forecastError,
      environment: s.environment, occasion: s.occasion, wardrobeBudget: s.wardrobeBudget, ageRange: s.ageRange,
      styles, wardrobe: s.wardrobe, wardrobeGaps, wardrobeName: s.wardrobeName,
      wardrobePhotoDraft: s.wardrobePhotoDraft,
      wardrobeCategory: s.wardrobeCategory,
      wardrobeCategoryGroup: WARDROBE_GROUPS[wardrobeCategoryIndices[0]].name,
      wardrobeCategoryColumns: columnsForGroup(wardrobeCategoryIndices[0]), wardrobeCategoryIndices,
      book,
      ageBand: s.birth ? ageBand(s.birth.date) : s.ageRange,
      styleText: plan ? plan.tags.join(' / ') : STYLES.filter(x => s.styles.includes(x.id)).map(x => x.name).join(' / '),
      canAdvance: s.answers[s.qIndex] != null
    })
    this.save()
  },

  navigate(e) {
    const page = e.currentTarget.dataset.page
    if (page === 'plan' && this.state.objectIndex < 0) {
      wx.showToast({ title: '先完成一次明日签', icon: 'none' })
      return
    }
    if (page === 'chart') this.state.chartMode = this.state.birth ? 'view' : 'edit'
    this.state.page = page
    this.refresh()
    wx.pageScrollTo({ scrollTop: 0, duration: 0 })
    if (page === 'conditions' || page === 'plan') this.loadForecast()
  },

  setDateMode(e) {
    this.state.dateMode = e.currentTarget.dataset.value
    this.invalidateForecast()
    this.refresh()
  },
  beginTheme(e) {
    this.state.themeId = e.currentTarget.dataset.id
    this.state.answers = []
    this.state.qIndex = 0
    this.state.objectIndex = -1
    this.state.page = 'quiz'
    this.refresh()
  },
  answer(e) {
    this.state.answers[this.state.qIndex] = Number(e.currentTarget.dataset.index)
    this.refresh()
  },
  nextQuestion() {
    if (this.state.answers[this.state.qIndex] == null) return
    if (this.state.qIndex < 2) this.state.qIndex++
    else this.state.page = 'draw'
    this.refresh()
    wx.pageScrollTo({ scrollTop: 0, duration: 0 })
  },
  previousQuestion() {
    if (this.state.page === 'draw') this.state.page = 'quiz'
    else if (this.state.qIndex === 0) this.state.page = 'home'
    else this.state.qIndex--
    this.refresh()
  },
  chooseObject(e) {
    this.state.objectIndex = Number(e.currentTarget.dataset.index)
    this.state.page = 'reading'
    this.refresh()
    wx.pageScrollTo({ scrollTop: 0, duration: 0 })
  },
  flipBook() {
    let next = Math.floor(Math.random() * content.book.length)
    if (next === this.state.bookIndex) next = (next + 1) % content.book.length
    this.state.bookIndex = next
    this.refresh()
  },
  setField(e) {
    const key = e.currentTarget.dataset.key
    const value = e.currentTarget.dataset.value
    if (['environment', 'occasion', 'wardrobeBudget', 'ageRange'].includes(key)) {
      this.state[key] = value
      this.refresh()
    }
  },
  invalidateForecast() {
    this.forecastRequestId = (this.forecastRequestId || 0) + 1
    this.state.forecast = null
    this.state.forecastStatus = 'idle'
    this.state.forecastError = ''
    this.state.forecastFetchedAt = 0
  },
  loadForecast() {
    const region = normalizeRegion(this.state.city)
    if (!region) {
      this.state.forecastStatus = 'need-city'
      this.refresh()
      return
    }
    if (region.isOverseas) {
      this.state.forecastStatus = 'unsupported'
      this.refresh()
      return
    }
    if (!getApp().globalData.weatherEnabled) {
      this.state.forecastStatus = 'disabled'
      this.refresh()
      return
    }
    if (!getApp().globalData.cloudEnv || !wx.cloud || !wx.cloud.callFunction) {
      this.state.forecastStatus = 'not-configured'
      this.refresh()
      return
    }
    const targetDate = localDate(this.state.dateMode === 'tomorrow' ? 1 : 0)
    if (this.state.forecastStatus === 'loading') return
    if (this.state.forecastStatus === 'ready' && this.state.forecast &&
        this.state.forecast.date === targetDate && Date.now() - this.state.forecastFetchedAt < 30 * 60 * 1000) return
    const requestId = (this.forecastRequestId || 0) + 1
    this.forecastRequestId = requestId
    this.state.forecast = null
    this.state.forecastStatus = 'loading'
    this.state.forecastError = ''
    this.state.forecastFetchedAt = 0
    this.refresh()
    wx.cloud.callFunction({ name: 'getForecast', data: { region, targetDate } })
      .then(res => {
        if (requestId !== this.forecastRequestId || this.state.city !== region.displayName) return
        const result = res && res.result
        if (!result || !result.ok || !result.forecast) {
          const error = new Error(result && result.error || '预报暂不可用')
          error.code = result && result.code
          throw error
        }
        const forecast = result.forecast
        if (forecast.date !== targetDate || !Number.isFinite(Number(forecast.tempMin)) ||
            !Number.isFinite(Number(forecast.tempMax))) throw new Error('预报日期或温度无效')
        this.state.forecast = {
          ...forecast, source: result.source || '',
          attribution: result.attribution || '数据来自彩云天气'
        }
        this.state.forecastFetchedAt = Date.now()
        this.state.forecastStatus = 'ready'
        this.refresh()
      })
      .catch(error => {
        if (requestId !== this.forecastRequestId) return
        const unsupported = ['UNSUPPORTED_CITY', 'UNSUPPORTED_REGION', 'unsupported-city'].includes(error.code)
        this.state.forecast = null
        this.state.forecastFetchedAt = 0
        this.state.forecastStatus = unsupported ? 'unsupported' : 'error'
        this.state.forecastError = unsupported
          ? '该城市暂未接入自动预报，方案不会猜测当地天气。'
          : error.message || '预报暂不可用，方案不会猜测当地天气。'
        this.refresh()
      })
  },
  currentRegionColumnChange(e) {
    const indices = (this.state.currentRegionIndices || [0, 0]).slice()
    indices[e.detail.column] = Number(e.detail.value)
    if (e.detail.column === 0) indices[1] = 0
    this.state.currentRegionIndices = indices
    this.setData({ currentRegionIndices: indices, currentRegionColumns: getRegionColumns(indices[0]) })
  },
  currentRegionChange(e) {
    const region = getRegionByIndices(e.detail.value)
    if (!region) return
    this.state.city = region.displayName
    this.state.currentRegionIndices = getRegionIndices(region)
    this.invalidateForecast()
    this.refresh()
    if (this.state.page === 'conditions') this.loadForecast()
  },
  currentRegionCancel() {
    this.state.currentRegionIndices = getRegionIndices(this.state.city)
    this.refresh()
  },
  toggleStyle(e) {
    const id = e.currentTarget.dataset.id
    const current = this.state.styles.slice()
    const index = current.indexOf(id)
    if (index >= 0 && current.length > 1) current.splice(index, 1)
    else if (index < 0 && current.length < 3) current.push(id)
    else if (index < 0) { wx.showToast({ title: '最多选择 3 种风格', icon: 'none' }); return }
    this.state.styles = current
    this.refresh()
  },
  goPlan() { this.state.page = 'plan'; this.refresh(); this.loadForecast(); wx.pageScrollTo({ scrollTop: 0, duration: 0 }) },
  birthDate(e) { this.state.birthDraft.date = e.detail.value; this.setData({ birthDraft: this.state.birthDraft }) },
  birthTime(e) { this.state.birthDraft.time = e.detail.value; this.setData({ birthDraft: this.state.birthDraft }) },
  birthRegionColumnChange(e) {
    const indices = (this.state.birthRegionIndices || [0, 0]).slice()
    indices[e.detail.column] = Number(e.detail.value)
    if (e.detail.column === 0) indices[1] = 0
    this.state.birthRegionIndices = indices
    this.setData({ birthRegionIndices: indices, birthRegionColumns: getRegionColumns(indices[0]) })
  },
  birthRegionChange(e) {
    const region = getRegionByIndices(e.detail.value)
    if (!region) return
    this.state.birthDraft.region = region
    this.state.birthRegionIndices = getRegionIndices(region)
    this.refresh()
  },
  birthRegionCancel() {
    this.state.birthRegionIndices = getRegionIndices(this.state.birthDraft.region)
    this.refresh()
  },
  showBirthEditor() {
    this.state.birthDraft = { date: '', time: '', region: null }
    this.state.birthRegionIndices = [0, 0]
    this.state.chartMode = 'edit'
    this.refresh()
    wx.pageScrollTo({ scrollTop: 0, duration: 0 })
  },
  cancelBirthEditor() {
    this.state.chartMode = 'view'
    this.state.birthDraft = { date: '', time: '', region: null }
    this.refresh()
  },
  saveBirth() {
    const b = this.state.birthDraft
    const region = b.region || normalizeRegion(b.city)
    if (!b.date || !region) { wx.showToast({ title: '请选择日期与出生地区', icon: 'none' }); return }
    try { chartForBirth({ date: b.date, time: b.time, city: region.city }) } catch (e) { wx.showToast({ title: e.message, icon: 'none' }); return }
    this.state.birth = { date: b.date, time: b.time || '', city: region.city, region }
    this.state.birthDraft = { date: '', time: '', region: null }
    this.state.birthRegionIndices = [0, 0]
    this.state.chartMode = 'view'
    this.refresh()
    wx.pageScrollTo({ scrollTop: 0, duration: 0 })
    wx.showToast({ title: region.isOverseas ? '资料已保存' : '命盘已生成', icon: 'none' })
  },
  clearBirth() {
    wx.showModal({ title: '删除出生资料', content: '删除后界面会回到默认色调。', success: res => {
      if (!res.confirm) return
      this.state.birth = null
      this.state.birthDraft = { date: '', time: '', region: null }
      this.state.birthRegionIndices = [0, 0]
      this.state.chartMode = 'edit'
      this.refresh()
    } })
  },
  wardrobeName(e) { this.state.wardrobeName = e.detail.value; this.setData({ wardrobeName: e.detail.value }) },
  wardrobeCategoryColumnChange(e) {
    if (e.detail.column !== 0) return
    const groupIndex = Number(e.detail.value)
    this.setData({ wardrobeCategoryColumns: columnsForGroup(groupIndex), wardrobeCategoryIndices: [groupIndex, 0] })
  },
  wardrobeCategory(e) {
    this.state.wardrobeCategory = categoryAt(e.detail.value)
    this.refresh()
  },
  chooseWardrobePhoto() {
    const success = res => {
      const file = (res.tempFiles || [])[0]
      const path = file && (file.tempFilePath || file.path) || (res.tempFilePaths || [])[0]
      if (!path) { wx.showToast({ title: '未能读取照片', icon: 'none' }); return }
      if (file && file.size > 5 * 1024 * 1024) {
        wx.showToast({ title: '请选择 5 MB 内的照片', icon: 'none' }); return
      }
      this.state.wardrobePhotoDraft = path
      this.refresh()
    }
    const fail = error => {
      if (!/cancel/i.test(error && error.errMsg || '')) wx.showToast({ title: '选择照片失败', icon: 'none' })
    }
    if (wx.chooseMedia) wx.chooseMedia({ count: 1, mediaType: ['image'], sourceType: ['album', 'camera'], success, fail })
    else wx.chooseImage({ count: 1, sourceType: ['album', 'camera'], success, fail })
  },
  clearWardrobePhotoDraft() { this.state.wardrobePhotoDraft = ''; this.refresh() },
  addWardrobe() {
    const name = this.state.wardrobeName.trim()
    if (!name) { wx.showToast({ title: '先写物品名称', icon: 'none' }); return }
    if (this.addingWardrobe) return
    const category = this.state.wardrobeCategory
    const draft = this.state.wardrobePhotoDraft
    const commit = photo => {
      this.state.wardrobe.push({ id: `item-${Date.now()}-${Math.floor(Math.random() * 10000)}`, name, category, photo })
      this.state.wardrobeName = ''
      this.state.wardrobePhotoDraft = ''
      this.addingWardrobe = false
      this.refresh()
    }
    if (!draft) { commit(''); return }
    this.addingWardrobe = true
    wx.saveFile({ tempFilePath: draft,
      success: res => commit(res.savedFilePath),
      fail: () => { this.addingWardrobe = false; wx.showToast({ title: '照片保存失败，请重试', icon: 'none' }) }
    })
  },
  removeWardrobe(e) {
    const id = String(e.currentTarget.dataset.id)
    const removed = this.state.wardrobe.find(x => String(x.id) === id)
    this.state.wardrobe = this.state.wardrobe.filter(x => String(x.id) !== id)
    if (removed && removed.photo && !removed.sample && wx.removeSavedFile) {
      wx.removeSavedFile({ filePath: removed.photo, fail: () => {} })
    }
    this.refresh()
  },
  copyInspiration(e) {
    const card = (this.data.inspirations || []).find(item => item.id === e.currentTarget.dataset.id)
    if (!card) return
    wx.setClipboardData({
      data: card.source ? card.source.url : card.searchQuery,
      success: () => wx.showToast({ title: card.source ? '已复制原文链接' : '已复制搜索词', icon: 'none' }),
      fail: () => wx.showToast({ title: '复制失败，请重试', icon: 'none' })
    })
  },
  copyCreatorLink(e) {
    const creator = (this.data.creatorMatches || []).find(item => item.id === e.currentTarget.dataset.id)
    if (!creator) return
    wx.setClipboardData({
      data: creator.profileUrl,
      success: () => wx.showToast({ title: '已复制博主主页', icon: 'none' }),
      fail: () => wx.showToast({ title: '复制失败，请重试', icon: 'none' })
    })
  },
  copyWardrobeGap(e) {
    const gap = (this.data.wardrobeGaps || []).find(item => item.id === e.currentTarget.dataset.id)
    if (!gap) return
    wx.setClipboardData({ data: gap.searchQuery,
      success: () => wx.showToast({ title: '已复制搜索词', icon: 'none' }),
      fail: () => wx.showToast({ title: '复制失败，请重试', icon: 'none' })
    })
  }
})
