// Tropical zodiac positions for a birth moment. Astronomy Engine is vendored
// because WeChat Mini Programs cannot reliably require a raw npm package.
// These are geocentric ecliptic-of-date longitudes, not houses or an ascendant.
const Astronomy = require('./astronomy.js')

const SIGNS = [
  '白羊', '金牛', '双子', '巨蟹', '狮子', '处女',
  '天秤', '天蝎', '射手', '摩羯', '水瓶', '双鱼'
]
const BODIES = [
  ['sun', '太阳', Astronomy.Body.Sun],
  ['moon', '月亮', Astronomy.Body.Moon],
  ['mercury', '水星', Astronomy.Body.Mercury],
  ['venus', '金星', Astronomy.Body.Venus],
  ['mars', '火星', Astronomy.Body.Mars]
]
const CHINA_CODES = ['CN', 'HK', 'MO', 'TW']

function birthParts(date, time) {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date || '')
  if (!d) throw new Error('请选择有效的公历出生日期')
  const year = Number(d[1]), month = Number(d[2]), day = Number(d[3])
  if (year < 1900 || year > 2100) throw new Error('目前支持 1900—2100 年的出生日期')
  const checked = new Date(Date.UTC(year, month - 1, day))
  if (checked.getUTCFullYear() !== year || checked.getUTCMonth() + 1 !== month || checked.getUTCDate() !== day) {
    throw new Error('出生日期无效')
  }
  if (time === '' || time == null) return { year, month, day, hasTime: false }
  const t = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time)
  if (!t) throw new Error('出生时刻格式应为 HH:mm')
  return { year, month, day, hour: Number(t[1]), minute: Number(t[2]), hasTime: true }
}

function offsetForBirth(birth, year) {
  // A caller can supply a researched historical offset, including overseas or
  // a birth recorded in Xinjiang local time. The app must not infer that offset.
  if (typeof birth.utcOffsetMinutes === 'number') {
    const value = birth.utcOffsetMinutes
    if (!Number.isInteger(value) || value < -720 || value > 840) throw new Error('出生地 UTC 时差无效')
    return { minutes: value, source: 'provided' }
  }
  const code = birth.location && birth.location.countryCode
  if (CHINA_CODES.indexOf(code) >= 0 && year >= 1992) {
    return { minutes: 480, source: 'china-standard-time' }
  }
  return null
}

function zodiacPosition(longitude) {
  const normalized = ((longitude % 360) + 360) % 360
  const signIndex = Math.floor(normalized / 30)
  return {
    longitude: Math.round(normalized * 1000) / 1000,
    signIndex,
    sign: SIGNS[signIndex],
    degreeInSign: Math.round((normalized - signIndex * 30) * 1000) / 1000,
    // For a clockwise UI wheel whose 0° is at the top. A CSS/cartesian
    // point uses angle = wheelAngle - 90° from the positive x-axis.
    wheelAngle: Math.round(normalized * 1000) / 1000
  }
}

function starChartForBirth(birth) {
  if (!birth || typeof birth !== 'object') throw new Error('请填写出生资料')
  const p = birthParts(birth.date, birth.time)
  const base = {
    system: 'tropical-geocentric',
    bodies: [],
    sectors: SIGNS.map((sign, index) => ({ sign, signIndex: index, startAngle: index * 30 })),
    ascendant: null,
    houses: null,
    note: '行星位置按地心视黄经与回归黄道十二星座计算；没有出生地经纬度，不计算上升点或十二宫位。星座解读仅作自我探索参考。',
    source: 'Astronomy Engine 2.1.19 (MIT)'
  }
  if (!p.hasTime) {
    return { ...base, status: 'needs-time', message: '补充出生时刻后，才能计算准确的月亮与行星位置。' }
  }
  const offset = offsetForBirth(birth, p.year)
  if (!offset) {
    return { ...base, status: 'needs-timezone', message: '需要出生地对应的历史 UTC 时差；海外和 1992 年前的出生记录暂不自动换算。' }
  }
  const utc = new Date(Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - offset.minutes * 60 * 1000)
  const bodies = BODIES.map(([key, name, body]) => {
    // Ecliptic converts a geocentric EQJ vector to the true ecliptic of date.
    const longitude = Astronomy.Ecliptic(Astronomy.GeoVector(body, utc, true)).elon
    return { key, name, ...zodiacPosition(longitude) }
  })
  return {
    ...base, status: 'ready', utc: utc.toISOString(), utcOffsetMinutes: offset.minutes,
    offsetSource: offset.source, bodies,
    sun: bodies[0], moon: bodies[1]
  }
}

module.exports = { starChartForBirth, zodiacPosition, SIGNS }
