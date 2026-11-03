/**
 * 全部为前端写死的模拟数据（不需要后端）。
 * 图片走 ES import，构建时由 Vite 处理路径。
 */
import duck from '../assets/duck.jpg'
import latte from '../assets/latte.png'
import noodles from '../assets/noodles.png'

export const IMAGES = { duck, latte, noodles }

export const brand = {
  name: 'Sushine',
  slogan: '认真记录每一餐',
  tagline: '把每一餐，过成手账。拍一张，就记下了。'
}

export const user = {
  name: 'Potato',
  avatar: 'P',
  days: 128,
  cards: 402,
  desc: '不辣 · 爱面食 · 周三下厨'
}

export const today = {
  label: '10月30日 · 周五 · 晴 21°',
  title: '今天吃了什么？'
}

/* ---------------- 02 首页 今日手账流 ---------------- */
export const weekLabels = ['一', '二', '三', '四', '五', '六', '日']
export const weekDates = [26, 27, 28, 29, 30, 31, 1]
export const weekDays = weekLabels.map((label, i) => ({
  label,
  date: weekDates[i],
  active: i === 4
}))

export const seedEntries = [
  {
    id: 1,
    name: '鸭腿饭',
    emoji: '🍗',
    time: '12:20',
    note: '卤鸭腿配青菜，今天认真吃完了一整盒',
    tag: '外卖',
    kcal: 680,
    meal: '午餐',
    weight: '约 520 g',
    img: IMAGES.duck,
    nutrition: [
      { label: '碳水', value: 78, unit: 'g' },
      { label: '蛋白质', value: 32, unit: 'g' },
      { label: '脂肪', value: 26, unit: 'g' },
      { label: '纤维', value: 4, unit: 'g' },
      { label: '糖', value: 6, unit: 'g' },
      { label: '盐', value: 2.1, unit: 'g' }
    ]
  },
  {
    id: 2,
    name: '番茄鸡蛋面',
    emoji: '🍜',
    time: '18:40',
    note: '加班回家随手煮的，热汤最治愈',
    tag: '家常',
    kcal: 560,
    meal: '晚餐',
    weight: '约 480 g',
    img: IMAGES.noodles,
    nutrition: [
      { label: '碳水', value: 68, unit: 'g' },
      { label: '蛋白质', value: 22, unit: 'g' },
      { label: '脂肪', value: 18, unit: 'g' },
      { label: '纤维', value: 3, unit: 'g' },
      { label: '糖', value: 5, unit: 'g' },
      { label: '盐', value: 1.4, unit: 'g' }
    ]
  }
]

/* ---------------- 05 贴纸信息 / 识别结果 ---------------- */
export const recognised = {
  name: '鸭腿饭',
  emoji: '🍗',
  confidence: 92,
  meal: '午餐',
  time: '12:20',
  dateText: '10月30日 周五',
  note: '卤鸭腿配青菜，今天认真吃完了一整盒',
  tag: '外卖',
  kcal: 680,
  weight: '约 520 g',
  portionHint: '一盒饭 + 一份青菜 · 改完营养值同步',
  img: IMAGES.duck,
  /** 是否已经生成过卡通贴纸（避免重复风格化） */
  cartoonized: false,
  nutrition: [
    { label: '碳水', value: 78, unit: 'g' },
    { label: '蛋白质', value: 32, unit: 'g' },
    { label: '脂肪', value: 26, unit: 'g' },
    { label: '纤维', value: 4, unit: 'g' },
    { label: '糖', value: 6, unit: 'g' },
    { label: '盐', value: 2.1, unit: 'g' }
  ]
}

/* ---------------- 06 编辑 ---------------- */
export const mealSegments = ['早餐', '午餐', '下午茶', '晚餐']
export const nameSuggestions = ['鸭腿饭', '卤鸭腿饭', '工作日晚餐']

/**
 * 手动记一餐：识别失败或没拍照时的降级路径，
 * 字段与「识别结果」完全一致，后面整条流程可以复用。
 */
