/**
 * 本地视觉模型的候选菜品表。
 *
 * CLIP 是「零样本」的：不会自己说出菜名，只能在一组候选里挑最像的。
 * 所以这张表决定了识别的上限 —— 表里没有的东西永远认不出来，
 * 但表里的东西认出来是「真的看了图」，不是假的。
 *
 * ⚠️ 每条标签都会增加识别耗时（实测约 0.13s/条），所以只保留最常见的 20 道。
 *    想扩充就往下面加：cn / en / 热量 / 六项营养（碳水、蛋白质、脂肪、纤维、糖、盐，单位 g）
 */
export const DISHES = [
  {
    id: 'duck-rice',
    cn: '鸭腿饭',
    emoji: '🍗',
    en: 'a braised duck leg with soy sauce over white rice in a takeout box',
    kcal: 680,
    weight: '约 520 g',
    tag: '外卖',
    meal: '午餐',
    nutrition: [78, 32, 26, 4, 6, 2.1]
  },
  {
    id: 'braised-pork-rice',
    cn: '卤肉饭',
    emoji: '🍚',
    en: 'braised minced pork belly with sauce over white rice in a small round bowl, taiwanese style',
    kcal: 620,
    weight: '约 460 g',
    tag: '家常',
    meal: '午餐',
    nutrition: [82, 24, 24, 2, 8, 2.4]
  },
  {
    id: 'chicken-rice',
    cn: '黄焖鸡米饭',
    emoji: '🍲',
    en: 'braised chicken with mushrooms in a clay pot served with rice',
    kcal: 720,
    weight: '约 560 g',
    tag: '外卖',
    meal: '午餐',
    nutrition: [86, 38, 28, 3, 6, 2.8]
  },
  {
    id: 'curry-rice',
    cn: '咖喱饭',
    emoji: '🍛',
    en: 'japanese curry with rice on a plate, brown sauce',
    kcal: 690,
    weight: '约 520 g',
    tag: '日料',
    meal: '午餐',
    nutrition: [92, 22, 26, 4, 9, 2.2]
  },
  {
    id: 'fried-rice',
    cn: '蛋炒饭',
    emoji: '🍳',
    en: 'egg fried rice on a plate with chopped green onion',
    kcal: 540,
    weight: '约 380 g',
    tag: '家常',
    meal: '午餐',
    nutrition: [74, 16, 20, 2, 3, 1.8]
  },
  {
    id: 'tomato-egg-rice',
    cn: '番茄炒蛋饭',
    emoji: '🍅',
    en: 'scrambled eggs with tomato over a bowl of white rice',
    kcal: 560,
    weight: '约 450 g',
    tag: '家常',
    meal: '午餐',
    nutrition: [72, 20, 20, 3, 7, 1.6]
  },
  {
    id: 'tomato-noodle',
    cn: '番茄鸡蛋面',
    emoji: '🍜',
    en: 'a bowl of noodle soup with tomato and egg, red broth',
    kcal: 560,
    weight: '约 480 g',
    tag: '家常',
    meal: '晚餐',
    nutrition: [68, 22, 18, 3, 5, 1.4]
  },
  {
    id: 'beef-noodle',
    cn: '牛肉面',
    emoji: '🍜',
    en: 'a bowl of beef noodle soup with sliced beef and greens',
    kcal: 640,
    weight: '约 620 g',
    tag: '面馆',
    meal: '午餐',
    nutrition: [78, 30, 20, 4, 4, 2.6]
  },
  {
    id: 'dumplings',
    cn: '饺子',
    emoji: '🥟',
    en: 'a plate of boiled chinese dumplings with dipping sauce',
    kcal: 480,
    weight: '约 300 g',
    tag: '家常',
    meal: '晚餐',
    nutrition: [56, 20, 18, 3, 2, 2.2]
  },
  {
    id: 'baozi',
    cn: '包子',
    emoji: '🥟',
    en: 'steamed chinese buns on a plate, white and fluffy',
    kcal: 320,
    weight: '约 200 g',
    tag: '早餐',
    meal: '早餐',
    nutrition: [46, 10, 9, 2, 4, 1.2]
  },
  {
    id: 'burger',
    cn: '汉堡薯条',
    emoji: '🍔',
    en: 'a hamburger with french fries on a tray',
    kcal: 820,
    weight: '约 380 g',
    tag: '快餐',
    meal: '午餐',
    nutrition: [92, 28, 40, 4, 12, 2.4]
  },
  {
    id: 'sushi',
    cn: '寿司',
    emoji: '🍣',
    en: 'a plate of sushi rolls with salmon and seaweed',
    kcal: 420,
    weight: '约 260 g',
    tag: '日料',
    meal: '午餐',
    nutrition: [58, 18, 10, 2, 4, 1.6]
  },
  {
    id: 'hotpot',
    cn: '火锅',
    emoji: '🍲',
    en: 'a bubbling chinese hot pot with vegetables and meat slices',
    kcal: 900,
    weight: '约 900 g',
    tag: '聚餐',
    meal: '晚餐',
    nutrition: [60, 48, 52, 6, 8, 4.2]
  },
  {
    id: 'malatang',
    cn: '麻辣烫',
    emoji: '🌶',
    en: 'a bowl of malatang spicy soup with vegetables, tofu and noodles',
    kcal: 720,
    weight: '约 700 g',
    tag: '小吃',
    meal: '晚餐',
    nutrition: [66, 28, 36, 6, 6, 3.8]
  },
  {
    id: 'fried-chicken',
    cn: '炸鸡',
    emoji: '🍗',
    en: 'fried chicken pieces in a paper bucket',
    kcal: 780,
    weight: '约 400 g',
    tag: '快餐',
    meal: '晚餐',
    nutrition: [44, 40, 48, 1, 2, 3.2]
  },
  {
    id: 'salad',
    cn: '沙拉',
    emoji: '🥗',
    en: 'a bowl of green salad with vegetables and dressing',
    kcal: 240,
    weight: '约 300 g',
    tag: '轻食',
    meal: '午餐',
    nutrition: [20, 8, 14, 6, 6, 1]
  },
  {
    id: 'latte',
    cn: '拿铁',
    emoji: '☕️',
    en: 'a cup of coffee latte with milk foam in a paper cup',
    kcal: 180,
    weight: '约 350 ml',
    tag: '咖啡',
    meal: '下午茶',
    nutrition: [18, 8, 8, 0, 16, 0.2]
  },
  {
    id: 'milk-tea',
    cn: '奶茶',
    emoji: '🧋',
    en: 'a cup of bubble milk tea with tapioca pearls',
    kcal: 420,
    weight: '约 500 ml',
    tag: '饮料',
    meal: '下午茶',
    nutrition: [66, 5, 14, 0, 52, 0.3]
  },
  {
    id: 'cake',
    cn: '蛋糕',
    emoji: '🍰',
    en: 'a slice of cake on a plate with cream frosting',
    kcal: 380,
    weight: '约 120 g',
    tag: '甜点',
    meal: '下午茶',
    nutrition: [44, 5, 20, 1, 30, 0.4]
  },
  {
    id: 'food-unknown',
    cn: '一餐饭',
    emoji: '🍽',
    en: 'a photo of a meal, tableware and cooked food',
    kcal: 500,
    weight: '约 450 g',
    tag: '记录',
    meal: '午餐',
    nutrition: [60, 20, 20, 3, 6, 2]
  }
]

/** 给 CLIP 用的候选描述 */
export const DISH_PROMPTS = DISHES.map((d) => d.en)
