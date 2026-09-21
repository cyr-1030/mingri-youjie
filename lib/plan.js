const { roleForCategory } = require('./wardrobe.js')
const STYLE_DIRECTION = require('../data/style-direction.js')
const { sceneDirection } = require('../data/scene-direction.js')
const READING_VISUAL = require('../data/reading-visual.js')

const STYLES = [
  { id: 'minimal', name: '极简通勤', top: '米白挺括衬衫', bottom: '深灰直筒西裤', shoes: '黑色乐福鞋', bag: '结构感肩包', makeup: '轻薄底妆、自然眉、豆沙唇', hair: '低马尾', mood: '清爽克制，线条利落' },
  { id: 'soft', name: '温柔轻熟', top: '奶油色细针织', bottom: '垂感过膝半裙', shoes: '浅棕平底鞋', bag: '小号腋下包', makeup: '透亮底妆、杏色腮红、柔雾唇', hair: '低发髻', mood: '柔和轻盈，层次细腻' },
  { id: 'cool', name: '甜酷个性', top: '短款深色外套', bottom: '高腰直筒裤', shoes: '厚底便鞋', bag: '黑色小斜挎包', makeup: '干净底妆、细眼线、低饱和唇', hair: '半扎发', mood: '利落有锋芒，保留甜感' },
  { id: 'french', name: '法式松弛', top: '条纹针织上衣', bottom: '复古蓝直筒牛仔裤', shoes: '玛丽珍鞋', bag: '棕色皮质肩包', makeup: '透薄底妆、微红唇色', hair: '自然微卷', mood: '随性、有旧电影质感' },
  { id: 'academia', name: '复古学院', top: '衬衫叠穿针织背心', bottom: '深棕百褶半裙', shoes: '复古乐福鞋', bag: '皮质书包', makeup: '雾面底妆、棕调眼影', hair: '低扎发', mood: '书卷气和清晰层次' },
  { id: 'outdoor', name: '城市户外', top: '轻量功能夹克', bottom: '宽松速干长裤', shoes: '防滑运动鞋', bag: '轻便斜挎包', makeup: '防晒、自然眉、有色润唇膏', hair: '利落扎发', mood: '轻便、防护、好活动' },
  { id: 'sporty', name: '运动休闲', top: '宽松纯色卫衣', bottom: '运动直筒裤', shoes: '缓震运动鞋', bag: '帆布托特包', makeup: '防晒、润色唇膏', hair: '高马尾', mood: '舒适明快，便于行走' },
  { id: 'cleanfit', name: '清爽 Clean Fit', top: '合身白色棉质上衣', bottom: '浅卡其直筒裤', shoes: '干净的白色板鞋', bag: '简洁托特包', makeup: '清透底妆、淡色腮红', hair: '顺直发', mood: '干净留白，精简配色' },
  { id: 'newchinese', name: '新中式', top: '盘扣或立领上衣', bottom: '垂感纯色长裙', shoes: '素色平底鞋', bag: '布面手提包', makeup: '轻透底妆、柔和眉眼、赤陶唇', hair: '低盘发', mood: '现代轮廓与东方细节' },
  { id: 'korean', name: '韩系日常', top: '宽松短开衫', bottom: '高腰长裙', shoes: '浅色运动鞋', bag: '小号帆布包', makeup: '水润底妆、自然卧蚕、果色唇', hair: '自然披发', mood: '轻盈、柔软、有呼吸感' },
  { id: 'vintage', name: '复古港风', top: '有领衬衫', bottom: '深色高腰长裤', shoes: '方头皮鞋', bag: '复古皮包', makeup: '柔雾底妆、利落眉、砖红唇', hair: '蓬松卷发', mood: '浓郁色彩与复古轮廓' },
  { id: 'office', name: '正式职场', top: '挺括西装外套与内搭', bottom: '同色直筒西裤', shoes: '低跟包头鞋', bag: '可装文件的手提包', makeup: '均匀底妆、清晰眉形、裸色唇', hair: '低发髻', mood: '可靠、专业、细节克制' },
  { id: 'date', name: '约会氛围', top: '柔软针织上衣', bottom: '有垂感的长裙', shoes: '舒适低跟鞋', bag: '小巧肩包', makeup: '细闪眼影、柔和腮红、润泽唇', hair: '自然卷发', mood: '亲近柔和，避免过度用力' },
  { id: 'street', name: '街头中性', top: '宽肩廓形衬衫', bottom: '宽松工装裤', shoes: '耐走的板鞋', bag: '尼龙斜挎包', makeup: '哑光底妆、清晰眉形', hair: '短发或束发', mood: '宽松有型，重视实穿' },
  { id: 'romantic', name: '轻浪漫', top: '有细节的浅色衬衫', bottom: '飘逸长裙', shoes: '柔软芭蕾平底鞋', bag: '小号编织包', makeup: '水光感底妆、粉杏腮红、蜜桃唇', hair: '松散编发', mood: '轻柔有光，细节克制' }
]

