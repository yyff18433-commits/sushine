<script setup>
/**
 * 贴纸装饰页（组员 5 · 4）
 * 一张照片 = 一页手账，用户可以从下面挑贴纸贴上去，
 * 贴完的坐标 / 缩放 / 角度原样存进这条记录，首页卡片上也能看到。
 */
import { computed, nextTick, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import SStickerStage from '../components/SStickerStage.vue'
import SModal from '../components/SModal.vue'
import SToast from '../components/SToast.vue'
import { journal, nextId, setDeco } from '../store/journal'
import { STICKER_PACKS } from '../data/recipes'

const router = useRouter()
const draft = journal.draft

const photo = computed(() => draft.raw || draft.img || '')
const deco = ref((draft.deco || []).map((d) => ({ ...d })))
const selected = ref('')
const pack = ref(STICKER_PACKS[0].id)
const toast = ref('')
const confirmClear = ref(false)

let toastTimer = null
let snapshotTimer = null

function showToast(text) {
  toast.value = text
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 1500)
}

const items = computed(() => STICKER_PACKS.find((p) => p.id === pack.value)?.items || [])
const active = computed(() => deco.value.find((s) => s.id === selected.value) || null)

/* ---------------- 撤销 ---------------- */

const history = ref([])
let silence = false

watch(
  deco,
  () => {
    if (silence) return
    clearTimeout(snapshotTimer)
    snapshotTimer = setTimeout(() => {
      history.value.push(JSON.stringify(deco.value))
      if (history.value.length > 20) history.value.shift()
    }, 420)
  },
  { deep: true }
)

const canUndo = computed(() => history.value.length > 1)

async function undo() {
  if (history.value.length < 2) return
  history.value.pop()
  const prev = history.value[history.value.length - 1]
  silence = true
  deco.value = JSON.parse(prev)
  selected.value = ''
  await nextTick()
  silence = false
  showToast('已撤销一步')
}

/* ---------------- 增删改 ---------------- */

function addSticker(emoji) {
  const id = `d-${nextId()}`
  const maxZ = deco.value.reduce((m, s) => Math.max(m, s.z ?? 0), 0)
  deco.value.push({
    id,
    emoji,
    x: 50 + (Math.random() * 18 - 9),
    y: 46 + (Math.random() * 16 - 8),
    scale: 1,
    rot: Math.round(Math.random() * 16 - 8),
    z: maxZ + 1
  })
  selected.value = id
}

function removeSelected() {
  if (!selected.value) return
  const id = selected.value
  deco.value = deco.value.filter((s) => s.id !== id)
  selected.value = ''
  showToast('已删除贴纸')
}

function duplicate() {
  if (!active.value) return
  const maxZ = deco.value.reduce((m, s) => Math.max(m, s.z ?? 0), 0)
  const copy = { ...active.value, id: `d-${nextId()}`, x: active.value.x + 7, y: active.value.y + 7, z: maxZ + 1 }
  deco.value.push(copy)
  selected.value = copy.id
}

function bringFront() {
  if (!active.value) return
  const maxZ = deco.value.reduce((m, s) => Math.max(m, s.z ?? 0), 0)
  patchActive({ z: maxZ + 1 })
  showToast('已置顶')
}

function scaleBy(delta) {
  if (!active.value) return
  const next = Math.min(2.6, Math.max(0.35, Math.round(((active.value.scale ?? 1) + delta) * 100) / 100))
  patchActive({ scale: next })
}

function rotateBy(delta) {
  if (!active.value) return
  let rot = (active.value.rot ?? 0) + delta
  if (rot > 180) rot -= 360
  if (rot < -180) rot += 360
  patchActive({ rot })
}

function patchActive(patch) {
  if (!active.value) return
  deco.value = deco.value.map((s) => (s.id === active.value.id ? { ...s, ...patch } : s))
}

function clearAll() {
  confirmClear.value = false
  deco.value = []
  selected.value = ''
  showToast('贴纸清空了')
}

