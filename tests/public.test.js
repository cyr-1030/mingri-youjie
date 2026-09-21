const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const content = require('../data/content.js')
const { buildPlan } = require('../lib/plan.js')

const root = path.join(__dirname, '..')

test('公开版前端不包含命理、占卜或站外导流文案', () => {
  const files = ['app.json', 'pages/index/index.js', 'pages/index/index.wxml']
  const source = files.map(file => fs.readFileSync(path.join(root, file), 'utf8')).join('\n')
  const banned = ['命盘', '八字', '五行', '星盘', '日主', '黄历', '卦意', '吉凶', '抽签', '小红书']
  for (const term of banned) assert.equal(source.includes(term), false, `发现公开版禁用词：${term}`)
})

test('九个入口均为穿搭场景并保留完整问答', () => {
  assert.equal(content.order.length, 9)
  for (const id of content.order) {
    const theme = content.themes[id]
    assert.ok(theme && theme.name)
    assert.equal(theme.questions.length, 3)
    assert.equal(theme.objects.length, 3)
  }
})

test('天气、场合、风格和衣橱仍能生成可执行方案', () => {
  const plan = buildPlan({
    styles: ['soft', 'french'], weather: { tempMin: 20, tempMax: 28, rain: 'rain', climate: 'normal', sourceLabel: '天气预报' },
    wardrobe: [{ id: '1', category: '衬衫', name: '奶油白轻薄衬衫' }],
    environment: '室内为主', occasion: '通勤', ageBand: '25–34岁', themeId: 'career',
    objectAction: '先说重点', reading: { object: { name: '钢笔' }, do: '先写一句结论', avoid: '反复修改' }
  })
  assert.match(plan.title, /通勤方案/)
  assert.match(plan.weatherText, /有雨/)
  assert.ok(plan.items.some(item => item.owned))
  assert.equal(plan.reasons.length, 4)
})
