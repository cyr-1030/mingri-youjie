const test = require('node:test')
const assert = require('node:assert/strict')
const { starChartForBirth, zodiacPosition } = require('../lib/astrology')

test('已知中国出生时刻生成五颗天体和可绘制的十二星座轮', () => {
  const chart = starChartForBirth({ date: '1996-06-18', time: '10:30', location: { countryCode: 'CN' } })
  assert.equal(chart.status, 'ready')
  assert.equal(chart.utc, '1996-06-18T02:30:00.000Z')
  assert.equal(chart.bodies.length, 5)
  assert.deepEqual(chart.bodies.map(body => body.key), ['sun', 'moon', 'mercury', 'venus', 'mars'])
  assert.equal(chart.sun.sign, '双子')
  assert.equal(chart.moon.sign, '巨蟹')
  assert.equal(chart.sectors.length, 12)
  assert.equal(chart.sectors[11].startAngle, 330)
  assert.equal(chart.ascendant, null)
  assert.equal(chart.houses, null)
  for (const body of chart.bodies) {
    assert.ok(body.longitude >= 0 && body.longitude < 360)
    assert.ok(body.degreeInSign >= 0 && body.degreeInSign < 30)
    assert.equal(body.wheelAngle, body.longitude)
  }
})

test('缺出生时刻或 UTC 时差时不虚构月亮与行星位置', () => {
  const noTime = starChartForBirth({ date: '1996-06-18', time: '', location: { countryCode: 'CN' } })
  assert.equal(noTime.status, 'needs-time')
  assert.deepEqual(noTime.bodies, [])
  const overseas = starChartForBirth({ date: '1996-06-18', time: '10:30', location: { countryCode: 'OVERSEAS' } })
  assert.equal(overseas.status, 'needs-timezone')
  assert.deepEqual(overseas.bodies, [])
  const historical = starChartForBirth({ date: '1988-06-18', time: '10:30', location: { countryCode: 'CN' } })
  assert.equal(historical.status, 'needs-timezone')
  const explicit = starChartForBirth({ date: '1988-06-18', time: '10:30', location: { countryCode: 'CN' }, utcOffsetMinutes: 540 })
  assert.equal(explicit.status, 'ready')
  assert.equal(explicit.utc, '1988-06-18T01:30:00.000Z')
})

test('黄经落点跨越 0 度时仍对应正确星座', () => {
  assert.deepEqual(zodiacPosition(360.5), { longitude: 0.5, signIndex: 0, sign: '白羊', degreeInSign: 0.5, wheelAngle: 0.5 })
  assert.equal(zodiacPosition(-1).sign, '双鱼')
  assert.throws(() => starChartForBirth({ date: '1996-02-30', time: '10:30', location: { countryCode: 'CN' } }), /日期无效/)
})
