<script setup>
/** 二次确认弹窗：只用于「要不要现在补一餐」这类不可逆/需要选择的操作 */
defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: '' },
  text: { type: String, default: '' },
  cancelText: { type: String, default: '以后再说' },
  confirmText: { type: String, default: '去拍照' }
})

defineEmits(['cancel', 'confirm'])
</script>

<template>
  <Teleport to="#overlay-root" defer>
    <Transition name="modal">
      <div v-if="open" class="scrim" @click.self="$emit('cancel')">
        <div class="sheet">
          <h5>{{ title }}</h5>
          <p>{{ text }}</p>
          <div class="acts">
            <button @click="$emit('cancel')">{{ cancelText }}</button>
            <button class="on" @click="$emit('confirm')">{{ confirmText }}</button>
          </div>
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
  display: grid;
  place-items: center;
  padding: 0 32px;
  background: rgba(61, 51, 43, 0.24);
  backdrop-filter: blur(1.5px);
}

.sheet {
  width: 100%;
  background: #fffcf5;
  border-radius: var(--r-20);
  border: 1px solid var(--line);
  padding: 18px;
  box-shadow: 0 3px 0 #e7d6be, 0 24px 48px rgba(90, 60, 40, 0.2);
}

.sheet h5 {
  margin: 0 0 7px;
  font-size: 13.5px;
  font-weight: 700;
}

.sheet p {
  margin: 0 0 14px;
  font-size: 11.5px;
  line-height: 1.75;
  color: var(--ink-2);
}

.acts {
  display: flex;
  gap: 9px;
}

.acts button {
  flex: 1;
  padding: 11px;
  border-radius: var(--r-14);
  border: 1.5px solid var(--line);
  background: #fff;
  font-size: 12px;
  transition: background 140ms var(--ease);
}

.acts button.on {
  background: var(--or);
  border-color: var(--or);
  color: #fff8f0;
  font-weight: 650;
  box-shadow: 0 2px 0 var(--or-d);
}

.acts button:active {
  transform: translateY(1px);
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 180ms var(--ease);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
