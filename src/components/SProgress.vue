<script setup>
/** 进度条：圆角全满 · 橘色渐变；done 时变抹茶绿 */
const props = defineProps({
  value: { type: Number, default: 0 },
  height: { type: String, default: '8px' },
  done: { type: Boolean, default: false }
})
</script>

<template>
  <div class="bar" :style="{ height }">
    <i :style="{ width: Math.min(100, Math.max(0, props.value)) + '%' }" :class="{ done }" />
  </div>
</template>

<style scoped>
.bar {
  width: 100%;
  border-radius: var(--r-pill);
  background: var(--paper-3);
  overflow: hidden;
}

.bar i {
  display: block;
  height: 100%;
  border-radius: var(--r-pill);
  background: linear-gradient(90deg, var(--or), #eda979);
  transition: width 300ms var(--ease);
}

.bar i.done {
  background: var(--matcha);
}
</style>
