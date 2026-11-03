<script setup>
/**
 * 日历 / 历史（组员 5 · 3 + 5）
 *
 * 上一版这块是写死的 mock：只有「10 月」和几个假日期。
 * 现在全部由模拟数据库推出来：
 *   · 日历：哪天记了几餐、哪天打了卡、今天在哪，一眼能看出来
 *   · 历史：按日期倒序的真实记录流，新增一条立刻出现并高亮
 * 两个视图共用一份数据，所以「补记一条 → 回到日历也能看到」是自然成立的。
 */
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SSticker from '../components/SSticker.vue'
import SRecordRow from '../components/SRecordRow.vue'
import SModal from '../components/SModal.vue'
import SSheet from '../components/SSheet.vue'
import SEmpty from '../components/SEmpty.vue'
import SToast from '../components/SToast.vue'
import SDecoLayer from '../components/SDecoLayer.vue'
import { journal, openDraft, removeEntry } from '../store/journal'
import { checkIn, dateKey, streakDays } from '../store/body'
import {
  historyGroups,
  monthRecords,
  monthStats,
  checkedOn,
  prettyDate,
  weekdayOf,
  isFav
} from '../store/db'

const router = useRouter()
const route = useRoute()

const view = ref(route.query.view === 'history' ? 'history' : 'calendar')
const offset = ref(0)
const toast = ref('')
let toastTimer = null

function showToast(text) {
  toast.value = text
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 1800)
}

/* ---------------- 当前显示的月份 ---------------- */

const today = dateKey()

const cursor = computed(() => {
  const base = new Date(`${today}T12:00:00`)
  const d = new Date(base.getFullYear(), base.getMonth() + offset.value, 1)
  return { year: d.getFullYear(), monthIndex: d.getMonth() + 1, isCurrent: offset.value === 0 }
})

const daysInMonth = computed(() => new Date(cursor.value.year, cursor.value.monthIndex, 0).getDate())
const firstWeekday = computed(
  () => (new Date(cursor.value.year, cursor.value.monthIndex - 1, 1).getDay() + 6) % 7
)

const recordsMap = computed(() => monthRecords(cursor.value.year, cursor.value.monthIndex))
const stats = computed(() => monthStats(cursor.value.year, cursor.value.monthIndex))

/** 每个格子要的信息：几餐、有没有图、打没打卡、是不是今天 / 未来 */
const cells = computed(() => {
  const list = []
  const cur = cursor.value
  const prefix = `${cur.year}-${String(cur.monthIndex).padStart(2, '0')}-`

  for (let i = 0; i < firstWeekday.value; i++) list.push({ key: `lead-${i}`, type: 'blank' })

  for (let d = 1; d <= daysInMonth.value; d++) {
    const key = `${prefix}${String(d).padStart(2, '0')}`
    const records = recordsMap.value.get(d) || []
    const checked = checkedOn(key)
    list.push({
      key,
      day: d,
      type: records.length ? 'rec' : checked ? 'checked' : 'plain',
      count: records.length,
      dots: Math.min(3, records.length),
      img: records.find((r) => r.img)?.img || '',
      kcal: records.reduce((sum, r) => sum + (Number(r.kcal) || 0), 0),
      checked,
      isToday: key === today,
      isFuture: key > today
    })
  }

  while (list.length % 7 !== 0) list.push({ key: `tail-${list.length}`, type: 'blank' })
  return list
})

/* ---------------- 交互 ---------------- */

const sheetDay = ref('')
const pendingDay = ref('')
const askRefill = ref(false)
const askDelete = ref(null)

const sheetRecords = computed(() =>
  sheetDay.value ? recordsMap.value.get(Number(sheetDay.value.slice(-2))) || [] : []
)
const sheetChecked = computed(() => (sheetDay.value ? checkedOn(sheetDay.value) : false))

function onDay(cell) {
  if (cell.type === 'blank') return
  if (cell.count) {
    sheetDay.value = cell.key
    return
  }
  if (cell.isFuture) {
    showToast('还没到这一天呢')
    return
  }
  // 空日子：问一句再走，不让人莫名其妙跳到拍照页
  pendingDay.value = cell.key
  askRefill.value = true
}

