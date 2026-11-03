<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SSticker from '../components/SSticker.vue'
import SProgress from '../components/SProgress.vue'
import SToast from '../components/SToast.vue'
import { journal, settings, totalKcal } from '../store/journal'
import { brand, report, weekDays } from '../data/mock'
import { weekReport, NUTRIENT_ORDER } from '../data/weekly'
import { goalKcal } from '../store/body'
import { weekBurn } from '../store/activity'

const router = useRouter()
const route = useRoute()

const todayIndex = weekDays.findIndex((d) => d.active)
const activeDay = ref(todayIndex)
/** 从首页「周报」入口进来直接看本周，从 Sushie 查看记录进来先看当日 */
const scope = ref(route.query.scope === 'day' ? 'day' : 'week')

/* ---------------- 今日 ---------------- */

const isToday = computed(() => activeDay.value === todayIndex)
const dayEntries = computed(() => (isToday.value ? journal.entries : []))
const dayKcal = computed(() => (isToday.value ? totalKcal() : weekRows.value[activeDay.value]?.kcal || 0))
const dayGoal = computed(() => goalKcal.value)
/** 周报也跟「每日建议摄入」走，不再写死 1800 */
const goal = computed(() => goalKcal.value)
const dayPercent = computed(() => Math.min(100, Math.round((dayKcal.value / dayGoal.value) * 100)))
const dayRemain = computed(() => Math.max(0, dayGoal.value - dayKcal.value))

/* ---------------- 本周 ---------------- */

const NUT_INDEX = { 碳水: 0, 蛋白质: 1, 脂肪: 2, 纤维: 3, 糖: 4, 盐: 5 }

/** 今天用真实记录聚合，其余天用模拟数据 —— 刚记的一餐立刻反映在周报里 */
function todayNutrition() {
  const sum = [0, 0, 0, 0, 0, 0]
  for (const entry of journal.entries) {
    for (const n of entry.nutrition || []) {
      const idx = NUT_INDEX[n.label]
      if (idx !== undefined) sum[idx] += Number(n.value) || 0
    }
  }
  return sum
}

const weekRows = computed(() =>
  weekReport.days.map((day, i) => {
    const today = i === todayIndex
    return {
      ...day,
      isToday: today,
      kcal: today ? totalKcal() : day.kcal,
      nutrition: today ? todayNutrition() : day.nutrition,
      meals: today ? journal.entries.map((e) => e.name) : day.meals
    }
  })
)

const weekTotal = computed(() => weekRows.value.reduce((s, d) => s + d.kcal, 0))
const recordedDays = computed(() => weekRows.value.filter((d) => d.kcal > 0).length)
const onTargetDays = computed(
  () => weekRows.value.filter((d) => d.kcal > 0 && d.kcal <= goal.value).length
)
const weekAvg = computed(() =>
  recordedDays.value ? Math.round(weekTotal.value / recordedDays.value) : 0
)
const maxKcal = computed(() =>
  Math.max(goal.value, ...weekRows.value.map((d) => d.kcal), 1)
)

/** 净摄入 = 吃进去 − 动掉的 */
const weekNet = computed(() => Math.max(0, weekTotal.value - weekBurn.value))

function barHeight(kcal) {
  return `${Math.max(kcal > 0 ? 6 : 0, Math.round((kcal / maxKcal.value) * 100))}%`
}

/** 三大产能营养素的热量占比（碳水 4 kcal/g、蛋白质 4、脂肪 9） */
const macros = computed(() => {
  const sum = [0, 0, 0]
  for (const row of weekRows.value) {
    sum[0] += row.nutrition[0] || 0
    sum[1] += row.nutrition[1] || 0
    sum[2] += row.nutrition[2] || 0
  }
  const energy = sum[0] * 4 + sum[1] * 4 + sum[2] * 9 || 1
  return [
    { label: '碳水', grams: Math.round(sum[0]), pct: Math.round((sum[0] * 4) / energy * 100), color: 'var(--butter)' },
    { label: '蛋白质', grams: Math.round(sum[1]), pct: Math.round((sum[1] * 4) / energy * 100), color: 'var(--matcha)' },
    { label: '脂肪', grams: Math.round(sum[2]), pct: Math.round((sum[2] * 9) / energy * 100), color: 'var(--rose)' }
  ]
})

