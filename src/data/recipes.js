/**
 * 预设识别结果库（组员 5 · 模拟数据）
 *
 * 演示版不依赖任何模型：点快门后前端跑一段「识别流程动画」，
 * 再从这张表里挑一条看起来合理的结果弹出来。
 * 数据是写死的，但六项营养是自洽的（碳水*4 + 蛋白*4 + 脂肪*9 ≈ 热量）。
 *
 * 想换菜品就往下加：nutrition 顺序固定为
 * [碳水, 蛋白质, 脂肪, 纤维, 糖, 盐]（g）
 */

export const NUTRI_LABELS = ['碳水', '蛋白质', '脂肪', '纤维', '糖', '盐']

/** [碳水, 蛋白质, 脂肪, 纤维, 糖, 盐] → 视图用的 { label, value, unit } */
export function toNutrition(values) {
  return NUTRI_LABELS.map((label, i) => ({
    label,
    value: values[i] ?? 0,
    unit: 'g'
  }))
}

/**
 * 识别结果预设。confidence 是「假装的置信度」，
 * note 用第一人称，像手账里随手写的一句话。
 */
export const PRESET_RECOGNITIONS = [
  {
    id: 'duck-rice',
    name: '鸭腿饭',
    emoji: '🍗',
    confidence: 92,
    meal: '午餐',
    kcal: 680,
    weight: '约 520 g',
    tag: '外卖',
    portion: '一盒饭 + 一只卤鸭腿 + 一小把青菜',
    note: '卤鸭腿配青菜，今天认真吃完了一整盒',
    nutrition: [78, 32, 26, 4, 6, 2.1]
  },
  {
    id: 'tomato-noodle',
    name: '番茄鸡蛋面',
    emoji: '🍜',
    confidence: 88,
    meal: '晚餐',
    kcal: 560,
    weight: '约 480 g',
    tag: '家常',
    portion: '一碗面 + 两个鸡蛋 + 半颗番茄',
    note: '加班回家随手煮的，热汤最治愈',
    nutrition: [68, 22, 18, 3, 5, 1.4]
  },
  {
    id: 'salmon-bowl',
    name: '三文鱼牛油果饭',
    emoji: '🥑',
    confidence: 86,
    meal: '午餐',
    kcal: 610,
    weight: '约 420 g',
    tag: '轻食',
    portion: '一碗糙米饭 + 一块三文鱼 + 半个牛油果',
    note: '今天想吃点好的，三文鱼煎得刚刚好',
    nutrition: [58, 34, 26, 6, 4, 1.2]
  },
  {
    id: 'chicken-salad',
    name: '鸡胸肉沙拉',
    emoji: '🥗',
    confidence: 94,
    meal: '午餐',
    kcal: 380,
    weight: '约 350 g',
    tag: '轻食',
    portion: '一大碗生菜 + 150 g 鸡胸 + 油醋汁',
    note: '认真减脂的第三天，酱汁只倒了一半',
    nutrition: [24, 36, 14, 6, 4, 1.1]
  },
  {
    id: 'xiaolongbao',
    name: '小笼包',
    emoji: '🥟',
    confidence: 83,
    meal: '早餐',
    kcal: 420,
    weight: '约 200 g',
    tag: '早餐',
    portion: '一笼 6 只 + 一小碟醋',
    note: '早上路过那家店，还是没能忍住',
    nutrition: [48, 16, 18, 1, 4, 1.6]
  },
  {
    id: 'latte-croissant',
    name: '拿铁 + 可颂',
    emoji: '🥐',
    confidence: 90,
    meal: '早餐',
    kcal: 320,
    weight: '约 180 g',
    tag: '咖啡',
    portion: '一杯中杯拿铁 + 一只黄油可颂',
    note: '今天的开工仪式感，先喝一口再说',
    nutrition: [28, 7, 18, 1, 9, 0.6]
  },
  {
    id: 'malatang',
    name: '麻辣烫',
    emoji: '🌶️',
    confidence: 85,
    meal: '晚餐',
    kcal: 720,
    weight: '约 650 g',
    tag: '外卖',
    portion: '一大碗，微辣，加了宽粉和丸子',
    note: '下雨天就想吃这个，汤只喝了两口',
    nutrition: [72, 28, 38, 7, 6, 3.4]
  },
  {
    id: 'avocado-toast',
    name: '牛油果吐司',
    emoji: '🍞',
    confidence: 81,
    meal: '早餐',
    kcal: 340,
    weight: '约 160 g',
    tag: '自制',
    portion: '两片全麦吐司 + 半个牛油果 + 水波蛋',
    note: '周末慢悠悠做的早餐，摆盘比味道好看',
    nutrition: [34, 12, 17, 5, 3, 0.9]
  },
  {
    id: 'milk-tea',
    name: '珍珠奶茶',
    emoji: '🧋',
    confidence: 89,
    meal: '下午茶',
    kcal: 400,
    weight: '约 500 ml',
    tag: '饮料',
    portion: '一杯中杯 · 三分糖 · 加珍珠',
    note: '下午三点，靠这一杯续命',
    nutrition: [62, 4, 13, 0, 48, 0.3]
  },
  {
    id: 'hotpot',
    name: '小火锅',
    emoji: '🍲',
    confidence: 87,
    meal: '晚餐',
    kcal: 980,
    weight: '约 900 g',
    tag: '聚餐',
    portion: '一人食小锅 + 一份肥牛 + 蔬菜拼盘',
    note: '和朋友约的，聊天比吃得多',
    nutrition: [64, 46, 58, 9, 8, 4.2]
  }
]

/** 把 preset 变成页面直接可用的营养数组 */
export function presetToDraft(preset) {
  return {
    name: preset.name,
    emoji: preset.emoji,
    confidence: preset.confidence,
    meal: preset.meal,
    kcal: preset.kcal,
    weight: preset.weight,
    tag: preset.tag,
    portionHint: `${preset.portion} · 识别结果可直接改`,
    note: preset.note,
    nutrition: toNutrition(preset.nutrition)
  }
}

/** 换一条不同的结果（避免连点两次拿到同一道菜） */
export function pickRecognition(excludeId = '') {
  const pool = PRESET_RECOGNITIONS.filter((r) => r.id !== excludeId)
  const list = pool.length ? pool : PRESET_RECOGNITIONS
  return list[Math.floor(Math.random() * list.length)]
}

/* ---------------- 贴纸素材（贴纸系统用 emoji，零素材依赖） ---------------- */

export const STICKER_PACKS = [
  {
    id: 'food',
    label: '食物',
    items: ['🍓', '🍋', '🥑', '🍞', '🧋', '🍙', '🌽', '🍅', '🥚', '🍰', '🍡', '🧀']
  },
  {
    id: 'mood',
    label: '心情',
    items: ['💛', '✨', '💫', '😋', '🎉', '🫶', '🥹', '🔥']
  },
  {
    id: 'deco',
    label: '装饰',
    items: ['⭐', '🌿', '🌸', '🍃', '🎀', '📎', '🖍️', '☁️', '☀️', '🫧']
  }
]
