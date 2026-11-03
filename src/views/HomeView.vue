<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import SMealCard from '../components/SMealCard.vue'
import SEmpty from '../components/SEmpty.vue'
import SSheet from '../components/SSheet.vue'
import SToast from '../components/SToast.vue'
import { journal, openDraft, removeEntry } from '../store/journal'
import { auth } from '../store/auth'
import {
  body,
  latest,
  weekChange,
  series,
  progress,
  streakDays,
  medals,
  checkedToday,
  checkIn,
  dateKey
} from '../store/body'
import { todayBurn } from '../store/activity'
import { recordsOn, recentDays, checkedOn, prettyDate, weekdayOf } from '../store/db'

const router = useRouter()

/** 头像直接取登录用户昵称首字母 */
const avatar = computed(() => (auth.user?.name || 'S').trim()[0].toUpperCase())

/* ---------- 日期条：最近 7 天，数据来自模拟数据库 ---------- */
const days = computed(() => recentDays(7))
const activeKey = ref(dateKey())

const isToday = computed(() => activeKey.value === dateKey())

const headerDate = computed(() => {
  if (isToday.value) return `今天 · ${prettyDate(activeKey.value)} ${weekdayOf(activeKey.value)}`
  return `${prettyDate(activeKey.value)} · ${weekdayOf(activeKey.value)}`
})
const headerTitle = computed(() => (isToday.value ? '今天吃了什么？' : '这一天吃了什么？'))

const weekMeals = computed(() => days.value.reduce((sum, d) => sum + d.count, 0))
const weekKcal = computed(() => days.value.reduce((sum, d) => sum + d.kcal, 0))

/* ---------- 当天的餐卡 ---------- */
const feed = computed(() => recordsOn(activeKey.value))
const checkedActive = computed(() => checkedOn(activeKey.value))

const emptyTitle = computed(() => (isToday.value ? '今天还没记录' : '这一天还没有记录'))
const emptyDesc = computed(() =>
  isToday.value ? '拍下第一餐，从这一刻开始' : '点这里，把这一天补上'
)

/* ---------- 体重卡 ---------- */
const spark = computed(() => {
  const points = series(21)
  if (points.length < 2) return ''
  const values = points.map((p) => p.kg)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  return points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * 66
      const y = 24 - ((p.kg - min) / span) * 24
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
})

const weekDeltaText = computed(() => {
  if (weekChange.value === null) return '还没有一周前的数据'
  if (weekChange.value === 0) return '和上周持平'
  const sign = weekChange.value > 0 ? '+' : ''
  return `较上周 ${sign}${weekChange.value} kg`
})

/* ---------- 提示 ---------- */
const menuEntry = ref(null)
const toast = ref('')
const flashId = ref('')
let toastTimer = null
let flashTimer = null

function showToast(text) {
  toast.value = text
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 1700)
}

/* ---------- 卡片操作 ---------- */
function openEntry(entry) {
  openDraft(entry)
  router.push('/sticker-info')
}

function editEntry() {
  const entry = menuEntry.value
  if (!entry) return
  menuEntry.value = null
  openDraft(entry)
  router.push('/edit')
}

function decorateEntry() {
  const entry = menuEntry.value
  if (!entry) return
  menuEntry.value = null
  openDraft(entry)
  router.push('/decorate')
}

function deleteEntry(entry) {
  const target = entry || menuEntry.value
  if (!target) return
  removeEntry(target.id)
  menuEntry.value = null
  showToast('已删除这条记录')
}

function onFav({ entry, on }) {
  showToast(on ? `已收藏「${entry.name}」` : '已取消收藏')
}

/* ---------- 每日打卡 ---------- */
const popCheckin = ref(false)

function onCheckIn() {
  if (checkedToday.value) {
    showToast(`今天已经打过卡了 · 连续 ${streakDays.value} 天`)
    return
  }
  checkIn()
  popCheckin.value = true
  setTimeout(() => (popCheckin.value = false), 700)
  // 读 computed 要在写入之后，才能拿到 +1 后的天数
  showToast(`打卡成功 · 连续 ${streakDays.value} 天 🎉`)
}

