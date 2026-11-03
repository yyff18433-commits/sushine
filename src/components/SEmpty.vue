<script setup>
/** 空状态：虚线圆 + 一句提示，永远给「下一步」*/
defineProps({
  icon: { type: String, default: '🍽' },
  title: { type: String, default: '今天还没记录' },
  desc: { type: String, default: '拍下第一餐，从这一刻开始' }
})
</script>

<template>
  <div class="empty">
    <div class="circ">{{ icon }}</div>
    <b>{{ title }}</b>
    <span>{{ desc }}</span>
    <slot />
  </div>
</template>

<style scoped>
.empty {
  width: 100%;
  padding: 26px 0 10px;
  text-align: center;
}

.circ {
  width: 64px;
  height: 64px;
  margin: 0 auto 12px;
  border-radius: 24px;
  display: grid;
  place-items: center;
  font-size: 22px;
  background: var(--paper-2);
  border: 1.5px dashed var(--line);
}

.empty b {
  display: block;
  font-size: 12.5px;
  margin-bottom: 5px;
}

.empty span {
  font-size: 10.5px;
  color: var(--ink-3);
}
</style>
