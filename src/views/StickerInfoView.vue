<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import SToast from '../components/SToast.vue'
import SDecoLayer from '../components/SDecoLayer.vue'
import { journal } from '../store/journal'
import { exportStickerPNG } from '../utils/exportSticker'

const router = useRouter()
const draft = journal.draft

const toast = ref('')
let toastTimer = null

function showToast(text) {
  toast.value = text
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 1800)
}

const exporting = ref(false)

/** 把这张贴纸存成 PNG，可直接发小红书 / 存进相册 */
async function saveSticker() {
  if (!draft.img) {
    showToast('先给这一餐补一张照片吧')
    return
  }
  exporting.value = true
  try {
    await exportStickerPNG({ src: draft.img, name: draft.name, note: draft.note })
    showToast('✓ 贴纸已保存到下载目录')
  } catch {
    showToast('导出失败，试试换张图')
  } finally {
    exporting.value = false
  }
}
</script>

<template>
  <div class="info">
    <!-- 虚线装饰环 -->
    <svg class="dashring" viewBox="0 0 262 262" fill="none" aria-hidden="true">
      <circle cx="131" cy="131" r="126" stroke="#DCCDBA" stroke-width="1.6" stroke-dasharray="14 12" />
      <circle cx="131" cy="131" r="112" stroke="#E7DACA" stroke-width="1.2" stroke-dasharray="6 9" />
    </svg>

    <div class="coaster">
      <div class="ring"></div>
      <div class="disc">
        <img :src="draft.img" :alt="draft.name" />
        <SDecoLayer :deco="draft.deco" :base="36" />
      </div>
    </div>

    <textarea
      v-model="draft.note"
      class="note-sticky"
      rows="2"
      maxlength="40"
      placeholder="写点什么…"
      aria-label="备注"
    ></textarea>

    <div class="namerow">
      <span class="nm">{{ draft.name }}</span>
      <span class="conf">{{ draft.confidence }}%</span>
    </div>

    <label class="kcalrow" title="点一下就能改">
      <input
        v-model.number="draft.kcal"
        class="kcal-input"
        type="number"
        inputmode="numeric"
        min="0"
        max="3000"
        aria-label="热量"
      />
      <span>kcal</span>
    </label>

    <div class="nutri">
      <label v-for="n in draft.nutrition" :key="n.label" class="nu" title="点一下就能改">
        <span>{{ n.label }}</span>
        <b>
          <input
            v-model.number="n.value"
            class="nu-input"
            type="number"
            inputmode="decimal"
            step="0.1"
            min="0"
            :aria-label="n.label"
          /><i>{{ n.unit }}</i>
        </b>
      </label>
    </div>

    <button class="deco-btn" type="button" @click="router.push('/decorate')">
      ✨ {{ draft.deco && draft.deco.length ? `已贴 ${draft.deco.length} 张贴纸 · 继续装饰` : '给这张贴纸加点装饰' }}
    </button>

    <p class="notacc">点数字直接改，整块都能点</p>

    <div class="bar3">
      <button class="cir" aria-label="放弃" @click="router.push('/home')">✕</button>
      <button class="shut" aria-label="下一步" @click="router.push('/edit')">
        <svg viewBox="0 0 24 24"><path d="M5 12.5l5 5 9-10" /></svg>
      </button>
      <button
        class="cir"
        aria-label="存成贴纸图片"
        :disabled="exporting"
        title="存成贴纸图片"
        @click="saveSticker"
      >
        <svg viewBox="0 0 24 24">
          <path d="M12 4v10" />
          <path d="M8 10.5l4 4 4-4" />
          <path d="M5 19h14" />
        </svg>
      </button>
    </div>

    <SToast :show="!!toast" :text="toast" />
  </div>
</template>

<style scoped>
.info {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  min-height: 100%;
  padding: 96px 0 0;
}

.dashring {
  position: absolute;
  top: 78px;
  left: 50%;
  width: 262px;
  height: 262px;
  transform: translateX(-50%) rotate(-8deg);
  z-index: 0;
}

.coaster {
  position: relative;
  width: 212px;
  height: 212px;
  flex: 0 0 auto;
  z-index: 2;
}

.coaster .ring {
  position: absolute;
  inset: -9px;
  border-radius: 50%;
  background: repeating-conic-gradient(#fff 0 5deg, #efe5d6 5deg 10deg);
  box-shadow: 0 16px 34px rgba(140, 105, 75, 0.16);
}

.coaster .disc {
  position: absolute;
  inset: 6px;
  border-radius: 50%;
  overflow: hidden;
  border: 5px solid #fff;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.04);
  background: var(--paper-2);
}

.coaster img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.note-sticky {
  position: absolute;
  right: 24px;
  top: 266px;
  z-index: 5;
  width: 104px;
  padding: 11px 12px;
  border: none;
  outline: none;
  resize: none;
  border-radius: 4px;
  background: #fff;
  transform: rotate(3deg);
  font-family: inherit;
  font-size: 11px;
  line-height: 1.5;
  color: #a4957f;
  box-shadow: 0 8px 18px rgba(150, 115, 80, 0.12);
}

.note-sticky::placeholder {
  color: #c9bca9;
}

.namerow {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 56px;
  z-index: 3;
}

.nm {
  padding: 9px 18px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.92);
  font-size: 19px;
  font-weight: 600;
  box-shadow: 0 8px 20px rgba(150, 115, 80, 0.1);
}

