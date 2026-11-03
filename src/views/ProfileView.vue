<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import SCard from '../components/SCard.vue'
import SSheet from '../components/SSheet.vue'
import SToast from '../components/SToast.vue'
import { journal, settings, toExportText } from '../store/journal'
import { auth, logout, tagLine } from '../store/auth'
import { user as demoUser } from '../data/mock'
import { latest } from '../store/body'
import { todayBurn } from '../store/activity'

const router = useRouter()
const sheet = ref(false)
const toast = ref('')
let toastTimer = null

/** 真实登录用户；理论上守卫已经拦住未登录，兜底用演示数据 */
const me = computed(() => auth.user || demoUser)
const avatar = computed(() => (me.value.name || 'P').trim()[0].toUpperCase())
const tagText = computed(() => tagLine(auth.user?.tags))
const cardCount = computed(() => journal.entries.length)
const bodyGoalText = computed(() => (latest.value ? `${latest.value.kg} kg` : '去记录'))
const days = computed(() => {
  const start = auth.user?.joinedAt
  if (!start) return demoUser.days
  return Math.max(1, Math.ceil((Date.now() - start) / 86400000))
})

function showToast(text) {
  toast.value = text
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 1600)
}

function toggleRemind() {
  settings.remind = !settings.remind
  showToast(settings.remind ? '已开启用餐提醒' : '已关闭用餐提醒')
}

function toggleHideKcal() {
  settings.hideKcal = !settings.hideKcal
  showToast(settings.hideKcal ? '已开启无压力模式' : '已关闭无压力模式')
}

