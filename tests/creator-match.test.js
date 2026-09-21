const test = require('node:test')
const assert = require('node:assert/strict')
const { recommendCreators, CREATORS } = require('../lib/creator-match.js')

test('运行时只载入 16 个已核对且不重复的账号', () => {
  assert.equal(CREATORS.length, 16)
  assert.equal(new Set(CREATORS.map(creator => creator.id)).size, 16)
  for (const creator of CREATORS) {
    assert.match(creator.profileUrl, new RegExp(`/user/profile/${creator.id}$`))
    assert.ok(creator.styleIds.length)
  }
})

test('场景和风格变化会改变匹配结果', () => {
  const commute = recommendCreators({ styleIds: ['minimal'], occasion: '通勤' })
  const date = recommendCreators({ styleIds: ['soft', 'romantic'], occasion: '约会' })
  const sporty = recommendCreators({ styleIds: ['sporty'], occasion: '旅行', environment: '室外为主' })
  assert.equal(commute.length, 3)
  assert.equal(date[0].name, '你是一个果子')
  assert.ok(sporty.some(creator => creator.name === '叫我NAN朋友！'))
  assert.notDeepEqual(commute.map(x => x.id), date.map(x => x.id))
  assert.notDeepEqual(date.map(x => x.id), sporty.map(x => x.id))
})

test('新中式只返回已核对的新中式账号', () => {
  const matches = recommendCreators({ styleIds: ['newchinese'], occasion: '日常' })
  assert.deepEqual(matches.map(x => x.name), ['CERFMIA小鹿弥雅', '中国丝绸｜隆鹊'])
  assert.ok(matches.every(x => x.kindLabel === '品牌账号'))
})
