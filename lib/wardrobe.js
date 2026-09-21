const GROUPS = [
  { name: '上装', role: '上装', items: ['上装', 'T恤', '衬衫', '针织衫', '毛衣', '卫衣', '背心', '吊带上衣', '打底衫', '马甲', 'Polo衫'] },
  { name: '裤装', role: '下装', items: ['下装', '牛仔裤', '西裤', '休闲裤', '运动裤', '工装裤', '阔腿裤', '短裤', '打底裤'] },
  { name: '裙装', role: 'skirt', items: ['裙装', '半裙', '百褶裙', '长裙', '短裙', '连衣裙', '吊带裙', '衬衫裙', '背带裙', '礼服裙', '裙裤'] },
  { name: '外套', role: '外套', items: ['外套', '西装外套', '风衣', '大衣', '羽绒服', '棉服', '夹克', '开衫', '防晒衣', '雨衣', '冲锋衣'] },
  { name: '套装', role: 'onepiece', items: ['套装', '西装套装', '运动套装', '连体裤', '新中式套装'] },
  { name: '鞋履', role: '鞋履', items: ['鞋履', '运动鞋', '乐福鞋', '皮鞋', '高跟鞋', '平底鞋', '玛丽珍鞋', '靴子', '凉鞋', '拖鞋', '雨靴'] },
  { name: '包袋', role: '包袋', items: ['包袋', '手提包', '托特包', '单肩包', '斜挎包', '双肩包', '腰包', '旅行包'] },
  { name: '首饰', role: '配饰', items: ['配饰', '耳饰', '项链', '戒指', '手链', '手镯', '胸针', '脚链', '水晶饰品'] },
  { name: '穿戴配件', role: '配饰', items: ['帽子', '围巾', '丝巾', '发饰', '发夹', '腰带', '眼镜', '墨镜', '手表', '袜子', '手套'] },
  { name: '美妆香氛', role: 'archive', items: ['底妆', '眼妆', '唇妆', '腮红', '护肤品', '香水', '美妆工具'] },
  { name: '居家与特殊', role: 'archive', items: ['家居服', '睡衣', '内衣', '泳装', '运动装备', '礼服', '演出服'] },
  { name: '随身小物', role: 'archive', items: ['雨伞', '遮阳伞', '水晶', '挂件', '钥匙扣', '其他物品'] }
]

const ONE_PIECE = new Set(['连衣裙', '吊带裙', '衬衫裙', '背带裙', '礼服裙'])

function roleForCategory(category) {
  if (ONE_PIECE.has(category)) return 'onepiece'
  const group = GROUPS.find(entry => entry.items.includes(category))
  return group ? group.role === 'skirt' ? '下装' : group.role : 'archive'
}

function indicesForCategory(category) {
  const groupIndex = GROUPS.findIndex(entry => entry.items.includes(category))
  if (groupIndex < 0) return [0, 0]
  return [groupIndex, GROUPS[groupIndex].items.indexOf(category)]
}

function columnsForGroup(groupIndex) {
  const group = GROUPS[groupIndex] || GROUPS[0]
  return [GROUPS.map(entry => entry.name), group.items]
}

function categoryAt(indices) {
  const group = GROUPS[Number(indices && indices[0])] || GROUPS[0]
  return group.items[Number(indices && indices[1])] || group.items[0]
}

module.exports = { GROUPS, roleForCategory, indicesForCategory, columnsForGroup, categoryAt }
