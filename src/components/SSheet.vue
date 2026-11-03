<script setup>
/** 底部操作面板：给「裁剪 / 设置 / 更多」这类轻量操作使用 */
defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: '' }
})

defineEmits(['close'])
</script>

<template>
  <Teleport to="#overlay-root" defer>
    <Transition name="sheet">
      <div v-if="open" class="scrim" @click.self="$emit('close')">
        <div class="sheet" role="dialog" aria-modal="true">
          <span class="grip" aria-hidden="true"></span>
          <h5 v-if="title">{{ title }}</h5>
          <div class="body"><slot /></div>
          <button class="close" @click="$emit('close')">取消</button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.scrim {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: flex;
  align-items: flex-end;
  background: rgba(61, 51, 43, 0.24);
  backdrop-filter: blur(1.5px);
}

.sheet {
  width: 100%;
  padding: 10px 16px calc(18px + env(safe-area-inset-bottom));
  background: #fffcf5;
  border-radius: 26px 26px 0 0;
  box-shadow: 0 -3px 0 #e7d6be, 0 -20px 40px rgba(90, 60, 40, 0.18);
}

.grip {
  display: block;
  width: 38px;
  height: 4px;
  margin: 0 auto 14px;
  border-radius: 99px;
  background: var(--line);
}

.sheet h5 {
  margin: 0 0 12px;
  font-size: 13.5px;
  font-weight: 700;
  text-align: center;
}

.body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.close {
  width: 100%;
  height: 46px;
  margin-top: 12px;
  border-radius: 15px;
  border: 1.5px solid var(--line);
  background: #fff;
  font-size: 13px;
  color: var(--ink-2);
}

.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 200ms var(--ease);
}

.sheet-enter-active .sheet,
.sheet-leave-active .sheet {
  transition: transform 260ms var(--ease);
}

.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}

.sheet-enter-from .sheet,
.sheet-leave-to .sheet {
  transform: translateY(100%);
}
</style>
