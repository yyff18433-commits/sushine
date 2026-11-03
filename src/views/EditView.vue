<script setup>
import { computed, reactive, ref, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SButton from '../components/SButton.vue'
import SToast from '../components/SToast.vue'
import { journal, saveDraft } from '../store/journal'
import { dateKey } from '../store/body'
import { prettyDate, weekdayOf } from '../store/db'
import { mealSegments, nameSuggestions } from '../data/mock'

const router = useRouter()
const route = useRoute()
const draft = journal.draft
const isManual = computed(() => route.query.manual === '1')

const form = reactive({
  name: draft.name,
  meal: draft.meal,
  time: draft.time,
  kcal: draft.kcal
})

const toast = ref(false)
let timer = null

const kcalText = computed(() => (Number(form.kcal) || 0).toLocaleString('zh-CN'))

/** 记的可能是某一天（从日历补记进来的），日期不能写死 */
const dateLabel = computed(() => `${prettyDate(draft.date || dateKey())} ${weekdayOf(draft.date || dateKey())}`)

function step(delta) {
  const next = Number(form.kcal) + delta
  form.kcal = Math.min(3000, Math.max(0, next))
}

function save() {
  Object.assign(journal.draft, {
    name: form.name.trim() || '未命名的一餐',
    meal: form.meal,
    time: form.time,
    kcal: Number(form.kcal) || 0
  })
  const saved = saveDraft()
  toast.value = true
  timer = setTimeout(() => {
    toast.value = false
    // 补记过去的日子：直接回历史，让「新记录已加入」这件事被看见
    const isPast = saved?.date && saved.date !== dateKey()
    router.push(isPast ? '/month?view=history' : '/sushie')
  }, 900)
}

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer)
})
</script>

<template>
  <div class="page edit">
    <header class="ehead">
      <button class="bak" aria-label="返回" @click="router.back()">‹</button>
      <b>{{ isManual ? '手动记录' : '编辑信息' }}</b>
      <button class="ok" @click="isManual ? router.push('/home') : router.push('/camera')">
        {{ isManual ? '取消' : '重拍' }}
      </button>
    </header>

    <button class="efig" type="button" aria-label="重拍" @click="router.push('/camera')">
      <img v-if="draft.img" :src="draft.img" :alt="form.name" />
      <span v-else class="efig-ph" aria-hidden="true">🍽</span>
    </button>
    <p class="ecap">{{ draft.img ? '点贴纸可重拍' : '还没有照片，点一下补一张' }}</p>

    <div class="ecard">
      <!-- 名称 -->
      <div class="erow">
        <span class="lb">名称</span>
        <label class="field">
          <input v-model="form.name" type="text" maxlength="14" aria-label="食物名称" />
          <i class="caret" aria-hidden="true"></i>
        </label>
        <div class="chips">
          <button
            v-for="s in nameSuggestions"
            :key="s"
            class="chip"
            :class="{ on: form.name === s }"
            @click="form.name = s"
          >
            {{ s }}
          </button>
        </div>
      </div>

      <!-- 时间 -->
      <div class="erow">
        <span class="lb">时间</span>
        <div class="seg">
          <button
            v-for="m in mealSegments"
            :key="m"
            class="seg-item"
            :class="{ on: form.meal === m }"
            @click="form.meal = m"
          >
            {{ m }}
          </button>
        </div>
        <div class="eval">{{ form.time }} <i>{{ dateLabel }}</i></div>
      </div>

      <!-- 热量 -->
      <div class="erow">
        <span class="lb">热量</span>
        <div class="kcalbox">
          <div class="num">{{ kcalText }}<i>kcal</i></div>
          <div class="stepper">
            <button aria-label="减少" @click="step(-10)">−</button>
            <button aria-label="增加" @click="step(10)">＋</button>
          </div>
        </div>
        <p class="hintline">{{ draft.weight }} · {{ draft.portionHint }}</p>
      </div>
    </div>

    <SButton class="ebtn" block @click="save">保存</SButton>

    <SToast :show="toast" :text="`✓ 已存入 ${dateLabel} 手账`" />
  </div>
</template>

<style scoped>
.edit {
  padding-top: 58px;
}

.ehead {
  display: flex;
  align-items: center;
  margin: 0 -2px;
}

.bak {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 15px;
  color: #6b5b4c;
  background: #fff;
  box-shadow: 0 6px 14px rgba(150, 115, 80, 0.1);
}

