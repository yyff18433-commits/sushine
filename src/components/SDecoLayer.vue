<script setup>
/**
 * 贴纸装饰的「只读」渲染层：
 * 首页卡片、收藏墙、贴纸详情里的那层贴纸，都用它画，不带任何交互。
 * base 是基准字号（px），scale 再乘上去 —— 缩略图场景只传一个小一点的 base 就行。
 */
defineProps({
  deco: { type: Array, default: () => [] },
  base: { type: Number, default: 30 }
})
</script>

<template>
  <div v-if="deco && deco.length" class="deco" aria-hidden="true">
    <span
      v-for="(d, i) in deco"
      :key="d.id || i"
      :style="{
        left: d.x + '%',
        top: d.y + '%',
        zIndex: 2 + (d.z ?? i),
        fontSize: base * (d.scale ?? 1) + 'px',
        transform: `translate(-50%, -50%) rotate(${d.rot ?? 0}deg)`
      }"
      >{{ d.emoji }}</span
    >
  </div>
</template>

<style scoped>
.deco {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.deco span {
  position: absolute;
  line-height: 1;
  filter: drop-shadow(0 0 1px #fff) drop-shadow(0 0 2px rgba(255, 255, 255, 0.85))
    drop-shadow(0 3px 6px rgba(60, 40, 25, 0.24));
}
</style>
