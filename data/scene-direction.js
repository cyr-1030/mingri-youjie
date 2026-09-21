// Scene rules alter the actual outfit, while the selected style supplies its
// palette and silhouette. Weather and owned wardrobe are applied afterwards.
const SCENES = {
  日常: {
    advice: '保留一套熟悉的比例，鞋包轻便，出门前只调整一处细节。',
    visual: '自然留白，像日常衣橱里认真整理好的一套。',
    makeup: '保留日常熟悉的妆感，不额外增加步骤'
  },
  通勤: {
    advice: '领口和腰线整理清楚，鞋要能走路，包能放工作必需品。',
    visual: '线条清楚、材质平整，鞋包利落，适合工作日。',
    makeup: '眉型清楚，唇色低饱和，补妆只带一支唇膏'
  },
  约会: {
    advice: '留一处柔软质地或轻巧饰品，坐下和步行都要舒服。',
    visual: '柔软层次、自然光泽，亲近但不过分隆重。',
    makeup: '腮红与唇色同调，眼妆保留自然层次'
  },
  上课: {
    advice: '久坐不勒腰，鞋适合校园步行，包能放书本和水。',
    visual: '轻松有层次，衣物耐坐耐走，包有实际容量。',
    makeup: '底妆尽量轻薄，优先防晒和润唇'
  },
  聚会: {
    advice: '把亮点留在领口或一件首饰，其他单品保持克制。',
    visual: '有一处精致细节，整体轻盈，适合与人相见。',
    makeup: '唇色或眼妆只强调一处，避免两处都加重'
  },
  旅行: {
    advice: '优先防滑耐走的鞋和能空出双手的包，外层可增减。',
    visual: '适合步行与移动的完整造型，鞋包结实轻便。',
    makeup: '防晒和易补涂优先，减少容易花掉的浓妆'
  },
  居家: {
    advice: '选柔软、不勒腰的衣物和室内鞋；不需要为了这套去配出门包。',
    visual: '柔软、可活动的居家衣物，不摆出门包。',
    makeup: '按需保湿与润唇，不必完成整套妆容'
  }
}

// The three most common gentle/Korean/French styles get curated garment edits.
const STYLE_EDITS = {
  soft: {
    通勤: { top: '奶油白垂感衬衫', bottom: '烟粉褐高腰直筒西裤', hotTop: '奶油白轻薄短袖衬衫', hotBottom: '烟粉褐薄料高腰直筒裤' },
    约会: { top: '奶油白柔软方领针织', bottom: '烟粉褐斜裁过膝半裙', hotTop: '奶油白轻薄方领短袖', hotBottom: '烟粉褐轻薄斜裁过膝半裙' },
    上课: { top: '奶油白短款薄开衫', bottom: '灰棕宽松直筒长裤', hotTop: '奶油白透气短袖衬衫', hotBottom: '灰棕轻薄直筒长裤' },
    聚会: { top: '奶油白微光泽垂感衬衫', bottom: '烟粉褐斜裁中长裙', hotTop: '奶油白微光泽轻薄短袖衬衫', hotBottom: '烟粉褐轻薄斜裁中长裙' },
    旅行: { top: '奶油白宽松薄棉衬衫', bottom: '灰棕高腰直筒长裤', hotTop: '奶油白宽松薄棉短袖' },
    居家: { top: '燕麦色柔软宽松针织', bottom: '奶咖色松紧腰长裤' }
  },
  french: {
    通勤: { bottom: '深咖垂感高腰直筒西裤', hotTop: '奶油白轻薄短袖衬衫', hotBottom: '深咖薄料高腰直筒西裤' },
    约会: { top: '奶油白柔软方领衬衫', bottom: '深靛蓝高腰直筒牛仔裤', hotTop: '奶油白轻薄方领短袖衬衫', hotBottom: '深靛蓝薄料直筒裤' },
    上课: { top: '奶油白宽松条纹针织', bottom: '深靛蓝高腰直筒牛仔裤', hotTop: '奶油白宽松条纹短袖', hotBottom: '深靛蓝薄料直筒裤' },
    聚会: { top: '奶油白垂感微褶衬衫', bottom: '巧克力棕斜裁中长裙', hotTop: '奶油白轻薄微褶短袖衬衫', hotBottom: '巧克力棕轻薄斜裁中长裙' },
    旅行: { top: '奶油白宽松棉衬衫', bottom: '深靛蓝柔软直筒牛仔裤', hotTop: '奶油白宽松薄棉短袖' },
    居家: { top: '奶油白柔软条纹针织', bottom: '烟棕松紧腰阔腿裤' }
  },
  korean: {
    通勤: { top: '奶油白细针织开衫', bottom: '灰棕高腰垂感直筒裤', hotTop: '奶油白轻薄短袖衬衫', hotBottom: '灰棕薄料高腰直筒裤' },
    约会: { top: '奶油白柔软方领针织', bottom: '灰棕高腰A字中长裙', hotTop: '奶油白轻薄方领短袖', hotBottom: '灰棕轻薄A字中长裙' },
    上课: { top: '燕麦色宽松短开衫', bottom: '灰棕松紧腰直筒长裤', hotTop: '燕麦色宽松薄棉短袖', hotBottom: '灰棕轻薄松紧腰直筒裤' },
    聚会: { top: '奶油白微光泽短开衫', bottom: '灰棕垂感斜裁中长裙', hotTop: '奶油白微光泽轻薄短袖', hotBottom: '灰棕轻薄斜裁中长裙' },
    旅行: { top: '燕麦色轻薄短开衫', bottom: '灰棕耐坐直筒长裤', hotTop: '燕麦色透气薄棉短袖' },
    居家: { top: '奶油白宽松软针织', bottom: '灰棕松紧腰长裤' }
  }
}

