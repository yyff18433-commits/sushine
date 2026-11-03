<script setup>
/**
 * 贴纸画布（组员 5 · 4）
 *
 * 把 emoji 贴纸贴在照片上：拖动、缩放、旋转、删除、调图层。
 * 交互统一走 Pointer Events：鼠标、触屏、触控笔同一套代码，
 * 手机上第二根手指落下就自动切成「双指缩放 + 旋转」。
 *
 * 数据结构（存进记录里的 deco 字段）：
 *   { id, emoji, x: 0-100(%), y: 0-100(%), scale: 0.35-2.6, rot: 角度, z }
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  src: { type: String, default: '' },
  selected: { type: String, default: '' },
  editable: { type: Boolean, default: true }
})

const emit = defineEmits(['update:modelValue', 'update:selected', 'change', 'remove'])

const stage = ref(null)
const stageW = ref(320)
let ro = null

/** 贴纸基础尺寸跟着画布宽度走，换设备不会大小失衡 */
const baseSize = computed(() => Math.round(stageW.value * 0.2))

const list = computed(() => props.modelValue || [])

function patch(id, next) {
  const idx = list.value.findIndex((s) => s.id === id)
  if (idx < 0) return
  const updated = list.value.slice()
  updated[idx] = { ...updated[idx], ...next }
  emit('update:modelValue', updated)
  emit('change', updated)
}

function select(id) {
  if (props.selected !== id) emit('update:selected', id)
}

/* ---------------- 指针交互 ---------------- */

/** pointerId → { x, y }，用来判断单指拖 / 双指缩放 */
const pointers = new Map()
let gesture = null

function findSticker(id) {
  return list.value.find((s) => s.id === id)
}

function stageRect() {
  return stage.value?.getBoundingClientRect() || { width: 320, height: 400, left: 0, top: 0 }
}

function onPointerDown(e, sticker) {
  if (!props.editable) return
  e.preventDefault()
  select(sticker.id)
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })

  const rect = stageRect()
  if (pointers.size === 1) {
    gesture = {
      mode: 'drag',
      id: sticker.id,
      startX: e.clientX,
      startY: e.clientY,
      ox: sticker.x,
      oy: sticker.y,
      w: rect.width,
      h: rect.height,
      moved: false
    }
  } else if (pointers.size === 2) {
    const [a, b] = [...pointers.values()]
    gesture = {
      mode: 'pinch',
      id: sticker.id,
      dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
      ang: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI,
      scale: sticker.scale ?? 1,
      rot: sticker.rot ?? 0
    }
  }

  window.addEventListener('pointermove', onPointerMove, { passive: false })
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerUp)
}

function onPointerMove(e) {
  if (!gesture) return
  if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })

  if (gesture.mode === 'drag') {
    const dx = e.clientX - gesture.startX
    const dy = e.clientY - gesture.startY
    if (!gesture.moved && Math.hypot(dx, dy) > 2) gesture.moved = true
    if (!gesture.moved) return
    const x = clamp(gesture.ox + (dx / gesture.w) * 100, 3, 97)
    const y = clamp(gesture.oy + (dy / gesture.h) * 100, 3, 97)
    patch(gesture.id, { x: round(x), y: round(y) })
    return
  }

  if (gesture.mode === 'pinch' && pointers.size >= 2) {
    const [a, b] = [...pointers.values()]
    const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1
    const ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI
    patch(gesture.id, {
      scale: round(clamp(gesture.scale * (dist / gesture.dist), 0.35, 2.6), 2),
      rot: Math.round(normalizeAngle(gesture.rot + (ang - gesture.ang)))
    })
    return
  }

  if (gesture.mode === 'scale' || gesture.mode === 'rotate') {
    const s = findSticker(gesture.id)
    if (!s) return
    const rect = stageRect()
    const cx = rect.left + (s.x / 100) * rect.width
    const cy = rect.top + (s.y / 100) * rect.height
    const dx = e.clientX - cx
    const dy = e.clientY - cy
    const dist = Math.hypot(dx, dy)
    const ang = (Math.atan2(dy, dx) * 180) / Math.PI

    if (gesture.mode === 'scale') {
      patch(gesture.id, {
        scale: round(clamp(gesture.scale * (dist / (gesture.dist || 1)), 0.35, 2.6), 2)
      })
    } else {
      patch(gesture.id, { rot: Math.round(normalizeAngle(gesture.rot + (ang - gesture.ang))) })
    }
  }
}

