const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const GUIDES = require('../data/style-guides.js')
const { STYLES, buildPlan } = require('../lib/plan.js')
const { recommendInspirations } = require('../lib/inspiration.js')
const { validateNotes } = require('../scripts/import-inspiration-notes.js')

test('每一种可选风格都有原创穿搭、妆容和搜索词', () => {
  assert.deepEqual(Object.keys(GUIDES).sort(), STYLES.map(style => style.id).sort())
  for (const guide of Object.values(GUIDES)) {
    for (const field of ['look', 'makeup', 'lookQuery', 'makeupQuery']) assert.ok(guide[field])
  }
})

test('灵感卡引用实际衣橱清单和天气，未收录笔记时显示搜索入口', () => {
  const plan = buildPlan({
    styles: ['soft', 'french'], occasion: '约会',
    weather: { temp: 8, rain: 'rain' },
    wardrobe: [{ category: '鞋履', name: '我的黑色防水鞋' }]
  })
  const cards = recommendInspirations({ styleIds: ['soft', 'french'], plan, occasion: '约会', notes: [] })
  assert.equal(cards.length, 3)
  assert.match(cards[0].specific, /我的黑色防水鞋/)
  assert.match(cards[0].reason, /约会.*有雨/)
  assert.equal(cards[0].source, null)
  assert.ok(cards[0].searchQuery)
  assert.match(cards[0].searchQuery, /约会/)
  assert.match(cards[0].principle, /坐下和步行/)
  assert.match(cards[1].specific, /防晒打底/)
  assert.equal(cards[2].styleName, '法式松弛')
})

test('只显示同风格同类别的原文，且不复制博主正文或图片', () => {
  const original = {
    id: 'note_001', styleId: 'minimal', kind: 'look', title: '基础款通勤搭配',
    author: '示例作者', url: 'https://www.xiaohongshu.com/explore/0123456789abcdef01234567'
  }
  assert.deepEqual(validateNotes([original]), [original])
  const plan = buildPlan({ styles: ['minimal'], occasion: '日常' })
  const cards = recommendInspirations({ styleIds: ['minimal'], plan, notes: [original] })
  assert.equal(cards[0].source.url, original.url)
  assert.equal(cards[1].source, null)
  assert.ok(!('image' in cards[0].source))
  assert.ok(!('body' in cards[0].source))
  assert.throws(() => validateNotes([{ ...original, url: 'https://example.com/post' }]), /原文链接/)
  assert.throws(() => validateNotes([original, original]), /重复/)
  assert.throws(() => validateNotes([{ ...original, image: 'copied.jpg' }]), /正文或图片/)
})

test('方案页展示博主匹配与灵感卡，并可复制对应入口', () => {
  const copied = []
  global.wx = {
    getStorageSync: () => null, setStorageSync: () => {},
    setClipboardData: ({ data, success }) => { copied.push(data); success() },
    pageScrollTo: () => {}, showToast: () => {}
  }
  global.getApp = () => ({ globalData: { cloudEnv: '' } })
  let definition
  global.Page = value => { definition = value }
  delete require.cache[require.resolve('../pages/index/index.js')]
  require('../pages/index/index.js')
  const page = { ...definition, data: { ...definition.data }, setData(value) { Object.assign(this.data, value) } }
  page.onLoad()
  page.state.answers = [0, 1, 2]
  page.state.objectIndex = 0
  page.refresh()
  assert.ok(page.data.inspirations.length >= 2)
  assert.ok(page.data.creatorMatches.length >= 2)
  page.copyCreatorLink({ currentTarget: { dataset: { id: page.data.creatorMatches[0].id } } })
  const card = page.data.inspirations[0]
  page.copyInspiration({ currentTarget: { dataset: { id: card.id } } })
  assert.deepEqual(copied, [page.data.creatorMatches[0].profileUrl, card.searchQuery])
  const wxml = fs.readFileSync(path.join(__dirname, '../pages/index/index.wxml'), 'utf8')
  assert.match(wxml, /匹配博主/)
  assert.match(wxml, /bindtap="copyCreatorLink"/)
  assert.match(wxml, /延伸灵感/)
  assert.match(wxml, /bindtap="copyInspiration"/)
})
