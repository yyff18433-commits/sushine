<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import SToast from '../components/SToast.vue'
import { journal, settings, totalKcal } from '../store/journal'
import { latest } from '../store/body'
import {
  ACTIVITY_TYPES,
  typeOf,
  activity,
  burnOf,
  todayBurn,
  recentBurn,
  addActivity,
  removeActivity,
  estimate,
  netIntake
} from '../store/activity'
import { dateKey } from '../store/body'

const router = useRouter()
const today = dateKey()

const type = ref('walk')
const minutes = ref(30)

const kcalPreview = computed(() => estimate(type.value, minutes.value))
const todayList = computed(() => activity.days[today] || [])
const intake = computed(() => totalKcal())
const net = computed(() => netIntake(intake.value))

const week = computed(() => recentBurn(7))
const weekMax = computed(() => Math.max(60, ...week.value.map((d) => d.kcal)))

const toast = ref('')
let toastTimer = null
function showToast(text) {
  toast.value = text
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 1600)
}

function stepMinutes(delta) {
  minutes.value = Math.min(600, Math.max(5, Number(minutes.value || 0) + delta))
}

function add() {
  const item = addActivity(type.value, minutes.value, latest.value?.kg)
  if (!item) {
    showToast('分钟数看起来不对')
    return
  }
  showToast(`✓ 已记下 ${typeOf(item.typeId).label} ${item.minutes} 分钟`)
}

function remove(item) {
  removeActivity(today, item.id)
  showToast('已删除这条运动')
}

const dayLabel = (date) => {
  const d = new Date(`${date}T12:00:00`)
  return ['日', '一', '二', '三', '四', '五', '六'][d.getDay()]
}
</script>

<template>
  <div class="page ac">
    <header class="hd">
      <button class="bak" aria-label="返回" @click="router.back()">‹</button>
      <b>运动记录</b>
      <span class="cnt">估算按 {{ latest ? latest.kg : 60 }} kg 体重</span>
    </header>

    <!-- 今日 -->
    <section class="card">
      <div class="cur">
        <span class="num">{{ todayBurn }}<i>kcal</i></span>
        <span class="lbl">今日消耗</span>
      </div>

      <p v-if="!settings.hideKcal" class="net">
        吃进去 {{ intake }} − 动掉 {{ todayBurn }} = <b>{{ net }}</b> kcal 净摄入
      </p>
      <p v-else class="net">无压力模式：只看动了多久，不算数字</p>

      <!-- 快捷添加 -->
      <div class="types">
        <button
          v-for="t in ACTIVITY_TYPES"
          :key="t.id"
          class="type"
          :class="{ on: type === t.id }"
          @click="type = t.id"
        >
          <span>{{ t.emoji }}</span>{{ t.label }}
        </button>
      </div>

      <div class="mins">
        <button class="step" aria-label="减 5 分钟" @click="stepMinutes(-5)">−</button>
        <input v-model.number="minutes" type="number" inputmode="numeric" min="5" max="600" aria-label="运动分钟" />
        <span class="unit">分钟</span>
        <button class="step" aria-label="加 5 分钟" @click="stepMinutes(5)">＋</button>
        <span class="preview">≈ {{ kcalPreview }} kcal</span>
        <button class="add" @click="add">记下</button>
      </div>
    </section>

    <!-- 今日列表 -->
    <section class="card">
      <div class="row-between">
        <b>今天的运动</b>
        <span class="muted">{{ todayList.length }} 条</span>
      </div>

      <div v-if="todayList.length" class="list">
        <div v-for="item in todayList" :key="item.id" class="item">
          <span class="ic">{{ typeOf(item.typeId).emoji }}</span>
          <span class="tx">
            <b>{{ typeOf(item.typeId).label }}</b>
            <span>{{ item.minutes }} 分钟</span>
          </span>
          <span class="kc">{{ item.kcal }}</span>
          <button class="del" aria-label="删除" @click="remove(item)">✕</button>
        </div>
      </div>
      <p v-else class="empty">今天还没动，走 20 分钟也算</p>
    </section>

    <!-- 近 7 天 -->
    <section class="card">
      <div class="row-between">
        <b>近 7 天消耗</b>
        <span class="muted">合计 {{ week.reduce((s, d) => s + d.kcal, 0) }} kcal</span>
      </div>
      <div class="bars">
        <div v-for="d in week" :key="d.date" class="bar-col" :class="{ today: d.date === today }">
          <span class="bar-val">{{ d.kcal || '' }}</span>
          <div class="bar-track"><i :style="{ height: Math.max(d.kcal ? 6 : 0, (d.kcal / weekMax) * 100) + '%' }" /></div>
          <span class="bar-lb">{{ dayLabel(d.date) }}</span>
        </div>
      </div>
    </section>

    <p class="note">消耗是按 MET 系数估的，实际和体重、强度、心率都有关系，当参考就好。</p>

    <SToast :show="!!toast" :text="toast" />
  </div>