.conf {
  padding: 3px 7px;
  border-radius: 9px;
  background: #fff;
  font-size: 10px;
  color: #9c8e7d;
}

.kcalrow {
  display: flex;
  align-items: baseline;
  justify-content: center;
  margin-top: 12px;
  z-index: 3;
  cursor: text;
  padding: 2px 10px;
  border-radius: 12px;
  transition: background 160ms var(--ease);
}

.kcalrow:hover,
.kcalrow:focus-within {
  background: var(--or-xs);
}

.kcal-input {
  width: 120px;
  border: none;
  border-bottom: 1.5px dashed transparent;
  outline: none;
  background: none;
  text-align: right;
  font-size: 36px;
  font-weight: 500;
  letter-spacing: -0.02em;
  color: #6b5b4c;
  font-family: inherit;
  -moz-appearance: textfield;
  appearance: textfield;
  transition: border-color 160ms var(--ease);
}

.kcal-input:hover,
.kcal-input:focus {
  border-bottom-color: var(--or-s);
}

.kcal-input::-webkit-outer-spin-button,
.kcal-input::-webkit-inner-spin-button,
.nu-input::-webkit-outer-spin-button,
.nu-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.kcalrow span {
  margin-left: 5px;
  font-size: 12px;
  color: #b4a796;
}

.nutri {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px 0;
  width: 100%;
  margin-top: 24px;
  padding: 0 34px;
  text-align: center;
  z-index: 3;
}

.nu {
  display: block;
  cursor: text;
  padding: 4px 0;
  border-radius: 10px;
  transition: background 160ms var(--ease);
}

.nu:hover,
.nu:focus-within {
  background: var(--or-xs);
}

.nu span {
  display: block;
  margin-bottom: 6px;
  font-size: 10.5px;
  letter-spacing: 0.04em;
  color: #a99a88;
}

.nu b {
  display: inline-flex;
  align-items: baseline;
  justify-content: center;
  font-size: 21px;
  font-weight: 500;
  color: #6b5b4c;
}

.nu-input {
  width: 58px;
  border: none;
  border-bottom: 1.5px dashed transparent;
  outline: none;
  background: none;
  text-align: right;
  font-family: inherit;
  font-size: 21px;
  font-weight: 500;
  color: #6b5b4c;
  -moz-appearance: textfield;
  appearance: textfield;
  transition: border-color 160ms var(--ease);
}

.nu-input:hover,
.nu-input:focus {
  border-bottom-color: var(--or-s);
}

.nu b i {
  margin-left: 2px;
  font-style: normal;
  font-size: 11px;
  font-weight: 400;
  color: #b4a796;
}

.deco-btn {
  margin-top: 16px;
  padding: 9px 18px;
  border-radius: var(--r-pill);
  border: 1.5px dashed var(--or-300);
  background: rgba(255, 255, 255, 0.86);
  font-size: 11.5px;
  color: var(--or-d);
  font-weight: 600;
  z-index: 3;
  transition: transform 140ms var(--ease), background 160ms var(--ease);
}

.deco-btn:active {
  transform: scale(0.96);
  background: var(--or-xs);
}

.notacc {
  margin: auto 0 0;
  padding-top: 22px;
  text-align: center;
  font-family: var(--hand);
  font-size: 13px;
  letter-spacing: 0.02em;
  color: #b9a48c;
  z-index: 3;
}

.bar3 {
  position: sticky;
  bottom: 0;
  left: 0;
  right: 0;
  width: 100%;
  height: 126px;
  padding: 0 36px 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(180deg, rgba(250, 246, 240, 0), #faf6f0 42%);
  z-index: 4;
}

.cir {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #fff;
  color: #4a3e34;
  font-size: 18px;
  box-shadow: 0 10px 24px rgba(150, 115, 80, 0.16);
  transition: transform 140ms var(--ease);
}

.cir:active {
  transform: scale(0.94);
}

.cir svg {
  width: 22px;
  height: 22px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.shut {
  width: 98px;
  height: 56px;
  border-radius: 28px;
  display: grid;
  place-items: center;
  background: #12100e;
  box-shadow: 0 12px 28px rgba(30, 20, 12, 0.3);
  transition: transform 140ms var(--ease);
}

.shut:active {
  transform: scale(0.96);
}

.shut svg {
  width: 24px;
  height: 24px;
  fill: none;
  stroke: #fff;
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

@media (max-height: 780px) {
  .info {
    padding-top: 70px;
  }
}

/* ============ 大屏（≥768px） ============ */
@media (min-width: 768px) {
  .info {
    max-width: 640px;
    margin: 0 auto;
    padding-top: 34px;
  }

  .dashring {
    top: 22px;
    width: 300px;
    height: 300px;
  }

  .coaster {
    width: 240px;
    height: 240px;
  }

  .note-sticky {
    top: 190px;
    right: 40px;
  }

  .namerow {
    margin-top: 48px;
  }

  .kcal-input {
    width: 130px;
    font-size: 40px;
  }

  .bar3 {
    padding: 0 80px 40px;
  }
}
</style>
