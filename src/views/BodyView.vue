<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import SToast from '../components/SToast.vue'
import { settings } from '../store/journal'
import {
  body,
  ACTIVITY_LEVELS,
  RATE_OPTIONS,
  history,
  latest,
  weekChange,
  bmr,
  tdee,
  deficit,
  goalKcal,
  floorHit,
  toGoal,
  weeksLeft,
  etaLabel,
  progress,
  series,
  logWeight,
  removeWeight,
  dateKey,
  shortDate,
  streakDays,
  checkedToday,
  checkIn
} from '../store/body'

const router = useRouter()
const today = dateKey()

const input = ref(latest.value ? String(latest.value.kg) : '')
const logged = computed(() => body.weights[today] !== undefined)

const toast = ref('')
let toastTimer = null
function showToast(text) {
  toast.value = text
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 1600)
}

function step(delta) {
  const base = Number(input.value) || latest.value?.kg || 60
  input.value = (Math.round((base + delta) * 10) / 10).toFixed(1)
}

function save() {
  const kg = Number(input.value)
  const first = !logged.value
  if (!logWeight(kg)) {
    showToast('体重看起来不太对，检查一下')
    return
  }
  showToast(first ? '✓ 已记下今天的体重 · 今日打卡完成' : '✓ 已更新今天的体重')
}

/** 只打卡、不称重（不想面对数字的那天也能续上） */
function onCheckIn() {
  if (!checkIn()) return
  showToast(`打卡成功 · 连续 ${streakDays.value} 天 🎉`)
}

function removeToday() {
  removeWeight(today)
  input.value = latest.value ? String(latest.value.kg) : ''
  showToast('已删除今天的记录')
}

/* ---------------- 折线 ---------------- */

const W = 300
const H = 104
const PAD = 10

