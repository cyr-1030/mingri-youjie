const SIGN_GUIDES = {
  '白羊': { core: '直接、有启动力', comfort: '快速回应与明确边界', communication: '先说重点', aesthetic: '利落轮廓与一处亮点', action: '先完成最小的一步', beauty: '眉眼保留清晰重点' },
  '金牛': { core: '稳定、重视质感', comfort: '熟悉节奏与舒服触感', communication: '慢一点讲清楚', aesthetic: '柔软材质与耐看配色', action: '按顺序稳稳推进', beauty: '底妆和发型保持整洁' },
  '双子': { core: '灵活、喜欢变化', comfort: '轻松交流与可切换的安排', communication: '用短句说明重点', aesthetic: '轻巧层次与有趣小配饰', action: '把事情分段处理', beauty: '妆发轻盈、线条干净' },
  '巨蟹': { core: '细腻、重视安全感', comfort: '熟悉感与柔软包裹感', communication: '先说明感受', aesthetic: '柔和线条与亲近质感', action: '给自己留一点缓冲', beauty: '妆发柔和、有光泽' },
  '狮子': { core: '自信、愿意表达', comfort: '被看见与明确肯定', communication: '清楚表达立场', aesthetic: '挺括轮廓与焦点配饰', action: '主动带头推进', beauty: '眉眼或唇色突出一处' },
  '处女': { core: '有条理、关注细节', comfort: '秩序与可控感', communication: '按步骤说明', aesthetic: '干净剪裁与精致细节', action: '先列出三步清单', beauty: '底妆细致、发型利落' },
  '天秤': { core: '讲究平衡与分寸', comfort: '和谐关系与舒展空间', communication: '先听完再回应', aesthetic: '协调比例与柔和配色', action: '比较后做出选择', beauty: '妆发保持柔和对称' },
  '天蝎': { core: '专注、重视深度', comfort: '明确边界与独处空间', communication: '少说但说准确', aesthetic: '深色层次与克制细节', action: '集中解决一件事', beauty: '眉眼加深一点层次' },
  '射手': { core: '开放、喜欢探索', comfort: '自由感与新鲜体验', communication: '直接分享观点', aesthetic: '轻便单品与舒展比例', action: '先尝试再调整', beauty: '妆发自然、有呼吸感' },
  '摩羯': { core: '务实、看重结果', comfort: '清晰结构与可靠安排', communication: '给出结论和时间点', aesthetic: '挺括材质与稳重线条', action: '按目标逐项推进', beauty: '妆发简洁、轮廓清楚' },
  '水瓶': { core: '独立、重视新意', comfort: '自主空间与新观点', communication: '换一个角度表达', aesthetic: '简洁基础上的独特点', action: '尝试一个新方法', beauty: '保留一处特别细节' },
  '双鱼': { core: '敏感、富有想象', comfort: '柔和环境与情绪缓冲', communication: '用感受补充事实', aesthetic: '流动线条与轻柔质感', action: '先感受再决定节奏', beauty: '妆发柔和、保留水润感' }
}

const BODY_ROLES = {
  sun: { role: '核心倾向', sentence: guide => `${guide.core}。` },
  moon: { role: '情绪需要', sentence: guide => `更需要${guide.comfort}。` },
  mercury: { role: '表达方式', sentence: guide => `表达时适合${guide.communication}。` },
  venus: { role: '审美偏好', sentence: guide => `更偏爱${guide.aesthetic}。` },
  mars: { role: '行动方式', sentence: guide => `行动时适合${guide.action}。` }
}

function astrologyProfile(starChart) {
  if (!starChart || starChart.status !== 'ready' || !Array.isArray(starChart.bodies)) return null
  const cards = starChart.bodies.map(body => {
    const guide = SIGN_GUIDES[body.sign]
    const role = BODY_ROLES[body.key]
    return { ...body, role: role ? role.role : '', reading: guide && role ? role.sentence(guide) : '' }
  })
  const byKey = Object.fromEntries(cards.map(card => [card.key, card]))
  if (!byKey.sun || !byKey.moon || !byKey.venus || !byKey.mars || !byKey.mercury) return null
  const sun = SIGN_GUIDES[byKey.sun.sign]
  const moon = SIGN_GUIDES[byKey.moon.sign]
  const mercury = SIGN_GUIDES[byKey.mercury.sign]
  const venus = SIGN_GUIDES[byKey.venus.sign]
  const mars = SIGN_GUIDES[byKey.mars.sign]
  return {
    cards,
    summary: `核心偏向${sun.core}，情绪上更需要${moon.comfort}。`,
    styleCue: `细节保留${venus.aesthetic}`,
    beautyCue: venus.beauty,
    actionCue: `${mars.action}；沟通时${mercury.communication}。`
  }
}

module.exports = { astrologyProfile, SIGN_GUIDES }
