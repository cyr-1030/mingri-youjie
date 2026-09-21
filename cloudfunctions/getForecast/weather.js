const https = require('https')
const zlib = require('zlib')
const catalog = require('./region-catalog.json')
const coordinates = require('./coordinates.json')

const SOURCE = '彩云天气'
const SOURCE_LINE = '数据来自彩云天气'
const SOURCE_URL = 'https://caiyunapp.com/'
const MAX_RESPONSE_BYTES = 512 * 1024
const SKYCON_LABEL = {
  CLEAR_DAY: '晴', CLEAR_NIGHT: '晴',
  PARTLY_CLOUDY_DAY: '多云', PARTLY_CLOUDY_NIGHT: '多云', CLOUDY: '阴',
  LIGHT_HAZE: '轻度雾霾', MODERATE_HAZE: '中度雾霾', HEAVY_HAZE: '重度雾霾',
  LIGHT_RAIN: '小雨', MODERATE_RAIN: '中雨', HEAVY_RAIN: '大雨', STORM_RAIN: '暴雨',
  LIGHT_SNOW: '小雪', MODERATE_SNOW: '中雪', HEAVY_SNOW: '大雪', STORM_SNOW: '暴雪',
  FOG: '雾', DUST: '浮尘', SAND: '沙尘', WIND: '大风'
}
const BEAUFORT_KMH_START = [1, 6, 12, 20, 29, 39, 50, 62, 75, 89, 103, 118, 134, 150, 167, 184, 202]

function fail(code, error) { return { ok: false, code, error } }

function canonicalRegion(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null
  const provinceCode = String(input.provinceCode || '')
  const code = String(input.code || '')
  const region = catalog[provinceCode]
  if (!region || !Object.prototype.hasOwnProperty.call(region.cities, code)) return null
  if (region.countryCode === 'OVERSEAS') return { isOverseas: true }
  const city = region.cities[code]
  return {
    provinceCode, code, province: region.name, city,
    countryCode: region.countryCode, timeZone: region.timeZone,
    displayName: region.name === city ? city : `${region.name} · ${city}`
  }
}

function localDateString(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(date)
  const field = type => parts.find(part => part.type === type).value
  return `${field('year')}-${field('month')}-${field('day')}`
}

function dayNumber(text) {
  if (typeof text !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(text)) return null
  const [year, month, day] = text.split('-').map(Number)
  const ms = Date.UTC(year, month - 1, day)
  if (!Number.isFinite(ms) || new Date(ms).toISOString().slice(0, 10) !== text) return null
  return ms / 86400000
}

function targetDateFor(input, region, now) {
  const today = localDateString(now, region.timeZone)
  const base = dayNumber(today)
  const targetDate = input == null || input === ''
    ? new Date((base + 1) * 86400000).toISOString().slice(0, 10)
    : input
  const target = dayNumber(targetDate)
  return target != null && target >= base && target <= base + 2 ? targetDate : null
}

function numericValue(value) {
  return value == null || value === '' ? null : Number.isFinite(Number(value)) ? Number(value) : null
}

function datedEntry(items, targetDate, timeZone) {
  if (!Array.isArray(items)) return null
  return items.find(item => {
    const date = item && new Date(item.date)
    return date && Number.isFinite(date.getTime()) && localDateString(date, timeZone) === targetDate
  }) || null
}

function beaufortForKmh(speed) {
  if (speed == null || speed < 0) return null
  let scale = 0
  for (const threshold of BEAUFORT_KMH_START) {
    if (speed < threshold) break
    scale++
  }
  return scale
}

function precipitationProbability(value) {
  const number = numericValue(value)
  if (number == null || number < 0 || number > 100) return null
  return number > 1 ? number / 100 : number
}

function weatherFromDaily(daily, targetDate, timeZone) {
  if (!daily || daily.status !== 'ok') return null
  const temperature = datedEntry(daily.temperature, targetDate, timeZone)
  const daytimeTemperature = datedEntry(daily.temperature_08h_20h, targetDate, timeZone)
  const condition = datedEntry(daily.skycon_08h_20h, targetDate, timeZone)
    || datedEntry(daily.skycon, targetDate, timeZone)
  const precipitation = datedEntry(daily.precipitation_08h_20h, targetDate, timeZone)
    || datedEntry(daily.precipitation, targetDate, timeZone)
  const humidityEntry = datedEntry(daily.humidity, targetDate, timeZone)
  const windEntry = datedEntry(daily.wind_08h_20h, targetDate, timeZone)
    || datedEntry(daily.wind, targetDate, timeZone)
  const high = numericValue(temperature && temperature.max)
  const low = numericValue(temperature && temperature.min)
  const dayHigh = numericValue(daytimeTemperature && daytimeTemperature.max) ?? high
  if (high == null || low == null || dayHigh == null) return null

  const skycon = String(condition && condition.value || '')
  const probability = precipitationProbability(precipitation && precipitation.probability)
  const humidity = numericValue(humidityEntry && humidityEntry.avg)
  const windSpeedKmh = numericValue(windEntry && windEntry.max && windEntry.max.speed)
  const windScale = beaufortForKmh(windSpeedKmh)
  const precipitationType = skycon.includes('SNOW') ? 'snow'
    : skycon.includes('RAIN') ? 'rain' : skycon ? 'none' : 'unknown'
  const rain = precipitationType === 'rain' || precipitationType === 'snow' || probability != null && probability >= 0.6
    ? 'rain' : precipitationType === 'none' ? 'none' : 'unknown'
  const climate = windScale != null && windScale >= 5 || skycon === 'WIND' ? 'windy'
    : humidity != null && humidity >= 0.75 ? 'humid'
      : humidity != null && humidity <= 0.35 ? 'dry'
        : windScale == null && humidity == null ? 'unknown' : 'normal'
  return {
    date: targetDate, temp: Math.round(dayHigh), tempMin: Math.round(low), tempMax: Math.round(high),
    description: SKYCON_LABEL[skycon] || '天气现象待确认', conditionCode: skycon,
    rain, precipitationType, rainProbability: probability,
    humidity: humidity != null && humidity >= 0 && humidity <= 1 ? humidity : null,
    windScale, windSpeedKmh, climate
  }
}

