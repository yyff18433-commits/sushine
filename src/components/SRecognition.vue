<script setup>
/**
 * 模拟识别流程（组员 5 · 1）
 *
 * 点快门之后走这一整套：
 *   闪光 → 全屏识别遮罩（环形进度 + 扫描线 + 分步文案）→ 预设结果卡弹出
 *
 * 为什么全在前端：演示现场可能没网、模型 146MB 也来不及下。
 * 这里用「真实的节奏感」+「预设数据」换一个稳定的答辩效果，
 * 每一帧进度、每一步文案都跟真正的识别流程对得上，不糊弄。
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { toNutrition } from '../data/recipes'

const props = defineProps({
  open: { type: Boolean, default: false },
  photo: { type: String, default: '' },
  preset: { type: Object, default: null }
})

const emit = defineEmits(['confirm', 'cancel', 'retry'])

/** scan = 识别中；result = 结果卡 */
const phase = ref('scan')
const pct = ref(0)
const cardIn = ref(false)
const countKcal = ref(0)

let raf = 0
let timer = 0
let countRaf = 0

const STEPS = ['定位食物区域', '识别菜品种类', '估算份量热量', '生成营养报告']
const DURATION = 2300

const stepIndex = computed(() => {
  if (pct.value >= 100) return 4
  if (pct.value >= 84) return 3
  if (pct.value >= 56) return 2
  if (pct.value >= 26) return 1
  return 0
})

const stepLabel = computed(() => STEPS[Math.min(stepIndex.value, STEPS.length - 1)])

/* 环形进度：r=92 */
const R = 92
const C = 2 * Math.PI * R
const dashOffset = computed(() => C * (1 - Math.min(100, pct.value) / 100))

/** 预设里存的是 [碳水, 蛋白, 脂肪, 纤维, 糖, 盐] 数字数组，这里统一转成带标签的行 */
const rows = computed(() => {
  const list = props.preset?.nutrition || []
  if (!list.length) return []
  return typeof list[0] === 'number' ? toNutrition(list) : list
})

/** 营养条的参考上限，只用于画长度，不参与计算 */
const NUTRI_MAX = { 碳水: 110, 蛋白质: 55, 脂肪: 60, 纤维: 12, 糖: 55, 盐: 5 }

function barWidth(n) {
  const max = NUTRI_MAX[n.label] || 100
  return Math.min(100, Math.round((Number(n.value) || 0) / max * 100))
}

/** 进度：整体 0→100，但在 48% / 88% 处各「顿」一下，更像真在算 */
function easedProgress(t) {
  if (t < 0.34) return 0.34 * Math.pow(t / 0.34, 1.5)
  if (t < 0.52) return 0.34 + (t - 0.34) * 0.45 // 平台期
  if (t < 0.82) return 0.46 + 0.4 * Math.pow((t - 0.52) / 0.3, 0.85)
  if (t < 0.92) return 0.86 + (t - 0.82) * 0.6
  return 0.92 + 0.08 * ((t - 0.92) / 0.08)
}

function stopAll() {
  cancelAnimationFrame(raf)
  cancelAnimationFrame(countRaf)
  clearTimeout(timer)
}

function startScan() {
  stopAll()
  phase.value = 'scan'
  cardIn.value = false
  countKcal.value = 0
  pct.value = 0

  const t0 = performance.now()
  const tick = (now) => {
    const t = Math.min(1, (now - t0) / DURATION)
    pct.value = Math.min(99, Math.round(easedProgress(t) * 100))
    if (t < 1) {
      raf = requestAnimationFrame(tick)
    } else {
      pct.value = 100
      timer = setTimeout(showResult, 220)
    }
  }
  raf = requestAnimationFrame(tick)
}

function showResult() {
  phase.value = 'result'
  cardIn.value = false
  requestAnimationFrame(() => {
    cardIn.value = true
    runCountUp()
  })
}

/** 热量数字滚动：0 → 目标值，让「算出来了」这件事有实感 */
function runCountUp() {
  cancelAnimationFrame(countRaf)
  const target = Number(props.preset?.kcal) || 0
  const t0 = performance.now()
  const step = (now) => {
    const t = Math.min(1, (now - t0) / 760)
    const eased = 1 - Math.pow(1 - t, 3)
    countKcal.value = Math.round(target * eased)
    if (t < 1) countRaf = requestAnimationFrame(step)
  }
  countRaf = requestAnimationFrame(step)
}