export function blankDraft() {
  return {
    name: '',
    emoji: '🍽',
    confidence: 0,
    meal: '午餐',
    time: '12:00',
    dateText: '10月30日 周五',
    note: '',
    tag: '手动记录',
    kcal: 0,
    weight: '',
    portionHint: '手动填写 · 保存后会出现在今天的手账里',
    img: '',
    cartoonized: true,
    nutrition: [
      { label: '碳水', value: 0, unit: 'g' },
      { label: '蛋白质', value: 0, unit: 'g' },
      { label: '脂肪', value: 0, unit: 'g' },
      { label: '纤维', value: 0, unit: 'g' },
      { label: '糖', value: 0, unit: 'g' },
      { label: '盐', value: 0, unit: 'g' }
    ]
  }
}

/* ---------------- 07 Sushie 分析 ---------------- */
export const analysis = {
  goal: 1800,
  lead: '这盒饭已经帮你记上了，整体算下来：',
  bullets: [
    '总热量约 <b>680 kcal</b>，占今日 38%',
    '蛋白质 32 g、脂肪 26 g、碳水 78 g、纤维 4 g'
  ],
  note: '蛋白质是够的，问题在 <b>盐 2.1 g 偏高</b>——卤汁和鸭皮是主要来源；青菜只有一小把，<b>纤维不到 5 g</b>。',
  next: '接下来可以这样补一下：',
  suggestions: [
    '卤汁别整盒拌进饭里，留一半，能省下约 100 kcal 和一半的盐。',
    '鸭皮吃不吃随意，但别两顿都带皮——这餐的脂肪一半在这层皮上。',
    '晚餐补一份深色蔬菜，主食减到半碗，今天的钠就不会超。'
  ],
  inputPlaceholder: '继续问 Sushie，比如「那晚饭吃什么」…'
}

/* ---------------- 08 今日 / 周报 ---------------- */
export const report = {
  goal: 1800,
  tip: '蛋白够、蔬菜少'
}

/* ---------------- 09 月度记录 ---------------- */
export const month = {
  year: 2026,
  monthIndex: 10, // 10 月
  days: 31,
  firstWeekday: 3, // 2026-10-01 是周四 → 周一起始索引 3
  today: 30,
  stats: [
    { value: '22', label: '记录天数' },
    { value: '46', label: '手账卡片' },
    { value: '15180', label: '本月 kcal' }
  ],
  recorded: [
    1, 3, 4, 5, 7, 8, 10, 12, 14, 15, 17, 18, 20, 21, 23, 24, 26, 27, 29
  ],
  images: {
    2: { img: IMAGES.noodles, kcal: 520 },
    6: { img: IMAGES.latte, kcal: 120 },
    9: { img: IMAGES.duck, kcal: 200 },
    11: { img: IMAGES.noodles, kcal: 480 },
    13: { img: IMAGES.latte, kcal: 150 },
    16: { img: IMAGES.duck, kcal: 260 },
    19: { img: IMAGES.noodles, kcal: 610 },
    22: { img: IMAGES.latte, kcal: 90 },
    25: { img: IMAGES.duck, kcal: 240 },
    28: { img: IMAGES.noodles, kcal: 530 },
    30: { img: IMAGES.duck, kcal: 680 }
  },
  weekly: [
    { label: '10/1', h: 56 },
    { label: '10/8', h: 74 },
    { label: '10/15', h: 92 },
    { label: '10/22', h: 63 },
    { label: '10/29', h: 38 }
  ],
  top: [
    { name: '番茄鸡蛋面', times: '9 次', img: IMAGES.noodles },
    { name: '鸭腿饭', times: '8 次', img: IMAGES.duck },
    { name: '拿铁', times: '6 次', img: IMAGES.latte }
  ]
}

/* ---------------- 10 我的 ---------------- */
export const profileRows = [
  { icon: '🔔', label: '用餐提醒', value: '12:30 / 18:30', to: null },
  { icon: '📘', label: '导出手账', value: 'PDF · 图片', to: null },
  { icon: '🏷', label: '我的贴纸', value: '收藏面板', to: '/collection' },
  { icon: '⚙️', label: '设置', value: '', to: null }
]
