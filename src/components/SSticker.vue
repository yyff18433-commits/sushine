<script setup>
/** 圆形食物贴纸：贯穿全 App 的视觉符号（白描边 + 柔光投影） */
defineProps({
  src: { type: String, default: '' },
  alt: { type: String, default: '' },
  size: { type: String, default: '132px' },
  border: { type: String, default: '5px' }
})
</script>

<template>
  <span class="sticker" :class="{ 'sticker--blank': !src }" :style="{ '--s': size, '--b': border }">
    <img v-if="src" :src="src" :alt="alt" loading="lazy" />
    <span v-else class="ph" aria-hidden="true">🍽</span>
  </span>
</template>

<style scoped>
.sticker {
  display: block;
  width: var(--s);
  height: var(--s);
  border-radius: 50%;
  overflow: hidden;
  border: var(--b) solid #fff;
  box-shadow: 0 12px 26px rgba(140, 105, 75, 0.22);
  flex: 0 0 auto;
  /* 贴纸是透明底 PNG，衬白底才不会被卡片底色透出来 */
  background: #fff;
}

.sticker img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  filter: saturate(1.04) brightness(1.02);
}

/* 手动记录：没有照片时用虚线占位，避免出现破图 */
.sticker--blank {
  display: grid;
  place-items: center;
  border-style: dashed;
  border-color: var(--line);
  background: var(--paper-2);
  box-shadow: none;
}

.sticker--blank .ph {
  font-size: calc(var(--s) * 0.34);
  opacity: 0.5;
  line-height: 1;
}
</style>
