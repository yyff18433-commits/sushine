<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import SSheet from '../components/SSheet.vue'
import { journal, settings } from '../store/journal'
import { cartoonify, CARTOON_STYLES } from '../utils/cartoonify'
import { dieCut } from '../utils/dieCut'
import { readImageFile, firstImageFile } from '../utils/readImageFile'
import { recognizeFood, applyRecognition, generateNote, mealContext } from '../utils/ai'
import { MODEL_SIZE_MB } from '../utils/localVision'

const router = useRouter()
const sheet = ref(false)
const fileInput = ref(null)
const generating = ref(false)

/** idle | running | ai | local | mock | failed —— 决定页面上的那段状态文案 */
const aiState = ref(journal.draft.aiSource || 'idle')
/** 本地模型下载进度（首次用才会有） */
const aiProgress = ref(0)
/** 已等待秒数：超过几秒还没结果就告诉用户为什么慢 */
const aiElapsed = ref(0)
let aiTicker = null
const dragging = ref(false)

/** 成品尺寸：320px 的贴纸框在 2x 屏上要 640 物理像素，800 留出白边后正好够 */
const OUT = 800

const style = computed(() => settings.cartoonStyle)

/**
 * 照片 → 贴纸：cartoonify（按当前风格处理）→ dieCut（不规则白边 + 透明底）
 * 原图单独存在 draft.raw，换风格时从那重画，不会被贴纸覆盖掉
 */
async function render() {
  const draft = journal.draft
  if (!draft.raw) draft.raw = draft.img
  if (!draft.raw) return

  generating.value = true
  try {
    // 给浏览器一帧把「生成中」画出来，再跑重活
    await new Promise((r) => requestAnimationFrame(r))
    const cartoon = await cartoonify(draft.raw, { style: style.value, size: OUT })
    draft.img = await dieCut(cartoon, { size: OUT, pad: 44, wobble: 14, border: 17 })
    draft.style = style.value
    draft.cartoonized = true
  } catch {
    draft.cartoonized = true
  } finally {
    generating.value = false
  }
}

onMounted(() => {
  const draft = journal.draft
  if (!draft.img) return
  // 已经是当前风格画好的贴纸就不重画；识别同理，一张图只认一次
  const needRender = !(draft.cartoonized && draft.style === style.value && draft.img.startsWith('data:'))
  if (needRender) render()
  recognize()
})

/**
 * AI 识别：和「生成贴纸」并行跑。
 * 失败（没 key / 超时 / 断网）就保持本地假数据，不拦用户。
 */
async function recognize() {
  const draft = journal.draft
  if (draft.recognized) return
  draft.recognized = true
  if (!draft.raw) draft.raw = draft.img
  if (!draft.raw) return

  aiState.value = 'running'
  aiProgress.value = 0
  aiElapsed.value = 0
  aiTicker = setInterval(() => (aiElapsed.value += 1), 1000)

  const res = await recognizeFood(draft.raw, { onProgress: (p) => (aiProgress.value = p) })
  clearInterval(aiTicker)
  aiTicker = null

  if (res.ok) {
    applyRecognition(draft, res.data)
    aiState.value = res.source === 'local' ? 'local' : res.source === 'mock' ? 'mock' : 'ai'
  } else {
    aiState.value = 'failed'
  }
  // 存到草稿上，回头再看这一页还能说清楚是 AI 认的还是本地估的
  draft.aiSource = aiState.value

  // 看图这块 DeepSeek 顶不上，但「把这一餐写成一句手账」它能做
  const noteRes = await generateNote(mealContext(draft))
  if (noteRes.ok) {
    draft.note = noteRes.note
    draft.aiNote = true
  }
}

