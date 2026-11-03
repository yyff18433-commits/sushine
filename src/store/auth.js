/**
 * 「账号」状态（纯前端演示）。
 *
 * 没有后端：账号表存在本机 localStorage，密码只做一次浅哈希。
 * 这不是安全方案，只是让注册 / 登录 / 退出这条链路在产品上是完整的、能演示。
 */
import { reactive, watch } from 'vue'

const ACCOUNTS_KEY = 'sushine:accounts:v1'
const SESSION_KEY = 'sushine:auth:v1'

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* 存储被禁用：退化成纯内存，页面照常跑 */
  }
}

function hash(text) {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(16)
}

function accounts() {
  return read(ACCOUNTS_KEY, [])
}

/** 当前登录用户；null = 未登录 */
export const auth = reactive({
  user: read(SESSION_KEY, null)
})

watch(
  () => auth.user,
  (value) => write(SESSION_KEY, value),
  { deep: true }
)

export function register({ name, email, pass }) {
  const key = String(email || '').trim().toLowerCase()
  const list = accounts()

  if (list.some((a) => a.email === key)) {
    return { ok: false, message: '这个邮箱已经注册过了，直接登录吧' }
  }

  const account = {
    email: key,
    name: String(name || '').trim(),
    pass: hash(String(pass)),
    tags: [],
    onboarded: false,
    joinedAt: Date.now()
  }
  list.push(account)
  write(ACCOUNTS_KEY, list)

  auth.user = { ...account }
  return { ok: true }
}

export function login({ email, pass }) {
  const key = String(email || '').trim().toLowerCase()
  const found = accounts().find((a) => a.email === key)

  if (!found) return { ok: false, message: '没有这个邮箱，先注册一个吧' }
  if (found.pass !== hash(String(pass))) return { ok: false, message: '密码不对，再试一次' }

  auth.user = {
    email: found.email,
    name: found.name,
    tags: found.tags || [],
    onboarded: !!found.onboarded,
    joinedAt: found.joinedAt
  }
  return { ok: true }
}

/** 演示用：不注册也能进去看，方便答辩 / 试用 */
export function guest() {
  auth.user = {
    email: 'demo@sushine.app',
    name: 'Potato',
    tags: ['不辣', '爱面食', '周三下厨'],
    onboarded: true,
    guest: true,
    // 往前挪 127 天，首页/我的 显示「记录 128 天」才像老用户
    joinedAt: Date.now() - 127 * 86400000
  }
}

/** 选完标签后写回会话 + 账号表（下次登录还带着） */
export function setTags(tags) {
  if (!auth.user) return
  auth.user.tags = [...tags]
  auth.user.onboarded = true

  const list = accounts()
  const i = list.findIndex((a) => a.email === auth.user.email)
  if (i > -1) {
    list[i] = { ...list[i], tags: auth.user.tags, onboarded: true }
    write(ACCOUNTS_KEY, list)
  }
}

export function logout() {
  auth.user = null
}

/** 标签拼成「不辣 · 爱面食 · 周三下厨」，直接给「我的」页用 */
export function tagLine(tags, fallback = '还没挑口味标签') {
  return tags && tags.length ? tags.join(' · ') : fallback
}
