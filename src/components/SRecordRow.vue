<script setup>
/**
 * 一条记录（历史页 / 收藏页共用）
 *
 * 左滑露出「收藏 / 删除」两个动作；点一下进详情。
 * 卡片本身不做位移动画，位移只作用在 .front 上，
 * 这样滑开时底下的动作按钮是「被揭开」而不是跟着跑。
 */
import { computed } from 'vue'
import SSticker from './SSticker.vue'
import SDecoLayer from './SDecoLayer.vue'
import SFavButton from './SFavButton.vue'
import { useSwipe } from '../composables/useSwipe'
import { isFav, toggleFav } from '../store/db'
import { settings } from '../store/journal'

const props = defineProps({
  entry: { type: Object, required: true },
  /** 刚新增的那条：播一次高亮 */
  flash: { type: Boolean, default: false }
})

const emit = defineEmits(['open', 'delete', 'fav'])

const MAX = 132
const { dx, dragging, open, onDown, close } = useSwipe({ max: MAX })

const fav = computed(() => isFav(props.entry.id))

let startX = 0
let startY = 0
let moved = false

function down(e) {
  startX = e.clientX
  startY = e.clientY
  moved = false
  onDown(e)
}

function track(e) {
  if (Math.hypot(e.clientX - startX, e.clientY - startY) > 8) moved = true
}

function onClick() {
  // 拖完松手浏览器还会补一个 click，先把它挡掉，否则刚滑开就被关上
  if (moved) return
  if (open.value) {
    close()
    return
  }
  emit('open', props.entry)
}

function onFav() {
  const next = toggleFav(props.entry.id)
  close()
  emit('fav', { entry: props.entry, on: next })
}

function onDelete() {
  close()
  emit('delete', props.entry)
}

const kcalText = computed(() =>
  settings.hideKcal ? '已记录' : `${Number(props.entry.kcal) || 0} kcal`
)
</script>

<template>
  <div class="row" :class="{ 'row--flash': flash }">
    <div class="acts" :class="{ 'acts--open': open }">
      <button class="act act-fav" type="button" @click.stop="onFav">
        <span>{{ fav ? '取消' : '收藏' }}</span>
      </button>
      <button class="act act-del" type="button" @click.stop="onDelete">
        <span>删除</span>
      </button>
    </div>

    <div
      class="front"
      :class="{ 'front--drag': dragging }"
      :style="{ transform: `translateX(${dx}px)` }"
      role="button"
      tabindex="0"
      @pointerdown="down"
      @pointermove="track"
      @click="onClick"
      @keydown.enter="emit('open', entry)"
    >
      <div class="thumb">
        <SSticker :src="entry.img" :alt="entry.name" size="54px" border="3px" />
        <SDecoLayer :deco="entry.deco" :base="13" />
      </div>

      <div class="info">
        <div class="line">
          <b>{{ entry.name }}</b>
          <em>{{ entry.emoji }}</em>
        </div>
        <p class="meta">{{ entry.time }} · {{ entry.meal }} · {{ entry.tag }}</p>
        <p class="note">{{ entry.note }}</p>
      </div>

      <div class="right">
        <span class="kcal">{{ kcalText }}</span>
        <SFavButton :active="fav" :size="27" @toggle="onFav" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.row {
  position: relative;
  border-radius: 18px;
  overflow: hidden;
  background: #e8b3a2;
  /* 横向手势归我们，竖向仍然交给页面滚动 */
  touch-action: pan-y;
}

.row--flash {
  animation: flash-ring 1.8s var(--ease) 1;
}

/* 底层动作：靠右排，滑开多少露多少 */
.acts {
  position: absolute;
  inset: 0 0 0 auto;
  display: flex;
  align-items: stretch;
  width: 132px;
}

.act {
  flex: 1;
  display: grid;
  place-items: center;
  font-size: 11px;
  font-weight: 650;
  color: #fff;
}

.act span {
  transform: scale(0.92);
  opacity: 0.85;
  transition: opacity 160ms var(--ease), transform 200ms var(--ease);
}

.acts--open .act span {
  opacity: 1;
  transform: scale(1);
}

.act-fav {
  background: #d9885f;
}

.act-del {
  background: #c4624f;
}

.front {
  position: relative;
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 10px 12px;
  background: #fff;
  border-radius: 18px;
  transition: transform 260ms var(--ease);
  will-change: transform;
}

.front--drag {
  transition: none;
}

.thumb {
  position: relative;
  flex: 0 0 auto;
  width: 54px;
  height: 54px;
}

.info {
  flex: 1 1 auto;
  min-width: 0;
}

.line {
  display: flex;
  align-items: center;
  gap: 5px;
}

.line b {
  font-size: 13.5px;
  font-weight: 700;
  color: #3d332b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.line em {
  font-style: normal;
  font-size: 11px;
}

.meta {
  margin: 3px 0 0;
  font-size: 9.5px;
  color: var(--ink-3);
  letter-spacing: 0.02em;
}

.note {
  margin: 4px 0 0;
  font-size: 10px;
  line-height: 1.55;
  color: #a99c8d;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  flex: 0 0 auto;
}

.kcal {
  font-size: 10px;
  color: var(--ink-2);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

@media (min-width: 768px) {
  .row:hover .front {
    background: #fffdf9;
  }

  .line b {
    font-size: 14.5px;
  }

  .note {
    font-size: 10.5px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .front {
    transition: none;
  }
}
</style>