/** 真实导出：把本地记录存成文件 */
function exportJournal() {
  const data = {
    app: 'Sushine',
    user: me.value.name,
    exportedAt: new Date().toISOString(),
    entries: journal.entries
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `sushine-handbook-${Date.now()}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
  showToast(`✓ 已导出 ${journal.entries.length} 条记录`)
}

async function copyExportText() {
  try {
    await navigator.clipboard.writeText(toExportText())
    sheet.value = false
    showToast('✓ 已复制为文本')
  } catch {
    showToast('浏览器不允许复制')
  }
}

function clearAll() {
  journal.entries.splice(0)
  sheet.value = false
  showToast('已清空本机手账')
}

function signOut() {
  logout()
  // 手账数据留在本机，换账号登录还能看到
  router.replace('/login')
}
</script>

<template>
  <div class="page profile">
    <header class="me">
      <h1 class="me-title">我的</h1>
      <p class="me-sub">记录 {{ days }} 天，攒下 {{ cardCount }} 张卡片</p>
    </header>

    <SCard class="pcard" :level="1" radius="22px" padded>
      <span class="av">{{ avatar }}</span>
      <div class="who">
        <b>{{ me.name }}</b>
        <span>{{ tagText }}</span>
      </div>
    </SCard>

    <section class="mlist">
      <div class="mr">
        <em>🔔</em>用餐提醒
        <span>{{ settings.remind ? `${settings.lunch} / ${settings.dinner}` : '已关闭' }}</span>
        <button
          class="switch"
          :class="{ on: settings.remind }"
          role="switch"
          :aria-checked="settings.remind"
          aria-label="用餐提醒开关"
          @click="toggleRemind"
        >
          <i></i>
        </button>
      </div>

      <div class="mr">
        <em>🌿</em>无压力模式
        <span>{{ settings.hideKcal ? '只看照片，不显示热量' : '显示热量与目标' }}</span>
        <button
          class="switch"
          :class="{ on: settings.hideKcal }"
          role="switch"
          :aria-checked="settings.hideKcal"
          aria-label="无压力模式开关"
          @click="toggleHideKcal"
        >
          <i></i>
        </button>
      </div>

      <button class="mr" @click="exportJournal">
        <em>📘</em>导出手账<span>JSON</span>
      </button>

      <button class="mr mr--link" @click="router.push('/collection')">
        <em>🏷</em>我的贴纸<span>收藏面板</span>
      </button>

      <button class="mr" @click="router.push('/body')">
        <em>⚖️</em>体重与目标<span>现在 {{ bodyGoalText }}</span>
      </button>

      <button class="mr" @click="router.push('/activity')">
        <em>🏃</em>运动记录<span>今日 {{ todayBurn }} kcal</span>
      </button>

      <button class="mr" @click="router.push('/report?scope=week')">
        <em>📊</em>本周周报<span>热量 / 营养 / 最常吃</span>
      </button>

      <button class="mr" @click="router.push('/tags')">
        <em>✨</em>我的标签<span>重新挑</span>
      </button>

      <button class="mr" @click="sheet = true">
        <em>⚙️</em>设置<span></span>
      </button>
    </section>

    <button class="signout" @click="signOut">退出登录</button>

    <p class="footnote">{{ me.name }} · Sushine v1.0 · 数据仅存在本机</p>

    <SSheet :open="sheet" title="设置" @close="sheet = false">
      <button class="opt" @click="copyExportText">📋 复制为文本</button>
      <button class="opt" @click="clearAll">🗑 清空本机手账（{{ journal.entries.length }} 条）</button>
      <button class="opt" @click="sheet = false; showToast('Sushine v1.0 · 前端骨架演示')">
        ℹ️ 关于 Sushine
      </button>
    </SSheet>

    <SToast :show="!!toast" :text="toast" />
  </div>
</template>

<style scoped>
.me-title {
  margin: 0;
  font-size: 25px;
  font-weight: 800;
}

.me-sub {
  margin: 8px 0 0;
  font-size: 10.5px;
  color: var(--ink-3);
}

.pcard {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 18px;
  padding: 15px 16px;
}

.av {
  flex: 0 0 auto;
  width: 54px;
  height: 54px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 24px;
  font-weight: 700;
  color: #c0703d;
  background: #fbe7d6;
}

.who b {
  display: block;
  margin-bottom: 6px;
  font-size: 16px;
  font-weight: 700;
}

.who span {
  font-size: 10.5px;
  color: var(--ink-3);
}

.mlist {
  margin-top: 14px;
  padding: 2px 16px;
  border-radius: 22px;
  background: #fff;
  box-shadow: 0 12px 28px rgba(150, 115, 80, 0.1);
}

.mr {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 0;
  border-bottom: 1px dashed #f1e7da;
  font-size: 12.5px;
  color: #4a3e34;
  text-align: left;
}

.mr:last-child {
  border-bottom: none;
}

.mr--link:active {
  opacity: 0.65;
}

.mr em {
  font-style: normal;
  font-size: 13px;
}

.mr span {
  margin-left: auto;
  font-size: 10.5px;
  color: var(--ink-3);
}

.switch {
  position: relative;
  width: 40px;
  height: 24px;
  margin-left: 10px;
  border-radius: 99px;
  background: var(--paper-3);
  transition: background 200ms var(--ease);
  flex: 0 0 auto;
}

.switch i {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(90, 60, 40, 0.25);
  transition: transform 200ms var(--ease);
}

.switch.on {
  background: var(--or);
}

.switch.on i {
  transform: translateX(16px);
}

.opt {
  width: 100%;
  height: 50px;
  padding: 0 18px;
  border-radius: 16px;
  border: 1.5px solid var(--line);
  background: #fff;
  font-size: 13.5px;
  text-align: left;
}

.opt:active {
  background: var(--paper-2);
}

.footnote {
  margin: 26px 0 0;
  text-align: center;
  font-size: 9.5px;
  letter-spacing: 0.04em;
  color: #c9bcac;
}

.signout {
  width: 100%;
  margin-top: 16px;
  padding: 14px 0;
  border-radius: 18px;
  border: 1.5px solid var(--line);
  background: #fff;
  font-size: 12.5px;
  color: var(--err);
  letter-spacing: 0.04em;
}

.signout:active {
  background: var(--paper-2);
}
</style>
