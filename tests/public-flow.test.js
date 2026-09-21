const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

function makePage() {
  const saved = {}
  global.wx = {
    getStorageSync: key => saved[key],
    setStorageSync: (key, value) => { saved[key] = value },
    pageScrollTo: () => {}, showToast: () => {}
  }
  global.getApp = () => ({ globalData: { cloudEnv: '', weatherEnabled: false } })
  let definition
  global.Page = value => { definition = value }
  delete require.cache[require.resolve('../pages/public/index.js')]
  require('../pages/public/index.js')
  const page = { ...definition, data: { ...definition.data }, setData(value) { Object.assign(this.data, value) } }
  page.onLoad()
  return page
}

test('微信公开版完成心理选择并生成穿搭', () => {
  const page = makePage()
  page.beginTheme({ currentTarget: { dataset: { id: 'career' } } })
  for (let index = 0; index < 3; index++) {
    page.answer({ currentTarget: { dataset: { index } } })
    page.nextQuestion()
  }
  page.chooseObject({ currentTarget: { dataset: { index: 1 } } })
  assert.equal(page.data.page, 'reading')
  assert.ok(page.data.reading.summary)
  assert.ok(page.data.plan.items.length >= 5)
})

test('星座偏好真实改变穿搭细节并保存', () => {
  const page = makePage()
  page.state.answers = [0, 1, 2]
  page.state.objectIndex = 0
  page.refresh()
  const before = page.data.plan.styling
  page.chooseZodiac({ currentTarget: { dataset: { id: 'libra' } } })
  assert.equal(page.data.zodiacName, '天秤座')
  assert.notEqual(page.data.plan.styling, before)
  assert.match(page.data.plan.styling, /比例|平衡/)
  assert.match(page.data.plan.makeup, /低饱和唇色/)
})

test('公开入口保留答案书，但不展示命理专属功能', () => {
  const app = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'app.json')))
  assert.deepEqual(app.pages, ['pages/public/index'])
  const copy = fs.readFileSync(path.join(__dirname, '..', 'pages/public/index.wxml'), 'utf8')
  assert.match(copy, /答案书/)
  assert.doesNotMatch(copy, /八字|五行|命盘|黄历|占卜|运势/)
})
