<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SRecognition from '../components/SRecognition.vue'
import { journal, resetDraft, startManualDraft } from '../store/journal'
import { dateKey } from '../store/body'
import { IMAGES } from '../data/mock'
import { pickRecognition, presetToDraft } from '../data/recipes'
import { readImageFile, firstImageFile } from '../utils/readImageFile'
import { warmup } from '../utils/localVision'

const router = useRouter()
const route = useRoute()

/** 从日历「补记某一天」进来时带着 ?date=，新记录就落在那一天 */
const targetDate = () => (typeof route.query.date === 'string' && route.query.date ? route.query.date : dateKey())
const fileInput = ref(null)
const dragging = ref(false)
const reading = ref(false)
const errorText = ref('')
let errorTimer = null

/* ---------- 模拟识别流程 ---------- */
const recOpen = ref(false)
const recPreset = ref(null)
const flash = ref(false)
/** 识别用的那张图：快门是内置演示图，上传/粘贴/拖拽是用户自己的图 */
const recPhoto = ref('')
let flashTimer = null

/**
 * 按快门：先闪一下光，再把识别遮罩推上来。
 * 真实拍摄这里会拿摄像头帧，演示版用内置餐照，但后续流程完全一致。
 */
function shoot() {
  if (recOpen.value || reading.value) return
  resetDraft()
  journal.draft.img = IMAGES.duck
  journal.draft.raw = IMAGES.duck
  journal.draft.date = targetDate()
  startRecognition(IMAGES.duck)
}

/** 闪光 + 打开识别遮罩；photo 为空时用取景框里的图 */
function startRecognition(photo) {
  recPhoto.value = photo || journal.draft.raw || journal.draft.img || IMAGES.duck
  recPreset.value = pickRecognition()
  flash.value = true
  clearTimeout(flashTimer)
  flashTimer = setTimeout(() => (flash.value = false), 240)
  // 闪光落下的瞬间再弹遮罩，衔接更自然
  setTimeout(() => (recOpen.value = true), 150)
}

/** 结果卡「换一个结果」：只换数据，不重扫 */
function onRetry() {
  recPreset.value = pickRecognition(recPreset.value?.id || '')
}

/** 确认预设结果：写进草稿，进贴纸页（那里只做贴纸化，不再重识别） */
function onConfirm(preset) {
  if (!preset) return
  Object.assign(journal.draft, presetToDraft(preset), {
    img: recPhoto.value,
    raw: recPhoto.value,
    date: journal.draft.date || dateKey(),
    editId: null,
    deco: [],
    cartoonized: false,
    recognized: true,
    aiSource: 'demo'
  })
  recOpen.value = false
  router.push('/sticker')
}

function onCancel() {
  recOpen.value = false
}

/** 识别失败 / 不想拍照时的降级路径：直接手动填 */
function manual() {
  startManualDraft()
  router.push('/edit?manual=1')
}

function pickFile() {
  fileInput.value?.click()
}

function flashError(text) {
  errorText.value = text
  clearTimeout(errorTimer)
  errorTimer = setTimeout(() => (errorText.value = ''), 2800)
}

/** 统一的入口：点击选文件 / 拖拽 / 粘贴 都走这里 */
async function handleFile(file) {
  if (!file) return

  reading.value = true
  const res = await readImageFile(file)
  reading.value = false

  if (!res.ok) {
    flashError(res.message)
    return
  }

  resetDraft()
  journal.draft.raw = res.url
  journal.draft.img = res.url
  journal.draft.date = targetDate()
  journal.draft.cartoonized = false
  journal.draft.recognized = false
  startRecognition(res.url)
}

function onFile(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  handleFile(file)
}

function onDrop(e) {
  dragging.value = false
  const files = e.dataTransfer?.files
  if (!files?.length) return

  const file = firstImageFile(files)
  if (!file) {
    flashError('拖进来的不是图片，换 jpg / png / webp 试试')
    return
  }
  handleFile(file)
}

function onPaste(e) {
  const item = Array.from(e.clipboardData?.items || []).find((i) => i.type.startsWith('image/'))
  const file = item?.getAsFile()
  if (file) handleFile(file)
}

onMounted(() => {
  window.addEventListener('paste', onPaste)
  // 提前把视觉模型准备好：已缓存时很快，没缓存时相当于提前开始下载
  warmup()
})

onBeforeUnmount(() => {
  window.removeEventListener('paste', onPaste)
  clearTimeout(errorTimer)
  clearTimeout(flashTimer)
})
</script>

