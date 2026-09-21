const { Solar } = require('./lunar.js')
const { ELEMENT_COLORS } = require('./elements.js')

const GAN_ELEMENT = {
  甲: 'wood', 乙: 'wood', 丙: 'fire', 丁: 'fire',
  戊: 'earth', 己: 'earth', 庚: 'metal', 辛: 'metal',
  壬: 'water', 癸: 'water'
}
const ZHI_ELEMENT = {
  寅: 'wood', 卯: 'wood', 巳: 'fire', 午: 'fire',
  辰: 'earth', 戌: 'earth', 丑: 'earth', 未: 'earth',
  申: 'metal', 酉: 'metal', 亥: 'water', 子: 'water'
}
const ELEMENT_LABEL = { wood: '木', fire: '火', earth: '土', metal: '金', water: '水' }
const ELEMENT_COLOR = Object.keys(ELEMENT_LABEL).reduce((colors, id) => {
  colors[id] = ELEMENT_COLORS[id].name
  return colors
}, {})

function parts(date) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date || '')
  if (!m) throw new Error('请选择有效的公历出生日期')
  const year = Number(m[1]), month = Number(m[2]), day = Number(m[3])
  const d = new Date(year, month - 1, day)
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) throw new Error('出生日期无效')
  return { year, month, day }
}

function chartForBirth(birth) {
  const { year, month, day } = parts(birth.date)
  if (year < 1900 || year > 2100) throw new Error('目前支持 1900—2100 年的出生日期')
  if (birth.date > localDate(0)) throw new Error('出生日期不能晚于今天')
  const hasTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(birth.time || '')
  const hour = hasTime ? Number(birth.time.slice(0, 2)) : 12
  const minute = hasTime ? Number(birth.time.slice(3, 5)) : 0
  const eight = Solar.fromYmdHms(year, month, day, hour, minute, 0).getLunar().getEightChar()
  const pillars = [eight.getYear(), eight.getMonth(), eight.getDay()]
  if (hasTime) pillars.push(eight.getTime())
  const element = GAN_ELEMENT[eight.getDayGan()]
  if (!element) throw new Error('日主五行计算失败')
  const counts = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 }
  pillars.forEach(p => {
    counts[GAN_ELEMENT[p[0]]]++
    counts[ZHI_ELEMENT[p[1]]]++
  })
  return {
    pillars, hasTime, dayGan: eight.getDayGan(), element,
    elementLabel: ELEMENT_LABEL[element], colorName: ELEMENT_COLOR[element], counts,
    note: `按日柱天干（日主）应用界面视觉色调「${ELEMENT_COLOR[element]}」；传统五行正色中，${ELEMENT_LABEL[element]}对应「${ELEMENT_COLORS[element].traditionalName}」。穿搭不按日主固定配色。分布只统计天干和地支本气，不等同于喜用神或开运判断。四柱使用北京时间与历法库节气规则。`
  }
}

function almanacFor(date) {
  const { year, month, day } = parts(date)
  const lunar = Solar.fromYmd(year, month, day).getLunar()
  return {
    date, lunar: lunar.toString(), dayGanZhi: lunar.getDayInGanZhi(),
    yi: lunar.getDayYi().slice(0, 4), ji: lunar.getDayJi().slice(0, 4),
    source: 'lunar-javascript 1.7.7 · 传统黄历参考'
  }
}

function localDate(offset) {
  const d = new Date(Date.now() + 8 * 60 * 60 * 1000)
  d.setUTCDate(d.getUTCDate() + (offset || 0))
  const pad = n => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

function ageBand(date) {
  if (!date) return ''
  const { year, month, day } = parts(date)
  const now = parts(localDate(0))
  let age = now.year - year
  if (now.month < month || (now.month === month && now.day < day)) age--
  if (age < 18) return '18岁以下'
  if (age < 25) return '18–24岁'
  if (age < 35) return '25–34岁'
  if (age < 45) return '35–44岁'
  return '45岁以上'
}

module.exports = { chartForBirth, almanacFor, localDate, ageBand, ELEMENT_LABEL, ELEMENT_COLOR }