function skip() {
  pct.value = 100
  stopAll()
  showResult()
}

function reroll() {
  emit('retry')
}

function confirm() {
  emit('confirm', props.preset)
}

function close() {
  emit('cancel')
}

function onKey(e) {
  if (e.key === 'Escape') close()
  if (e.key === 'Enter' && phase.value === 'result') confirm()
}

watch(
  () => props.open,
  (open) => {
    window.removeEventListener('keydown', onKey)
    if (open) {
      window.addEventListener('keydown', onKey)
      startScan()
    } else {
      stopAll()
      phase.value = 'scan'
      pct.value = 0
    }
  }
)

// 换了预设：结果卡重播入场，不重扫一遍
watch(
  () => props.preset?.id,
  () => {
    if (props.open && phase.value === 'result') {
      cardIn.value = false
      requestAnimationFrame(() => {
        cardIn.value = true
        runCountUp()
      })
    }
  }
)

onBeforeUnmount(() => {
  stopAll()
  window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <Teleport to="#overlay-root" defer>
    <Transition name="rec">
      <div v-if="open" class="rec" role="dialog" aria-modal="true" aria-label="识别结果">
        <!-- 背景：照片虚化 + 纸感遮罩 -->
        <div class="rec-bg" :style="photo ? { backgroundImage: `url(${photo})` } : null"></div>
        <div class="rec-veil"></div>

        <!-- ① 识别中 -->
        <div v-if="phase === 'scan'" class="scan">
          <p class="scan-tag"><i>✦</i>模拟识别 · 演示数据</p>

          <div class="orb">
            <span class="halo" aria-hidden="true"></span>
            <svg class="ring" viewBox="0 0 200 200" aria-hidden="true">
              <circle class="track" cx="100" cy="100" r="92" />
              <circle
                class="prog"
                cx="100"
                cy="100"
                r="92"
                :stroke-dasharray="C"
                :stroke-dashoffset="dashOffset"
              />
            </svg>
            <div class="orb-img">
              <img v-if="photo" :src="photo" alt="" />
              <span v-else class="ph" aria-hidden="true">🍽</span>
              <i class="scanline" aria-hidden="true"></i>
            </div>
            <span class="orb-pct">{{ pct }}<b>%</b></span>
          </div>

          <h4 class="scan-title">
            正在识别食物<em class="dots" aria-hidden="true"><i></i><i></i><i></i></em>
          </h4>
          <p class="scan-sub">{{ stepLabel }}…</p>

          <ul class="steps">
            <li
              v-for="(s, i) in STEPS"
              :key="s"
              :class="{ done: stepIndex > i, now: stepIndex === i }"
            >
              <span class="tick" aria-hidden="true">
                <svg v-if="stepIndex > i" viewBox="0 0 24 24">
                  <path d="M5 12.5l5 5 9-10" />
                </svg>
                <i v-else></i>
              </span>
              {{ s }}
            </li>
          </ul>

          <button class="skip" type="button" @click="skip">跳过动画</button>
        </div>

        <!-- ② 识别结果 -->
        <div v-else class="result-wrap">
          <div class="burst" aria-hidden="true">
            <span v-for="n in 8" :key="n" :style="{ '--a': n * 45 + 'deg' }">
              {{ ['✨', '🍃', '💛', '⭐'][n % 4] }}
            </span>
          </div>

          <div v-if="preset" :key="preset.id" class="card" :class="{ in: cardIn }">
            <header class="card-hd">
              <span class="ok-dot"></span>
              <b>识别完成</b>
              <span class="conf">置信度 {{ preset.confidence }}%</span>
              <button class="x" type="button" aria-label="关闭" @click="close">✕</button>
            </header>

            <div class="dish">
              <span class="dish-emoji">{{ preset.emoji }}</span>
              <div class="dish-txt">
                <h3>{{ preset.name }}</h3>
                <p>{{ preset.weight }} · {{ preset.meal }} · {{ preset.tag }}</p>
              </div>
            </div>

            <div class="kcal">
              <b>{{ countKcal.toLocaleString('zh-CN') }}</b><span>kcal</span>
              <i class="kcal-hint">按画面估算，可手动改</i>
            </div>

            <ul class="nutri">
              <li v-for="(n, i) in rows" :key="n.label" :style="{ '--d': i * 60 + 'ms' }">
                <span class="nu-lb">{{ n.label }}</span>
                <span class="nu-bar"><i :style="{ width: cardIn ? barWidth(n) + '%' : '0%' }"></i></span>
                <b class="nu-v">{{ n.value }}<em>{{ n.unit }}</em></b>
              </li>
            </ul>

            <p class="portion">{{ preset.portion }}</p>
            <p class="note">「{{ preset.note }}」</p>

            <div class="acts">
              <button class="ghost" type="button" @click="reroll">换一个结果</button>
              <button class="main" type="button" @click="confirm">就用这一餐</button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.rec {
  position: fixed;
  inset: 0;
  z-index: 46;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.rec-bg {
  position: absolute;
  inset: -20px;
  background-size: cover;
  background-position: center;
  filter: blur(22px) saturate(0.85);
  transform: scale(1.08);
}

.rec-veil {
  position: absolute;
  inset: 0;
  background: radial-gradient(120% 80% at 50% 30%, rgba(255, 252, 246, 0.9), rgba(250, 243, 233, 0.96) 62%,
      #f8f1e6 100%);
}

/* ---------------- 识别中 ---------------- */
.scan {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  padding: 0 32px;
  animation: rise-in 320ms var(--ease) both;
}

.scan-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 30px;
  padding: 8px 15px;
  border-radius: var(--r-pill);
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid rgba(230, 215, 195, 0.9);
  font-size: 10.5px;
  letter-spacing: 0.06em;
  color: var(--ink-2);
}

.scan-tag i {
  font-style: normal;
  color: #e0a63f;
}

.orb {
  position: relative;
  width: 208px;
  height: 208px;
  display: grid;
  place-items: center;
}

.halo {
  position: absolute;
  inset: 8px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(217, 136, 95, 0.24), transparent 68%);
  animation: halo 2.4s ease-in-out infinite;
}

.ring {
  position: absolute;
  inset: 0;
  transform: rotate(-90deg);
}

.ring .track {
  fill: none;
  stroke: rgba(230, 215, 195, 0.55);
  stroke-width: 5;
}

.ring .prog {
  fill: none;
  stroke: var(--or);
  stroke-width: 5;
  stroke-linecap: round;
  transition: stroke-dashoffset 120ms linear;
  filter: drop-shadow(0 2px 6px rgba(217, 136, 95, 0.45));
}

.orb-img {
  position: relative;
  width: 158px;
  height: 158px;
  border-radius: 50%;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 16px 34px rgba(140, 105, 75, 0.24);
}

.orb-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.orb-img .ph {
  display: grid;
  place-items: center;
  height: 100%;
  font-size: 54px;
  opacity: 0.4;
}

/* 扫描线：一条细亮线 + 上下渐变 */
.scanline {
  position: absolute;
  left: 8%;
  right: 8%;
  height: 2px;
  background: linear-gradient(90deg, transparent, #fff, transparent);
  box-shadow: 0 0 12px 3px rgba(255, 255, 255, 0.85), 0 0 22px 8px rgba(217, 136, 95, 0.4);
  animation: scan-sweep 1.5s ease-in-out infinite;
}

.orb-pct {
  position: absolute;
  bottom: -6px;
  padding: 3px 12px;
  border-radius: var(--r-pill);
  background: var(--ink);
  color: #fff6e9;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
  box-shadow: 0 6px 14px rgba(60, 40, 25, 0.25);
}

.orb-pct b {
  margin-left: 1px;
  font-size: 8px;
  font-weight: 500;
  opacity: 0.7;
}

.scan-title {
  display: flex;
  align-items: baseline;
  margin: 34px 0 0;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: #4a3e34;
}

.dots {
  display: inline-flex;
  gap: 3px;
  margin-left: 3px;
}

.dots i {
  width: 3.5px;
  height: 3.5px;
  border-radius: 50%;
  background: var(--or);
  animation: breathe 1.05s ease-in-out infinite;
}

.dots i:nth-child(2) {
  animation-delay: 0.16s;
}

.dots i:nth-child(3) {
  animation-delay: 0.32s;
}

.scan-sub {
  margin: 9px 0 0;
  font-size: 11px;
  color: var(--ink-3);
  letter-spacing: 0.03em;
  min-height: 16px;
}

.steps {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 9px;
  margin: 24px 0 0;
  padding: 14px 18px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(230, 215, 195, 0.7);
  min-width: 208px;
}

.steps li {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 11px;
  color: #b3a594;
  transition: color 200ms var(--ease);
}

.steps li.now {
  color: #4a3e34;
  font-weight: 600;
}

.steps li.done {
  color: #9a8b7b;
}

.tick {
  width: 15px;
  height: 15px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  border: 1.4px solid #e2d5c2;
  transition: background 200ms var(--ease), border-color 200ms var(--ease);
}

.steps li.done .tick {
  background: var(--matcha);
  border-color: var(--matcha);
}

.steps li.now .tick {
  border-color: var(--or);
}

.tick svg {
  width: 10px;
  height: 10px;
  fill: none;
  stroke: #fff;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.tick i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--or);
  animation: breathe 0.9s ease-in-out infinite;
}

.steps li.done .tick i {
  display: none;
}

.skip {
  margin-top: 26px;
  padding: 8px 16px;
  border-radius: var(--r-pill);
  font-size: 10.5px;
  color: var(--ink-3);
  background: rgba(255, 255, 255, 0.6);
  border: 1px dashed var(--line);
}

/* ---------------- 识别结果 ---------------- */
.result-wrap {
  position: relative;
  z-index: 2;
  width: 100%;
  display: flex;
  justify-content: center;
  padding: 0 18px;
}

.card {
  position: relative;
  width: 100%;
  max-width: 344px;
  padding: 16px 18px 16px;
  border-radius: 26px;
  background: #fffdf8;
  border: 1px solid #f0e2cf;
  box-shadow: 0 4px 0 #e9d8c2, 0 26px 54px rgba(120, 85, 55, 0.26);
  opacity: 0;
  transform: translateY(26px) scale(0.94);
}

.card.in {
  animation: pop-in 520ms cubic-bezier(0.24, 1.3, 0.42, 1) both;
}

.card-hd {
  display: flex;
  align-items: center;
  gap: 7px;
}

.ok-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--matcha);
  box-shadow: 0 0 0 3px rgba(143, 163, 124, 0.2);
}

.card-hd b {
  font-size: 11.5px;
  font-weight: 700;
  color: #4a3e34;
  letter-spacing: 0.02em;
}

.conf {
  margin-left: auto;
  padding: 3px 9px;
  border-radius: var(--r-pill);
  background: var(--or-xs);
  border: 1px solid var(--or-s);
  font-size: 9.5px;
  color: var(--or-d);
  font-variant-numeric: tabular-nums;
}

.x {
  margin-left: 6px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 11px;
  color: var(--ink-3);
  background: var(--paper-2);
}

.dish {
  display: flex;
  align-items: center;
  gap: 11px;
  margin-top: 13px;
}

.dish-emoji {
  width: 46px;
  height: 46px;
  border-radius: 15px;
  display: grid;
  place-items: center;
  font-size: 24px;
  background: #fff;
  box-shadow: 0 6px 16px rgba(150, 115, 80, 0.16);
  flex: 0 0 auto;
}

.dish-txt {
  min-width: 0;
}

.dish-txt h3 {
  margin: 0;
  font-size: 19px;
  font-weight: 750;
  letter-spacing: -0.01em;
  color: #3d332b;
}

.dish-txt p {
  margin: 3px 0 0;
  font-size: 10px;
  color: var(--ink-3);
}

.kcal {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-top: 12px;
  padding: 10px 0 0;
  border-top: 1px dashed #f0e5d6;
}

.kcal b {
  font-size: 34px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: #4a3e34;
  font-variant-numeric: tabular-nums;
  animation: count-glow 800ms var(--ease) both;
}

.kcal span {
  font-size: 11px;
  color: var(--ink-3);
}

.kcal-hint {
  margin-left: auto;
  font-style: normal;
  font-size: 9px;
  color: #c3b5a4;
}

.nutri {
  list-style: none;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 14px;
  margin: 12px 0 0;
  padding: 0;
}

.nutri li {
  display: grid;
  grid-template-columns: 30px 1fr auto;
  align-items: center;
  gap: 6px;
  opacity: 0;
  animation: rise-in 320ms var(--ease) both;
  animation-delay: calc(240ms + var(--d));
}

.nu-lb {
  font-size: 9.5px;
  color: var(--ink-3);
}

.nu-bar {
  height: 5px;
  border-radius: 99px;
  background: #f4ebdd;
  overflow: hidden;
}

.nu-bar i {
  display: block;
  height: 100%;
  border-radius: 99px;
  background: linear-gradient(90deg, #eda979, var(--or));
  transition: width 620ms cubic-bezier(0.2, 0.9, 0.3, 1);
}

.nu-v {
  font-size: 10px;
  font-weight: 650;
  color: #6b5b4c;
  font-variant-numeric: tabular-nums;
}

.nu-v em {
  margin-left: 1px;
  font-style: normal;
  font-size: 8px;
  font-weight: 400;
  color: var(--ink-3);
}

.portion {
  margin: 13px 0 0;
  font-size: 10px;
  line-height: 1.65;
  color: var(--ink-2);
}

.note {
  margin: 6px 0 0;
  font-family: var(--hand);
  font-size: 13px;
  line-height: 1.6;
  color: #a3907a;
}

.acts {
  display: flex;
  gap: 9px;
  margin-top: 15px;
}

.acts button {
  flex: 1;
  height: 44px;
  border-radius: 15px;
  font-size: 12.5px;
  font-weight: 650;
  transition: transform 140ms var(--ease), background 160ms var(--ease);
}

.acts button:active {
  transform: scale(0.97);
}

.ghost {
  border: 1.5px solid var(--line);
  background: #fff;
  color: var(--ink-2);
}

.main {
  background: var(--or);
  color: #fff8f0;
  box-shadow: 0 3px 0 var(--or-d);
}

/* 结果卡周围飞出的粒子 */
.burst {
  position: absolute;
  left: 50%;
  top: 34%;
  width: 0;
  height: 0;
  pointer-events: none;
}

.burst span {
  position: absolute;
  left: 0;
  top: 0;
  font-size: 15px;
  animation: spark-fly 900ms var(--ease) both;
  animation-delay: 120ms;
}

/* 八个方向写死偏移，避免依赖 CSS 三角函数（老浏览器不支持） */
.burst span:nth-child(1) {
  --dx: 104px;
  --dy: -18px;
}
.burst span:nth-child(2) {
  --dx: 62px;
  --dy: -84px;
}
.burst span:nth-child(3) {
  --dx: -10px;
  --dy: -104px;
}
.burst span:nth-child(4) {
  --dx: -78px;
  --dy: -68px;
}
.burst span:nth-child(5) {
  --dx: -104px;
  --dy: 12px;
}
.burst span:nth-child(6) {
  --dx: -58px;
  --dy: 82px;
}
.burst span:nth-child(7) {
  --dx: 14px;
  --dy: 102px;
}
.burst span:nth-child(8) {
  --dx: 82px;
  --dy: 62px;
}

/* 遮罩进出：先压暗，再让内容浮上来 */
.rec-enter-active,
.rec-leave-active {
  transition: opacity 240ms var(--ease);
}

.rec-enter-from,
.rec-leave-to {
  opacity: 0;
}

@media (max-width: 360px) {
  .orb {
    width: 176px;
    height: 176px;
  }

  .orb-img {
    width: 132px;
    height: 132px;
  }

  .steps {
    min-width: 0;
  }
}

/* 大屏：识别卡居中、留白更松 */
@media (min-width: 768px) {
  .card {
    max-width: 392px;
    padding: 20px 24px 20px;
  }

  .kcal b {
    font-size: 40px;
  }

  .dish-txt h3 {
    font-size: 22px;
  }

  .orb {
    width: 232px;
    height: 232px;
  }

  .orb-img {
    width: 176px;
    height: 176px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .card.in,
  .scan,
  .halo,
  .scanline,
  .dots i,
  .tick i,
  .burst span,
  .nutri li {
    animation: none !important;
    opacity: 1;
  }
}
</style>