/** 顶部标签文案：先报「做贴纸」，再报「识别」，都完了报结果来源 */
const statusText = computed(() => {
  if (generating.value) return '正在把照片做成贴纸…'
  if (aiState.value === 'running') {
    if (aiProgress.value > 0) {
      return `首次要下载视觉模型 ${aiProgress.value}%（${MODEL_SIZE_MB}MB，只需一次）`
    }
    if (aiElapsed.value >= 4) {
      return `正在看图…（已等 ${aiElapsed.value}s，首次用要下 ${MODEL_SIZE_MB}MB 模型）`
    }
    return '正在看图，认出这是什么…'
  }
  if (aiState.value === 'demo') return `贴纸已生成 · 模拟识别 ${journal.draft.confidence || 92}%`
  if (aiState.value === 'ai') return '贴纸已生成 · AI 已识别'
  if (aiState.value === 'local') return '贴纸已生成 · 本地模型识别'
  if (aiState.value === 'mock' || aiState.value === 'failed') return '贴纸已生成 · 本地估算'
  return '贴纸已生成'
})

function pickStyle(id) {
  if (generating.value || id === settings.cartoonStyle) return
  settings.cartoonStyle = id
  render()
}

function pickFile() {
  sheet.value = false
  fileInput.value?.click()
}

async function onFile(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  handleFile(file)
}

/** 点击选择 / 拖拽 都走这里 */
async function handleFile(file) {
  if (!file) return
  const res = await readImageFile(file)
  if (!res.ok) return
  sheet.value = false
  journal.draft.raw = res.url
  journal.draft.img = res.url
  journal.draft.cartoonized = false
  journal.draft.recognized = false // 换了图就要重新认
  render()
  recognize()
}

function onDrop(e) {
  dragging.value = false
  handleFile(firstImageFile(e.dataTransfer?.files))
}

onBeforeUnmount(() => {
  if (aiTicker) clearInterval(aiTicker)
})
</script>

<template>
  <div
    class="sticker-page"
    @dragover.prevent="dragging = true"
    @dragleave.prevent="dragging = false"
    @drop.prevent="onDrop"
  >
    <div v-if="dragging" class="dropveil">松手，换这张图</div>
    <p class="tag"><i>✦</i>{{ statusText }}</p>

    <div class="cut" :class="{ 'cut--loading': generating }">
      <img
        v-if="journal.draft.img"
        class="cut-img"
        :src="journal.draft.img"
        :alt="journal.draft.name"
      />
      <span v-else class="ph-empty" aria-hidden="true">🍽</span>
    </div>

    <p class="cut-hint">
      {{
        aiState === 'running'
          ? '马上就好，先给这一餐起个名字…'
          : journal.draft.note
            ? `「${journal.draft.note}」`
            : `${journal.draft.name} · ${journal.draft.kcal} kcal`
      }}
    </p>

    <div class="styles" role="group" aria-label="贴纸风格">
      <button
        v-for="s in CARTOON_STYLES"
        :key="s.id"
        class="st"
        :class="{ on: style === s.id }"
        :aria-pressed="style === s.id"
        :disabled="generating"
        @click="pickStyle(s.id)"
      >
        {{ s.label }}
      </button>
    </div>

    <div class="bar3">
      <button class="cir" aria-label="重拍" @click="router.push('/camera')">✕</button>
      <button class="shut" aria-label="确认" @click="router.push('/sticker-info')">
        <svg viewBox="0 0 24 24"><path d="M5 12.5l5 5 9-10" /></svg>
      </button>
      <button class="cir" aria-label="换一张图" @click="sheet = true">
        <svg viewBox="0 0 24 24">
          <path d="M7 3v14a2 2 0 0 0 2 2h12" />
          <path d="M3 7h12a2 2 0 0 1 2 2v12" />
        </svg>
      </button>
    </div>

    <SSheet :open="sheet" title="换一张图" @close="sheet = false">
      <button class="opt" @click="pickFile">🖼 从相册选择</button>
      <button class="opt" @click="sheet = false; router.push('/camera')">📷 重新拍一张</button>
    </SSheet>

    <input ref="fileInput" class="sr-only" type="file" accept="image/*" @change="onFile" />
  </div>
</template>

<style scoped>
.sticker-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100%;
  padding: 74px 0 0;
}

/* 拖拽换图时的遮罩 */
.dropveil {
  position: fixed;
  inset: 0;
  z-index: 20;
  display: grid;
  place-items: center;
  background: rgba(251, 246, 238, 0.86);
  border: 3px dashed var(--or);
  font-size: 14px;
  font-weight: 650;
  letter-spacing: 0.05em;
  color: var(--or-d);
  pointer-events: none;
}

