// Daily themes are transparent, symbolic prompts for reflection. They are not
// auspiciousness scores, event predictions, or a calculation of 喜用神.
const STEM_ELEMENT = {
  甲: 'wood', 乙: 'wood', 丙: 'fire', 丁: 'fire', 戊: 'earth', 己: 'earth',
  庚: 'metal', 辛: 'metal', 壬: 'water', 癸: 'water'
}
const GENERATES = { wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood' }
const CONTROLS = { wood: 'earth', fire: 'metal', earth: 'water', metal: 'wood', water: 'fire' }
const YANG_STEMS = new Set(['甲', '丙', '戊', '庚', '壬'])
const CLASHES = { 子: '午', 丑: '未', 寅: '申', 卯: '酉', 辰: '戌', 巳: '亥',
  午: '子', 未: '丑', 申: '寅', 酉: '卯', 戌: '辰', 亥: '巳' }

const THEMES = {
  same: {
    label: '同类',
    avoid: '别因为顺手，就把日程排得太满。',
    styling: '优先穿已经搭顺手的组合，减少出门前的临时选择。'
  },
  output: {
    label: '我生',
    avoid: '避免一次说太多，让重点被细节淹没。',
    styling: '领口和轮廓保持利落，把视觉重点留给表达。'
  },
  input: {
    label: '生我',
    avoid: '信息还不齐时，先别急着给出最终答复。',
    styling: '选择舒服、易活动的层次，给日程留一点缓冲。'
  },
  organize: {
    label: '我克',
    avoid: '先别同时展开好几项新计划。',
    styling: '选顺手的包与不妨碍动作的配饰，方便带齐要用的东西。'
  },
  boundary: {
    label: '克我',
    avoid: '不要靠临时加速来弥补过满的安排。',
    styling: '外层选容易增减的款式，鞋包以实用、好行动为先。'
  }
}

// Each pair is [same polarity, opposite polarity]. These are traditional
// Ten Gods names; the accompanying prompts are our own practical copy.
const DAILY_VARIANTS = {
  same: [
    { name: '比肩', title: '沿着熟悉的节奏推进', action: '先独立完成一件熟悉的小事，再接新任务。', styling: '沿用一套穿着顺手的组合。', accessory: '简洁日常耳饰' },
    { name: '劫财', title: '先说清彼此的分工', action: '把需要协作的一件事说清分工，再开始。', styling: '选方便行动与沟通的轻配饰。', accessory: '轻巧腕表' }
  ],
  output: [
    { name: '食神', title: '把想法整理后表达', action: '把最重要的一句话写下来，沟通时先说结论。', styling: '保持清楚的领口与轮廓。', accessory: '小巧几何耳饰' },
    { name: '伤官', title: '给表达留一点余地', action: '先写下核心观点，再选合适时机开口。', styling: '用一处轻巧细节表达个性。', accessory: '轻巧发夹' }
  ],
  input: [
    { name: '偏印', title: '换个角度收集线索', action: '找一条不同来源的信息，再下判断。', styling: '选容易调整的舒适层次。', accessory: '柔软发带' },
    { name: '正印', title: '先吸收，再做决定', action: '先确认一条关键信息，再决定下一步。', styling: '把舒适感放在造型前面。', accessory: '轻巧发夹' }
  ],
  organize: [
    { name: '偏财', title: '先盘点手边的资源', action: '列出已经有的东西，再决定是否需要添置。', styling: '优先用衣橱里的常用配饰。', accessory: '简洁手表' },
    { name: '正财', title: '稳稳收好一件小事', action: '从清单里挑一件可以当天收尾的事。', styling: '保持便于整理的实用细节。', accessory: '素面细链' }
  ],
  boundary: [
    { name: '七杀', title: '给安排留出边界', action: '为最重要的一项安排预留可调整的时间。', styling: '减少容易勾挂的装饰。', accessory: '贴耳耳饰' },
    { name: '正官', title: '先确认规则和时间', action: '核对一项具体要求，再把时间安排稳。', styling: '选择利落且容易增减的细节。', accessory: '素面胸针' }
  ]
}

function relationship(natal, day) {
  if (natal === day) return 'same'
  if (GENERATES[natal] === day) return 'output'
  if (GENERATES[day] === natal) return 'input'
  if (CONTROLS[natal] === day) return 'organize'
  return 'boundary'
}

function dailyFor(chart, almanac) {
  if (!chart || !chart.dayGan || !almanac || !almanac.dayGanZhi) {
    return {
      personalized: false, title: '从此刻关心的事出发', relationLabel: '简版',
      action: '先把抽到的提醒放进真实日程，选一件现在能做的小事。',
      avoid: '不用把象征提示当成必须发生的事。',
      styling: '按天气、场合和已有衣物搭配，以舒服好行动为先。',
      accessory: '简洁日常配饰',
      basis: '尚无可计算的出生资料；暂按互动内容与实际条件给建议。'
    }
  }
  const dayGan = almanac.dayGanZhi[0]
  const dayZhi = almanac.dayGanZhi[1]
  const natal = STEM_ELEMENT[chart.dayGan]
  const day = STEM_ELEMENT[dayGan]
  if (!natal || !day) return dailyFor(null, null)
  const key = relationship(natal, day)
  const theme = THEMES[key]
  const samePolarity = YANG_STEMS.has(chart.dayGan) === YANG_STEMS.has(dayGan)
  const variant = DAILY_VARIANTS[key][samePolarity ? 0 : 1]
  const natalDayZhi = chart.pillars && chart.pillars[2] && chart.pillars[2][1]
  const clash = !!(natalDayZhi && CLASHES[natalDayZhi] === dayZhi)
  const note = clash ? '；日支形成相冲，给安排多留一点余量' : ''
  return {
    personalized: true, relationLabel: variant.name, title: variant.title,
    action: clash ? `${variant.action}把两段安排之间留出一点空档。` : variant.action,
    avoid: theme.avoid,
    styling: `${theme.styling}${variant.styling}${clash ? '尽量选容易增减的外层。' : ''}`,
    accessory: variant.accessory,
    basis: `你的日主${chart.dayGan}与${almanac.dayGanZhi}日的天干生克及阴阳关系为「${theme.label} · ${variant.name}」${note}。${chart.hasTime ? '依据四柱' : '未填时刻，依据前三柱'}；只作传统符号下的日常灵感。`
  }
}

module.exports = { dailyFor }
