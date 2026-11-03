/**
 * 全局状态（不引 Pinia）：
 * 1. 记录与设置持久化到 localStorage —— 刷新、关掉浏览器都还在；
 * 2. 跨页面共享 draft，保证「拍照 → 编辑 → 保存 → 首页/周报」数据一致；
 * 3. 没有后端也能「可落地」，本地存储是这类记录产品的底线。
 *
 * 组员 5 补充：
 * · 每条记录带 date（YYYY-MM-DD）与 deco（贴在照片上的贴纸），日历和历史都按它分组；
 * · lastAdded 记录「最近新增的那条」，历史页据此播放新卡片动画 + 高亮；
 * · 编辑已存在的记录走 editId，不再用「同名覆盖」这种会误伤的做法。
 */
import { reactive, watch } from 'vue'
import { seedEntries, recognised, blankDraft } from '../data/mock'
import { CARTOON_STYLES } from '../utils/cartoonify'
import { dateKey } from './body'

const JOURNAL_KEY = 'sushine:journal:v1'
const SETTINGS_KEY = 'sushine:settings:v1'

const DEFAULT_SETTINGS = {
  remind: true,
  lunch: '12:30',
  dinner: '18:30',
  /** 无压力模式：全站弱化热量数字，只看照片和记录 */
  hideKcal: false,
  /** 贴纸风格：photo / flat / ink / poster，见 utils/cartoonify.js */
  cartoonStyle: 'photo'
}

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    // 隐私模式 / 存储被禁用时退化为纯内存，不影响使用
    return fallback
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* 配额满或被禁用：静默失败，页面照常跑 */
  }
}

/* ---------------- id 生成 ---------------- */

let seq = 0
/** 同一毫秒内连点两次也不会撞 id */
export function nextId() {
  seq = (seq + 1) % 1296
  return `r-${Date.now().toString(36)}-${seq.toString(36)}`
}

function cloneNutrition(list) {
  return (list || []).map((n) => ({ ...n }))
}

function cloneDeco(list) {
  return (list || []).map((d) => ({ ...d }))
}

/* ---------------- 草稿 ---------------- */

function freshDraft() {
  return {
    ...recognised,
    date: dateKey(),
    editId: null,
    deco: [],
    raw: '',
    aiSource: '',
    nutrition: cloneNutrition(recognised.nutrition)
  }
}

const storedEntries = read(JOURNAL_KEY, null)

export const journal = reactive({
  // null = 从没存过 → 用种子数据；[] = 用户清空过 → 尊重用户
  entries: storedEntries ?? seedEntries.map((e) => ({ ...e })),
  draft: freshDraft(),
  lastSaved: null,
  /** { id, date, at } —— 新增记录时打点，历史页据此高亮 */
  lastAdded: null
})

export const settings = reactive({ ...DEFAULT_SETTINGS, ...read(SETTINGS_KEY, {}) })

// 老版本存过 flat / ink / poster，这些画法已经删了，加载时回落到默认
if (!CARTOON_STYLES.some((s) => s.id === settings.cartoonStyle)) {
  settings.cartoonStyle = DEFAULT_SETTINGS.cartoonStyle
}

watch(() => journal.entries, (value) => write(JOURNAL_KEY, value), { deep: true })
watch(settings, (value) => write(SETTINGS_KEY, value), { deep: true })

export function resetDraft() {
  Object.assign(journal.draft, freshDraft())
  journal.draft.cartoonized = false
}

/** 手动记一餐：清空草稿，走同一套编辑流程 */
export function startManualDraft(date = dateKey()) {
  const blank = blankDraft()
  Object.assign(journal.draft, blank, { date, editId: null, deco: [], raw: '' })
  return journal.draft
}

/**
 * 打开一条已有记录（详情 / 编辑 / 装饰）。
 * 用 Object.assign 原地改，而不是换对象 —— 各页面 setup 时拿的是同一个引用。
 */