.tag {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 0 0 26px;
  padding: 11px 22px;
  border-radius: var(--r-pill);
  background: #fff;
  font-size: 13px;
  color: #5c4e42;
  white-space: nowrap;
  box-shadow: 0 10px 26px rgba(150, 115, 80, 0.13);
}

.tag i {
  font-style: normal;
  color: #e0a63f;
}

.cut {
  position: relative;
  width: min(320px, 78vw);
  aspect-ratio: 1;
  transform: rotate(-3deg);
  transition: transform 500ms var(--ease), filter 500ms var(--ease);
}

/* 外围虚线 = 贴纸的模切刀线 */
.cut::before {
  content: "";
  position: absolute;
  inset: -12px;
  border-radius: 28px;
  border: 1.5px dashed rgba(160, 140, 115, 0.42);
  pointer-events: none;
}

/* 手绘感的小装饰 */
.cut::after {
  content: "✦";
  position: absolute;
  right: -24px;
  top: 4px;
  font-size: 18px;
  color: rgba(217, 136, 95, 0.55);
  pointer-events: none;
}

.cut--loading {
  transform: rotate(-3deg) scale(0.96);
  filter: blur(3px) saturate(0.8);
}

.cut-img {
  position: relative;
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
  filter: drop-shadow(0 18px 26px rgba(140, 105, 75, 0.28));
}

.ph-empty {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: 64px;
  opacity: 0.4;
  line-height: 1;
}

.cut-hint {
  margin: auto 0 0;
  padding-top: 26px;
  text-align: center;
  font-family: var(--hand);
  font-size: 15px;
  letter-spacing: 0.04em;
  color: #bca98e;
}

.bar3 {
  position: sticky;
  bottom: 0;
  left: 0;
  right: 0;
  width: 100%;
  height: 126px;
  padding: 0 36px 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(180deg, rgba(250, 246, 240, 0), #faf6f0 42%);
  z-index: 4;
}

.opt {
  width: 100%;
  height: 50px;
  border-radius: 16px;
  border: 1.5px solid var(--line);
  background: #fff;
  font-size: 13.5px;
  color: var(--ink);
  text-align: left;
  padding: 0 18px;
}

.opt:active {
  background: var(--paper-2);
}

/* 风格切换：一排小胶囊，选中填满色块 */
.styles {
  display: flex;
  gap: 7px;
  padding: 14px 24px 4px;
  overflow-x: auto;
  scrollbar-width: none;
}

.styles::-webkit-scrollbar {
  display: none;
}

.st {
  flex: none;
  padding: 7px 13px;
  border-radius: var(--r-pill);
  border: 1.5px solid var(--line);
  background: #fff;
  color: var(--ink-2);
  font-size: 12px;
  white-space: nowrap;
  transition: background 160ms var(--ease), color 160ms var(--ease);
}

.st.on {
  background: var(--clay);
  border-color: var(--clay);
  color: #fff;
}

.st:disabled {
  opacity: 0.55;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}

.cir {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #fff;
  color: #4a3e34;
  font-size: 18px;
  box-shadow: 0 10px 24px rgba(150, 115, 80, 0.16);
  transition: transform 140ms var(--ease);
}

.cir:active {
  transform: scale(0.94);
}

.cir svg {
  width: 22px;
  height: 22px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.shut {
  width: 98px;
  height: 56px;
  border-radius: 28px;
  display: grid;
  place-items: center;
  background: #12100e;
  box-shadow: 0 12px 28px rgba(30, 20, 12, 0.3);
  transition: transform 140ms var(--ease);
}

.shut:active {
  transform: scale(0.96);
}

.shut svg {
  width: 24px;
  height: 24px;
  fill: none;
  stroke: #fff;
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* ============ 大屏（≥768px） ============ */
@media (min-width: 768px) {
  .sticker-page {
    max-width: 620px;
    margin: 0 auto;
    padding-top: 34px;
  }

  .cut .ph {
    width: 300px;
    height: 300px;
  }

  .bar3 {
    padding: 0 80px 40px;
  }
}
</style>
