<script setup>
/**
 * 纸卡片：全 App 唯一的「材质」。
 * level 0 静置 / 1 浮起 / 2 弹窗抽屉
 */
defineProps({
  level: { type: Number, default: 1 },
  radius: { type: String, default: '24px' },
  padded: { type: Boolean, default: true },
  clickable: { type: Boolean, default: false }
})
</script>

<template>
  <div
    class="scard"
    :class="[`scard--l${level}`, { 'scard--pad': padded, 'scard--click': clickable }]"
    :style="{ borderRadius: radius }"
  >
    <slot />
  </div>
</template>

<style scoped>
.scard {
  background: #fff;
  position: relative;
}

.scard--pad {
  padding: var(--card-pad);
}

.scard--l0 {
  box-shadow: var(--sh-0);
  border: 1px solid #f1e3cf;
}

.scard--l1 {
  box-shadow: 0 12px 28px rgba(150, 115, 80, 0.1);
}

.scard--l2 {
  box-shadow: var(--sh-2);
}

.scard--click {
  cursor: pointer;
  transition: transform 160ms var(--ease), box-shadow 160ms var(--ease);
}

.scard--click:active {
  transform: translateY(2px) scale(0.995);
  box-shadow: 0 6px 16px rgba(150, 115, 80, 0.12);
}
</style>