const topDishes = computed(() => {
  const counts = new Map()
  for (const row of weekRows.value) {
    for (const name of row.meals) counts.set(name, (counts.get(name) || 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 4)
    .map(([name, count]) => ({ name, count }))
})

const summary = computed(() => {
  if (!recordedDays.value) return '这周还没有记录，拍下第一餐就从今天开始。'
  const parts = [`本周记了 ${recordedDays.value} 天`]
  if (!settings.hideKcal) parts.push(`日均 ${weekAvg.value} kcal`)

  if (onTargetDays.value >= 5) parts.push('大部分日子都在目标内，节奏很稳')
  else if (onTargetDays.value >= 3) parts.push('差不多一半的日子在目标内')
  else parts.push('超标的日子偏多，可以留意一下晚饭')

  if (topDishes.value.length) parts.push(`最常吃的是${topDishes.value[0].name}`)
  return `${parts.join('，')}。`
})

/* ---------------- 交互 ---------------- */

const toast = ref('')
let toastTimer = null
function refresh() {
  toast.value = '✓ 已同步最新记录'
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 1500)
}

const nutrientLabels = NUTRIENT_ORDER
const headLabel = computed(() =>
  isToday.value ? '今天' : `10月${weekDays[activeDay.value].date}日`
)
</script>

<template>
  <div class="page rp">
    <header class="nb">
      <button class="bak" aria-label="返回" @click="router.back()">‹</button>
      <span class="logo">{{ brand.name }}</span>
      <button class="rr" aria-label="刷新" @click="refresh">⟳</button>
    </header>

    <!-- 今日 / 本周 -->
    <div class="seg" role="tablist" aria-label="范围">
      <button
        role="tab"
        :aria-selected="scope === 'day'"
        :class="{ on: scope === 'day' }"
        @click="scope = 'day'"
      >
        今日
      </button>
      <button
        role="tab"
        :aria-selected="scope === 'week'"
        :class="{ on: scope === 'week' }"
        @click="scope = 'week'"
      >
        本周
      </button>
    </div>

    <!-- ============ 今日 ============ -->
    <template v-if="scope === 'day'">
      <div class="wk">
        <button
          v-for="(d, i) in weekDays"
          :key="d.date"
          class="wk-day"
          :class="{ on: i === activeDay }"
          @click="activeDay = i"
        >
          <span>{{ d.label }}</span>
          <b>{{ d.date }}</b>
        </button>
      </div>

      <section class="bigcard">
        <div class="bc-head">
          <b>{{ headLabel }}</b>
        </div>

        <div class="bc-kcal">
          <template v-if="settings.hideKcal">
            已记录 <em>{{ dayEntries.length }} 餐</em>
          </template>
          <template v-else>{{ dayKcal }}<i>/{{ dayGoal }}</i><em>kcal</em></template>
        </div>
        <SProgress v-if="!settings.hideKcal" class="bc-bar" :value="dayPercent" height="5px" />

        <div class="dotted">
          <div v-for="e in dayEntries" :key="e.id" class="meal">
            <SSticker :src="e.img" :alt="e.name" size="78px" border="4px" />
            <span class="tx">
              <b>{{ e.name }}</b>
              <span>{{ e.time }} · {{ settings.hideKcal ? e.meal : `${e.kcal} kcal · ${e.meal}` }}</span>
            </span>
          </div>

          <div v-if="!dayEntries.length" class="slot-empty">这一天还没有记录</div>

          <button class="slot" @click="router.push('/camera')">＋ 记下一餐</button>
        </div>

        <p class="bc-foot">
          {{
            settings.hideKcal
              ? report.tip
              : `还有 ${dayRemain} kcal 的余量 · ${report.tip}`
          }}
        </p>
      </section>
    </template>

    <!-- ============ 本周 ============ -->
    <template v-else>
      <p class="range">{{ weekReport.range }} · 目标 {{ goal }} kcal/天</p>

      <section class="overview">
        <div class="ov">
          <b>{{ settings.hideKcal ? '—' : weekTotal }}</b>
          <span>本周总热量</span>
        </div>
        <div class="ov">
          <b>{{ settings.hideKcal ? '—' : weekAvg }}</b>
          <span>日均 kcal</span>
        </div>
        <div class="ov">
          <b>{{ recordedDays }}<i>/7</i></b>
          <span>记录天数</span>
        </div>
        <div class="ov">
          <b>{{ onTargetDays }}<i>/{{ recordedDays || 0 }}</i></b>
          <span>未超目标</span>
        </div>
      </section>

      <section class="bigcard">
        <div class="bc-head">
          <b>每日热量</b>
          <span class="hint">超过目标的标橙</span>
        </div>

        <div class="bars">
          <div
            v-for="row in weekRows"
            :key="row.date"
            class="bar-col"
            :class="{ today: row.isToday, over: row.kcal > goal }"
          >
            <span class="bar-val">{{ row.kcal || '' }}</span>
            <div class="bar-track">
              <i :style="{ height: barHeight(row.kcal) }" />
            </div>
            <span class="bar-lb">{{ row.label }}</span>
          </div>
        </div>

        <p v-if="!settings.hideKcal" class="net-line">
          本周运动消耗 <b>{{ weekBurn }}</b> kcal · 净摄入 <b>{{ weekNet }}</b> kcal
        </p>
      </section>

      <section class="bigcard">
        <div class="bc-head">
          <b>营养结构</b>
          <span class="hint">按热量占比</span>
        </div>
        <div class="macro">
          <div v-for="m in macros" :key="m.label" class="mac-row">
            <span class="mac-lb">{{ m.label }}</span>
            <div class="mac-track"><i :style="{ width: m.pct + '%', background: m.color }" /></div>
            <span class="mac-val">{{ m.pct }}%<em>{{ m.grams }}g</em></span>
          </div>
        </div>
      </section>

      <section class="bigcard">
        <div class="bc-head">
          <b>最常吃</b>
        </div>
        <div v-if="topDishes.length" class="tops">
          <span v-for="d in topDishes" :key="d.name" class="top">
            {{ d.name }}<i>×{{ d.count }}</i>
          </span>
        </div>
        <p v-else class="slot-empty">这一周还没有吃过的记录</p>
      </section>

      <p class="summary">{{ summary }}</p>
      <p class="nutri-note">六项营养（{{ nutrientLabels.join(' / ') }}）按每天记录汇总</p>
    </template>

    <SToast :show="!!toast" :text="toast" />
  </div>
</template>

<style scoped>
.rp {
  display: flex;
  flex-direction: column;
  padding-bottom: 26px;
}

.nb {
  display: flex;
  align-items: center;
  gap: 10px;
}

.bak {
  width: 30px;
  height: 30px;
  flex: 0 0 auto;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 18px;
  line-height: 1;
  color: var(--ink-2);
  background: #fff;
  box-shadow: 0 4px 12px rgba(150, 115, 80, 0.12);
}

.logo {
  font-size: 17px;
  font-weight: 800;
  letter-spacing: -0.01em;
}

.rr {
  margin-left: auto;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 14px;
  color: var(--ink-3);
}

.rr:active {
  background: var(--paper-2);
}

/* 今日 / 本周 */
.seg {
  display: flex;
  gap: 4px;
  margin: 16px 0 4px;
  padding: 4px;
  border-radius: var(--r-pill);
  background: var(--paper-2);
}

.seg button {
  flex: 1;
  height: 34px;
  border-radius: var(--r-pill);
  font-size: 12.5px;
  color: var(--ink-2);
  transition: background 180ms var(--ease), color 180ms var(--ease);
}

.seg button.on {
  background: #fff;
  color: var(--ink);
  font-weight: 650;
  box-shadow: 0 2px 8px rgba(150, 115, 80, 0.12);
}

.range {
  margin: 12px 0 0;
  font-size: 10.5px;
  color: var(--ink-3);
  letter-spacing: 0.02em;
}

/* 一周日期条 */
.wk {
  display: flex;
  gap: 5px;
  margin-top: 14px;
}

.wk-day {
  flex: 1;
  padding: 8px 0 9px;
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  font-size: 9.5px;
  color: var(--ink-3);
  background: #fff;
  transition: background 180ms var(--ease), color 180ms var(--ease);
}

.wk-day b {
  font-size: 12.5px;
  font-weight: 700;
  color: var(--ink);
}

.wk-day.on {
  background: var(--or);
  color: #fff6ee;
}

.wk-day.on b {
  color: #fff;
}

/* 卡片 */
.bigcard {
  margin-top: 14px;
  padding: 16px 16px 14px;
  border-radius: 22px;
  background: #fff;
  box-shadow: 0 12px 28px rgba(150, 115, 80, 0.1);
}

.bc-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.bc-head b {
  font-size: 13px;
  font-weight: 700;
}

.bc-head .hint {
  margin-left: auto;
  font-size: 9.5px;
  color: var(--ink-3);
}

.bc-kcal {
  margin-top: 12px;
  font-size: 30px;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.bc-kcal i {
  font-style: normal;
  font-weight: 500;
  font-size: 12px;
  color: var(--ink-3);
}

.bc-kcal em {
  margin-left: 6px;
  font-style: normal;
  font-size: 11px;
  font-weight: 600;
  color: var(--ink-3);
}

.bc-bar {
  margin-top: 12px;
}

.dotted {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1.5px dashed var(--line);
}

.meal {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 7px 0;
}

.tx b {
  display: block;
  margin-bottom: 4px;
  font-size: 12.5px;
  font-weight: 650;
}

.tx span {
  font-size: 10px;
  color: var(--ink-3);
}

.slot-empty {
  padding: 18px 0;
  text-align: center;
  font-size: 11px;
  color: var(--ink-3);
}

.slot {
  width: 100%;
  margin-top: 10px;
  padding: 12px 0;
  border-radius: 14px;
  border: 1.5px dashed var(--line);
  font-size: 11.5px;
  color: var(--ink-2);
}

.bc-foot {
  margin: 12px 0 0;
  font-size: 10px;
  color: var(--ink-3);
}

/* 概览四格 */
.overview {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-top: 12px;
}

.ov {
  padding: 12px 6px;
  border-radius: 16px;
  background: #fff;
  text-align: center;
  box-shadow: 0 8px 20px rgba(150, 115, 80, 0.08);
}

.ov b {
  display: block;
  font-size: 16px;
  font-weight: 800;
  letter-spacing: -0.01em;
}

.ov b i {
  font-style: normal;
  font-size: 9.5px;
  font-weight: 500;
  color: var(--ink-3);
}

.ov span {
  display: block;
  margin-top: 4px;
  font-size: 9px;
  color: var(--ink-3);
}

/* 柱状图 */
.bars {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  height: 148px;
  margin-top: 14px;
}

.bar-col {
  flex: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.bar-val {
  font-size: 8.5px;
  color: var(--ink-3);
  height: 12px;
  line-height: 12px;
}

.bar-track {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
  border-radius: 8px;
  background: var(--paper-2);
  overflow: hidden;
}

.bar-track i {
  width: 100%;
  border-radius: 8px;
  background: linear-gradient(180deg, var(--or-300), var(--or));
  transition: height 420ms var(--ease);
}

.bar-col.over .bar-track i {
  background: linear-gradient(180deg, #eab27a, var(--warn));
}

.bar-col.today .bar-track {
  box-shadow: inset 0 0 0 1.5px var(--or-300);
}

.bar-lb {
  font-size: 9.5px;
  color: var(--ink-3);
}

.bar-col.today .bar-lb {
  color: var(--or-d);
  font-weight: 700;
}

/* 营养结构 */
.macro {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mac-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.mac-lb {
  width: 42px;
  flex: 0 0 auto;
  font-size: 10.5px;
  color: var(--ink-2);
}

.mac-track {
  flex: 1;
  height: 8px;
  border-radius: 99px;
  background: var(--paper-2);
  overflow: hidden;
}

.mac-track i {
  display: block;
  height: 100%;
  border-radius: 99px;
  transition: width 420ms var(--ease);
}

.mac-val {
  width: 62px;
  flex: 0 0 auto;
  text-align: right;
  font-size: 10px;
  color: var(--ink-2);
}

.mac-val em {
  margin-left: 4px;
  font-style: normal;
  font-size: 9px;
  color: var(--ink-3);
}

/* 最常吃 */
.tops {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.top {
  padding: 8px 13px;
  border-radius: var(--r-pill);
  background: var(--or-xs);
  font-size: 11.5px;
  color: var(--or-d);
}

.top i {
  margin-left: 5px;
  font-style: normal;
  font-size: 9.5px;
  opacity: 0.75;
}

.summary {
  margin: 16px 2px 0;
  padding: 13px 15px;
  border-radius: 16px;
  border: 1.5px dashed var(--line);
  font-size: 11.5px;
  line-height: 1.85;
  color: var(--ink-2);
}

.nutri-note {
  margin: 10px 2px 0;
  font-size: 9px;
  color: #c9bcac;
  text-align: center;
}

.net-line {
  margin: 12px 0 0;
  padding-top: 10px;
  border-top: 1.5px dashed var(--line);
  font-size: 10px;
  color: var(--ink-3);
}

.net-line b {
  color: var(--ink-2);
  font-weight: 700;
}

/* ============ 大屏 ============ */
@media (min-width: 768px) {
  .rp {
    max-width: 720px;
    margin: 0 auto;
  }

  .bars {
    height: 200px;
  }

  .overview {
    gap: 14px;
  }
}
</style>