/* ---------- 刚保存完进来：直接落在新增的那一天并高亮 ---------- */
onMounted(() => {
  const added = journal.lastAdded
  if (!added || Date.now() - added.at > 20000) return
  activeKey.value = added.date || dateKey()
  flashId.value = added.id
  nextTick(() => {
    document
      .querySelector(`[data-rid="${added.id}"]`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
  clearTimeout(flashTimer)
  flashTimer = setTimeout(() => (flashId.value = ''), 2600)
})

/* ---------- 刚保存完进来：直接落在新增的那一天并高亮 ---------- */
onMounted(() => {
  const added = journal.lastAdded
  if (!added || Date.now() - added.at > 20000) return
  activeKey.value = added.date || dateKey()
  flashId.value = added.id
  nextTick(() => {
    document
      .querySelector(`[data-rid="${added.id}"]`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
  clearTimeout(flashTimer)
  flashTimer = setTimeout(() => (flashId.value = ''), 2600)
})

/* ---------- 新增记录：切到那一天 + 高亮 ---------- */
watch(
  () => journal.lastAdded?.id,
  () => {
    const added = journal.lastAdded
    if (!added) return
    activeKey.value = added.date || dateKey()
    flashId.value = added.id
    nextTick(() => {
      document
        .querySelector(`[data-rid="${added.id}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
    clearTimeout(flashTimer)
    flashTimer = setTimeout(() => (flashId.value = ''), 2600)
    showToast('✓ 新记录已加入手账')
  }
)
</script>

<template>
  <div class="page home">
    <header class="hd">
      <div>
        <p class="hd-date">{{ headerDate }}</p>
        <h1 class="hd-title">{{ headerTitle }}</h1>
      </div>
      <div class="hd-right">
        <button class="wk-btn" @click="router.push('/report?scope=week')">📊 周报</button>
        <button class="ava" aria-label="我的" @click="router.push('/profile')">{{ avatar }}</button>
      </div>
    </header>

    <!-- 最近 7 天：有记录的日子会亮，打卡的日子有火苗 -->
    <div class="week">
      <button
        v-for="d in days"
        :key="d.key"
        class="week-day"
        :class="{ on: d.key === activeKey, today: d.isToday }"
        @click="activeKey = d.key"
      >
        <span class="wd-l">{{ d.weekday.replace('周', '') }}</span>
        <b class="wd-d">{{ d.day }}</b>
        <i v-if="d.count" class="dot" aria-hidden="true"></i>
        <em v-else-if="d.checked" class="mini-flame" aria-hidden="true">🔥</em>
        <i v-else class="dot dot--off" aria-hidden="true"></i>
      </button>
    </div>

    <p class="week-sum">
      这 7 天：<b>{{ weekMeals }}</b> 餐 · <b>{{ weekKcal.toLocaleString('zh-CN') }}</b> kcal
      <button class="week-link" @click="router.push('/month?view=history')">全部历史 ›</button>
    </p>

    <button class="wcard" @click="router.push('/body')">
      <span class="w-left">
        <span class="w-label">体重</span>
        <b class="w-num">{{ latest ? latest.kg : '—' }}<i>kg</i></b>
        <span class="w-delta" :class="{ down: weekChange < 0, up: weekChange > 0 }">{{ weekDeltaText }}</span>
      </span>
      <span class="w-right">
        <svg v-if="spark" class="w-spark" viewBox="0 0 66 24" preserveAspectRatio="none" aria-hidden="true">
          <polyline
            :points="spark"
            fill="none"
            stroke="var(--or)"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <span class="w-goal">目标 {{ body.profile.goalWeight }}kg · {{ progress }}%</span>
      </span>
    </button>

    <!-- 每日打卡：连续天数 + 今日消耗 -->
    <section class="daily">
      <div class="dl-row">
        <span class="dl-ic" :class="{ pop: popCheckin }">🔥</span>
        <span class="dl-txt">连续 <b>{{ streakDays }}</b> 天<em class="dl-medal">🏅 {{ medals }} 枚</em></span>
        <button class="dl-btn" :class="{ on: checkedToday }" @click="onCheckIn">
          {{ checkedToday ? '✓ 今天已打卡' : '今天打卡' }}
        </button>
      </div>
      <button class="dl-row dl-row--link" @click="router.push('/activity')">
        <span class="dl-ic">🏃</span>
        <span class="dl-txt">今日消耗 <b>{{ todayBurn }}</b> kcal</span>
        <span class="dl-more">运动记录 ›</span>
      </button>
    </section>

    <!-- 当天小结 -->
    <div v-if="feed.length" class="daybar">
      <span>{{ isToday ? '今天' : prettyDate(activeKey) }} · {{ feed.length }} 餐</span>
      <b>{{ feed.reduce((s, e) => s + (Number(e.kcal) || 0), 0) }} kcal</b>
      <i v-if="checkedActive" class="ok">🔥 已打卡</i>
    </div>

    <TransitionGroup name="feed" tag="div" class="feed">
      <SMealCard
        v-for="(entry, i) in feed"
        :key="entry.id"
        :entry="entry"
        :index="i"
        :flash="flashId === entry.id"
        @open="openEntry"
        @more="menuEntry = $event"
        @delete="deleteEntry"
        @fav="onFav"
      />
    </TransitionGroup>

    <SEmpty v-if="!feed.length" :title="emptyTitle" :desc="emptyDesc">
      <button class="empty-btn" @click="router.push(isToday ? '/camera' : `/camera?date=${activeKey}`)">
        {{ isToday ? '去拍一张' : '补记这一天' }}
      </button>
    </SEmpty>

    <SSheet :open="!!menuEntry" title="这条记录" @close="menuEntry = null">
      <button class="opt" @click="editEntry">✏️ 编辑信息</button>
      <button class="opt" @click="decorateEntry">✨ 贴纸装饰</button>
      <button class="opt" @click="deleteEntry()">🗑 删除这条记录</button>
    </SSheet>

    <SToast :show="!!toast" :text="toast" />
  </div>
</template>

<style scoped>
.hd {
  display: flex;
  align-items: flex-start;
}

.hd-date {
  margin: 0;
  font-size: 10.5px;
  letter-spacing: 0.02em;
  color: var(--ink-3);
}

.hd-title {
  margin: 7px 0 0;
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.01em;
}

.ava {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 16px;
  font-weight: 700;
  color: #c0703d;
  background: #fbe7d6;
  box-shadow: 0 6px 14px rgba(150, 115, 80, 0.1);
}

.hd-right {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

/* 体重卡：一条弧线就能看出这周有没有在掉 */
.wcard {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 14px;
  padding: 12px 15px;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 10px 24px rgba(150, 115, 80, 0.1);
  text-align: left;
}

.wcard:active {
  background: var(--paper-2);
}

.w-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.w-label {
  font-size: 9px;
  letter-spacing: 0.12em;
  color: var(--ink-3);
}

.w-num {
  font-size: 21px;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.w-num i {
  margin-left: 2px;
  font-style: normal;
  font-size: 9.5px;
  font-weight: 600;
  color: var(--ink-3);
}

.w-delta {
  font-size: 9px;
  color: var(--ink-3);
}

.w-delta.down {
  color: var(--ok);
}

.w-delta.up {
  color: var(--err);
}

.w-right {
  margin-left: auto;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.w-spark {
  width: 66px;
  height: 24px;
  display: block;
}

.w-goal {
  font-size: 8.5px;
  color: var(--ink-3);
}

/* 每日打卡卡 */
.daily {
  margin-top: 8px;
  border-radius: 16px;
  background: var(--or-xs);
  border: 1.5px dashed var(--line);
  overflow: hidden;
}

.dl-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  font-size: 10px;
  color: var(--ink-2);
  text-align: left;
}

.dl-row--link {
  border-top: 1.5px dashed var(--line);
  padding: 9px 12px;
}

.dl-ic {
  font-size: 12px;
  line-height: 1;
}

.dl-ic.pop {
  animation: heart-pop 620ms var(--ease);
}

.dl-txt {
  flex: 1 1 auto;
  min-width: 0;
}

.dl-txt b {
  font-size: 12.5px;
  font-weight: 800;
  color: var(--or-d);
}

.dl-medal {
  margin-left: 5px;
  font-style: normal;
  font-size: 9px;
  color: var(--ink-3);
}

.dl-more {
  margin-left: auto;
  font-size: 9px;
  color: var(--ink-3);
  white-space: nowrap;
}

.dl-btn {
  margin-left: auto;
  flex: 0 0 auto;
  padding: 7px 14px;
  border-radius: 999px;
  background: var(--or);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
  box-shadow: 0 2px 0 var(--or-d);
  transition: transform 140ms var(--ease), background 180ms var(--ease);
}

.dl-btn:active {
  transform: translateY(1px);
  box-shadow: 0 1px 0 var(--or-d);
}

.dl-btn.on {
  background: #fff;
  color: var(--or-d);
  border: 1.5px solid var(--or-s);
  box-shadow: none;
  font-weight: 600;
}

.wk-btn {
  padding: 7px 12px;
  border-radius: var(--r-pill);
  background: #fff;
  font-size: 10.5px;
  color: var(--ink-2);
  box-shadow: 0 6px 14px rgba(150, 115, 80, 0.1);
  white-space: nowrap;
}

.wk-btn:active {
  background: var(--paper-2);
}

/* 一周日期条 */
.week {
  display: flex;
  gap: 5px;
  margin-top: 18px;
}

.week-day {
  flex: 1;
  height: 62px;
  border-radius: 15px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  font-size: 10.5px;
  color: var(--ink-2);
  background: #fff;
  box-shadow: 0 6px 14px rgba(150, 115, 80, 0.07);
  transition: background 200ms var(--ease), color 200ms var(--ease), transform 160ms var(--ease);
}

.week-day:active {
  transform: scale(0.94);
}

.wd-l {
  font-size: 9.5px;
  line-height: 1;
  letter-spacing: 0.04em;
  opacity: 0.72;
}

.wd-d {
  font-size: 13.5px;
  font-weight: 650;
  line-height: 1.1;
}

.week-day.on .wd-l {
  opacity: 0.92;
}

.dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--or);
}

.dot--off {
  background: #e2d3c0;
}

.week-day.on .dot {
  background: rgba(255, 255, 255, 0.9);
}

.mini-flame {
  font-size: 8px;
  font-style: normal;
  line-height: 1;
}

.week-day.today:not(.on) {
  box-shadow: inset 0 0 0 1.5px var(--or-s), 0 6px 14px rgba(150, 115, 80, 0.07);
}

.week-day.on {
  background: var(--or);
  color: #fff;
  box-shadow: 0 10px 22px rgba(185, 107, 69, 0.28);
}

.week-sum {
  display: flex;
  align-items: center;
  gap: 3px;
  margin: 8px 2px 0;
  font-size: 9.5px;
  color: var(--ink-3);
}

.week-sum b {
  color: var(--or-d);
  font-weight: 700;
}

.week-link {
  margin-left: auto;
  font-size: 9.5px;
  color: var(--ink-3);
  text-decoration: underline;
  text-decoration-style: dotted;
  text-underline-offset: 3px;
}

/* 当天小结条 */
.daybar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  padding: 0 4px;
  font-size: 10px;
  color: var(--ink-3);
}

.daybar b {
  margin-left: auto;
  font-size: 11px;
  color: var(--or-d);
  font-weight: 700;
}

.daybar .ok {
  font-style: normal;
  font-size: 9px;
  color: var(--ink-3);
}

/* 今日手账流 */
.feed {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* 新增卡片：从上方落下 + 高亮，和删除时的收起对应 */
.feed-enter-active {
  animation: drop-in 460ms var(--ease);
}

.feed-leave-active {
  transition: opacity 200ms var(--ease), transform 200ms var(--ease);
}

.feed-leave-to {
  opacity: 0;
  transform: scale(0.96);
}

.feed-move {
  transition: transform 260ms var(--ease);
}

.empty-btn {
  margin-top: 14px;
  height: 40px;
  padding: 0 20px;
  border-radius: var(--r-14);
  background: var(--or);
  color: #fff8f0;
  font-size: 12.5px;
  font-weight: 650;
  box-shadow: 0 3px 0 var(--or-d);
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

/* ============ 大屏（≥900px） ============ */
@media (min-width: 900px) {
  .hd-title {
    font-size: 30px;
  }

  .week {
    max-width: 760px;
    gap: 8px;
    margin-top: 22px;
  }

  .week-day {
    height: 68px;
    border-radius: 16px;
    font-size: 12px;
  }

  .wd-l {
    font-size: 11px;
  }

  .wd-d {
    font-size: 16px;
  }

  .feed {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 20px;
    margin-top: 14px;
  }
}
</style>
