<script setup>
/** 胶囊标签：选中即实心橘 */
defineProps({
  active: { type: Boolean, default: false }
})
</script>

<template>
  <span class="schip" :class="{ on: active }"><slot /></span>
</template>

<style scoped>
.schip {
  display: inline-flex;
  align-items: center;
  padding: 6px 13px;
  border-radius: var(--r-pill);
  border: 1px solid var(--line);
  background: #fffcf5;
  font-size: 11px;
  color: var(--ink-2);
  white-space: nowrap;
}

.schip.on {
  background: var(--or);
  border-color: var(--or);
  color: #fff8f0;
  font-weight: 600;
}
</style>
