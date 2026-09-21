const test = require('node:test')
const assert = require('node:assert/strict')
const {
  canonicalRegion, dayNumber, targetDateFor, beaufortForKmh,
  precipitationProbability, weatherFromDaily, getForecast
} = require('../cloudfunctions/getForecast/weather.js')
const pickerRegions = require('../data/regions.js')
const cloudCatalog = require('../cloudfunctions/getForecast/region-catalog.json')
const coordinates = require('../cloudfunctions/getForecast/coordinates.json')

const SHANGHAI = { provinceCode: '31', code: '3101' }
const NOW = new Date('2026-09-20T12:00:00+08:00')
const ENV = { CAIYUN_API_TOKEN: 'testToken123456' }

test('cloud city whitelist stays aligned with the picker', () => {
  for (const region of pickerRegions) {
    assert.equal(cloudCatalog[region.code].name, region.name)
    assert.deepEqual(cloudCatalog[region.code].cities,
      Object.fromEntries(region.cities.map(city => [city.code, city.name])))
  }
})

test('official city points cover mainland, Hong Kong, Macao and Taiwan without guessing missing cities', () => {
  assert.equal(Object.keys(coordinates).length, 389)
  for (const code of ['1101', '3101', '4401', '4403', 'HK', 'MO', 'TW-01', 'TW-06']) {
    const [lon, lat] = coordinates[code]
    assert.ok(lon > 70 && lon < 140 && lat > 0 && lat < 55)
  }
  for (const code of ['659012', 'TW-02', 'TW-21', 'TW-22', 'OVERSEAS']) {
    assert.equal(coordinates[code], undefined)
  }
})

test('only catalog cities and valid local dates are accepted', () => {
  const region = canonicalRegion(SHANGHAI)
  assert.equal(region.city, '上海市')
  assert.equal(canonicalRegion({ provinceCode: '31', code: '1101' }), null)
  assert.equal(canonicalRegion('上海'), null)
  assert.equal(canonicalRegion({ provinceCode: 'OVERSEAS', code: 'OVERSEAS' }).isOverseas, true)
  assert.equal(dayNumber('2026-02-29'), null)
  assert.equal(targetDateFor(undefined, region, NOW), '2026-09-21')
  assert.equal(targetDateFor('2026-09-23', region, NOW), null)
})

test('daily weather does not invent missing temperatures', () => {
  assert.equal(weatherFromDaily({ status: 'ok', skycon: [{ date: '2026-09-21T00:00+08:00', value: 'CLEAR_DAY' }] },
    '2026-09-21', 'Asia/Shanghai'), null)
})

test('probability and wind conversions match the metric API data', () => {
  assert.equal(precipitationProbability(70), 0.7)
  assert.equal(precipitationProbability(0.7), 0.7)
  assert.equal(beaufortForKmh(30), 5)
  assert.equal(beaufortForKmh(null), null)
})

test('forecast returns real provider fields and attribution for selected date', async () => {
  const calls = []
  const result = await getForecast({ region: SHANGHAI, targetDate: '2026-09-21' }, {
    env: ENV, now: NOW,
    requestJson: async url => {
      calls.push(url)
      return { status: 'ok', result: { daily: {
        status: 'ok',
        temperature: [
          { date: '2026-09-20T00:00+08:00', max: 27, min: 20 },
          { date: '2026-09-21T00:00+08:00', max: 24.3, min: 18.2 }
        ],
        temperature_08h_20h: [{ date: '2026-09-21T00:00+08:00', max: 23.7 }],
        skycon_08h_20h: [{ date: '2026-09-21T00:00+08:00', value: 'LIGHT_RAIN' }],
        precipitation_08h_20h: [{ date: '2026-09-21T00:00+08:00', probability: 64 }],
        humidity: [{ date: '2026-09-21T00:00+08:00', avg: 0.83 }],
        wind_08h_20h: [{ date: '2026-09-21T00:00+08:00', max: { speed: 25 } }]
      } } }
    }
  })
  assert.equal(result.ok, true)
  assert.equal(result.forecast.temp, 24)
  assert.equal(result.forecast.tempMin, 18)
  assert.equal(result.forecast.rain, 'rain')
  assert.equal(result.forecast.rainProbability, 0.64)
  assert.equal(result.forecast.climate, 'humid')
  assert.equal(result.attribution, '数据来自彩云天气')
  assert.equal(result.attributionUrl, 'https://caiyunapp.com/')
  assert.equal(calls.length, 1)
  assert.match(calls[0], /^https:\/\/api\.caiyunapp\.com\/v2\.6\/testToken123456\/121\.472644,31\.231706\/daily\?dailysteps=3/)
})

test('missing credentials, missing date and provider errors stay explicit', async () => {
  const missing = await getForecast({ region: SHANGHAI, targetDate: '2026-09-21' }, { env: {}, now: NOW })
  assert.equal(missing.code, 'NOT_CONFIGURED')
  const invalidDate = await getForecast({ region: SHANGHAI, targetDate: '2026-09-24' }, { env: ENV, now: NOW })
  assert.equal(invalidDate.code, 'INVALID_DATE')
  const unsupported = await getForecast({ region: { provinceCode: 'TW', code: 'TW-21' }, targetDate: '2026-09-21' }, { env: ENV, now: NOW })
  assert.equal(unsupported.code, 'UNSUPPORTED_CITY')
  const overseas = await getForecast({ region: { provinceCode: 'OVERSEAS', code: 'OVERSEAS' } }, { env: ENV, now: NOW })
  assert.equal(overseas.code, 'UNSUPPORTED_REGION')
  const providerError = await getForecast({ region: SHANGHAI, targetDate: '2026-09-21' }, {
    env: ENV, now: NOW, requestJson: async () => { const error = new Error('upstream'); error.statusCode = 429; throw error }
  })
  assert.equal(providerError.code, 'UPSTREAM_RATE_LIMIT')
  assert.equal('forecast' in providerError, false)
})
