const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const content = require('../data/content.json')
const { chartForBirth, almanacFor, localDate, ELEMENT_COLOR } = require('../lib/calendar')
const { dailyFor } = require('../lib/daily')
const { ELEMENT_COLORS } = require('../lib/elements')
const { REGIONS, getRegionIndices, getRegionByIndices } = require('../lib/regions')
const { STYLES, buildPlan, buildWardrobeGaps } = require('../lib/plan')
const { GROUPS: wardrobeGroups, roleForCategory, indicesForCategory, categoryAt } = require('../lib/wardrobe')

function makePage(options = {}) {
  const saved = options.saved || {}
  global.wx = {
    getStorageSync: key => saved[key], setStorageSync: (key, value) => { saved[key] = value },
    pageScrollTo: () => {}, showToast: () => {}, showLoading: () => {}, hideLoading: () => {},
    showModal: ({ success }) => success({ confirm: true })
  }
  if (options.callFunction) global.wx.cloud = { callFunction: options.callFunction }
  global.getApp = () => ({ globalData: { cloudEnv: options.cloudEnv || '', weatherEnabled: !!options.weatherEnabled } })
  let definition
  global.Page = value => { definition = value }
  delete require.cache[require.resolve('../pages/index/index.js')]
  require('../pages/index/index.js')
  const page = { ...definition, data: { ...definition.data }, setData(value) { Object.assign(this.data, value) } }
  page.onLoad()
  return page
}

test('九主题 27 种选物都生成对应解读与方案，不会出现缺失题目', () => {
  const page = makePage()
  for (const id of content.order) {
    page.beginTheme({ currentTarget: { dataset: { id } } })
    for (let i = 0; i < 3; i++) {
      assert.equal(page.data.questionOptions.length, 3)
      page.answer({ currentTarget: { dataset: { index: i } } })
      page.nextQuestion()
    }
    assert.equal(page.data.page, 'draw')
    assert.equal(page.data.objects.length, 3)
    for (let objectIndex = 0; objectIndex < 3; objectIndex++) {
      page.chooseObject({ currentTarget: { dataset: { index: objectIndex } } })
      assert.equal(page.data.page, 'reading')
      assert.ok(page.data.reading.do)
      assert.ok(page.data.reading.avoid)
      assert.equal(page.data.reading.object.name, content.themes[id].objects[objectIndex].name)
      assert.equal(page.data.plan.items.length, 6)
    }
  }
})

test('出生资料自动决定五行界面；未知时辰不生成时柱', () => {
  const page = makePage()
  const seen = new Set()
  for (let day = 1; day <= 12; day++) {
    const date = `2020-01-${String(day).padStart(2, '0')}`
    const chart = chartForBirth({ date, time: '', city: '上海' })
    seen.add(chart.element)
    assert.equal(chart.pillars.length, 3)
    assert.equal(Object.values(chart.counts).reduce((sum, n) => sum + n, 0), 6)
    page.state.birth = { date, time: '', city: '上海' }
    page.refresh()
    assert.equal(page.data.themeClass, `theme-${chart.element}`)
    assert.equal(page.data.elementBars.length, 5)
  }
  assert.equal(seen.size, 5)
  page.clearBirth()
  assert.equal(page.data.themeClass, 'theme-neutral')
})

test('每日建议随日期和个人日柱改变，缺出生资料时明确降级', () => {
  const fire = chartForBirth({ date: '1996-06-18', time: '', city: '上海' })
  const earth = chartForBirth({ date: '1996-06-20', time: '', city: '上海' })
  const monday = almanacFor('2026-09-21')
  const wednesday = almanacFor('2026-09-23')
  const first = dailyFor(fire, monday)
  const later = dailyFor(fire, wednesday)
  const another = dailyFor(earth, monday)
  const tenDays = Array.from({ length: 10 }, (_, index) =>
    dailyFor(fire, almanacFor(new Date(Date.UTC(2026, 8, 21 + index)).toISOString().slice(0, 10))))
  assert.equal(new Set(tenDays.map(day => day.relationLabel)).size, 10)
  assert.equal(first.relationLabel, '食神')
  assert.notEqual(first.title, later.title)
  assert.notEqual(first.title, another.title)
  assert.match(first.basis, /丙.*戊戌.*我生/)
  assert.match(first.basis, /未填时刻/)
  const clash = dailyFor(fire, almanacFor('2026-09-27'))
  assert.match(clash.basis, /日支形成相冲/)
  assert.match(clash.action, /空档/)
  const fallback = dailyFor(null, monday)
  assert.equal(fallback.personalized, false)
  assert.match(fallback.basis, /尚无可计算的出生资料/)

  const practical = { weather: { temp: 20, rain: 'none' }, occasion: '日常', styles: ['minimal'] }
  const firstPlan = buildPlan({ ...practical, daily: first })
  const laterPlan = buildPlan({ ...practical, daily: later })
  assert.notEqual(firstPlan.items[5].value, laterPlan.items[5].value)
  assert.notEqual(firstPlan.mood, laterPlan.mood)
  assert.match(firstPlan.prep.join(' '), /先说结论/)
  const owned = buildPlan({ ...practical, daily: later, wardrobe: [{ category: '配饰', name: '银色耳环' }] })
  assert.equal(owned.items[5].value, '银色耳环')
})