function onPointerUp(e) {
  pointers.delete(e.pointerId)

  // 双指抬掉一根：重置手势，避免剩下一根突然「跳」
  if (pointers.size === 1) {
    const id = gesture?.id
    const sticker = findSticker(id)
    const rect = stageRect()
    const [p] = [...pointers.values()]
    if (sticker) {
      gesture = {
        mode: 'drag',
        id,
        startX: p.x,
        startY: p.y,
        ox: sticker.x,
        oy: sticker.y,
        w: rect.width,
        h: rect.height,
        moved: true
      }
    }
    return
  }

  if (pointers.size === 0) {
    gesture = null
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    window.removeEventListener('pointercancel', onPointerUp)
  }
}

/** 右下角圆点：拖它就缩放 */
function startScale(e, sticker) {
  if (!props.editable) return
  e.stopPropagation()
  e.preventDefault()
  const rect = stageRect()
  const cx = rect.left + (sticker.x / 100) * rect.width
  const cy = rect.top + (sticker.y / 100) * rect.height
  gesture = {
    mode: 'scale',
    id: sticker.id,
    scale: sticker.scale ?? 1,
    dist: Math.hypot(e.clientX - cx, e.clientY - cy) || 1
  }
  window.addEventListener('pointermove', onPointerMove, { passive: false })
  window.addEventListener('pointerup', onPointerUp)
}

/** 左上角圆点：拖它转角度 */
function startRotate(e, sticker) {
  if (!props.editable) return
  e.stopPropagation()
  e.preventDefault()
  const rect = stageRect()
  const cx = rect.left + (sticker.x / 100) * rect.width
  const cy = rect.top + (sticker.y / 100) * rect.height
  gesture = {
    mode: 'rotate',
    id: sticker.id,
    rot: sticker.rot ?? 0,
    ang: (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI
  }
  window.addEventListener('pointermove', onPointerMove, { passive: false })
  window.addEventListener('pointerup', onPointerUp)
}

/** 滚轮缩放：电脑上没有双指，给个等价入口 */
function onWheel(e) {
  if (!props.editable || !props.selected) return
  const s = findSticker(props.selected)
  if (!s) return
  e.preventDefault()
  patch(s.id, { scale: round(clamp((s.scale ?? 1) - e.deltaY * 0.0012, 0.35, 2.6), 2) })
}

function removeSticker(e, id) {
  e.stopPropagation()
  const next = list.value.filter((s) => s.id !== id)
  emit('update:modelValue', next)
  emit('change', next)
  emit('remove', id)
  if (props.selected === id) emit('update:selected', '')
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v))
}

function round(v, digits = 1) {
  const p = 10 ** digits
  return Math.round(v * p) / p
}

function normalizeAngle(a) {
  let v = a % 360
  if (v > 180) v -= 360
  if (v < -180) v += 360
  return v
}

/* 点到空白处取消选中 */
function onStageClick(e) {
  if (!props.editable) return
  if (e.target === stage.value || e.target.classList.contains('photo')) {
    emit('update:selected', '')
  }
}

onMounted(() => {
  const measure = () => {
    if (stage.value) stageW.value = stage.value.clientWidth || 320
  }
  measure()
  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(measure)
    ro.observe(stage.value)
  }
})

onBeforeUnmount(() => {
  ro?.disconnect()
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointercancel', onPointerUp)
})

/* 删掉选中项时顺手清掉选中态 */
watch(
  () => props.modelValue.length,
  () => {
    if (props.selected && !props.modelValue.some((s) => s.id === props.selected)) {
      emit('update:selected', '')
    }
  }
)
</script>

