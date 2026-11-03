/**
 * 身体数据：体重流水 + 个人资料 + 热量目标。
 *
 * 为什么把「吃多少」挂在这里：减脂的第一指标是体重，不是热量。
 * 热量目标应该由「我的体重 + 身高年龄活动量 + 想瘦多快」推出来，
 * 而不是全站写死一个 1800。
 *
 * 纯前端：数据和账号一样存在本机 localStorage。
 */
import { computed, reactive, watch } from 'vue'

const KEY = 'sushine:body:v1'

/** 活动系数（Mifflin-St Jeor 之后乘这个得到 TDEE） */
export const ACTIVITY_LEVELS = [
  { id: 'sedentary', label: '久坐', desc: '办公室，几乎不运动', factor: 1.2 },
  { id: 'light', label: '轻度', desc: '每周 1–2 次运动', factor: 1.375 },
  { id: 'moderate', label: '中度', desc: '每周 3–4 次运动', factor: 1.55 },
  { id: 'active', label: '高强度', desc: '每周 5 次以上', factor: 1.725 }
]

export const RATE_OPTIONS = [
  { value: 0, label: '保持体重' },
  { value: 0.25, label: '每周 −0.25 kg（温和）' },
  { value: 0.5, label: '每周 −0.5 kg（推荐）' },
  { value: 0.75, label: '每周 −0.75 kg' },
  { value: 1, label: '每周 −1 kg（激进）' }
]

/* ---------------- 工具 ---------------- */

export function dateKey(date = new Date()) {
  const d = new Date(date)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function shiftDays(key, days) {
  const d = new Date(`${key}T12:00:00`)
  d.setDate(d.getDate() + days)
  return dateKey(d)
}

function read() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/** 第一次打开：给两周连续的体重流水（连续打卡和趋势图都要靠它） */
function seedWeights() {
  const today = dateKey()
  // 从 14 天前到昨天，缓慢下降 + 小幅波动
  // 故意不含今天：这样一进来就是「今天还没打卡」，打卡按钮才有事可做
  const samples = [
    63.0, 62.9, 62.7, 62.8, 62.6, 62.4, 62.5, 62.3, 62.1, 62.2, 62.0, 61.8, 61.5, 61.2
  ]
  const weights = {}
  samples.forEach((kg, index) => {
    weights[shiftDays(today, -(samples.length - index))] = kg
  })
  return weights
}

/* ---------------- 状态 ---------------- */

const stored = read()

export const body = reactive({
  profile: {
    height: 168,
    age: 26,
    sex: 'female',
    activity: 'light',
    goalWeight: 55,
    weeklyRate: 0.5,
    ...(stored?.profile || {})
  },
  /** { '2026-10-30': 61.2 } —— 一天一条，重复记录就覆盖 */
  weights: stored?.weights || seedWeights(),
  /** { '2026-10-30': true } —— 「今天我来了」，比称重轻得多，凑连续天数用 */
  checkins: stored?.checkins || {}
})

watch(body, (value) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(value))
  } catch {
    /* 配额满就算了，页面照常 */
  }
}, { deep: true })

/* ---------------- 读取 ---------------- */

export const history = computed(() =>
  Object.entries(body.weights)
    .map(([date, kg]) => ({ date, kg: Number(kg) }))
    .filter((item) => Number.isFinite(item.kg) && item.kg > 0)
    .sort((a, b) => (a.date < b.date ? -1 : 1))
)

export const latest = computed(() => history.value[history.value.length - 1] || null)
export const first = computed(() => history.value[0] || null)

/** 最近 N 天的点，给折线图用 */
export function series(days = 30) {
  const from = shiftDays(dateKey(), -days)
  return history.value.filter((item) => item.date >= from)
}

/** 与一周前相比的变化（正数=涨了） */
export const weekChange = computed(() => {
  if (!latest.value) return null
  const cutoff = shiftDays(latest.value.date, -7)
  const before = [...history.value].reverse().find((item) => item.date <= cutoff)
  const base = before || first.value
  if (!base || base.date === latest.value.date) return null
  return Math.round((latest.value.kg - base.kg) * 10) / 10
})

/* ---------------- 计算 ---------------- */

export const activityFactor = computed(
  () => ACTIVITY_LEVELS.find((a) => a.id === body.profile.activity)?.factor || 1.375
)