const THEME_FOCUS = {
  career: '线条清楚，方便表达和行动', love: '柔和亲近，同时保留自己的边界',
  money: '优先耐穿与重复搭配，不靠购买制造新鲜感', study: '适合久坐与移动，减少不必要的整理',
  social: '留一处容易被记住的细节', wellbeing: '舒适、宽松、可呼吸',
  travel: '耐走、好收纳、容易应对变化', family: '亲切自然，不用过度打扮',
  growth: '在熟悉的组合里尝试一处新细节'
}

const WARDROBE_GAP_META = {
  '上装': { min: 120, max: 220, priority: 1 },
  '下装': { min: 180, max: 320, priority: 2 },
  '鞋履': { min: 250, max: 450, priority: 3 },
  '外套': { min: 350, max: 700, priority: 4 },
  '包袋': { min: 180, max: 380, priority: 5 },
  '配饰': { min: 50, max: 150, priority: 6 }
}

const GARMENT_CUES = /衬衫|针织|开衫|卫衣|西装|风衣|半裙|长裙|百褶|直筒|阔腿|牛仔|西裤|短靴|乐福|玛丽珍|平底|低跟|皮质|帆布|肩包|斜挎|珍珠|耳钉/g
const COLOR_CUES = [
  /奶油|米白|乳白|燕麦|象牙|白色|白衬衫/g,
  /烟灰|炭灰|灰白|深灰|灰色|灰棕/g,
  /深咖|奶咖|暖棕|巧克力|烟棕|褐色|棕色|卡其|驼色/g,
  /深靛|牛仔蓝|蓝色|藏蓝/g,
  /烟粉|灰粉|粉色/g,
  /橄榄|墨绿|绿色/g,
  /黑色|纯黑/g
]

function garmentScore(name, target, palette) {
  const expected = new Set(String(target || '').match(GARMENT_CUES) || [])
  const actual = new Set(String(name || '').match(GARMENT_CUES) || [])
  let score = 0
  for (const cue of actual) if (expected.has(cue)) score += 3
  for (const color of COLOR_CUES) {
    color.lastIndex = 0
    const inItem = color.test(name)
    color.lastIndex = 0
    if (inItem && color.test(palette)) score += 2
  }
  return score
}

function ownedFor(wardrobe, category, suitable, target = '', palette = '') {
  // Ignore legacy demo entries that may still exist in an older local cache.
  const candidates = (wardrobe || []).filter(x => x && !x.sample && roleForCategory(x.category) === category &&
    typeof x.name === 'string' && x.name.trim() && suitable(x.name.trim(), x.category))
  return candidates.reduce((best, item) =>
    !best || garmentScore(item.name, target, palette) > garmentScore(best.name, target, palette) ? item : best, null)
}

