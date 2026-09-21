const CREATORS = require('../data/verified-creators.js')
const { STYLES } = require('./plan.js')

const STYLE_NAME = Object.fromEntries(STYLES.map(style => [style.id, style.name]))
const OCCASION_STYLES = {
  '日常': ['cleanfit', 'korean', 'soft', 'minimal', 'french'],
  '通勤': ['office', 'minimal', 'cleanfit', 'korean'],
  '约会': ['date', 'soft', 'romantic', 'french', 'korean'],
  '上课': ['cleanfit', 'korean', 'academia', 'sporty'],
  '聚会': ['cool', 'street', 'romantic', 'vintage'],
  '旅行': ['sporty', 'outdoor', 'cleanfit', 'korean', 'french'],
  '居家': ['soft', 'korean', 'cleanfit']
}

function unique(values) {
  return [...new Set((values || []).filter(Boolean))]
}

function recommendCreators({ styleIds = [], occasion = '日常', environment = '', limit = 3,
  creators = CREATORS } = {}) {
  const selected = unique(styleIds)
  const occasionStyles = OCCASION_STYLES[occasion] || OCCASION_STYLES['日常']
  const outdoorStyles = environment.includes('室外') ? ['sporty', 'outdoor', 'street'] : []
  const ranked = (creators || []).map((creator, order) => {
    const creatorStyles = unique(creator.styleIds)
    const selectedMatches = selected.filter(style => creatorStyles.includes(style))
    const occasionMatches = occasionStyles.filter(style => creatorStyles.includes(style))
    const outdoorMatches = outdoorStyles.filter(style => creatorStyles.includes(style))
    let score = 0
    selected.forEach((style, index) => {
      if (creatorStyles.includes(style)) score += [10, 6, 4][index] || 2
    })
    occasionMatches.forEach((style, index) => { score += Math.max(1, 5 - index) })
    score += outdoorMatches.length * 2
    const matched = unique([...selectedMatches, ...occasionMatches, ...outdoorMatches])
    const labels = matched.slice(0, 3).map(style => STYLE_NAME[style]).filter(Boolean)
    const reason = labels.length
      ? `匹配${labels.join('、')}；可作为${occasion}场景的风格方向。`
      : `作为${occasion}场景的补充参考。`
    return {
      ...creator,
      order,
      score,
      selectedMatchCount: selectedMatches.length,
      kindLabel: creator.accountType === 'brand' ? '品牌账号' : '穿搭博主',
      displayTags: unique([...creatorStyles.map(style => STYLE_NAME[style]), ...(creator.styleTags || [])]).slice(0, 4),
      matchReason: reason
    }
  })

  const hasExactStyle = selected.length > 0 && ranked.some(creator => creator.selectedMatchCount > 0)
  const eligible = ranked.filter(creator => creator.score > 0 && (!hasExactStyle || creator.selectedMatchCount > 0))
  eligible.sort((a, b) => b.score - a.score || a.order - b.order || a.name.localeCompare(b.name, 'zh-CN'))
  return eligible.slice(0, Math.max(0, limit))
}

module.exports = { recommendCreators, CREATORS, OCCASION_STYLES }
