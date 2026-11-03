/**
 * 前端模拟数据库（组员 5 · 模拟数据逻辑）
 *
 * 没有后端，这一层就是「数据库」：
 *   · 记录（records）—— 真实来源是 journal.entries，这里只做按日期索引、分组、统计；
 *   · 打卡（checkins）—— 复用 body 里的打卡/称重记录，避免出现两份「我到底来没来」；
 *   · 收藏（favorites）—— 单独存一份 id 列表，可持久化、可取消；
 *   · 事件（lastAdded）—— 新增一条记录时打一个时间戳，历史页据此播放「新卡片落下」动画。
 *
 * 之所以不另起一套 records 数组：两份数据必然不同步。
 * 这里只做「读模型 + 少量写入（收藏 / 种子数据）」，写入记录的唯一入口仍是 journal。
 */
import { computed, reactive, watch } from 'vue'
import { journal, nextId } from './journal'
import { body, dateKey, streakDays, checkedToday as bodyCheckedToday } from './body'
import { IMAGES } from '../data/mock'
import { PRESET_RECOGNITIONS, toNutrition } from '../data/recipes'

const KEY = 'sushine:db:v2'

function read() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function persist(value) {
  try {
    localStorage.setItem(KEY, JSON.stringify(value))
  } catch {
    /* 配额满 / 隐私模式：静默降级为内存态 */
  }
}

const stored = read()

export const db = reactive({
  /** 收藏的记录 id */
  favorites: Array.isArray(stored?.favorites) ? stored.favorites : [],
  /** 是否已经播过历史种子数据（只播一次，避免每次刷新都多一堆记录） */
  seeded: !!stored?.seeded
})

watch(
  db,
  (value) => persist({ favorites: value.favorites, seeded: value.seeded }),
  { deep: true }
)

/* ---------------- 日期工具 ---------------- */

export function shiftKey(key, days) {
  const d = new Date(`${key}T12:00:00`)
  d.setDate(d.getDate() + days)
  return dateKey(d)
}

export const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

export function weekdayOf(key) {
  return WEEKDAYS[new Date(`${key}T12:00:00`).getDay()]
}

/** 2026-11-02 → 11 月 2 日 */
export function prettyDate(key) {
  const [, m, d] = key.split('-')
  return `${Number(m)} 月 ${Number(d)} 日`
}

export function dateKeyOf(entry) {
  return entry?.date || dateKey()
}

/* ---------------- 读模型 ---------------- */

/** 某一天的全部记录（按时间正序，早餐在前） */
export function recordsOn(key) {
  return journal.entries
    .filter((e) => dateKeyOf(e) === key)
    .slice()
    .sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')))
}

/** date → records，供日历 / 历史一次性取用 */
export const byDate = computed(() => {
  const map = new Map()
  for (const entry of journal.entries) {
    const key = dateKeyOf(entry)
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(entry)
  }
  for (const list of map.values()) {
    list.sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')))
  }
  return map
})

/** 这一天算不算「打过卡」：显式打卡，或者称过体重（与连续天数口径一致） */
export function checkedOn(key) {
  return !!body.checkins?.[key] || body.weights?.[key] !== undefined
}

export const todayRecords = computed(() => recordsOn(dateKey()))
export const todayChecked = computed(() => bodyCheckedToday.value)
export const streak = computed(() => streakDays.value)

/** 历史时间线：按日期倒序分组，附带当天热量与打卡状态 */
export const historyGroups = computed(() => {
  const out = []
  for (const [key, entries] of byDate.value) {
    out.push({
      date: key,
      weekday: weekdayOf(key),
      label: prettyDate(key),
      isToday: key === dateKey(),
      entries,
      kcal: entries.reduce((sum, e) => sum + (Number(e.kcal) || 0), 0),
      checked: checkedOn(key)
    })
  }
  return out.sort((a, b) => (a.date < b.date ? 1 : -1))
})

/** 最近 N 天（含今天）的摄入与打卡，用于首页日期条 */
export function recentDays(n = 7) {
  const today = dateKey()
  const out = []
  for (let i = n - 1; i >= 0; i--) {
    const key = shiftKey(today, -i)
    const records = recordsOn(key)
    out.push({
      key,
      day: Number(key.slice(-2)),
      weekday: weekdayOf(key),
      count: records.length,
      kcal: records.reduce((sum, e) => sum + (Number(e.kcal) || 0), 0),
      checked: checkedOn(key),
      isToday: key === today
    })
  }
  return out
}

/** 某月的记录索引：{ 1: [entry], 2: [...] } */
export function monthRecords(year, monthIndex) {
  const map = new Map()
  const prefix = `${year}-${String(monthIndex).padStart(2, '0')}-`
  for (const [key, list] of byDate.value) {
    if (!key.startsWith(prefix)) continue
    map.set(Number(key.slice(-2)), list)
  }
  return map
}