/* ---------------- 保存 ---------------- */

function save() {
  const list = deco.value.map((s, i) => ({ ...s, z: s.z ?? i }))
  if (draft.editId) {
    setDeco(draft.editId, list)
  }
  draft.deco = list
  showToast(list.length ? `✓ 已贴好 ${list.length} 张贴纸` : '已清空贴纸')
  // 返回上一页：可能是还没保存的贴纸信息页，不能直接跳首页，否则这一餐会丢
  setTimeout(() => router.back(), 520)
}
</script>

<template>
  <div class="dpage">
    <header class="dhead">
      <button class="bak" aria-label="返回" @click="router.back()">‹</button>
      <div class="ttl">
        <b>贴纸装饰</b>
        <span>{{ deco.length ? `已贴 ${deco.length} 张` : '给这一餐加点装饰' }}</span>
      </div>
      <button class="undo" type="button" :disabled="!canUndo" @click="undo">↺</button>
      <button class="done" type="button" @click="save">完成</button>
    </header>

    <div class="stagewrap">
      <SStickerStage
        v-model="deco"
        v-model:selected="selected"
        :src="photo"
        editable
      />

      <Transition name="ctrl">
        <div v-if="active" class="ctrl">
          <button type="button" aria-label="缩小" @click="scaleBy(-0.12)">－</button>
          <span class="ctl-v">{{ Math.round((active.scale ?? 1) * 100) }}%</span>
          <button type="button" aria-label="放大" @click="scaleBy(0.12)">＋</button>
          <i class="divider" aria-hidden="true"></i>
          <button type="button" aria-label="左转" @click="rotateBy(-12)">↺</button>
          <button type="button" aria-label="右转" @click="rotateBy(12)">↻</button>
          <i class="divider" aria-hidden="true"></i>
          <button type="button" aria-label="置顶" @click="bringFront">⇧</button>
          <button type="button" aria-label="复制" @click="duplicate">⧉</button>
          <button class="del" type="button" aria-label="删除" @click="removeSelected">✕</button>
        </div>
      </Transition>
    </div>

    <p class="tips">
      <template v-if="active">拖动移动 · 双指缩放旋转 · 圆点也能拉</template>
      <template v-else>点下面的贴纸贴到照片上 · 贴上后可拖动、缩放</template>
    </p>

    <section class="tray">
      <div class="tabs">
        <button
          v-for="p in STICKER_PACKS"
          :key="p.id"
          type="button"
          class="tab"
          :class="{ on: pack === p.id }"
          @click="pack = p.id"
        >
          {{ p.label }}
        </button>
        <button v-if="deco.length" class="clear" type="button" @click="confirmClear = true">清空</button>
      </div>

      <div class="grid">
        <button
          v-for="e in items"
          :key="e"
          type="button"
          class="pick"
          :aria-label="`贴一个 ${e}`"
          @click="addSticker(e)"
        >
          {{ e }}
        </button>
      </div>
    </section>

    <SModal
      :open="confirmClear"
      title="清空所有贴纸？"
      text="照片不会变，只是把贴上去的贴纸全部拿掉。"
      cancel-text="再想想"
      confirm-text="清空"
      @cancel="confirmClear = false"
      @confirm="clearAll"
    />
    <SToast :show="!!toast" :text="toast" />
  </div>
</template>

<style scoped>
.dpage {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 100%;
  padding: 52px 18px 18px;
}

.dhead {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 0 0 auto;
}

.bak {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 15px;
  color: #6b5b4c;
  background: #fff;
  box-shadow: 0 6px 14px rgba(150, 115, 80, 0.1);
}