</template>

<style scoped>
.ac {
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
  font-size: 9px;
  color: var(--ink-3);
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
  gap: 8px;
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

.lbl {
  font-size: 10px;
  color: var(--ink-3);
}

.net {
  margin: 8px 0 0;
  font-size: 10.5px;
  color: var(--ink-2);
}

.net b {
  color: var(--or-d);
}

/* 类型 */
.types {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1.5px dashed var(--line);
}

.type {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 9px 0 8px;
  border-radius: 13px;
  border: 1.5px solid var(--line);
  background: #fffcf5;
  font-size: 9.5px;
  color: var(--ink-2);
}

.type span {
  font-size: 15px;
  line-height: 1;
}

.type.on {
  background: var(--or-xs);
  border-color: var(--or-200);
  color: var(--or-d);
  font-weight: 650;
}

/* 分钟 */
.mins {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
}

.step {
  width: 32px;
  height: 36px;
  flex: 0 0 auto;
  border-radius: 11px;
  background: var(--paper-2);
  font-size: 14px;
  color: var(--ink-2);
}

.mins input {
  width: 62px;
  height: 36px;
  padding: 0 8px;
  border-radius: 11px;
  border: 1.5px solid var(--line);
  background: #fffdf9;
  text-align: center;
  font-size: 14px;
  font-weight: 700;
}

.mins input:focus {
  outline: none;
  border-color: var(--or-300);
  box-shadow: 0 0 0 4px rgba(217, 136, 95, 0.14);
}

.unit {
  font-size: 10px;
  color: var(--ink-3);
}

.preview {
  margin-left: auto;
  font-size: 10.5px;
  color: var(--ink-2);
}

.add {
  height: 36px;
  padding: 0 14px;
  border-radius: 11px;
  background: var(--or);
  font-size: 11.5px;
  font-weight: 650;
  color: #fff8f0;
  box-shadow: var(--sh-3);
}

/* 列表 */
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

.list {
  margin-top: 10px;
}

.item {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 9px 0;
  border-bottom: 1px dashed #f1e7da;
}

.item:last-child {
  border-bottom: none;
}

.ic {
  width: 32px;
  height: 32px;
  flex: 0 0 auto;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--paper-2);
  font-size: 15px;
}

.tx b {
  display: block;
  font-size: 12px;
  font-weight: 650;
}

.tx span {
  font-size: 9.5px;
  color: var(--ink-3);
}

.kc {
  margin-left: auto;
  font-size: 13px;
  font-weight: 700;
  color: var(--or-d);
}

.kc::after {
  content: " kcal";
  font-size: 8.5px;
  font-weight: 500;
  color: var(--ink-3);
}

.del {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 10px;
  color: var(--ink-3);
}

.del:active {
  background: var(--paper-2);
}

.empty {
  margin: 16px 0 4px;
  text-align: center;
  font-size: 11px;
  color: var(--ink-3);
}

/* 柱状图 */
.bars {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  height: 116px;
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
  height: 12px;
  line-height: 12px;
  font-size: 8px;
  color: var(--ink-3);
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
  background: linear-gradient(180deg, #b9caa7, var(--ok));
  transition: height 400ms var(--ease);
}

.bar-col.today .bar-lb {
  color: var(--or-d);
  font-weight: 700;
}

.bar-lb {
  font-size: 9px;
  color: var(--ink-3);
}

.note {
  margin: 12px 2px 0;
  font-size: 9px;
  color: #c9bcac;
  text-align: center;
}

@media (min-width: 768px) {
  .ac {
    max-width: 620px;
    margin: 0 auto;
  }
}
</style>