/** 某月打卡天数 / 记录数 / 总热量 / 日均 */
export function monthStats(year, monthIndex) {
  const days = new Date(year, monthIndex, 0).getDate()
  const map = monthRecords(year, monthIndex)
  let meals = 0
  let kcal = 0
  let checkinDays = 0
  const todayKey = dateKey()

  for (let d = 1; d <= days; d++) {
    const key = `${year}-${String(monthIndex).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const list = map.get(d) || []
    meals += list.length
    kcal += list.reduce((sum, e) => sum + (Number(e.kcal) || 0), 0)
    if (checkedOn(key) || list.length) checkinDays += 1
    if (key > todayKey) break
  }

  return {
    recordDays: [...map.keys()].length,
    meals,
    kcal,
    checkinDays,
    avg: meals ? Math.round(kcal / meals) : 0
  }
}

/* ---------------- 收藏 ---------------- */

export function isFav(id) {
  return db.favorites.includes(id)
}

/** 返回收藏后的状态，方便页面决定播「点亮」还是「取消」动画 */
export function toggleFav(id) {
  const i = db.favorites.indexOf(id)
  if (i > -1) {
    db.favorites.splice(i, 1)
    return false
  }
  db.favorites.unshift(id)
  return true
}

export const favEntries = computed(() =>
  journal.entries.filter((e) => db.favorites.includes(e.id))
)

/* ---------------- 种子数据（只播一次） ---------------- */

const SEED_PLAN = [
  { offset: -1, preset: 'latte-croissant', time: '08:40' },
  { offset: -1, preset: 'malatang', time: '19:25' },
  { offset: -2, preset: 'chicken-salad', time: '12:10' },
  { offset: -3, preset: 'xiaolongbao', time: '08:20' },
  { offset: -3, preset: 'tomato-noodle', time: '18:50' },
  {
    offset: -4,
    preset: 'salmon-bowl',
    time: '12:30',
    deco: [
      { id: 'd-seed-1', emoji: '🥑', x: 72, y: 26, scale: 0.9, rot: 12, z: 1 },
      { id: 'd-seed-2', emoji: '✨', x: 26, y: 74, scale: 0.7, rot: -8, z: 2 }
    ]
  },
  { offset: -5, preset: 'avocado-toast', time: '09:10' },
  { offset: -5, preset: 'hotpot', time: '19:00' },
  { offset: -6, preset: 'milk-tea', time: '15:30' }
]

const SEED_IMAGES = [IMAGES.latte, IMAGES.noodles, IMAGES.duck]

/**
 * 首次进入时补一段「前几天的记录」：
 * 否则日历一片空白、历史页也演示不出「新增后立刻刷新」的对比效果。
 */
export function ensureSeed() {
  // 老数据没有 date 字段：一律归到今天，保证一定能被日历读到
  const today = dateKey()
  for (const entry of journal.entries) {
    if (!entry.date) entry.date = today
  }
  if (db.seeded) return

  const presetMap = new Map(PRESET_RECOGNITIONS.map((p) => [p.id, p]))
  SEED_PLAN.forEach((plan, i) => {
    const preset = presetMap.get(plan.preset)
    if (!preset) return
    const date = shiftKey(today, plan.offset)
    const exists = journal.entries.some((e) => e.date === date && e.name === preset.name)
    if (exists) return
    journal.entries.push({
      id: `seed-${i + 1}`,
      date,
      name: preset.name,
      emoji: preset.emoji,
      time: plan.time,
      note: preset.note,
      tag: preset.tag,
      meal: preset.meal,
      kcal: preset.kcal,
      weight: preset.weight,
      img: SEED_IMAGES[i % SEED_IMAGES.length],
      // 种子图是工程内静态资源，不走贴纸化，省 localStorage 配额
      cartoonized: true,
      nutrition: toNutrition(preset.nutrition),
      deco: plan.deco || []
    })
  })

  // 给两张收藏，收藏页一进去就有内容
  if (!db.favorites.length) {
    const picked = journal.entries.slice(-2).map((e) => e.id)
    db.favorites.push(...picked)
  }

  db.seeded = true
}

/* ---------------- 写入（唯一入口在 journal，这里只做薄封装） ---------------- */

/**
 * 新增一条记录。date 传 'YYYY-MM-DD' 可以补记到过去的日子。
 * 返回新记录的 id，页面可以据此滚动定位 / 播放高亮动画。
 */
export function addRecord(payload) {
  return journal.addRecord({ ...payload, date: payload.date || dateKey() })
}

export { nextId }