test('页面切换目标日期时重算每日主题', () => {
  const page = makePage()
  page.state.birth = { date: '1996-06-18', time: '', city: '上海' }
  page.state.answers = [0, 1, 2]
  page.state.objectIndex = 0
  page.refresh()
  const tomorrow = page.data.targetDate
  const tomorrowBasis = page.data.daily.basis
  page.setDateMode({ currentTarget: { dataset: { value: 'today' } } })
  assert.notEqual(page.data.targetDate, tomorrow)
  assert.notEqual(page.data.daily.basis, tomorrowBasis)
  assert.equal(page.data.plan.daily.basis, page.data.daily.basis)
})

test('天气、风格、衣橱和年龄进入具体方案', () => {
  assert.ok(STYLES.length >= 12)
  const base = {
    styles: ['outdoor', 'minimal'], weather: { temp: '8', rain: 'rain' },
    wardrobe: [{ category: '鞋履', name: '我的黑色防水鞋' }],
    environment: '户外较多', occasion: '旅行', budget: '只用已有物品',
    daily: dailyFor(chartForBirth({ date: '1996-06-18', time: '', city: '上海' }), almanacFor('2026-09-21')),
    ageBand: '35–44岁', themeId: 'travel',
    themeAccent: '轻便斜挎包', objectAction: '确认路线'
  }
  const plan = buildPlan(base)
  assert.ok(plan.items.some(x => x.value === '我的黑色防水鞋' && x.owned))
  assert.match(plan.makeup, /保湿妆前/)
  assert.match(plan.reminder, /折叠伞/)
  assert.match(plan.mood, /把想法整理后表达/)
  assert.match(plan.prep.join(' '), /确认路线/)
  const warm = buildPlan({ ...base, weather: { temp: '31', rain: 'dry' }, wardrobe: [], styles: ['soft'] })
  assert.notEqual(warm.items[0].value, plan.items[0].value)
  assert.notEqual(warm.reminder, plan.reminder)
  const windy = buildPlan({ ...base, weather: { temp: '19', rain: 'dry', climate: 'windy' }, wardrobe: [] })
  assert.match(windy.items[2].value, /防风/)
})

test('韩法造型按版型和颜色挑选衣橱', () => {
  const wardrobe = [
    { category: '上装', name: '荧光绿大印花卫衣' },
    { category: '上装', name: '奶油白垂感衬衫' },
    { category: '牛仔裤', name: '黑色破洞牛仔裤' },
    { category: '牛仔裤', name: '深靛蓝直筒牛仔裤' }
  ]
  const plan = buildPlan({ styles: ['french', 'soft'], weather: { temp: 29, rain: 'none' },
    occasion: '日常', wardrobe })
  assert.equal(plan.items[0].value, '奶油白垂感衬衫')
  assert.equal(plan.items[1].value, '深靛蓝直筒牛仔裤')
  assert.equal(plan.items[2].optional, true)
  assert.match(plan.styling, /裤/)
})

