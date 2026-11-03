<script setup>
/**
 * 首页餐卡（组员 5 · 2）
 * 把「卡片本来的样子」和「左滑露出的动作」封在一起，
 * 首页只负责给它数据和监听事件，不用管交互细节。
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
  flash: { type: Boolean, default: false },
  index: { type: Number, default: 0 }
})

const emit = defineEmits(['open', 'delete', 'fav', 'more'])

const MAX = 132
const { dx, dragging, open, onDown, close } = useSwipe({ max: MAX })

const fav = computed(() => isFav(props.entry.id))
let moved = false
let sx = 0
let sy = 0

function down(e) {
  sx = e.clientX
  sy = e.clientY
  moved = false
  onDown(e)
}

function track(e) {
  if (Math.hypot(e.clientX - sx, e.clientY - sy) > 8) moved = true
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

function onFav(e) {
  e?.stopPropagation()
  const on = toggleFav(props.entry.id)
  close()
  emit('fav', { entry: props.entry, on })
}

function onDelete(e) {
  e.stopPropagation()
  close()
  emit('delete', props.entry)
}

const kcalText = computed(() => (settings.hideKcal ? '已记录' : `${props.entry.kcal} kcal`))
</script>

<template>
  <article
    class="mcard"
    :class="{ 'mcard--flash': flash }"
    :style="{ '--d': Math.min(index, 6) * 70 + 'ms' }"
    :data-rid="entry.id"
  >
    <div class="swipe-acts">
      <button class="sa sa-fav" type="button" @click.stop="onFav">{{ fav ? '取消' : '收藏' }}</button>
      <button class="sa sa-del" type="button" @click.stop="onDelete">删除</button>
    </div>

    <div
      class="mcard-in"
      :class="{ dragging }"
      :style="{ transform: `translateX(${dx}px)` }"
      role="button"
      tabindex="0"
      @pointerdown="down"
      @pointermove="track"
      @click="onClick"
      @keydown.enter="emit('open', entry)"
    >
      <div class="meal-photo">
        <SSticker :src="entry.img" :alt="entry.name" size="130px" />
        <SDecoLayer :deco="entry.deco" :base="30" />
        <span class="meal-time">{{ entry.time }}</span>
        <button class="card-more" aria-label="更多操作" @click.stop="$emit('more', entry)">⋯</button>
      </div>

      <h3 class="meal-name">
        {{ entry.name }}<em>{{ entry.emoji }}</em>
      </h3>
      <p class="meal-note">{{ entry.note }}</p>

      <div class="meal-foot">
        <span class="meal-tag">{{ entry.tag }}</span>
        <SFavButton class="foot-fav" :active="fav" :size="24" plain @toggle="onFav" />
        <span class="meal-kcal">{{ kcalText }}</span>
      </div>
    </div>
  </article>
</template>

<style scoped>
.mcard {
  position: relative;
  border-radius: 24px;
  overflow: hidden;
  background: #d9885f;
  animation: rise-in 380ms var(--ease) both;
  animation-delay: var(--d, 0ms);
}

.mcard--flash {
  animation: flash-ring 1.9s var(--ease) 1;
}

/* 左滑后露出的两个动作 */
.swipe-acts {
  position: absolute;
  inset: 0 0 0 auto;
  width: 132px;
  display: flex;
  align-items: stretch;
}

.sa {
  flex: 1;
  display: grid;
  place-items: center;
  font-size: 11.5px;
  font-weight: 650;
  color: #fff;
}

.sa-fav {
  background: #d9885f;
}

.sa-del {
  background: #c4624f;
}

.mcard-in {
  position: relative;
  padding: 11px 11px 14px;
  border-radius: 24px;
  background: #fff;
  box-shadow: 0 12px 28px rgba(150, 115, 80, 0.1);
  transition: transform 260ms var(--ease), box-shadow 160ms var(--ease);
  touch-action: pan-y;
  will-change: transform;
}

.mcard-in.dragging {
  transition: none;
}

.mcard-in:active {
  box-shadow: 0 6px 16px rgba(150, 115, 80, 0.12);
}

.meal-photo {
  position: relative;
  height: 184px;
  border-radius: 18px;
  background: #f8efe2;
  display: grid;
  place-items: center;
  overflow: hidden;
}

.meal-time {
  position: absolute;
  left: 10px;
  bottom: 10px;
  padding: 4px 8px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.94);
  font-size: 9.5px;
  letter-spacing: 0.02em;
  color: var(--ink-2);
}

.card-more {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 4;
  width: 27px;
  height: 27px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.94);
  color: var(--ink-2);
  font-size: 14px;
  line-height: 1;
  box-shadow: 0 4px 10px rgba(150, 115, 80, 0.14);
}

.meal-name {
  margin: 11px 4px 5px;
  font-size: 15px;
  font-weight: 700;
  display: flex;
  align-items: center;
}

.meal-name em {
  margin-left: auto;
  font-style: normal;
  font-size: 13px;
}

.meal-note {
  margin: 0 4px;
  font-size: 10.8px;
  line-height: 1.7;
  color: var(--ink-3);
}

.meal-foot {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 8px 4px 0;
}

.meal-tag {
  font-size: 9.5px;
  padding: 3px 8px;
  border-radius: 7px;
  background: var(--or-xs);
  color: var(--or-d);
}

.meal-kcal {
  margin-left: auto;
  font-size: 10px;
  color: var(--ink-3);
}

.foot-fav {
  margin-left: 2px;
}

@media (min-width: 900px) {
  .meal-photo {
    height: 210px;
  }

  .mcard-in {
    padding: 13px 13px 16px;
  }

  .meal-name {
    font-size: 16px;
  }
}
</style>
