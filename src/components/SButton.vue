<script setup>
/**
 * 主按钮：一屏只允许出现一个实心橘色按钮（设计规范 · DO）
 * variant: primary | secondary | ghost | disabled
 * size:    lg(52高) | md(44高) | sm
 */
defineProps({
  variant: { type: String, default: 'primary' },
  size: { type: String, default: 'lg' },
  block: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false }
})

defineEmits(['click'])
</script>

<template>
  <button
    class="sbtn"
    :class="[`sbtn--${disabled ? 'disabled' : variant}`, `sbtn--${size}`, { 'sbtn--block': block }]"
    :disabled="disabled"
    @click="$emit('click', $event)"
  >
    <slot />
  </button>
</template>

<style scoped>
.sbtn {
  font-size: 14px;
  font-weight: 650;
  letter-spacing: 0.03em;
  padding: 0 24px;
  border-radius: var(--r-18);
  transition: transform 120ms var(--ease), box-shadow 120ms var(--ease);
  white-space: nowrap;
}

.sbtn--lg {
  height: 52px;
}

.sbtn--md {
  height: 44px;
  font-size: 13.5px;
}

.sbtn--sm {
  height: 40px;
  padding: 0 18px;
  font-size: 12px;
  border-radius: var(--r-14);
}

.sbtn--block {
  display: block;
  width: 100%;
}

.sbtn--primary {
  background: var(--or);
  color: #fff8f0;
  box-shadow: var(--sh-3);
}

.sbtn--primary:active {
  transform: translateY(3px);
  box-shadow: 0 1px 0 var(--or-d);
}

.sbtn--secondary {
  background: #fffcf5;
  color: var(--ink);
  border: 1.5px solid var(--line);
}

.sbtn--secondary:active {
  background: var(--paper-2);
}

.sbtn--ghost {
  background: transparent;
  color: var(--ink-2);
  border: 1.5px dashed var(--line);
}

.sbtn--disabled {
  background: var(--paper-3);
  color: #bdaf9f;
  cursor: not-allowed;
}
</style>