function suitableFor(name, category, conditions, specificCategory = '') {
  const { cold, hot, rainy, windy, outdoor, occasion } = conditions
  const description = `${specificCategory} ${name}`
  if (hot && ['上装', '下装', 'onepiece', '外套'].includes(category) && /羽绒|羊毛|毛呢|厚毛衣|加绒|棉服|抓绒/.test(description)) return false
  if (cold && category === '上装' && /短袖|背心|吊带|薄纱|无袖/.test(description)) return false
  if (cold && category === '下装' && /短裤|薄纱|超短/.test(description)) return false
  if (cold && category === '下装' && /裙/.test(description) && !/加绒|保暖|厚|羊毛/.test(description)) return false
  if (cold && category === 'onepiece' && !/保暖|加绒|厚|针织|羊毛|长袖/.test(description)) return false
  if (cold && category === '外套' && !/羽绒|棉服|厚外套|保暖|羊毛|毛呢|抓绒|加绒|冲锋衣/.test(description)) return false
  if (rainy && category === '鞋履') {
    if (/凉鞋|拖鞋|露趾|细跟|麂皮|帆布/.test(description)) return false
    if (outdoor && !/防水|防滑|雨靴|胶靴/.test(description)) return false
  }
  if (rainy && outdoor && category === '外套' && !/防水|雨衣|冲锋衣/.test(description)) return false
  if (windy && outdoor && category === '外套' && !/防风|冲锋衣|硬壳/.test(description)) return false
  if (occasion === '通勤' && ['上装', '下装', 'onepiece'].includes(category) && /睡衣|露脐|破洞|超短/.test(description)) return false
  if (occasion === '旅行' && category === '鞋履' && /高跟|细跟|拖鞋|露趾|麂皮/.test(description)) return false
  if (occasion === '上课' && category === '鞋履' && /高跟|细跟|拖鞋/.test(description)) return false
  if (occasion === '居家' && category === '鞋履' && /高跟|细跟/.test(description)) return false
  return true
}

function itemFor(wardrobe, category, fallback, conditions, reason, palette = '') {
  const owned = ownedFor(wardrobe, category, (value, specificCategory) => suitableFor(value, category, conditions, specificCategory), fallback, palette)
  const name = owned ? owned.name.trim() : ''
  return { label: category === '外套' ? '外层' : category === '鞋履' ? '鞋' : category === '包袋' ? '包' : category,
    value: name || fallback, owned: !!name, photo: owned && typeof owned.photo === 'string' ? owned.photo : '',
    placeholder: !name,
    reason: name ? `衣橱已有；已按${reason}筛选` : `按${reason}提供的参考单品，尚未在衣橱中确认` }
}

