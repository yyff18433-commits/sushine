<script setup>
/**
 * 收藏按钮（组员 5 · 2）
 * 点亮的瞬间：心形「压扁 → 弹起」，同时飞出 6 颗小粒子。
 * 取消收藏不播粒子，只做一次回落 —— 不然太吵。
 */
import { ref } from 'vue'

const props = defineProps({
  active: { type: Boolean, default: false },
  size: { type: Number, default: 34 },
  /** 只有贴纸墙用「无底色」版本 */
  plain: { type: Boolean, default: false }
})

const emit = defineEmits(['toggle'])

const beat = ref(0)
const DIRS = [
  [-19, -15],
  [0, -22],
  [19, -15],
  [-23, 3],
  [23, 3],
  [0, 13]
]

function tap(e) {
  e.stopPropagation()
  e.preventDefault()
  if (!props.active) beat.value += 1
  emit('toggle')
}
</script>

<template>
  <button
    class="fav"
    :class="{ on: active, plain, 'just-on': beat > 0 }"
    type="button"
    :style="{ '--s': size + 'px' }"
    :aria-pressed="active"
    :aria-label="active ? '取消收藏' : '收藏这一餐'"
    @click="tap"
  >
    <svg viewBox="0 0 24 24" aria-hidden="true" :key="'h' + beat">
      <path
        d="M12 20.4c-1.2-1-2.3-1.9-3.6-3C5.1 14.6 3 12.6 3 9.6 3 6.8 5.1 4.7 7.8 4.7c1.5 0 3 .7 4.2 1.9 1.2-1.2 2.7-1.9 4.2-1.9 2.7 0 4.8 2.1 4.8 4.9 0 3-2.1 5-5.4 7.8-1.3 1.1-2.4 2-3.6 3z"
      />
    </svg>

    <span v-if="beat" :key="'b' + beat" class="spark" aria-hidden="true">
      <i
        v-for="(d, i) in DIRS"
        :key="i"
        :style="{ '--dx': d[0] + 'px', '--dy': d[1] + 'px', '--n': i }"
      />
    </span>
  </button>
</template>

<style scoped>
.fav {
  position: relative;
  width: var(--s);
  height: var(--s);
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #fff;
  box-shadow: 0 4px 10px rgba(150, 115, 80, 0.14);
  flex: 0 0 auto;
  transition: transform 140ms var(--ease), background 180ms var(--ease);
}

.fav.plain {
  background: transparent;
  box-shadow: none;
}

.fav:active {
  transform: scale(0.9);
}

.fav svg {
  width: calc(var(--s) * 0.52);
  height: calc(var(--s) * 0.52);
  fill: none;
  stroke: #c3b4a2;
  stroke-width: 1.7;
  stroke-linejoin: round;
  transition: fill 180ms var(--ease), stroke 180ms var(--ease);
}

.fav.on svg {
  fill: #e0705f;
  stroke: #e0705f;
  animation: heart-pop 420ms var(--ease);
}

/* 取消收藏：颜色回落，不做动画 */
.fav:not(.on) svg {
  animation: none;
}

.spark {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 0;
  height: 0;
  pointer-events: none;
}

.spark i {
  position: absolute;
  left: 0;
  top: 0;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #e8a08f;
  animation: spark-fly 620ms cubic-bezier(0.2, 0.8, 0.3, 1) both;
  animation-delay: calc(var(--n) * 18ms);
}

.spark i:nth-child(2n) {
  background: #f2d69b;
}

.spark i:nth-child(3n) {
  width: 3px;
  height: 3px;
  background: #d9885f;
}

@media (prefers-reduced-motion: reduce) {
  .fav.on svg {
    animation: none;
  }

  .spark {
    display: none;
  }
}
</style>
