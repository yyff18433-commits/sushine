<script setup>
/* 状态栏：纯装饰，还原高保真稿里的 iOS 状态栏 */
</script>

<template>
  <div class="sbar" aria-hidden="true">
    <span class="sbar-time">21:18</span>
    <span class="sbar-right">
      <svg viewBox="0 0 24 24"><path d="M3 18h3v-6H3zm6 0h3V9H9zm6 0h3V5h-3zm6 0h3V2h-3z" /></svg>
      <svg viewBox="0 0 24 24">
        <path
          d="M12 4C7.9 4 4.2 5.6 1.5 8.2l1.6 1.7C5.4 7.6 8.5 6.2 12 6.2s6.6 1.4 8.9 3.7l1.6-1.7C19.8 5.6 16.1 4 12 4zm0 4.6c-2.6 0-5 1-6.8 2.7l1.6 1.6C8.1 11.6 10 10.8 12 10.8s3.9.8 5.2 2.1l1.6-1.6C17 9.6 14.6 8.6 12 8.6zm0 4.5c-1.3 0-2.5.5-3.4 1.4L12 19l3.4-4.5c-.9-.9-2.1-1.4-3.4-1.4z"
        />
      </svg>
      <i class="sbar-batt">100</i>
    </span>
  </div>
</template>

<style scoped>
.sbar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 52px;
  z-index: 9;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 26px 0;
  font-size: 12.5px;
  font-weight: 650;
  letter-spacing: 0.02em;
  color: var(--ink);
  pointer-events: none;
}

.sbar-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.sbar-right svg {
  width: 16px;
  height: 16px;
  fill: var(--ink);
  opacity: 0.85;
}

.sbar-batt {
  display: inline-block;
  background: #4cd964;
  color: #fff;
  font-size: 9px;
  font-weight: 700;
  font-style: normal;
  border-radius: 4px;
  padding: 1px 5px;
  letter-spacing: 0;
}

/* 大屏是桌面应用，不需要模拟手机状态栏 */
@media (min-width: 768px) {
  .sbar {
    display: none;
  }
}
</style>