<template>
  <div class="camera">
    <p class="cam-tag"><i>✦</i>对准食物，按一下就自动识别</p>

    <div
      class="live"
      :class="{ 'live--hot': dragging }"
      @dragover.prevent="dragging = true"
      @dragleave.prevent="dragging = false"
      @drop.prevent="onDrop"
    >
      <img :src="journal.draft.img || IMAGES.duck" alt="取景画面" />
      <i class="br a"></i><i class="br b"></i><i class="br c"></i><i class="br d"></i>
      <div v-if="dragging" class="veil">松手，用这张图</div>
      <div v-else-if="reading" class="veil">正在读取照片…</div>
      <div class="flash" :class="{ on: flash }" aria-hidden="true"></div>
    </div>

    <p class="cam-hint" :class="{ 'cam-hint--err': !!errorText }">
      {{ errorText || '对准备吃的，按一下' }}
    </p>

    <div class="upl">
      <button class="upl-btn" type="button" @click="pickFile">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 16.5V4.5M7.5 9L12 4.5 16.5 9" />
          <path d="M4.5 15v3.5A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5V15" />
        </svg>
        上传照片
      </button>
      <span class="upl-tip">也可以把图拖进来，或 Ctrl+V 粘贴</span>
    </div>

    <button class="manual" @click="manual">识别不准？手动记一餐</button>

    <div class="cam-bar">
      <button class="cir" aria-label="取消" @click="router.push('/home')">✕</button>

      <button class="shut" aria-label="快门" @click="shoot"><i></i></button>

      <button class="cir" aria-label="从相册选一张" @click="pickFile">
        <svg viewBox="0 0 24 24">
          <path d="M7 3v14a2 2 0 0 0 2 2h12" />
          <path d="M3 7h12a2 2 0 0 1 2 2v12" />
        </svg>
      </button>
    </div>

    <input ref="fileInput" class="sr-only" type="file" accept="image/*" @change="onFile" />

    <!-- 拍照后的模拟识别流程（闪光 → 进度 → 预设结果卡） -->
    <SRecognition
      :open="recOpen"
      :photo="recPhoto"
      :preset="recPreset"
      @confirm="onConfirm"
      @cancel="onCancel"
      @retry="onRetry"
    />
  </div>
</template>

<style scoped>
.camera {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100%;
  padding: 74px 0 0;
}

.cam-tag {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 0 0 22px;
  padding: 11px 22px;
  border-radius: var(--r-pill);
  background: #fff;
  font-size: 13px;
  color: #5c4e42;
  white-space: nowrap;
  box-shadow: 0 10px 26px rgba(150, 115, 80, 0.13);
}

.cam-tag i {
  font-style: normal;
  font-size: 13px;
  color: #e0a63f;
}

.live {
  position: relative;
  width: 320px;
  max-width: calc(100% - 40px);
  aspect-ratio: 320 / 376;
  border-radius: 36px;
  overflow: hidden;
  box-shadow: 0 26px 54px rgba(150, 115, 80, 0.24), 0 0 0 9px rgba(255, 255, 255, 0.78);
  transition: box-shadow 180ms var(--ease);
}

/* 拖拽悬停：整个取景框亮起橘色，明确告诉用户「能放这里」 */
.live--hot {
  box-shadow: 0 0 0 3px var(--or), 0 0 0 11px rgba(217, 136, 95, 0.18),
    0 26px 54px rgba(150, 115, 80, 0.24);
}

.veil {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 24px;
  text-align: center;
  background: rgba(255, 253, 249, 0.9);
  border: 2.5px dashed var(--or);
  border-radius: 36px;
  font-size: 13.5px;
  font-weight: 650;
  letter-spacing: 0.04em;
  color: var(--or-d);
}

/* 快门闪光：白屏一闪，和识别遮罩衔接 */
.flash {
  position: absolute;
  inset: 0;
  background: #fff;
  opacity: 0;
  pointer-events: none;
  transition: opacity 260ms ease-out;
}

.flash.on {
  opacity: 0.92;
  transition-duration: 40ms;
}

.live img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.br {
  position: absolute;
  width: 22px;
  height: 22px;
  border: 2.4px solid rgba(255, 255, 255, 0.92);
  border-radius: 5px;
}

.br.a {
  left: 14px;
  top: 14px;
  border-right: 0;
  border-bottom: 0;
}
.br.b {
  right: 14px;
  top: 14px;
  border-left: 0;
  border-bottom: 0;
}
.br.c {
  left: 14px;
  bottom: 14px;
  border-right: 0;
  border-top: 0;
}
.br.d {
  right: 14px;
  bottom: 14px;
  border-left: 0;
  border-top: 0;
}

.cam-hint {
  margin: auto 0 6px;
  padding-top: 18px;
  text-align: center;
  font-family: var(--hand);
  font-size: 20px;
  letter-spacing: 0.04em;
  color: #bca98e;
}

/* 报错时不用手写体，免得看不清 */
.cam-hint--err {
  font-family: var(--sans);
  font-size: 12.5px;
  color: var(--err);
  padding-top: 14px;
}

/* 上传入口：电脑上这是主要路径，手机上也比小图标好点 */
.upl {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  margin: 8px 0 4px;
}

.upl-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 11px 20px;
  border-radius: var(--r-pill);
  border: 1.5px dashed var(--line);
  background: #fff;
  font-size: 12.5px;
  color: var(--ink);
  transition: border-color 160ms var(--ease), transform 160ms var(--ease);
}

.upl-btn:active {
  transform: scale(0.97);
  border-color: var(--or-300);
}

.upl-btn svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: var(--or-d);
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.upl-tip {
  font-size: 9.5px;
  color: var(--ink-3);
  letter-spacing: 0.02em;
}

.cam-bar {
  position: sticky;
  bottom: 0;
  width: 100%;
  height: 126px;
  padding: 0 36px 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(180deg, rgba(250, 246, 240, 0), #faf6f0 42%);
}

.manual {
  margin: 2px 0 4px;
  padding: 8px 16px;
  border-radius: var(--r-pill);
  border: 1.5px dashed var(--line);
  background: transparent;
  font-size: 11.5px;
  color: var(--ink-2);
}

.manual:active {
  background: var(--paper-2);
}

.cir {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #fff;
  color: var(--ink);
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

.shut i {
  display: block;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #fff;
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

/* ============ 大屏（≥768px） ============ */
@media (min-width: 768px) {
  .camera {
    max-width: 660px;
    margin: 0 auto;
    padding-top: 34px;
  }

  .cam-tag {
    font-size: 14px;
  }

  .live {
    width: 430px;
  }

  .cam-hint {
    font-size: 22px;
  }
}
</style>
