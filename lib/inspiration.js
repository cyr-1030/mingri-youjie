const GUIDES = require('../data/style-guides.js')
const NOTES = require('../data/inspiration-notes.js')
const { STYLES } = require('./plan.js')

const STYLE_BY_NAME = Object.fromEntries(STYLES.map(style => [style.name, style]))
const STYLE_BY_ID = Object.fromEntries(STYLES.map(style => [style.id, style]))
const NOTE_URL = /^https:\/\/www\.xiaohongshu\.com\/explore\/[0-9a-f]{24}(?:\?.*)?$/i

function suitableNote(notes, styleId, kind) {
  return (notes || []).find(note => note && note.styleId === styleId && note.kind === kind &&
    typeof note.title === 'string' && note.title.trim() &&
    typeof note.author === 'string' && note.author.trim() &&
    typeof note.url === 'string' && NOTE_URL.test(note.url)) || null
}

function recommendInspirations({ styleIds = [], plan, occasion = '日常', notes = NOTES }) {
  if (!plan || !Array.isArray(plan.items) || !plan.items.length) return []
  const primary = STYLE_BY_NAME[plan.tags && plan.tags[0]] || STYLE_BY_ID[styleIds[0]] || STYLES[0]
  const guide = GUIDES[primary.id]
  if (!guide) return []
  const clothing = plan.items.filter(item => ['上装', '下装', '连身款', '套装', '外层', '鞋'].includes(item.label))
  const values = clothing.slice(0, 4).map(item => item.value)
  const weather = plan.weatherText || '天气待确认'
  const reason = `${occasion} · ${weather}；已结合你的衣橱与当前方案。`
  const lookQuery = `${primary.name} ${occasion} ${clothing.slice(0, 2).map(item => item.value).join(' ')} 穿搭`
  const makeupQuery = `${primary.name} ${occasion} ${plan.makeup.split('；')[0].split('、').slice(0, 2).join(' ')} 妆容`
  const cards = [
    {
      id: `${primary.id}-look`, kind: 'look', kindLabel: '穿搭', symbol: '◇', styleName: primary.name,
      title: '用这套清单找穿搭灵感', principle: `${guide.look} ${plan.sceneAdvice || ''}`,
      specific: `这次先搭：${values.join('＋')}。${plan.readingStyling ? `卦意细节：${plan.readingStyling}。` : ''}`, reason,
      searchQuery: lookQuery, source: suitableNote(notes, primary.id, 'look')
    },
    {
      id: `${primary.id}-makeup`, kind: 'makeup', kindLabel: '妆容', symbol: '✦', styleName: primary.name,
      title: '妆容照着这一步做', principle: guide.makeup,
      specific: `${plan.makeup}；发型：${plan.hair}。`, reason: `已按${weather}调整步骤；以舒服和方便补妆为先。`,
      searchQuery: makeupQuery, source: suitableNote(notes, primary.id, 'makeup')
    }
  ]
  const secondary = (plan.tags || []).slice(1).map(name => STYLE_BY_NAME[name]).find(style => style && style.id !== primary.id)
  if (secondary && GUIDES[secondary.id]) {
    const secondaryGuide = GUIDES[secondary.id]
    cards.push({
      id: `${secondary.id}-look`, kind: 'look', kindLabel: '另一种感觉', symbol: '○', styleName: secondary.name,
      title: `给这套加一点${secondary.name}`,
      principle: secondaryGuide.look,
      specific: `保留上方实际清单，先调整搭配比例或细节；${plan.reminder}`,
      reason: '这是风格参考，不会替换已按天气和场合筛选的单品。',
      searchQuery: `${secondary.name} ${occasion} ${clothing.slice(0, 2).map(item => item.value).join(' ')} 穿搭`, source: suitableNote(notes, secondary.id, 'look')
    })
  }
  return cards
}

module.exports = { recommendInspirations, NOTE_URL }