test('同一风格在七种场合得到不同清单，居家不推荐出门包和饰品', () => {
  const outfits = new Set()
  for (const occasion of ['日常', '通勤', '约会', '上课', '聚会', '旅行', '居家']) {
    const plan = buildPlan({ styles: ['soft', 'french'], weather: { temp: 21, rain: 'none' }, occasion })
    outfits.add(plan.items.filter(item => !item.optional).map(item => item.value).join('｜'))
    if (occasion === '居家') {
      assert.equal(plan.items.find(item => item.label === '包').optional, true)
      assert.equal(plan.items.find(item => item.label === '配饰').optional, true)
      assert.doesNotMatch(plan.prep.join(' '), /出门包/)
    }
  }
  assert.equal(outfits.size, 7)
  const hotRainy = ['日常', '通勤', '约会', '上课', '聚会', '旅行', '居家'].map(occasion =>
    buildPlan({ styles: ['soft'], weather: { temp: 29, rain: 'rain' }, occasion }).items.slice(0, 2).map(item => item.value).join('｜'))
  assert.equal(new Set(hotRainy).size, 7, '炎热雨天的主要衣物也应因场合而不同')
})

test('抽中的物件改变搭配提醒，已有单品仍优先', () => {
  const base = { styles: ['soft'], occasion: '通勤', weather: { temp: 21, rain: 'none' },
    wardrobe: [{ category: '上装', name: '自己的奶油白衬衫' }] }
  const pen = { object: { name: '钢笔' }, do: '先说结论。', avoid: '不要拖延。' }
  const stairs = { object: { name: '阶梯' }, do: '先做第一步。', avoid: '不要贪多。' }
  const first = buildPlan({ ...base, reading: pen })
  const second = buildPlan({ ...base, reading: stairs })
  assert.equal(first.items[0].value, '自己的奶油白衬衫')
  assert.equal(second.items[0].value, '自己的奶油白衬衫')
  assert.notEqual(first.readingStyling, second.readingStyling)
  assert.match(first.prep.join(' '), /先说结论/)
  assert.match(second.prep.join(' '), /先做第一步/)
  const objects = content.order.flatMap(id => content.themes[id].objects)
  assert.equal(objects.length, 27)
  for (const object of objects) {
    const plan = buildPlan({ ...base, reading: { object } })
    assert.ok(plan.readingStyling, object.name)
  }
})

test('衣橱可按大类选择细分单品，半裙与连衣裙能进入搭配', () => {
  assert.ok(wardrobeGroups.length >= 10)
  const categoryNames = wardrobeGroups.flatMap(group => group.items)
  for (const name of ['裙装', '半裙', '连衣裙', '吊带裙', '牛仔裤', '西装外套', '耳饰', '香水', '水晶']) {
    assert.ok(categoryNames.includes(name), name)
    assert.equal(categoryAt(indicesForCategory(name)), name)
  }
  assert.equal(roleForCategory('半裙'), '下装')
  assert.equal(roleForCategory('连衣裙'), 'onepiece')
  assert.equal(roleForCategory('香水'), 'archive')
  const page = makePage()
  const skirtIndices = indicesForCategory('半裙')
  page.wardrobeCategoryColumnChange({ detail: { column: 0, value: skirtIndices[0] } })
  assert.ok(page.data.wardrobeCategoryColumns[1].includes('半裙'))
  page.wardrobeCategory({ detail: { value: skirtIndices } })
  page.wardrobeName({ detail: { value: '自己的百褶半裙' } })
  page.addWardrobe()
  assert.equal(page.data.wardrobe[0].category, '半裙')
  const skirtPlan = buildPlan({ wardrobe: page.data.wardrobe, weather: { temp: 22, rain: 'none' } })
  assert.equal(skirtPlan.items[1].value, '自己的百褶半裙')
  assert.equal(skirtPlan.items[1].owned, true)

  const dressPlan = buildPlan({ wardrobe: [{ category: '连衣裙', name: '自己的蓝色连衣裙' }], weather: { temp: 22, rain: 'none' } })
  assert.equal(dressPlan.items.length, 5)
  assert.equal(dressPlan.items[0].label, '连身款')
  assert.equal(dressPlan.items[0].value, '自己的蓝色连衣裙')
  assert.ok(!dressPlan.items.some(item => item.label === '下装'))
  assert.match(dressPlan.prep[0], /蓝色连衣裙/)
})