function numberOrNull(value) {
  if (value == null || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function accessoryFor(style, direction, daily) {
  if (!daily || !daily.accessory) return direction.accessory
  const coolTone = ['cool', 'street', 'outdoor', 'sporty'].includes(style.id)
  const metal = coolTone ? '银色' : '细金'
  if (/腕表|手表/.test(daily.accessory)) return coolTone ? '深灰细表盘腕表' : '深咖细表盘皮带腕表'
  if (/发夹/.test(daily.accessory)) return coolTone ? '深灰小号发夹' : '奶咖小号发夹'
  if (/发带/.test(daily.accessory)) return coolTone ? '深灰细发带' : '奶油白细发带'
  if (/项链|细链/.test(daily.accessory)) return `${metal}素面细链`
  if (/胸针/.test(daily.accessory)) return `${metal}小号胸针`
  return direction.accessory
}

function buildWardrobeGaps(input = {}) {
  const style = (input.styles || []).map(id => STYLES.find(item => item.id === id)).find(Boolean) || STYLES[0]
  const ownedRoles = new Set((input.wardrobe || []).filter(item => item && !item.sample && item.name && item.name.trim())
    .map(item => roleForCategory(item.category)))
  const candidates = [
    { role: '上装', name: style.top }, { role: '下装', name: style.bottom },
    { role: '鞋履', name: style.shoes }, { role: '外套', name: `${style.name}常用外层` },
    { role: '包袋', name: style.bag }, { role: '配饰', name: '小体量日常配饰' }
  ]
  const limit = { '200 元内': 200, '500 元内': 500, '1000 元内': 1000 }[input.budget] || Infinity
  return candidates.filter(item => !ownedRoles.has(item.role) && WARDROBE_GAP_META[item.role].min <= limit)
    .sort((a, b) => WARDROBE_GAP_META[a.role].priority - WARDROBE_GAP_META[b.role].priority)
    .slice(0, 3)
    .map((item, index) => {
      const meta = WARDROBE_GAP_META[item.role]
      return {
        id: `gap-${item.role}`, category: item.role, name: item.name,
        price: `¥${meta.min}–${Math.min(meta.max, limit)}`,
        searchQuery: `${style.name} ${item.name}`,
        reason: index === 0 ? `衣橱尚未录入合适的${item.role}，它是当前最值得长期补齐的基础位置。`
          : `衣橱尚未录入合适的${item.role}，可在以后有明确购物计划时再补充。`
      }
    })
}

function buildPlan(input) {
  const styles = (input.styles || []).map(id => STYLES.find(x => x.id === id)).filter(Boolean)
  const style = styles[0] || STYLES[0]
  const secondary = styles[1]
  const { direction, scene } = sceneDirection(style.id, STYLE_DIRECTION[style.id], input.occasion)
  const weather = input.weather || {}
  const temp = numberOrNull(weather.temp)
  const tempMin = numberOrNull(weather.tempMin)
  const tempMax = numberOrNull(weather.tempMax)
  const low = tempMin == null ? (temp == null ? tempMax : temp) : tempMin
  const high = tempMax == null ? (temp == null ? tempMin : temp) : tempMax
  const cold = low != null && low <= 12
  const hot = high != null && high >= 28
  const wideRange = low != null && high != null && high - low >= 10
  const rainy = weather.rain === 'rain'
  const climate = weather.climate || 'normal'
  const outdoor = input.environment === '户外较多'
  const windy = climate === 'windy'
  const own = input.wardrobe || []
  const conditions = { cold, hot, rainy, windy, outdoor, occasion: input.occasion }
  const reason = `${rainy ? '雨天、' : ''}${cold ? '低温、' : hot ? '高温、' : ''}${outdoor ? '户外、' : ''}${input.occasion || '日常'}条件`
  const fallbackTop = hot ? direction.hotTop || direction.top : cold ? direction.coldTop || '细密保暖打底上衣' : direction.top
  const fallbackBottom = cold ? direction.coldBottom || '保暖高腰直筒长裤'
    : hot ? direction.hotBottom || direction.bottom : direction.bottom
  const fallbackOuter = cold && rainy && outdoor ? '防水保暖短外套'
    : cold ? direction.coldOuter || '深咖保暖短大衣'
      : rainy && outdoor ? '轻量防雨短外套'
        : windy && outdoor ? '轻量防风短外套'
          : hot ? direction.hotOuter || '空调房备用的薄针织开衫' : direction.outer
  const fallbackShoes = rainy && outdoor ? '深咖防滑防水包头鞋' : rainy ? '深咖防滑包头鞋'
    : outdoor ? '轻巧耐走的平底鞋' : direction.shoes
  const topItem = itemFor(own, '上装', fallbackTop, conditions, reason, direction.palette)
  const bottomItem = itemFor(own, '下装', fallbackBottom, conditions, reason, direction.palette)
  const onePiece = ownedFor(own, 'onepiece', (value, specificCategory) => suitableFor(value, 'onepiece', conditions, specificCategory), '', direction.palette)
  const useOnePiece = !!(onePiece && (!topItem.owned || !bottomItem.owned))
  const onePieceItem = useOnePiece ? itemFor(own, 'onepiece', '', conditions, reason, direction.palette) : null
  if (onePieceItem) onePieceItem.label = /套装/.test(onePiece.category) ? '套装' : '连身款'
  const outerItem = itemFor(own, '外套', fallbackOuter, conditions, reason, direction.palette)
  outerItem.optional = (hot && !cold) || (!cold && !rainy && !windy && low != null && low >= 18)
  if (outerItem.optional) outerItem.label = '备用外层'
  const shoesItem = itemFor(own, '鞋履', fallbackShoes, conditions, reason, direction.palette)
  const bagItem = itemFor(own, '包袋', direction.bag, conditions, reason, direction.palette)
  if (input.occasion === '居家') bagItem.optional = true
  const daily = input.daily || null
  const astro = input.astro || null
  const accessoryItem = itemFor(own, '配饰', accessoryFor(style, direction, daily), conditions, reason, direction.palette)
  if (input.occasion === '居家') accessoryItem.optional = true
  const agePrep = climate === 'dry' || ['35–44岁', '45岁以上'].includes(input.ageBand) ? '按肤质做好保湿妆前、' : ''
  const humidPrep = climate === 'humid' ? '减少厚重叠涂、' : ''
  const makeupBase = input.occasion === '居家' ? '按需保湿与润唇，外出再补防晒；无需为了居家完成整套妆容'
    : hot || rainy || climate === 'humid' ? `${agePrep}${humidPrep}防晒打底、轻薄持妆底妆、自然眉、低饱和唇色；约 7 分钟`
      : input.occasion === '聚会' ? `${agePrep}${style.makeup}；只强调唇色或眼妆其中一处，约 10 分钟`
        : `${agePrep}${style.makeup}；约 8 分钟`
  const makeup = input.occasion === '居家' ? makeupBase
    : `${makeupBase}；${scene.makeup}${astro && astro.beautyCue ? `；${astro.beautyCue}` : ''}`
  const hair = input.occasion === '旅行' ? '利落低扎发' : input.occasion === '上课' ? '松低马尾'
    : input.occasion === '居家' ? '自然整理即可' : style.hair
  const items = onePieceItem
    ? [onePieceItem, outerItem, shoesItem, bagItem, accessoryItem]
    : [topItem, bottomItem, outerItem, shoesItem, bagItem, accessoryItem]
  const photoCount = items.filter(item => item.photo).length
  const outfit = onePieceItem ? onePieceItem.value : `${topItem.value}和${bottomItem.value}`
  const baseStyling = onePieceItem
    ? '连身款的腰线保持自然，外层到胯上方；鞋包体量轻巧，整套留出活动余量'
    : /裙/.test(bottomItem.value) && /裤/.test(direction.silhouette)
      ? '上衣轻收进裙腰，裙摆顺身不过分蓬松；外层不过胯，鞋包保持轻巧'
      : !/裙/.test(bottomItem.value) && /裙/.test(direction.silhouette)
        ? '上衣轻收进裤腰，裤腿顺直落在鞋面附近；用小体量鞋包保持轻盈'
        : direction.silhouette
  const styling = `${baseStyling}。${scene.advice}${astro && astro.styleCue ? `；${astro.styleCue}` : ''}`
  const reading = input.reading || null
  const readingStyling = reading && reading.object ? READING_VISUAL[reading.object.name] || '' : ''
  const shoes = shoesItem.value; const bag = bagItem.value
  const reminder = input.occasion === '居家' ? '室内按体感增减薄外层；若临时外出，再查看当地天气并换出门鞋。'
    : low == null || high == null ? '天气暂未获取，出门前查看气温、降雨与风力，再决定外层和鞋。' : rainy && cold ? '带折叠伞，外层注意保暖，鞋底保持防滑。' : rainy ? '把折叠伞放进包里，优先防滑包头鞋。' : cold ? '出门前带上保暖外层，注意室内外温差。' : windy ? '带防风外层，发型尽量扎起。' : hot || climate === 'humid' ? '优先透气面料，带水和防晒用品。' : '出门前看一次实际天气，再决定是否带外层。'
  const fullReminder = wideRange ? `${reminder}昼夜温差较大，外层选可增减的。` : reminder
  const unconfirmed = items.filter(x => !x.owned && !x.optional).map(x => x.label)
  const substitute = !unconfirmed.length ? '清单全部来自已录入衣橱，无需新增购买。'
    : `${unconfirmed.join('、')}尚未在衣橱中确认；今晚先从家中找同类、颜色相近且适合天气的单品替代，没有就用最接近的已有单品重新组合。`
  const focus = THEME_FOCUS[input.themeId] || THEME_FOCUS.growth
  const temperatureText = low == null || high == null ? '暂无天气数据' : low === high ? `${low}°C` : `${low}–${high}°C`
  const weatherText = `${temperatureText}${rainy ? '，有雨' : ''}${climate === 'humid' ? '，潮湿闷热' : windy ? '，大风' : climate === 'dry' ? '，干燥' : ''}`
  const reasons = [
    { key: 'weather', label: '天气', detail: weatherText, source: weather.sourceLabel || (weather.source === 'forecast' ? '天气预报' : '暂无天气数据') },
    { key: 'occasion', label: '场合', detail: `${input.occasion || '日常'} · ${input.environment || '室内为主'}`, source: '用户选择' },
    { key: 'wardrobe', label: '衣橱', detail: items.some(x => x.owned)
      ? '已优先使用衣橱中适合当天条件的单品' : '衣橱中暂未找到合适单品，以下为搭配参考', source: '用户衣橱与搭配模板' },
    { key: 'style', label: '风格', detail: `${style.name}${secondary ? `，点缀${secondary.name}` : ''}`, source: '用户偏好与场合规则' },
    { key: 'daily', label: '个人与日期', detail: daily ? daily.title : '未提供出生资料，按互动主题给灵感', source: daily && daily.personalized ? '日柱与目标日的传统符号关系' : '简版互动' }
  ]
  const bagPrep = input.occasion === '居家' ? '' : `与${bag}`
  const prep = unconfirmed.length
    ? [`参考${outfit}，找出家中能替换的衣物`, `确认是否有适合的${shoes}${bagPrep}`, fullReminder,
      input.objectAction ? `把「${input.objectAction}」变成一件具体的小事` : '确认下一件要做的事']
    : [`放好${outfit}`, `找出${shoes}${bagPrep}`, fullReminder,
      input.objectAction ? `把「${input.objectAction}」变成一件具体的小事` : '确认下一件要做的事']
  if (daily && daily.personalized) prep.splice(3, 0, daily.action)
  if (reading && reading.do) prep.push(reading.do)
  return {
    title: `${style.name} · ${input.occasion || '日常'}方案`,
    mood: `${style.mood}${secondary ? `，加入一点${secondary.name}的感觉` : ''}；${daily && daily.personalized ? daily.title : focus}`,
    items, photoCount, makeup, hair, daily, astro, astroAction: astro ? astro.actionCue : '', reminder: fullReminder, substitute, focus,
    sceneAdvice: scene.advice, sceneVisual: scene.visual, readingStyling,
    readingAction: reading ? reading.do : '', readingAvoid: reading ? reading.avoid : '',
    styleId: style.id, styling, palette: direction.palette, fabric: hot && direction.hotFabric || direction.fabric,
    weatherText, reasons, unconfirmed, wardrobeStatus: unconfirmed.length ? 'needs-confirmation' : 'verified',
    prep,
    tags: [style.name].concat(secondary ? [secondary.name] : [])
  }
}

module.exports = { STYLES, buildPlan, buildWardrobeGaps }