.ttl {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ttl b {
  font-size: 15px;
  font-weight: 750;
}

.ttl span {
  font-size: 9.5px;
  color: var(--ink-3);
}

.undo {
  margin-left: auto;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 14px;
  color: var(--ink-2);
  background: #fff;
  box-shadow: 0 6px 14px rgba(150, 115, 80, 0.1);
  transition: opacity 160ms var(--ease), transform 140ms var(--ease);
}

.undo:disabled {
  opacity: 0.35;
}

.undo:active {
  transform: scale(0.92);
}

.done {
  padding: 8px 16px;
  border-radius: var(--r-pill);
  background: var(--or);
  color: #fff8f0;
  font-size: 11.5px;
  font-weight: 700;
  box-shadow: 0 2px 0 var(--or-d);
}

.done:active {
  transform: translateY(1px);
  box-shadow: 0 1px 0 var(--or-d);
}

.stagewrap {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin-top: 14px;
}

.stagewrap :deep(.stage) {
  max-width: min(100%, 360px);
  margin: 0 auto;
}

/* 选中后的浮层工具条：贴着画布底部浮起来 */
.ctrl {
  position: absolute;
  left: 50%;
  bottom: -6px;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 6px 8px;
  border-radius: var(--r-pill);
  background: rgba(43, 33, 27, 0.82);
  backdrop-filter: blur(8px);
  box-shadow: 0 10px 24px rgba(40, 25, 15, 0.3);
  white-space: nowrap;
  z-index: 6;
}

.ctrl button {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 12px;
  color: #fff6e9;
  transition: background 140ms var(--ease), transform 120ms var(--ease);
}

.ctrl button:active {
  background: rgba(255, 255, 255, 0.16);
  transform: scale(0.9);
}

.ctrl button.del {
  color: #ffb8a5;
}

.ctl-v {
  min-width: 34px;
  text-align: center;
  font-size: 9.5px;
  color: rgba(255, 246, 233, 0.7);
  font-variant-numeric: tabular-nums;
}

.divider {
  width: 1px;
  height: 14px;
  margin: 0 2px;
  background: rgba(255, 255, 255, 0.18);
}

.ctrl-enter-active,
.ctrl-leave-active {
  transition: opacity 180ms var(--ease), transform 220ms var(--ease);
}

.ctrl-enter-from,
.ctrl-leave-to {
  opacity: 0;
  transform: translate(-50%, 8px) scale(0.94);
}

.tips {
  margin: 12px 0 0;
  text-align: center;
  font-size: 9.5px;
  letter-spacing: 0.02em;
  color: var(--ink-3);
  flex: 0 0 auto;
}

.tray {
  flex: 0 0 auto;
  margin-top: 10px;
  padding: 10px 6px 4px;
  border-radius: 20px 20px 0 0;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid #f2e6d6;
  border-bottom: none;
}

.tabs {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 4px 8px;
}

.tab {
  padding: 5px 12px;
  border-radius: var(--r-pill);
  font-size: 10.5px;
  color: var(--ink-2);
  background: transparent;
  transition: background 160ms var(--ease), color 160ms var(--ease);
}

.tab.on {
  background: var(--or);
  color: #fff;
  font-weight: 650;
}

.clear {
  margin-left: auto;
  padding: 5px 10px;
  border-radius: var(--r-pill);
  font-size: 9.5px;
  color: var(--ink-3);
  border: 1px dashed var(--line);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(44px, 1fr));
  gap: 6px;
  padding: 0 2px 6px;
}

.pick {
  aspect-ratio: 1;
  border-radius: 14px;
  display: grid;
  place-items: center;
  font-size: 23px;
  background: #fff;
  box-shadow: 0 3px 10px rgba(150, 115, 80, 0.1);
  transition: transform 130ms var(--ease), box-shadow 130ms var(--ease);
}

.pick:active {
  transform: scale(0.88);
  box-shadow: 0 1px 4px rgba(150, 115, 80, 0.12);
}

/* ============ 大屏 ============ */
@media (min-width: 768px) {
  .dpage {
    max-width: 560px;
    margin: 0 auto;
    padding: 36px 24px 24px;
  }

  .stagewrap :deep(.stage) {
    max-width: 340px;
  }

  .grid {
    grid-template-columns: repeat(auto-fill, minmax(52px, 1fr));
  }

  .pick {
    font-size: 27px;
  }
}
</style>