test('雨天户外和极端气温约束单品，同时保留用户选的风格', () => {
  const rain = buildPlan({
    weather: { temp: '6', rain: 'rain', source: 'forecast', sourceLabel: '测试天气预报' },
    environment: '户外较多', occasion: '旅行', styles: ['romantic'],
    wardrobe: [
      { category: '鞋履', name: '我的麂皮高跟鞋' }, { category: '鞋履', name: '我的防滑防水短靴' },
      { category: '外套', name: '我的薄针织开衫' }, { category: '外套', name: '我的防水保暖冲锋衣' }
    ], element: 'metal', budget: '只用已有物品'
  })
  assert.equal(rain.items[3].value, '我的防滑防水短靴')
  assert.equal(rain.items[2].value, '我的防水保暖冲锋衣')
  assert.match(rain.reminder, /折叠伞|带折叠伞/)
  assert.equal(rain.reasons[0].source, '测试天气预报')
  assert.equal(rain.tags[0], '轻浪漫')
  assert.match(rain.substitute, /今晚先/)
  assert.ok(rain.unconfirmed.includes('上装'))

  const hot = buildPlan({ weather: { temp: '34', rain: 'dry' }, occasion: '日常', styles: ['soft'],
    wardrobe: [{ category: '上装', name: '厚羊毛毛衣' }, { category: '外套', name: '羽绒服' }] })
  assert.match(hot.items[0].value, /透气|轻薄|薄棉/)
  assert.ok(!hot.items[0].owned)
  assert.ok(!hot.items[2].owned)
  assert.match(hot.reminder, /透气/)

  const range = buildPlan({ weather: { tempMin: '9', tempMax: '30', temp: '20', rain: 'dry' },
    occasion: '日常', styles: ['soft'], wardrobe: [] })
  assert.match(range.weatherText, /9–30°C/)
  assert.match(range.items[0].value, /透气|薄棉/)
  assert.match(range.items[2].value, /保暖/)
  assert.match(range.reminder, /外层选可增减/)

  const commute = buildPlan({ weather: { temp: '21' }, occasion: '通勤', styles: ['street'] })
  assert.equal(commute.tags[0], '街头中性')
  assert.equal(commute.tags.length, 1)
})

test('只用衣橱不虚称参考单品已拥有，已有配饰原色优先', () => {
  const plan = buildPlan({ weather: { temp: '20' }, occasion: '日常', styles: ['minimal'],
    budget: '只用已有物品', element: 'fire', wardrobe: [{ category: '配饰', name: '银色耳环' }] })
  assert.equal(plan.items[5].value, '银色耳环')
  assert.ok(plan.items[5].owned)
  assert.equal(plan.items[0].placeholder, true)
  assert.equal(plan.wardrobeStatus, 'needs-confirmation')
  assert.match(plan.substitute, /尚未在衣橱/)
  assert.match(plan.reasons[4].detail, /未提供出生资料/)
})

test('预算只筛选长期衣橱缺口，不改变明日穿搭', () => {
  const base = { styles: ['soft'], weather: { temp: 20, rain: 'none' }, occasion: '通勤', wardrobe: [] }
  const low = buildPlan({ ...base, budget: '200 元内' })
  const high = buildPlan({ ...base, budget: '1000 元内' })
  assert.deepEqual(low.items, high.items)
  assert.equal(low.substitute, high.substitute)

  const gaps = buildWardrobeGaps({ styles: ['soft'], budget: '200 元内',
    wardrobe: [{ category: '上装', name: '自己的奶油色针织' }] })
  assert.ok(gaps.length > 0)
  assert.ok(!gaps.some(item => item.category === '上装' || item.category === '鞋履'))
  assert.ok(gaps.every(item => item.searchQuery.includes('温柔轻熟')))
})

test('照片衣橱保存本机文件，并可单独删除物品', () => {
  const page = makePage()
  global.wx.chooseMedia = ({ success }) => success({ tempFiles: [{ tempFilePath: '/tmp/example.jpg', size: 1000 }] })
  global.wx.saveFile = ({ success }) => success({ savedFilePath: '/saved/example.jpg' })
  page.wardrobeName({ detail: { value: '自己的蓝色衬衫' } })
  page.chooseWardrobePhoto()
  assert.equal(page.data.wardrobePhotoDraft, '/tmp/example.jpg')
  page.addWardrobe()
  assert.equal(page.state.wardrobe.length, 1)
  assert.equal(page.state.wardrobe.at(-1).photo, '/saved/example.jpg')
  page.removeWardrobe({ currentTarget: { dataset: { id: page.state.wardrobe[0].id } } })
  assert.equal(page.state.wardrobe.length, 0)
})

test('旧版测试衣物不会进入用户界面', () => {
  const saved = { 'mingriyoujie-mvp-v1': { wardrobe: [{ id: 'legacy-demo', name: '旧示例', category: '上装', sample: true }] } }
  const page = makePage({ saved })
  assert.equal(page.state.wardrobe.length, 0)
})