function requestJson(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, { headers: { 'Accept-Encoding': 'gzip' }, timeout: 8000 }, response => {
      const chunks = []
      let bytes = 0
      response.on('data', chunk => {
        bytes += chunk.length
        if (bytes > MAX_RESPONSE_BYTES) request.destroy(new Error('RESPONSE_TOO_LARGE'))
        else chunks.push(chunk)
      })
      response.on('end', () => {
        if (response.statusCode !== 200) {
          const error = new Error('CAIYUN_HTTP_ERROR')
          error.statusCode = response.statusCode
          reject(error)
          return
        }
        try {
          const buffer = Buffer.concat(chunks)
          const content = response.headers['content-encoding'] === 'gzip' ? zlib.gunzipSync(buffer) : buffer
          if (content.length > 1024 * 1024) throw new Error('RESPONSE_TOO_LARGE')
          resolve(JSON.parse(content.toString('utf8')))
        } catch (error) { reject(error) }
      })
      response.on('error', reject)
    })
    request.on('timeout', () => request.destroy(new Error('REQUEST_TIMEOUT')))
    request.on('error', reject)
  })
}

async function getForecast(event, options = {}) {
  const region = canonicalRegion(event.region)
  if (!region) return fail('INVALID_REGION', '请从城市列表中选择当前城市。')
  if (region.isOverseas) return fail('UNSUPPORTED_REGION', '海外城市暂未细分，请手动填写天气。')
  const now = options.now || new Date()
  const targetDate = targetDateFor(event.targetDate, region, now)
  if (!targetDate) return fail('INVALID_DATE', '只能查询当地今天至后天的预报。')
  const point = coordinates[region.code]
  if (!Array.isArray(point) || point.length !== 2) {
    return fail('UNSUPPORTED_CITY', '该城市暂无可核验的预报位置，请手动填写天气。')
  }
  const env = options.env || process.env
  const token = String(env.CAIYUN_API_TOKEN || '').trim()
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(token)) {
    return fail('NOT_CONFIGURED', '天气服务尚未配置，请先完成云端凭据设置。')
  }
  const url = `https://api.caiyunapp.com/v2.6/${token}/${point[0]},${point[1]}/daily?dailysteps=3&lang=zh_CN&unit=metric`
  try {
    const response = await (options.requestJson || requestJson)(url)
    if (!response || response.status !== 'ok' || !response.result || !response.result.daily) {
      return fail('UPSTREAM_UNAVAILABLE', '天气预报暂不可用，请稍后重试。')
    }
    const forecast = weatherFromDaily(response.result.daily, targetDate, region.timeZone)
    if (!forecast) return fail('FORECAST_NOT_FOUND', '天气服务未返回所选日期的预报。')
    return {
      ok: true, source: SOURCE, attribution: SOURCE_LINE, attributionUrl: SOURCE_URL,
      attributions: [],
      location: region, forecast, fetchedAt: now.toISOString()
    }
  } catch (error) {
    const code = [400, 401, 403].includes(error.statusCode) ? 'UPSTREAM_AUTH'
      : error.statusCode === 429 ? 'UPSTREAM_RATE_LIMIT' : 'UPSTREAM_UNAVAILABLE'
    // v2.6 token sits in the URL; never log the request URL or raw error body.
    console.error('getForecast Caiyun request failed', { statusCode: error.statusCode || null })
    return fail(code, code === 'UPSTREAM_AUTH' ? '天气服务鉴权失败，请检查云端凭据。'
      : code === 'UPSTREAM_RATE_LIMIT' ? '天气查询次数暂时受限，请稍后重试。'
        : '天气服务暂不可用，请稍后重试。')
  }
}

module.exports = {
  canonicalRegion, localDateString, dayNumber, targetDateFor, datedEntry,
  beaufortForKmh, precipitationProbability, weatherFromDaily, getForecast
}
