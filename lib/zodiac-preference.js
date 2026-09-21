const SIGNS = [
  { id: 'aries', name: '白羊座', symbol: '♈', summary: '直接、有行动力，喜欢清楚利落的选择。', styleCue: '保留清晰轮廓，用一处有精神的细节提亮整套搭配', beautyCue: '妆容重点放在清爽眉眼，减少复杂叠加', actionCue: '先完成最关键的一步，再处理细节' },
  { id: 'taurus', name: '金牛座', symbol: '♉', summary: '重视舒适和质感，偏爱耐看、能反复穿的单品。', styleCue: '优先柔软面料和稳定比例，让颜色自然衔接', beautyCue: '用细腻底妆和自然唇色保持温和质感', actionCue: '按熟悉节奏推进，给重要决定多一点确认时间' },
  { id: 'gemini', name: '双子座', symbol: '♊', summary: '好奇、灵活，愿意尝试轻巧的新变化。', styleCue: '在基础组合中加入一处轻盈、有趣的小变化', beautyCue: '眉眼保持灵动，唇色可以比日常明快一点', actionCue: '先整理信息，再选一个最想尝试的方向' },
  { id: 'cancer', name: '巨蟹座', symbol: '♋', summary: '细腻、重视安全感，喜欢柔和而有包裹感的搭配。', styleCue: '选择柔软层次和温和配色，保留自在的活动余量', beautyCue: '用柔和腮红和润泽唇色增加亲近感', actionCue: '先照顾好自己的节奏，再回应外界需求' },
  { id: 'leo', name: '狮子座', symbol: '♌', summary: '自信、重视表达，适合有明确视觉重点的造型。', styleCue: '保持整体简洁，并留一处能被记住的视觉重点', beautyCue: '妆容选一个重点充分表达，其他部分保持克制', actionCue: '主动说出目标，让行动围绕重点展开' },
  { id: 'virgo', name: '处女座', symbol: '♍', summary: '细致、有秩序，偏爱干净、准确的穿着细节。', styleCue: '检查衣领、裤线和鞋面，让整套搭配保持整洁', beautyCue: '底妆和眉形保持精细干净，减少多余颜色', actionCue: '列出三项优先级，完成一项再进入下一项' },
  { id: 'libra', name: '天秤座', symbol: '♎', summary: '讲究平衡与审美，喜欢柔和、协调的整体感。', styleCue: '让上下装比例与鞋包体量保持平衡，颜色彼此呼应', beautyCue: '用柔和眉眼和低饱和唇色维持协调感', actionCue: '先定一个选择标准，减少来回比较' },
  { id: 'scorpio', name: '天蝎座', symbol: '♏', summary: '专注、有边界，适合克制而有层次的表达。', styleCue: '使用深浅层次和简洁线条，避免同时堆叠多个重点', beautyCue: '强化眼神或唇色其中一处，保留整体留白', actionCue: '把注意力留给真正重要的事，减少无效回应' },
  { id: 'sagittarius', name: '射手座', symbol: '♐', summary: '自在、开放，偏好轻便、方便移动的穿着。', styleCue: '优先轻便好活动的单品，用自然层次保持松弛感', beautyCue: '选择快速、清透的妆容，让状态看起来更有精神', actionCue: '先开始行动，在过程中及时调整方向' },
  { id: 'capricorn', name: '摩羯座', symbol: '♑', summary: '稳妥、有目标，偏爱实用且经得起时间的选择。', styleCue: '选择结构清楚、可重复搭配的单品，细节保持可靠', beautyCue: '以均匀底妆和清晰眉形呈现利落状态', actionCue: '把目标拆成可完成的小步骤，按顺序推进' },
  { id: 'aquarius', name: '水瓶座', symbol: '♒', summary: '独立、有想法，愿意保留一点不寻常的个人表达。', styleCue: '在实穿基础上加入一处不对称或材质变化', beautyCue: '保持底妆清透，用一处独特细节体现个人偏好', actionCue: '保留自己的判断，同时给新方法一次试验机会' },
  { id: 'pisces', name: '双鱼座', symbol: '♓', summary: '感受力丰富，偏爱柔软、轻盈和有氛围的细节。', styleCue: '运用轻柔面料和低对比配色，让轮廓自然流动', beautyCue: '用水润质感和柔和颜色营造轻盈氛围', actionCue: '把感受写成一句具体需求，再决定下一步' }
]

function profileForSign(id) {
  return SIGNS.find(item => item.id === id) || null
}

module.exports = { SIGNS, profileForSign }