test('五行色仅控制界面，不直接决定穿搭与配饰颜色', () => {
  const expected = {
    wood: ['青绿', '青'], fire: ['朱赤', '赤'], earth: ['赭褐', '黄'],
    metal: ['香槟金', '白'], water: ['黛蓝', '黑']
  }
  for (const [element, [name, traditionalName]] of Object.entries(expected)) {
    assert.equal(ELEMENT_COLORS[element].name, name)
    assert.equal(ELEMENT_COLORS[element].traditionalName, traditionalName)
    assert.equal(ELEMENT_COLOR[element], name)
    const plan = buildPlan({ element, styles: ['minimal'], wardrobe: [] })
    assert.equal(plan.items[5].value, '细金耳钉')
  }
  assert.equal(ELEMENT_COLORS.neutral.name, '米白')
  const fire = buildPlan({ element: 'fire', wardrobe: [] })
  const water = buildPlan({ element: 'water', wardrobe: [] })
  assert.deepEqual(fire.items.map(item => item.value), water.items.map(item => item.value))
})

test('真实黄历由日期计算，UI 文案注明来源，素材路径均存在', () => {
  const almanac = almanacFor('2026-09-21')
  assert.equal(almanac.dayGanZhi, '戊戌')
  assert.ok(almanac.yi.length > 0 && almanac.ji.length > 0)
  assert.match(almanac.source, /lunar-javascript 1.7.7/)
  for (const id of content.order) {
    for (const object of content.themes[id].objects) {
      const file = path.join(__dirname, '..', 'assets', `object-sheet-${object.sheet}.jpg`)
      const tile = path.join(__dirname, '..', 'assets', 'objects', `s${object.sheet}-t${object.tile}.jpg`)
      assert.ok(fs.existsSync(file), file)
      assert.ok(fs.existsSync(tile), tile)
      assert.ok(object.tile >= 0 && object.tile < 9)
    }
  }
})

test('页面交互会保存出生资料、衣橱与答案书状态', () => {
  const page = makePage()
  page.state.birthDraft = { date: '1996-06-18', time: '10:30', city: '上海' }
  page.saveBirth()
  assert.equal(page.data.themeClass, 'theme-fire')
  page.wardrobeName({ detail: { value: '米白衬衫' } })
  page.addWardrobe()
  assert.equal(page.data.wardrobe.length, 1)
  assert.equal(page.data.wardrobe[0].category, '上装')
  page.navigate({ currentTarget: { dataset: { page: 'book' } } })
  page.flipBook()
  assert.ok(page.data.book[0] && page.data.book[1])
  page.removeWardrobe({ currentTarget: { dataset: { id: page.data.wardrobe[0].id } } })
  assert.equal(page.data.wardrobe.length, 0)
})

test('出生地区使用标准选项；保存后收起原始资料并可更换用户', () => {
  const page = makePage()
  page.navigate({ currentTarget: { dataset: { page: 'chart' } } })
  const shanghai = getRegionIndices('上海')
  page.birthRegionColumnChange({ detail: { column: 0, value: shanghai[0] } })
  page.birthRegionChange({ detail: { value: shanghai } })
  page.birthDate({ detail: { value: '1996-06-18' } })
  page.birthTime({ detail: { value: '10:30' } })
  page.saveBirth()
  assert.equal(page.state.birth.region.code, getRegionByIndices(shanghai).code)
  assert.equal(page.data.birth, true)
  assert.equal(page.data.chartMode, 'view')
  assert.equal(page.data.birthDraft.date, '')
  assert.equal(page.data.birthRegionLabel, '')
  assert.equal(page.data.starChart.status, 'ready')
  page.showBirthEditor()
  assert.equal(page.data.chartMode, 'edit')
  assert.equal(page.data.birthDraft.date, '')
  page.cancelBirthEditor()
  assert.equal(page.data.chartMode, 'view')
})

test('海外选项不被误算为东八区命盘', () => {
  const page = makePage()
  page.navigate({ currentTarget: { dataset: { page: 'chart' } } })
  page.birthRegionChange({ detail: { value: getRegionIndices('海外') } })
  page.birthDate({ detail: { value: '1996-06-18' } })
  page.birthTime({ detail: { value: '10:30' } })
  page.saveBirth()
  assert.equal(page.data.chart, null)
  assert.equal(page.data.themeClass, 'theme-neutral')
  assert.equal(page.data.starChart.status, 'needs-timezone')
})