.ehead b {
  margin-left: 10px;
  font-size: 15px;
  font-weight: 700;
}

.ok {
  margin-left: auto;
  font-size: 11.5px;
  font-weight: 650;
  letter-spacing: 0.02em;
  color: var(--or-d);
}

.efig {
  display: block;
  width: 166px;
  height: 166px;
  margin: 18px auto 0;
  padding: 0;
  border-radius: 50%;
  overflow: hidden;
  border: 7px solid #fff;
  transform: rotate(-3deg);
  box-shadow: 0 20px 40px rgba(140, 105, 75, 0.22), 0 0 0 1px rgba(0, 0, 0, 0.03);
  background: var(--paper-2);
  cursor: pointer;
  transition: transform 160ms var(--ease);
  display: grid;
  place-items: center;
}

.efig:active {
  transform: rotate(-3deg) scale(0.97);
}

.efig img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.efig-ph {
  font-size: 54px;
  opacity: 0.45;
}

.ecap {
  margin: 10px 0 0;
  text-align: center;
  font-size: 10.5px;
  letter-spacing: 0.03em;
  color: var(--ink-3);
}

.ecard {
  margin-top: 14px;
  padding: 4px 16px 14px;
  background: #fff;
  border-radius: 22px;
  box-shadow: 0 12px 28px rgba(150, 115, 80, 0.1);
}

.erow {
  padding: 13px 0;
  border-bottom: 1px dashed #f1e7da;
}

.erow:last-child {
  border-bottom: none;
}

.lb {
  display: block;
  margin-bottom: 8px;
  font-size: 9.5px;
  letter-spacing: 0.1em;
  color: var(--ink-3);
}

.field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 11px 14px;
  border-radius: var(--r-14);
  background: #f7f1e7;
}

.field input {
  width: 100%;
  border: none;
  background: none;
  outline: none;
  font-size: 15px;
  font-weight: 600;
  color: #4a3e34;
}

.caret {
  width: 1.5px;
  height: 16px;
  margin-left: 2px;
  border-radius: 2px;
  background: var(--or);
  animation: blink 1.1s steps(1) infinite;
}

@keyframes blink {
  50% {
    opacity: 0;
  }
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 10px;
}

.chip {
  padding: 4px 10px;
  border-radius: var(--r-pill);
  border: 1px solid var(--line);
  font-size: 10.5px;
  color: var(--ink-2);
  background: #fff;
}

.chip.on {
  background: var(--or-xs);
  border-color: var(--or-s);
  color: var(--or-d);
}

.seg {
  display: flex;
  gap: 6px;
  margin-bottom: 10px;
}

.seg-item {
  flex: 1;
  padding: 8px 0;
  border-radius: 11px;
  background: #f7f1e7;
  font-size: 11.5px;
  color: var(--ink-2);
  transition: background 160ms var(--ease), color 160ms var(--ease);
}

.seg-item.on {
  background: var(--or);
  color: #fff;
  font-weight: 650;
}

.eval {
  display: flex;
  align-items: baseline;
  gap: 7px;
  font-size: 15px;
  font-weight: 600;
  color: #4a3e34;
}

.eval i {
  font-style: normal;
  font-size: 10.5px;
  font-weight: 400;
  color: var(--ink-3);
}

.kcalbox {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.num {
  font-size: 30px;
  font-weight: 600;
  color: #4a3e34;
}

.num i {
  margin-left: 4px;
  font-style: normal;
  font-size: 11px;
  font-weight: 400;
  color: var(--ink-3);
}

.stepper {
  display: flex;
  gap: 9px;
}

.stepper button {
  width: 34px;
  height: 34px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: #f7f1e7;
  font-size: 16px;
  color: #7e6f60;
  transition: background 140ms var(--ease);
}

.stepper button:active {
  background: var(--or-s);
}

.hintline {
  margin: 9px 0 0;
  font-size: 9.5px;
  color: var(--ink-3);
}

.ebtn {
  margin-top: 18px;
}

/* ============ 大屏（≥768px） ============ */
@media (min-width: 768px) {
  .edit {
    max-width: 560px;
    padding-top: 36px;
  }

  .efig {
    width: 190px;
    height: 190px;
  }

  .ecard {
    padding: 8px 22px 18px;
  }
}
</style>