function sceneDirection(styleId, direction, occasion) {
  const scene = SCENES[occasion] || SCENES.日常
  const edit = (STYLE_EDITS[styleId] || {})[occasion] || {}
  const cool = ['cool', 'street', 'outdoor', 'sporty'].includes(styleId)
  const shoeTone = cool ? '深灰' : '深咖'
  const bagTone = cool ? '炭灰' : '暖棕'
  const d = { ...direction, ...edit }
  if (occasion === '通勤') {
    d.bottom = edit.bottom || direction.formalBottom || direction.bottom
    d.shoes = `${shoeTone}低跟包头鞋`
    d.bag = `${bagTone}中号结构感肩包`
  } else if (occasion === '约会') {
    d.shoes = `${shoeTone}柔软低跟鞋`
    d.bag = `${bagTone}小号半月肩包`
  } else if (occasion === '上课') {
    d.shoes = `${shoeTone}低帮舒适平底鞋`
    d.bag = `${bagTone}可装书本的轻便肩包`
  } else if (occasion === '聚会') {
    d.shoes = `${shoeTone}合脚低跟鞋`
    d.bag = `${bagTone}小号手提包`
  } else if (occasion === '旅行') {
    d.shoes = `${shoeTone}防滑耐走平底鞋`
    d.bag = `${bagTone}轻量拉链斜挎包`
    if (styleId === 'soft') d.hotBottom = '灰棕轻薄直筒长裤'
    if (styleId === 'french') d.hotBottom = '深靛蓝薄料直筒裤'
    if (styleId === 'korean') d.hotBottom = '灰棕轻薄直筒长裤'
  } else if (occasion === '居家') {
    d.shoes = '素色柔软室内拖鞋'
    d.bag = '无需出门包'
    d.hotTop = cool ? '灰白宽松薄棉短袖' : '奶油白宽松薄棉短袖'
    d.hotBottom = cool ? '深灰轻薄松紧腰长裤' : '燕麦色轻薄松紧腰长裤'
    d.coldTop = cool ? '深灰宽松保暖针织' : '燕麦色宽松保暖针织'
    d.coldBottom = cool ? '炭灰保暖松紧腰长裤' : '暖棕保暖松紧腰长裤'
    if (!edit.top) d.top = cool ? '深灰柔软宽松针织' : '燕麦色柔软宽松针织'
    if (!edit.bottom) d.bottom = cool ? '炭灰松紧腰长裤' : '奶咖色松紧腰长裤'
  }
  return { direction: d, scene }
}

module.exports = { SCENES, sceneDirection }