test('地区选择的 394 个展示名均能还原同一选项', () => {
  let checked = 0
  REGIONS.forEach((region, provinceIndex) => region.cities.forEach((city, cityIndex) => {
    const selected = getRegionByIndices([provinceIndex, cityIndex])
    assert.deepEqual(getRegionIndices(selected.displayName), [provinceIndex, cityIndex])
    checked++
  }))
  assert.ok(checked >= 390)
})

test('选择城市和日期后自动读取预报，并在过期时更新', async () => {
  const calls = []
  const page = makePage({ cloudEnv: 'test-env', weatherEnabled: true, callFunction: async args => {
    calls.push(args)
    return { result: { ok: true, source: '彩云天气', attribution: '数据来自彩云天气', forecast: {
        date: args.data.targetDate, temp: 23, tempMin: 16, tempMax: 24,
        rain: 'none', climate: 'normal', description: '多云'
      } } }
  } })
  page.state.page = 'conditions'
  page.currentRegionChange({ detail: { value: getRegionIndices('上海') } })
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(calls[0].name, 'getForecast')
  assert.equal(calls[0].data.targetDate, localDate(1))
  assert.equal(page.data.forecastStatus, 'ready')
  assert.equal(page.data.forecast.temp, 23)
  assert.match(page.data.weatherFactors, /预报无雨/)
  assert.equal(page.data.forecast.attribution, '数据来自彩云天气')
  page.navigate({ currentTarget: { dataset: { page: 'conditions' } } })
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(calls.length, 1)
  page.state.forecastFetchedAt = Date.now() - 31 * 60 * 1000
  page.navigate({ currentTarget: { dataset: { page: 'conditions' } } })
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(calls.length, 2)
  page.setDateMode({ currentTarget: { dataset: { value: 'today' } } })
  page.navigate({ currentTarget: { dataset: { page: 'conditions' } } })
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(calls[2].data.targetDate, localDate(0))
  assert.equal(typeof page.tempInput, 'undefined')
  const wxml = fs.readFileSync(path.join(__dirname, '../pages/index/index.wxml'), 'utf8')
  for (const label of ['预计气温（可跳过）', '天气感觉', '当地气候感受', 'bindtap="loadForecast"']) {
    assert.ok(!wxml.includes(label), label)
  }
})

test('预报失败时不沿用旧天气，也不从旧缓存恢复手填值', async () => {
  let fail = false
  const saved = { 'mingriyoujie-mvp-v1': { temp: '38', rain: 'rain', climate: 'humid', weatherDate: localDate(1) } }
  const page = makePage({ saved, cloudEnv: 'test-env', weatherEnabled: true, callFunction: async args => ({
    result: fail
      ? { ok: false, code: 'UNSUPPORTED_CITY', error: '该城市暂无可信坐标，请手动填写天气' }
      : { ok: true, forecast: { date: args.data.targetDate, temp: 23, tempMin: 16,
        tempMax: 24, rain: 'none', climate: 'normal', description: '多云' } }
  }) })
  page.state.answers = [0, 0, 0]
  page.state.objectIndex = 0
  page.refresh()
  assert.equal(page.data.plan.weatherText, '暂无天气数据')
  page.state.page = 'conditions'
  page.currentRegionChange({ detail: { value: getRegionIndices('上海') } })
  await new Promise(resolve => setImmediate(resolve))
  assert.match(page.data.plan.weatherText, /16–24°C/)
  fail = true
  page.state.forecastFetchedAt = 0
  page.navigate({ currentTarget: { dataset: { page: 'conditions' } } })
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(page.data.forecastStatus, 'unsupported')
  assert.match(page.data.forecastError, /不会猜测当地天气/)
  assert.equal(page.data.forecast, null)
  assert.equal(page.data.plan.weatherText, '暂无天气数据')
  assert.match(page.data.plan.reminder, /查看气温、降雨与风力/)
  assert.equal(saved['mingriyoujie-mvp-v1'].temp, undefined)
})

test('1992 年前历史时差未核实，不显示可能错误的时柱', () => {
  const page = makePage()
  page.state.birth = { date: '1988-06-18', time: '10:30', city: '上海' }
  page.navigate({ currentTarget: { dataset: { page: 'chart' } } })
  assert.equal(page.data.chart.pillars.length, 3)
  assert.equal(page.data.chart.historicalTime, true)
  assert.equal(page.data.starChart.status, 'needs-timezone')
})