function refill(key = pendingDay.value) {
  askRefill.value = false
  sheetDay.value = ''
  const target = key || today
  router.push(target === today ? '/camera' : `/camera?date=${target}`)
}

function openEntry(entry) {
  sheetDay.value = ''
  openDraft(entry)
  router.push('/sticker-info')
}

function onDelete(entry) {
  askDelete.value = entry
}

function confirmDelete() {
  const entry = askDelete.value
  if (!entry) return
  removeEntry(entry.id)
  askDelete.value = null
  sheetDay.value = ''
  showToast('已删除这条记录')
}

function onFav({ entry, on }) {
  showToast(on ? `已收藏「${entry.name}」` : '已取消收藏')
}

function onCheckIn(key = sheetDay.value) {
  if (!key) return
  if (checkedOn(key)) {
    showToast('这一天已经打过卡了')
    return
  }
  checkIn(key)
  showToast(`打卡成功 · 连续 ${streakDays.value} 天 🎉`)
}

/** 日历 → 看这一天在历史里的位置 */
function jumpHistory(key) {
  sheetDay.value = ''
  view.value = 'history'
  pendingDay.value = key
  nextTick(() => {
    document.querySelector(`[data-day="${key}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

/* ---------------- 新增记录高亮 ---------------- */

const flashId = ref('')
let flashTimer = null

function highlightRecent() {
  const added = journal.lastAdded
  if (!added) return
  if (Date.now() - added.at > 20000) return
  if (view.value !== 'history') return
  flashId.value = added.id
  nextTick(() => {
    document.querySelector(`[data-rid="${added.id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
  clearTimeout(flashTimer)
  flashTimer = setTimeout(() => (flashId.value = ''), 2600)
}

watch(view, (v) => {
  router.replace({ query: v === 'history' ? { view: 'history' } : {} })
  if (v === 'history') {
    highlightRecent()
    const added = journal.lastAdded
    if (added && Date.now() - added.at < 20000) showToast('✓ 新记录已加入时间线')
  }
})

// 页面开着时新增记录（比如补记后返回）也能立刻高亮
watch(
  () => journal.lastAdded?.id,
  () => {
    if (view.value !== 'history') return
    showToast('✓ 历史已刷新')
    highlightRecent()
  }
)

onMounted(() => {
  highlightRecent()
  const added = journal.lastAdded
  if (view.value === 'history' && added && Date.now() - added.at < 20000) {
    showToast('✓ 新记录已加入时间线')
  }
})

/* ---------------- 附加信息 ---------------- */

const groups = computed(() => historyGroups.value)
const favCount = computed(() => journal.entries.filter((e) => isFav(e.id)).length)
</script>

<template>
  <div class="page month">
    <header class="mhead">
      <div class="ttl">
        <h2>
          {{ view === 'calendar' ? `${cursor.monthIndex} 月` : '历史' }}
          <i v-if="view === 'calendar'">{{ cursor.year }}</i>
          <i v-else>全部记录</i>
        </h2>
        <p class="sub">
          <template v-if="view === 'calendar'">
            <span class="flame-chip">🔥 连续 {{ streakDays }} 天</span>
            本月打卡 {{ stats.checkinDays }} 天
          </template>
          <template v-else>
            {{ groups.length }} 天 · {{ journal.entries.length }} 餐 · 收藏 {{ favCount }}
          </template>
        </p>
      </div>

      <div v-if="view === 'calendar'" class="sw">
        <button aria-label="上个月" @click="offset--">‹</button>
        <button aria-label="下个月" :disabled="offset >= 0" @click="offset++">›</button>
      </div>
    </header>

    <!-- 视图切换 -->
    <div class="seg" role="tablist" aria-label="视图">
      <span class="seg-pill" :class="{ right: view === 'history' }" aria-hidden="true"></span>
      <button
        role="tab"
        :aria-selected="view === 'calendar'"
        :class="{ on: view === 'calendar' }"
        @click="view = 'calendar'"
      >
        日历
      </button>
      <button
        role="tab"
        :aria-selected="view === 'history'"
        :class="{ on: view === 'history' }"
        @click="view = 'history'"
      >
        历史
      </button>
    </div>

    <!-- ================= 日历 ================= -->
    <template v-if="view === 'calendar'">
      <div class="mstat">
        <div>
          <b>{{ stats.checkinDays }}</b><span>打卡天数</span>
        </div>
        <div>
          <b>{{ stats.meals }}</b><span>记录餐数</span>
        </div>
        <div>
          <b>{{ stats.avg || '—' }}</b><span>每餐均值 kcal</span>
        </div>
      </div>

      <div class="calwrap">
        <div class="calgrid">
          <div v-for="w in ['一', '二', '三', '四', '五', '六', '日']" :key="w" class="wd">{{ w }}</div>

          <button
            v-for="(cell, i) in cells"
            :key="cell.key"
            class="day"
            :class="[cell.type, { today: cell.isToday, future: cell.isFuture }]"
            :style="{ '--d': Math.min(i, 30) * 11 + 'ms' }"
            :disabled="cell.type === 'blank'"
            :aria-label="cell.day ? `${cursor.monthIndex} 月 ${cell.day} 日${cell.count ? `，${cell.count} 餐` : ''}` : ''"
            @click="onDay(cell)"
          >
            <span v-if="cell.type !== 'blank'" class="dw">
              <img v-if="cell.img" :src="cell.img" alt="" />
              <b v-if="cell.day" class="dnum">{{ cell.day }}</b>
              <span v-if="cell.dots" class="dots">
                <i v-for="n in cell.dots" :key="n"></i>
              </span>
            </span>
            <i v-if="cell.checked" class="flame" aria-hidden="true">🔥</i>
            <span v-if="cell.count > 1" class="more">×{{ cell.count }}</span>
          </button>
        </div>

        <aside class="calside">
          <p class="legend">
            <span><i class="lg lg--rec"></i>有记录</span>
            <span><i class="lg lg--flame">🔥</i>已打卡</span>
            <span><i class="lg lg--today"></i>今天</span>
          </p>

          <div class="sidecard">
            <p class="sc-t">本月小结</p>
            <p class="sc-line">
              记录了 <b>{{ stats.recordDays }}</b> 天、<b>{{ stats.meals }}</b> 餐，
              平均每餐 <b>{{ stats.avg || 0 }}</b> kcal。
            </p>
            <div class="sc-bar">
              <i :style="{ width: Math.min(100, (stats.checkinDays / daysInMonth) * 100) + '%' }"></i>
            </div>
            <p class="sc-foot">打卡 {{ stats.checkinDays }} / {{ daysInMonth }} 天</p>
          </div>

          <button class="sidebtn" type="button" @click="refill(today)">＋ 记下今天这一餐</button>
        </aside>
      </div>

      <SEmpty
        v-if="!stats.meals && !stats.checkinDays"
        icon="🗓"
        :title="`${cursor.monthIndex} 月还没有记录`"
        desc="点任意一天，把那一天补上"
      />
    </template>

    <!-- ================= 历史 ================= -->
    <div v-else class="history">
      <TransitionGroup name="grp" tag="div" class="hlist">
        <section v-for="g in groups" :key="g.date" class="hgroup" :data-day="g.date">
          <header class="hhead">
            <span class="hdate">
              {{ g.label }}
              <em>{{ g.weekday }}</em>
              <i v-if="g.isToday" class="badge">今天</i>
              <i v-if="g.checked" class="hflame" aria-hidden="true">🔥</i>
            </span>
            <span class="hkcal">{{ g.kcal }} kcal</span>
          </header>

          <div class="hrows">
            <SRecordRow
              v-for="e in g.entries"
              :key="e.id"
              :entry="e"
              :flash="flashId === e.id"
              :data-rid="e.id"
              @open="openEntry"
              @delete="onDelete"
              @fav="onFav"
            />
          </div>
        </section>
      </TransitionGroup>

      <SEmpty
        v-if="!groups.length"
        icon="📖"
        title="还没有任何记录"
        desc="拍下第一餐，这里就会按天攒起来"
      >
        <button class="go-btn" @click="router.push('/camera')">去拍一张</button>
      </SEmpty>
    </div>

    <!-- 某一天的详情 -->
    <SSheet
      :open="!!sheetDay"
      :title="sheetDay ? `${prettyDate(sheetDay)} · ${weekdayOf(sheetDay)}` : ''"
      @close="sheetDay = ''"
    >
      <div class="dayinfo">
        <span :class="{ on: sheetChecked }">{{ sheetChecked ? '🔥 这一天已打卡' : '还没打卡' }}</span>
        <button v-if="!sheetChecked" class="mini" type="button" @click="onCheckIn()">补打卡</button>
      </div>

      <div class="daylist">
        <button
          v-for="e in sheetRecords"
          :key="e.id"
          class="dayitem"
          type="button"
          @click="openEntry(e)"
        >
          <span class="dthumb">
            <SSticker :src="e.img" :alt="e.name" size="40px" border="2.5px" />
            <SDecoLayer :deco="e.deco" :base="10" />
          </span>
          <span class="dtxt">
            <b>{{ e.name }}<em>{{ e.emoji }}</em></b>
            <i>{{ e.time }} · {{ e.meal }} · {{ e.kcal }} kcal</i>
          </span>
          <span class="dgo">›</span>
        </button>
      </div>

      <div class="dayacts">
        <button class="opt" type="button" @click="refill(sheetDay)">＋ 补记一餐</button>
        <button class="opt" type="button" @click="jumpHistory(sheetDay)">在历史里查看</button>
      </div>
    </SSheet>

    <SModal
      :open="askRefill"
      title="这一天还没有记录"
      text="要现在补一餐吗？记完会出现在这一天，日历上也会亮起来。"
      cancel-text="以后再说"
      confirm-text="补一餐"
      @cancel="askRefill = false"
      @confirm="refill()"
    />

    <SModal
      :open="!!askDelete"
      title="删除这条记录？"
      :text="askDelete ? `「${askDelete.name}」会从手账和日历里一起消失。` : ''"
      cancel-text="保留"
      confirm-text="删除"
      @cancel="askDelete = null"
      @confirm="confirmDelete"
    />

    <SToast :show="!!toast" :text="toast" />
  </div>
</template>

<style scoped>
.month {
  padding-bottom: 110px;
}

.mhead {
  display: flex;
  align-items: flex-start;
}

.mhead h2 {
  margin: 0;
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -0.01em;
}

.mhead h2 i {
  margin-left: 8px;
  font-style: normal;
  font-size: 12px;
  font-weight: 400;
  color: var(--ink-3);
}

.sub {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 6px 0 0;
  font-size: 10px;
  color: var(--ink-3);
}

.flame-chip {
  padding: 2px 8px;
  border-radius: var(--r-pill);
  background: var(--or-xs);
  color: var(--or-d);
  font-weight: 600;
}

.mhead .sw {
  margin-left: auto;
  display: flex;
  gap: 6px;
}

.mhead .sw button {
  width: 30px;
  height: 30px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  font-size: 13px;
  color: var(--ink-2);
  background: #fff;
  box-shadow: 0 6px 14px rgba(150, 115, 80, 0.1);
  transition: transform 140ms var(--ease), opacity 160ms var(--ease);
}

.mhead .sw button:active {
  transform: scale(0.92);
}

.mhead .sw button:disabled {
  opacity: 0.3;
}

/* 视图切换：滑块跟着走 */
.seg {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  margin: 14px 0 0;
  padding: 3px;
  border-radius: var(--r-pill);
  background: #f1e6d6;
}

.seg button {
  position: relative;
  z-index: 2;
  height: 32px;
  border-radius: var(--r-pill);
  font-size: 11.5px;
  color: var(--ink-2);
  transition: color 200ms var(--ease);
}

.seg button.on {
  color: var(--or-d);
  font-weight: 750;
}

.seg-pill {
  position: absolute;
  z-index: 1;
  top: 3px;
  left: 3px;
  width: calc(50% - 3px);
  height: 32px;
  border-radius: var(--r-pill);
  background: #fff;
  box-shadow: 0 3px 10px rgba(150, 115, 80, 0.16);
  transition: transform 280ms var(--ease);
}

.seg-pill.right {
  transform: translateX(100%);
}

/* ---------- 概览 ---------- */
.mstat {
  display: flex;
  margin-top: 14px;
  padding: 12px 6px;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 10px 24px rgba(150, 115, 80, 0.09);
}

.mstat div {
  flex: 1;
  text-align: center;
  border-right: 1px dashed #efe6da;
}

.mstat div:last-child {
  border-right: none;
}

.mstat b {
  display: block;
  font-size: 16px;
  font-weight: 750;
  color: #4a3e34;
  font-variant-numeric: tabular-nums;
}

.mstat span {
  font-size: 9px;
  color: var(--ink-3);
}

/* ---------- 日历 ---------- */
.calwrap {
  margin-top: 16px;
}

.calgrid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 7px;
}

.wd {
  text-align: center;
  margin-bottom: 2px;
  font-size: 9px;
  color: #c0b2a0;
}

.day {
  position: relative;
  aspect-ratio: 1;
  border-radius: 14px;
  display: grid;
  place-items: center;
  animation: rise-in 320ms var(--ease) both;
  animation-delay: var(--d, 0ms);
  transition: transform 140ms var(--ease);
  touch-action: manipulation;
}

.day:active {
  transform: scale(0.93);
}

.day.blank {
  visibility: hidden;
}

.dw {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  overflow: hidden;
  background: #fff;
  border: 1.5px solid transparent;
}

/* 有记录的格子：暖底，数字变橘 */
.day.rec .dw {
  background: var(--or-50);
  border-color: var(--or-s);
}

.day.rec .dnum {
  color: var(--or-d);
  font-weight: 800;
}

/* 有照片：直接上缩略图 */
.dw img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.dw img + .dnum {
  position: relative;
  z-index: 2;
  color: #fff;
  text-shadow: 0 1px 4px rgba(30, 20, 14, 0.6);
}

.dnum {
  font-size: 12px;
  font-weight: 600;
  color: #a2958a;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

/* 只打卡、没记录：虚线 + 白底 */
.day.checked .dw {
  background: #fff;
  border-style: dashed;
  border-color: var(--or-s);
}

.day.checked .dnum {
  color: var(--or-d);
}

.day.plain .dw {
  background: transparent;
}

.dots {
  position: relative;
  z-index: 2;
  display: flex;
  gap: 2px;
}

.dots i {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--or);
}

.dw img ~ .dots i {
  background: rgba(255, 255, 255, 0.9);
}

/* 打卡火焰角标 */
.flame {
  position: absolute;
  right: -2px;
  top: -3px;
  z-index: 3;
  font-size: 9px;
  font-style: normal;
  filter: drop-shadow(0 1px 2px rgba(150, 90, 40, 0.4));
}

.more {
  position: absolute;
  right: 2px;
  bottom: 1px;
  z-index: 3;
  font-size: 7px;
  color: var(--or-d);
  background: rgba(255, 255, 255, 0.86);
  border-radius: 4px;
  padding: 0 2px;
  line-height: 1.4;
}

.day.today .dw {
  border-color: var(--or);
  box-shadow: 0 0 0 2px rgba(217, 136, 95, 0.28), 0 6px 14px rgba(185, 107, 69, 0.2);
}

.day.future {
  opacity: 0.4;
}

.day.future .dw {
  background: transparent;
}

/* 右侧信息卡 */
.calside {
  margin-top: 18px;
}

.legend {
  display: flex;
  gap: 14px;
  margin: 0 0 12px;
  font-size: 9px;
  color: var(--ink-3);
}

.legend span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.lg {
  width: 10px;
  height: 10px;
  border-radius: 4px;
  border: 1.5px solid var(--or-s);
  background: var(--or-50);
  font-style: normal;
  display: inline-grid;
  place-items: center;
  font-size: 8px;
}

.lg--flame {
  border: none;
  background: none;
}

.lg--today {
  border-color: var(--or);
  background: transparent;
}

.sidecard {
  padding: 14px 15px;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 10px 24px rgba(150, 115, 80, 0.09);
}

.sc-t {
  margin: 0 0 6px;
  font-size: 10px;
  letter-spacing: 0.08em;
  color: var(--ink-3);
}

.sc-line {
  margin: 0;
  font-size: 11.5px;
  line-height: 1.8;
  color: var(--ink-2);
}

.sc-line b {
  color: var(--or-d);
  font-weight: 750;
}

.sc-bar {
  height: 6px;
  margin-top: 10px;
  border-radius: 99px;
  background: var(--paper-2);
  overflow: hidden;
}

.sc-bar i {
  display: block;
  height: 100%;
  border-radius: 99px;
  background: linear-gradient(90deg, #eda979, var(--or));
  transition: width 620ms var(--ease);
}

.sc-foot {
  margin: 6px 0 0;
  font-size: 9px;
  color: var(--ink-3);
}

.sidebtn {
  width: 100%;
  height: 44px;
  margin-top: 10px;
  border-radius: 15px;
  background: var(--or);
  color: #fff8f0;
  font-size: 12.5px;
  font-weight: 650;
  box-shadow: 0 3px 0 var(--or-d);
  transition: transform 140ms var(--ease);
}

.sidebtn:active {
  transform: translateY(1px);
  box-shadow: 0 1px 0 var(--or-d);
}

/* ---------- 历史 ---------- */
.history {
  margin-top: 16px;
}

.hlist {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.hgroup {
  scroll-margin-top: 12px;
}

.hhead {
  display: flex;
  align-items: baseline;
  margin-bottom: 8px;
  padding: 0 2px;
}

.hdate {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  color: #4a3e34;
}

.hdate em {
  font-style: normal;
  font-size: 9.5px;
  font-weight: 400;
  color: var(--ink-3);
}

.badge {
  font-style: normal;
  padding: 1px 6px;
  border-radius: 6px;
  background: var(--or);
  color: #fff;
  font-size: 8px;
  font-weight: 600;
}

.hflame {
  font-style: normal;
  font-size: 10px;
}

.hkcal {
  margin-left: auto;
  font-size: 9.5px;
  color: var(--ink-3);
  font-variant-numeric: tabular-nums;
}

.hrows {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 新分组：落下 */
.grp-enter-active {
  animation: drop-in 460ms var(--ease);
}

.go-btn {
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

/* ---------- 某一天 ---------- */
.dayinfo {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  border-radius: 14px;
  background: var(--paper);
  font-size: 11px;
  color: var(--ink-2);
}

.dayinfo .on {
  color: var(--or-d);
  font-weight: 650;
}

.mini {
  margin-left: auto;
  padding: 5px 11px;
  border-radius: var(--r-pill);
  background: var(--or);
  color: #fff;
  font-size: 10px;
  font-weight: 650;
}

.daylist {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.dayitem {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 14px;
  background: #fff;
  border: 1px solid #f2e7d8;
  text-align: left;
}

.dayitem:active {
  background: var(--paper-2);
}

.dthumb {
  position: relative;
  width: 40px;
  height: 40px;
  flex: 0 0 auto;
}

.dtxt {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.dtxt b {
  font-size: 12px;
  font-weight: 650;
  color: #3d332b;
}

.dtxt b em {
  margin-left: 4px;
  font-style: normal;
  font-size: 10px;
}

.dtxt i {
  font-style: normal;
  font-size: 9px;
  color: var(--ink-3);
}

.dgo {
  margin-left: auto;
  color: #cbbba8;
  font-size: 13px;
}

.dayacts {
  display: flex;
  gap: 8px;
}

.opt {
  flex: 1;
  height: 44px;
  border-radius: 14px;
  border: 1.5px solid var(--line);
  background: #fff;
  font-size: 12px;
  color: var(--ink);
}

.opt:active {
  background: var(--paper-2);
}

/* ============ 大屏（≥900px） ============ */
@media (min-width: 900px) {
  .mhead h2 {
    font-size: 30px;
  }

  .seg {
    max-width: 320px;
  }

  .mstat {
    max-width: 560px;
  }

  .calwrap {
    display: grid;
    grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
    gap: 30px;
    align-items: start;
    margin-top: 22px;
  }

  .calgrid {
    gap: 10px;
  }

  .dnum {
    font-size: 14px;
  }

  .calside {
    margin-top: 0;
  }

  .history {
    max-width: 760px;
  }

  .hrows {
    gap: 10px;
  }
}
</style>