/** Mifflin-St Jeor */
export const bmr = computed(() => {
  const { height, age, sex } = body.profile
  const weight = latest.value?.kg || body.profile.goalWeight
  const base = 10 * weight + 6.25 * height - 5 * age
  return Math.round(sex === 'male' ? base + 5 : base - 161)
})

export const tdee = computed(() => Math.round(bmr.value * activityFactor.value))

/** 每周减 R kg ≈ 每天少吃 R*7700/7 kcal */
export const deficit = computed(() => Math.round((body.profile.weeklyRate * 7700) / 7))

/** 每日建议摄入：带下限保护，不鼓励极端节食 */
export const goalKcal = computed(() => {
  const floor = body.profile.sex === 'male' ? 1500 : 1200
  return Math.max(floor, tdee.value - deficit.value)
})

/** 下限被触发了（说明想瘦太快） */
export const floorHit = computed(
  () => tdee.value - deficit.value < (body.profile.sex === 'male' ? 1500 : 1200)
)

export const toGoal = computed(() => {
  if (!latest.value) return 0
  return Math.round((latest.value.kg - body.profile.goalWeight) * 10) / 10
})

export const weeksLeft = computed(() => {
  if (body.profile.weeklyRate <= 0 || toGoal.value <= 0) return 0
  return Math.ceil(toGoal.value / body.profile.weeklyRate)
})

export const etaLabel = computed(() => {
  if (!weeksLeft.value) return toGoal.value <= 0 ? '已达成目标' : '未设置减重速度'
  const d = new Date()
  d.setDate(d.getDate() + weeksLeft.value * 7)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
})

/** 0–100：从最初体重走到目标体重的进度 */
export const progress = computed(() => {
  const start = first.value?.kg
  const now = latest.value?.kg
  if (!start || !now) return 0
  const total = start - body.profile.goalWeight
  if (total <= 0) return 100
  return Math.max(0, Math.min(100, Math.round(((start - now) / total) * 100)))
})

/** 已经掉了多少 kg（正数=瘦了） */
export const lostKg = computed(() => {
  if (!first.value || !latest.value) return 0
  return Math.round((first.value.kg - latest.value.kg) * 10) / 10
})

/** 每减 1kg 解锁一枚里程碑贴纸 */
export const medals = computed(() => Math.max(0, Math.floor(lostKg.value)))

/**
 * 连续打卡天数：从今天（或昨天，视今天打没打卡）往回数。
 * 「打卡」= 当天称了体重，或者当天点了打卡按钮，二者算一个。
 */
export const streakDays = computed(() => {
  const dates = new Set(history.value.map((item) => item.date))
  for (const [date, on] of Object.entries(body.checkins || {})) {
    if (on) dates.add(date)
  }
  if (!dates.size) return 0

  let cursor = dateKey()
  // 今天还没打卡就先从昨天算起，不然一进首页 streak 就断了
  if (!dates.has(cursor)) cursor = shiftDays(cursor, -1)

  let count = 0
  while (dates.has(cursor)) {
    count += 1
    cursor = shiftDays(cursor, -1)
  }
  return count
})

/** 今天打过卡了没有（称重也算） */
export const checkedToday = computed(
  () => !!body.checkins?.[dateKey()] || body.weights?.[dateKey()] !== undefined
)

/** 打卡（重复点不会加天数，返回 false） */
export function checkIn(date = dateKey()) {
  if (!body.checkins) body.checkins = {}
  if (body.checkins[date]) return false
  body.checkins[date] = true
  return true
}

/** 撤销今天的打卡（称过重的那天撤不掉，得先删体重） */
export function undoCheckIn(date = dateKey()) {
  if (!body.checkins?.[date]) return false
  delete body.checkins[date]
  return true
}

/* ---------------- 写入 ---------------- */

export function logWeight(kg, date = dateKey()) {
  const value = Math.round(Number(kg) * 10) / 10
  if (!Number.isFinite(value) || value <= 0 || value > 300) return false
  body.weights[date] = value
  return true
}

export function removeWeight(date) {
  if (body.weights[date] === undefined) return false
  delete body.weights[date]
  return true
}

/** 把 'YYYY-MM-DD' 显示成 '10/30' */
export function shortDate(key) {
  const [, m, d] = key.split('-')
  return `${Number(m)}/${Number(d)}`
}
