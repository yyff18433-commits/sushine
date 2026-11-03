/**
 * 运动记录：把「消耗」这一半补上。
 *
 * 只有摄入没有消耗，热量缺口就永远算不准。
 * 估算用 MET：kcal = MET × 体重(kg) × 小时数，是目前最通用的简易算法。
 *
 * 纯前端，存 localStorage。和体重流水一样，一天可以有多条运动记录。
 */
import { computed, reactive, watch } from 'vue'
import { latest } from './body'
import { dateKey } from './body'

const KEY = 'sushine:activity:v1'

export const ACTIVITY_TYPES = [
  { id: 'walk', label: '走路', emoji: '🚶', met: 3.5 },
  { id: 'run', label: '跑步', emoji: '🏃', met: 8.3 },
  { id: 'bike', label: '骑行', emoji: '🚴', met: 6.8 },
  { id: 'strength', label: '力量', emoji: '🏋️', met: 5.0 },
  { id: 'swim', label: '游泳', emoji: '🏊', met: 7.0 },
  { id: 'yoga', label: '瑜伽', emoji: '🧘', met: 2.8 },
  { id: 'rope', label: '跳绳', emoji: '🪢', met: 10.0 },
  { id: 'ball', label: '球类', emoji: '🏸', met: 6.5 }
]

export function typeOf(id) {
  return ACTIVITY_TYPES.find((t) => t.id === id) || ACTIVITY_TYPES[0]
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

/** 第一次打开给几条像样的记录，周报的「净摄入」才有东西 */
function seed() {
  const today = dateKey()
  let seq = 1
  const make = (typeId, minutes) => ({
    id: `seed-${seq++}`,
    typeId,
    minutes,
    kcal: estimate(typeId, minutes)
  })
  return {
    [shiftDays(today, -6)]: [make('walk', 40)],
    [shiftDays(today, -4)]: [make('run', 25)],
    [shiftDays(today, -2)]: [make('strength', 45)],
    [shiftDays(today, -1)]: [make('walk', 55)]
  }
}

/** MET × 体重 × 小时 */
export function estimate(typeId, minutes, weightKg) {
  const met = typeOf(typeId).met
  const weight = Number(weightKg) || latest.value?.kg || 60
  const hours = Math.max(0, Number(minutes) || 0) / 60
  return Math.round(met * weight * hours)
}

const stored = read()

export const activity = reactive({
  /** { 'YYYY-MM-DD': [{ id, typeId, minutes, kcal }] } */
  days: stored || seed()
})

watch(
  () => activity.days,
  (value) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(value))
    } catch {
      /* 配额满就静默 */
    }
  },
  { deep: true }
)

export function burnOf(date) {
  const list = activity.days[date]
  if (!Array.isArray(list)) return 0
  return list.reduce((sum, item) => sum + (Number(item.kcal) || 0), 0)
}

export const todayBurn = computed(() => burnOf(dateKey()))

/** 最近 N 天（含今天）的消耗，用于柱状图 */
export function recentBurn(days = 7) {
  const today = dateKey()
  const out = []
  for (let i = days - 1; i >= 0; i--) {
    const date = shiftDays(today, -i)
    out.push({ date, kcal: burnOf(date) })
  }
  return out
}

export const weekBurn = computed(() => recentBurn(7).reduce((sum, d) => sum + d.kcal, 0))

export function addActivity(typeId, minutes, weightKg) {
  const mins = Math.round(Number(minutes))
  if (!Number.isFinite(mins) || mins <= 0 || mins > 600) return false

  const date = dateKey()
  const item = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    typeId,
    minutes: mins,
    kcal: estimate(typeId, mins, weightKg)
  }
  if (!activity.days[date]) activity.days[date] = []
  activity.days[date].push(item)
  return item
}

export function removeActivity(date, id) {
  const list = activity.days[date]
  if (!Array.isArray(list)) return false
  const index = list.findIndex((item) => item.id === id)
  if (index < 0) return false
  list.splice(index, 1)
  if (!list.length) delete activity.days[date]
  return true
}

/** 净摄入 = 吃进去 − 运动消耗 */
export function netIntake(intake, date = dateKey()) {
  return Math.max(0, Math.round(intake - burnOf(date)))
}