<template>
  <div ref="stage" class="stage" :class="{ 'stage--edit': editable }" @click="onStageClick" @wheel="onWheel">
    <div class="photo" :style="src ? { backgroundImage: `url(${src})` } : null">
      <span v-if="!src" class="photo-ph" aria-hidden="true">🍽</span>
    </div>

    <TransitionGroup name="st" tag="div" class="layer">
      <div
        v-for="(s, i) in list"
        :key="s.id"
        class="st"
        :class="{ on: editable && selected === s.id, dim: editable && selected && selected !== s.id }"
        :style="{
          left: s.x + '%',
          top: s.y + '%',
          zIndex: 2 + (s.z ?? i),
          fontSize: baseSize * (s.scale ?? 1) + 'px',
          '--rot': (s.rot ?? 0) + 'deg'
        }"
        @pointerdown="onPointerDown($event, s)"
        @click.stop="select(s.id)"
      >
        <span class="st-emoji">{{ s.emoji }}</span>

        <template v-if="editable && selected === s.id">
          <span class="ring" aria-hidden="true"></span>
          <button class="h h-del" type="button" aria-label="删除贴纸" @pointerdown.stop @click="removeSticker($event, s.id)">✕</button>
          <span class="h h-scale" aria-hidden="true" @pointerdown="startScale($event, s)"></span>
          <span class="h h-rot" aria-hidden="true" @pointerdown="startRotate($event, s)">↻</span>
        </template>
      </div>
    </TransitionGroup>

    <p v-if="editable && !list.length" class="hint">从下面挑一张贴纸，贴到照片上</p>
  </div>
</template>

<style scoped>
.stage {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 5;
  border-radius: 24px;
  overflow: hidden;
  background: var(--paper-2);
  box-shadow: 0 14px 34px rgba(140, 105, 75, 0.2);
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}

.photo {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  display: grid;
  place-items: center;
}

.photo-ph {
  font-size: 56px;
  opacity: 0.35;
}

.layer {
  position: absolute;
  inset: 0;
}

/* 贴纸本体：emoji + 白色描边 + 投影，像一张模切贴纸 */
.st {
  position: absolute;
  line-height: 1;
  transform: translate(-50%, -50%) rotate(var(--rot));
  cursor: grab;
  transition: transform 120ms var(--ease), opacity 160ms var(--ease);
  will-change: left, top;
}

.st:active {
  cursor: grabbing;
}

.st-emoji {
  display: block;
  filter: drop-shadow(0 0 1.5px #fff) drop-shadow(0 0 2.5px rgba(255, 255, 255, 0.9))
    drop-shadow(0 4px 8px rgba(60, 40, 25, 0.28));
  transition: transform 140ms var(--ease);
}

.st.dim .st-emoji {
  opacity: 0.92;
}

.st.on .st-emoji {
  animation: wiggle 300ms var(--ease);
}

/* 选中框：虚线 + 四个角点 */
.ring {
  position: absolute;
  inset: -22%;
  border: 1.5px dashed rgba(255, 255, 255, 0.95);
  border-radius: 10px;
  box-shadow: 0 0 0 1.5px rgba(217, 136, 95, 0.55), 0 0 18px rgba(217, 136, 95, 0.24);
  pointer-events: none;
}

.h {
  position: absolute;
  width: 19px;
  height: 19px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 9px;
  color: #fff;
  box-shadow: 0 3px 8px rgba(60, 40, 25, 0.28);
  touch-action: none;
}

.h-del {
  right: -22%;
  top: -22%;
  background: #c4624f;
  font-size: 10px;
  font-weight: 700;
}

.h-scale {
  right: -22%;
  bottom: -22%;
  background: var(--or);
  cursor: nwse-resize;
}

.h-rot {
  left: -22%;
  top: -22%;
  background: #7c8f6d;
  cursor: grab;
}

.hint {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 16px;
  margin: 0;
  text-align: center;
  font-family: var(--hand);
  font-size: 13px;
  color: rgba(255, 255, 255, 0.92);
  text-shadow: 0 1px 6px rgba(60, 40, 25, 0.45);
  pointer-events: none;
}

/* 贴纸增删的过渡：落下时带一点弹 */
.st-enter-active {
  animation: sticker-drop 380ms var(--ease);
}

.st-leave-active {
  transition: opacity 160ms var(--ease), transform 160ms var(--ease);
}

.st-leave-to {
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.4) rotate(var(--rot));
}

@media (prefers-reduced-motion: reduce) {
  .st,
  .st-emoji {
    transition: none !important;
  }

  .st-enter-active,
  .st.on .st-emoji {
    animation: none !important;
  }
}
</style>
