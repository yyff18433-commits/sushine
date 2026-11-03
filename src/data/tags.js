/**
 * 口味标签池。
 *
 * 注册之后不让用户从几十个标签里翻，而是「随机抽一批给你挑」——
 * 分组抽，保证抽出来的不会全挤在同一个维度（比如全是辣度）。
 */
export const TAG_GROUPS = [
  {
    key: 'taste',
    label: '口味',
    items: ['不辣', '微辣', '重辣', '爱甜', '偏咸', '怕酸', '爱香菜', '不吃香菜', '重口味', '清淡派']
  },
  {
    key: 'food',
    label: '爱吃',
    items: [
      '爱面食', '米饭党', '汤汤水水', '烧烤', '火锅', '日料',
      '汉堡薯条', '奶茶控', '咖啡续命', '水果党'
    ]
  },
  {
    key: 'habit',
    label: '习惯',
    items: ['周三下厨', '早餐派', '深夜食堂', '外卖常客', '带饭上班', '七分饱', '光盘行动', '慢点吃']
  },
  {
    key: 'goal',
    label: '状态',
    items: ['减脂中', '增肌中', '控糖', '早睡早起', '久坐族', '运动日']
  }
]

export const ALL_TAGS = TAG_GROUPS.flatMap((g) => g.items)

/** 每组抽 perGroup 个，再整体打乱 —— 每次「换一批」结果都不一样 */
export function randomTags(perGroup = 3) {
  const picked = []
  for (const group of TAG_GROUPS) {
    const pool = shuffle([...group.items])
    picked.push(...pool.slice(0, perGroup))
  }
  return shuffle(picked)
}

export function shuffle(list) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[list[i], list[j]] = [list[j], list[i]]
  }
  return list
}