export function openDraft(entry) {
  if (!entry) return journal.draft
  Object.assign(journal.draft, {
    name: entry.name,
    emoji: entry.emoji,
    confidence: entry.confidence ?? 92,
    meal: entry.meal,
    time: entry.time,
    note: entry.note,
    tag: entry.tag,
    kcal: entry.kcal,
    weight: entry.weight || '约 500 g',
    portionHint: '来自手账 · 改完营养值同步',
    img: entry.img,
    raw: entry.img,
    cartoonized: true,
    recognized: true,
    aiSource: 'demo',
    date: entry.date || dateKey(),
    editId: entry.id,
    deco: cloneDeco(entry.deco),
    nutrition: cloneNutrition(entry.nutrition || journal.draft.nutrition)
  })
  return journal.draft
}

/* ---------------- 写入 ---------------- */

/**
 * 保存草稿到手账。
 * · 有 editId → 更新那一条（改完不会多出一张卡）
 * · 没有 → 新增，并给 lastAdded 打点
 */
export function saveDraft() {
  const d = journal.draft
  const date = d.date || dateKey()
  const base = {
    name: d.name || '未命名的一餐',
    emoji: d.emoji || '🍽',
    time: d.time,
    note: d.note || '刚刚记下的一餐',
    tag: d.tag || '今天',
    meal: d.meal,
    kcal: Number(d.kcal) || 0,
    weight: d.weight,
    img: d.img,
    deco: cloneDeco(d.deco),
    nutrition: cloneNutrition(d.nutrition)
  }

  const idx = d.editId ? journal.entries.findIndex((e) => e.id === d.editId) : -1
  if (idx > -1) {
    const item = { ...journal.entries[idx], ...base, date }
    journal.entries.splice(idx, 1, item)
    journal.lastSaved = item
    journal.draft.editId = null
    return item
  }

  const item = { id: nextId(), date, createdAt: Date.now(), cartoonized: true, ...base }
  journal.entries.unshift(item)
  journal.lastSaved = item
  journal.lastAdded = { id: item.id, date, at: Date.now() }
  journal.draft.editId = null
  return item
}

/** 供模拟数据库（store/db.js）调用的新增入口 */
export function addRecord(payload) {
  const d = payload || {}
  const item = {
    id: nextId(),
    date: d.date || dateKey(),
    createdAt: Date.now(),
    name: d.name || '未命名的一餐',
    emoji: d.emoji || '🍽',
    time: d.time || '12:00',
    note: d.note || '',
    tag: d.tag || '手动记录',
    meal: d.meal || '午餐',
    kcal: Number(d.kcal) || 0,
    weight: d.weight || '',
    img: d.img || '',
    deco: cloneDeco(d.deco),
    nutrition: cloneNutrition(d.nutrition),
    cartoonized: true
  }
  journal.entries.unshift(item)
  journal.lastSaved = item
  journal.lastAdded = { id: item.id, date: item.date, at: Date.now() }
  return item.id
}

export function removeEntry(id) {
  const idx = journal.entries.findIndex((e) => e.id === id)
  if (idx > -1) journal.entries.splice(idx, 1)
  return idx > -1
}

/** 把贴纸装饰写回某条记录（装饰页保存时用） */
export function setDeco(id, deco) {
  const entry = journal.entries.find((e) => e.id === id)
  if (!entry) return false
  entry.deco = cloneDeco(deco)
  return true
}

export function totalKcal() {
  return journal.entries.reduce((sum, e) => sum + (Number(e.kcal) || 0), 0)
}

/** 导出用：把当前记录拼成可读文本 */
export function toExportText() {
  const lines = [`Sushine 手账导出 · ${new Date().toLocaleString('zh-CN')}`, '']
  journal.entries.forEach((e, i) => {
    lines.push(
      `${i + 1}. ${e.name}　${e.meal || ''}　${e.time}　${e.kcal} kcal`,
      `   备注：${e.note || '—'}`
    )
  })
  return lines.join('\n')
}
