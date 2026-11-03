<script setup>
/** 轻提示 */
defineProps({
  show: { type: Boolean, default: false },
  text: { type: String, default: '' }
})
</script>

<template>
  <Teleport to="#overlay-root" defer>
    <Transition name="toast">
      <div v-if="show" class="toast">{{ text }}</div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.toast {
  position: fixed;
  left: 50%;
  bottom: 118px;
  transform: translateX(-50%);
  z-index: 50;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: var(--r-pill);
  background: var(--ink);
  color: #fff6e9;
  font-size: 11.5px;
  white-space: nowrap;
  box-shadow: 0 8px 20px rgba(60, 40, 25, 0.24);
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 200ms var(--ease), transform 200ms var(--ease);
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, 8px);
}
</style>