const chart = computed(() => {
  const points = series(30)
  if (points.length < 2) return null

  const values = points.map((p) => p.kg)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1

  const coords = points.map((p, i) => {
    const x = PAD + (i / (points.length - 1)) * (W - PAD * 2)
    const y = H - PAD - ((p.kg - min) / span) * (H - PAD * 2)
    return [x, y]
  })

  const pairs = coords.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`)
  const line = pairs.join(' ')
  const area = `M ${coords[0][0].toFixed(1)} ${H - PAD} L ${pairs.join(' L ')} L ${coords[coords.length - 1][0].toFixed(1)} ${H - PAD} Z`

  return {
    line,
    area,
    min: min.toFixed(1),
    max: max.toFixed(1),
    from: shortDate(points[0].date),
    to: shortDate(points[points.length - 1].date),
    dot: coords[coords.length - 1]
  }
})

const diffText = computed(() => {
  if (weekChange.value === null) return '还没有一周前的数据'
  if (weekChange.value === 0) return '和一周前持平'
  const sign = weekChange.value > 0 ? '+' : ''
  return `较一周前 ${sign}${weekChange.value} kg`
})
</script>

<template>
  <div class="page bd">
    <header class="hd">
      <button class="bak" aria-label="返回" @click="router.back()">‹</button>
      <b>身体数据</b>
      <span class="cnt">{{ history.length }} 次记录</span>
    </header>

    <!-- 打卡状态：称重自动算打卡，不想称也可以直接点 -->
    <div class="daybar" :class="{ done: checkedToday }">
      <span class="db-ic">🔥</span>
      <span class="db-txt">连续 <b>{{ streakDays }}</b> 天</span>
      <span class="db-state">{{ checkedToday ? '今天已打卡' : '今天还没打卡' }}</span>
      <button v-if="!checkedToday" class="db-btn" @click="onCheckIn">打卡</button>
    </div>

    <!-- 当前体重 + 折线 -->
    <section class="card">
      <div class="cur">
        <span class="num">{{ latest ? latest.kg : '—' }}<i>kg</i></span>
        <span class="delta" :class="{ down: weekChange < 0, up: weekChange > 0 }">{{ diffText }}</span>
      </div>

      <svg v-if="chart" class="line" :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--or-300)" stop-opacity="0.34" />
            <stop offset="100%" stop-color="var(--or-300)" stop-opacity="0" />
          </linearGradient>
        </defs>
        <path :d="chart.area" fill="url(#wg)" />
        <polyline :points="chart.line" fill="none" stroke="var(--or)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
        <circle :cx="chart.dot[0]" :cy="chart.dot[1]" r="3.4" fill="#fff" stroke="var(--or)" stroke-width="2.2" />
      </svg>
      <p v-else class="empty">再记一条就能画趋势了</p>

      <div v-if="chart" class="axis">
        <span>{{ chart.from }} · {{ chart.max }}kg</span>
        <span>{{ chart.to }} · {{ chart.min }}kg</span>
      </div>

      <!-- 记录今天 -->
      <div class="log">
        <button class="step" aria-label="减 0.1" @click="step(-0.1)">−</button>
        <input v-model="input" type="number" inputmode="decimal" step="0.1" min="25" max="300" aria-label="今天的体重" />
        <span class="unit">kg</span>
        <button class="step" aria-label="加 0.1" @click="step(0.1)">＋</button>
        <button class="save" :class="{ again: logged }" @click="save">
          {{ logged ? '更新今天' : '记录今天' }}
        </button>
      </div>
      <button v-if="logged" class="del" @click="removeToday">删除今天的记录</button>
    </section>

    <!-- 目标进度 -->
    <section class="card">
      <div class="row-between">
        <b>减重目标</b>
        <span class="muted">还差 {{ toGoal > 0 ? toGoal : 0 }} kg</span>
      </div>

      <div class="bar"><i :style="{ width: progress + '%' }" /></div>
      <div class="row-between small">
        <span>起点 {{ history.length ? history[0].kg : '—' }} kg</span>
        <span>{{ progress }}%</span>
        <span>目标 {{ body.profile.goalWeight }} kg</span>
      </div>

      <p class="eta">
        <template v-if="toGoal <= 0">已经到目标体重了，接下来保持就好</template>
        <template v-else-if="weeksLeft">按每周 {{ body.profile.weeklyRate }} kg，预计 <b>{{ etaLabel }}</b> 达成</template>
        <template v-else>把「减重速度」调一下，就能算出预计达成日</template>
      </p>
    </section>

    <!-- 每日建议 -->
    <section class="card plan">
      <div class="row-between">
        <b>每日建议摄入</b>
        <span class="muted">Mifflin-St Jeor</span>
      </div>

      <p class="big">{{ goalKcal }}<i>kcal</i></p>
      <div class="facts">
        <span>基础代谢 <b>{{ bmr }}</b></span>
        <span>日常消耗 <b>{{ tdee }}</b></span>
        <span>热量缺口 <b>{{ deficit }}</b></span>
      </div>
      <p v-if="floorHit" class="warn">
        按你选的速度算出来低于安全下限，已按 {{ goalKcal }} kcal 取整。别减太快，掉的会是肌肉。
      </p>
      <p class="note">估算仅供参考：个体差异、运动量和食物称量都会影响结果。</p>
    </section>

    <!-- 个人资料 -->
    <section class="card">
      <div class="row-between">
        <b>我的资料</b>
        <span class="muted">改了立刻生效</span>
      </div>

      <div class="fields">
        <label class="fld">
          <span>身高（cm）</span>
          <input v-model.number="body.profile.height" type="number" min="120" max="220" />
        </label>
        <label class="fld">
          <span>年龄</span>
          <input v-model.number="body.profile.age" type="number" min="12" max="90" />
        </label>
        <label class="fld">
          <span>目标体重（kg）</span>
          <input v-model.number="body.profile.goalWeight" type="number" min="30" max="200" step="0.1" />
        </label>
      </div>

      <div class="seg-row">
        <span class="lbl">性别</span>
        <div class="seg">
          <button :class="{ on: body.profile.sex === 'female' }" @click="body.profile.sex = 'female'">女</button>
          <button :class="{ on: body.profile.sex === 'male' }" @click="body.profile.sex = 'male'">男</button>
        </div>
      </div>

      <div class="seg-row">
        <span class="lbl">活动量</span>
        <div class="acts">
          <button
            v-for="a in ACTIVITY_LEVELS"
            :key="a.id"
            class="act"
            :class="{ on: body.profile.activity === a.id }"
            :title="a.desc"
            @click="body.profile.activity = a.id"
          >
            {{ a.label }}
          </button>
        </div>
      </div>

      <label class="fld wide">
        <span>减重速度</span>
        <select v-model.number="body.profile.weeklyRate">
          <option v-for="r in RATE_OPTIONS" :key="r.value" :value="r.value">{{ r.label }}</option>
        </select>
      </label>
    </section>

    <p v-if="settings.hideKcal" class="note">
      你开着「无压力模式」，这些数字只在设置里显示，不会出现在手账里。
    </p>

    <SToast :show="!!toast" :text="toast" />
  </div>
</template>

<style scoped>
.bd {
  padding-bottom: 30px;
}

.hd {
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

.hd b {
  font-size: 17px;
  font-weight: 800;
}

.cnt {
  margin-left: auto;
  font-size: 9.5px;
  color: var(--ink-3);
}

/* 打卡状态栏 */
.daybar {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: 12px;
  padding: 9px 12px;
  border-radius: 14px;
  background: var(--or-xs);
  border: 1.5px dashed var(--line);
  font-size: 10px;
  color: var(--ink-2);
}

.db-ic {
  font-size: 12px;
  line-height: 1;
}

.db-txt b {
  font-size: 12px;
  font-weight: 800;
  color: var(--or-d);
}

.db-state {
  color: var(--ink-3);
  font-size: 9.5px;
}

.db-btn {
  margin-left: auto;
  padding: 6px 13px;
  border-radius: 999px;
  background: var(--or);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
}

.card {
  margin-top: 14px;
  padding: 16px;
  border-radius: 22px;
  background: #fff;
  box-shadow: 0 12px 28px rgba(150, 115, 80, 0.1);
}

.cur {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.num {
  font-size: 34px;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.num i {
  margin-left: 3px;
  font-style: normal;
  font-size: 12px;
  font-weight: 600;
  color: var(--ink-3);
}

.delta {
  font-size: 10.5px;
  color: var(--ink-3);
}

.delta.down {
  color: var(--ok);
}

.delta.up {
  color: var(--err);
}

.line {
  width: 100%;
  height: 104px;
  margin-top: 10px;
  display: block;
}

.empty {
  margin: 22px 0;
  text-align: center;
  font-size: 11px;
  color: var(--ink-3);
}

.axis {
  display: flex;
  justify-content: space-between;
  font-size: 9px;
  color: var(--ink-3);
  margin-top: 2px;
}

.log {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1.5px dashed var(--line);
}

.step {
  width: 34px;
  height: 38px;
  flex: 0 0 auto;
  border-radius: 12px;
  background: var(--paper-2);
  font-size: 15px;
  color: var(--ink-2);
}

.log input {
  flex: 1;
  min-width: 0;
  height: 38px;
  padding: 0 10px;
  border-radius: 12px;
  border: 1.5px solid var(--line);
  background: #fffdf9;
  text-align: center;
  font-size: 15px;
  font-weight: 700;
  color: var(--ink);
}

.log input:focus {
  outline: none;
  border-color: var(--or-300);
  box-shadow: 0 0 0 4px rgba(217, 136, 95, 0.14);
}

.unit {
  font-size: 10.5px;
  color: var(--ink-3);
}

.save {
  flex: 0 0 auto;
  height: 38px;
  padding: 0 14px;
  border-radius: 12px;
  background: var(--or);
  font-size: 11.5px;
  font-weight: 650;
  color: #fff8f0;
  box-shadow: var(--sh-3);
}

.save.again {
  background: #fff;
  color: var(--or-d);
  border: 1.5px solid var(--or-200);
  box-shadow: none;
}

.del {
  margin-top: 10px;
  font-size: 10px;
  color: var(--ink-3);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.row-between {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.row-between b {
  font-size: 13px;
  font-weight: 700;
}

.muted {
  font-size: 9.5px;
  color: var(--ink-3);
}

.bar {
  height: 8px;
  margin-top: 12px;
  border-radius: 99px;
  background: var(--paper-2);
  overflow: hidden;
}

.bar i {
  display: block;
  height: 100%;
  border-radius: 99px;
  background: linear-gradient(90deg, var(--or-300), var(--or));
  transition: width 400ms var(--ease);
}

.row-between.small {
  margin-top: 7px;
  font-size: 9px;
  color: var(--ink-3);
}

.eta {
  margin: 12px 0 0;
  font-size: 11px;
  line-height: 1.7;
  color: var(--ink-2);
}

.eta b {
  color: var(--or-d);
}

.big {
  margin: 10px 0 0;
  font-size: 32px;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.big i {
  margin-left: 5px;
  font-style: normal;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--ink-3);
}

.facts {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  margin-top: 10px;
  font-size: 10px;
  color: var(--ink-3);
}

.facts b {
  color: var(--ink-2);
  font-weight: 650;
}

.warn {
  margin: 12px 0 0;
  padding: 10px 12px;
  border-radius: 12px;
  background: #fdf3e6;
  font-size: 10px;
  line-height: 1.7;
  color: #9a6a2a;
}

.note {
  margin: 10px 0 0;
  font-size: 9px;
  color: #c9bcac;
}

/* 资料 */
.fields {
  display: flex;
  gap: 10px;
  margin-top: 14px;
}

.fld {
  flex: 1;
  min-width: 0;
  display: block;
}

.fld.wide {
  margin-top: 14px;
}

.fld > span {
  display: block;
  margin-bottom: 6px;
  font-size: 9.5px;
  color: var(--ink-3);
}

.fld input,
.fld select {
  width: 100%;
  height: 40px;
  padding: 0 10px;
  border-radius: 12px;
  border: 1.5px solid var(--line);
  background: #fffdf9;
  font-size: 13px;
  color: var(--ink);
}

.fld input:focus,
.fld select:focus {
  outline: none;
  border-color: var(--or-300);
  box-shadow: 0 0 0 4px rgba(217, 136, 95, 0.14);
}

.seg-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 14px;
}

.lbl {
  font-size: 11px;
  color: var(--ink-2);
  flex: 0 0 auto;
}

.seg {
  display: flex;
  gap: 4px;
  padding: 3px;
  border-radius: var(--r-pill);
  background: var(--paper-2);
}

.seg button {
  padding: 6px 18px;
  border-radius: var(--r-pill);
  font-size: 11px;
  color: var(--ink-2);
}

.seg button.on {
  background: #fff;
  color: var(--ink);
  font-weight: 650;
  box-shadow: 0 2px 8px rgba(150, 115, 80, 0.12);
}

.acts {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.act {
  padding: 6px 10px;
  border-radius: var(--r-pill);
  border: 1.5px solid var(--line);
  background: #fff;
  font-size: 10px;
  color: var(--ink-2);
}

.act.on {
  background: var(--or-xs);
  border-color: var(--or-200);
  color: var(--or-d);
  font-weight: 650;
}

@media (min-width: 768px) {
  .bd {
    max-width: 620px;
    margin: 0 auto;
  }
}
</style>
