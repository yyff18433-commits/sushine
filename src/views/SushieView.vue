<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import SSticker from '../components/SSticker.vue'
import SSheet from '../components/SSheet.vue'
import SToast from '../components/SToast.vue'
import { journal, settings, totalKcal } from '../store/journal'
import { auth } from '../store/auth'
import { analysis } from '../data/mock'
import { askSushie, mealContext } from '../utils/ai'
import { goalKcal } from '../store/body'

const router = useRouter()
const draft = journal.draft
const pct = computed(() => Math.round(((Number(draft.kcal) || 0) / goalKcal.value) * 100))

/** 把 mock 文案里的热量换成用户刚改过的值，避免前后数字打架 */
const bullets = computed(() =>
  settings.hideKcal
    ? ['营养细节依然保留，但不把热量摆在你面前。']
    : analysis.bullets.map((b) =>
        b.replace('680 kcal', `${draft.kcal} kcal`).replace('占今日 38%', `占今日 ${pct.value}%`)
      )
)

const expanded = ref(false)
const sheet = ref(false)
const toast = ref('')
let toastTimer = null

function showToast(text) {
  toast.value = text
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 1600)
}

/** 撤销：把这条记录从手账里删掉 */
function undo() {
  const idx = journal.entries.findIndex((e) => e.name === draft.name)
  if (idx > -1) journal.entries.splice(idx, 1)
  sheet.value = false
  router.replace('/home')
}

async function copyAnalysis() {
  const text = [
    analysis.lead,
    ...bullets.value.map((b) => b.replace(/<[^>]+>/g, '')),
    analysis.note.replace(/<[^>]+>/g, ''),
    analysis.next,
    ...analysis.suggestions.map((s, i) => `${i + 1}. ${s}`)
  ].join('\n')
  try {
    await navigator.clipboard.writeText(text)
    showToast('✓ 已复制分析文字')
  } catch {
    showToast('浏览器不允许复制，请手动选择')
  }
}

/* ---------- 追问：优先问模型，失败回落到本地规则 ---------- */
const chat = ref([])
const input = ref('')
const thinking = ref(false)

function reply(q) {
  if (/晚饭|晚餐|晚上/.test(q))
    return '晚餐可以来一份清蒸鱼 + 半碗杂粮饭 + 一份深色蔬菜，约 520 kcal，正好补上今天的余量。'
  if (/盐|咸|钠/.test(q)) return '今天的钠主要在卤汁里。晚餐少放酱油，深色蔬菜用清水焯一下就够。'
  if (/热量|多少|cal/.test(q)) return `这餐 ${draft.kcal} kcal，占今天目标的 ${pct.value}%。`
  if (/不好|问题|建议/.test(q))
    return '主要问题是盐偏高、蔬菜偏少。热量本身没问题，不用有负担。'
  return '记下了。可以问我「晚饭吃什么」「今天还差多少」或者「这餐哪里需要改」。'
}

async function ask() {
  const q = input.value.trim()
  if (!q || thinking.value) return

  // 先把这一轮之前的对话整理成模型要的 history（不含刚落下的这句）
  const history = chat.value.map((m) => ({
    role: m.role === 'me' ? 'user' : 'assistant',
    content: m.text
  }))

  chat.value.push({ role: 'me', text: q })
  input.value = ''
  thinking.value = true

  const res = await askSushie(q, {
    context: mealContext(draft, { todayKcal: totalKcal(), goal: goalKcal.value }),
    history
  })

  thinking.value = false
  chat.value.push({ role: 'sushie', text: res.ok ? res.answer : reply(q) })
}

function reanalyze() {
  sheet.value = false
  chat.value = []
  expanded.value = false
  showToast('已重新分析')
}
</script>

<template>
  <div class="page sushie">
    <header class="ahead">
      <b>Sushie</b>
      <span class="r">
        <button aria-label="复制分析" @click="copyAnalysis">↗</button>
        <button aria-label="更多" @click="sheet = true">⋯</button>
      </span>
    </header>

    <section class="acard">
      <div class="row1">
        <em>✓</em>已完成分析
        <button class="more" @click="expanded = !expanded">{{ expanded ? '收起' : '展开' }}</button>
      </div>
      <h3>Sushie 已为你记录饮食</h3>

      <div class="foodrow">
        <SSticker :src="draft.img" :alt="draft.name" size="44px" border="2.5px" />
        <span class="tx">
          <b>{{ draft.name }}</b>
          <span>{{ draft.time }} · {{ draft.meal }} · {{ draft.weight.replace('约 ', '') }}</span>
        </span>
        <span class="kcal2">{{ settings.hideKcal ? '—' : draft.kcal }}<i>{{ settings.hideKcal ? '' : '千卡' }}</i></span>
      </div>

      <div v-if="expanded" class="nutri-mini">
        <span v-for="n in draft.nutrition" :key="n.label">{{ n.label }} {{ n.value }}{{ n.unit }}</span>
      </div>

      <button class="fold" @click="expanded = !expanded">
        {{ expanded ? '收起 1 个食物' : '展开 1 个食物' }} ⌄
      </button>
      <div class="ameta">
        已保存至 {{ auth.user?.name || '你' }} 的饮食清单
        <span class="sp">
          <button @click="undo">撤销</button>
          <button @click="router.push('/report?scope=day')">查看</button>
        </span>
      </div>
    </section>

    <div class="atext">
      <p class="lead">{{ analysis.lead }}</p>
      <p v-for="(b, i) in bullets" :key="i" class="bul" v-html="b"></p>
      <p v-html="analysis.note"></p>
      <p>{{ analysis.next }}</p>
      <div class="sug">
        <div v-for="(s, i) in analysis.suggestions" :key="i">
          <em>{{ i + 1 }}</em>
          <p>{{ s }}</p>
        </div>
      </div>
      <p class="pct">
        {{ settings.hideKcal ? '无压力模式：今天只记录，不计算。' : `今天已摄入 ${draft.kcal} kcal · 占目标 ${pct}%` }}
      </p>
    </div>

    <div v-if="chat.length || thinking" class="chat">
      <div v-for="(m, i) in chat" :key="i" class="msg" :class="m.role">{{ m.text }}</div>
      <div v-if="thinking" class="msg sushie typing">Sushie 正在想…</div>
    </div>

    <form class="ainput" @submit.prevent="ask">
      <input
        v-model="input"
        type="text"
        :placeholder="analysis.inputPlaceholder"
        aria-label="向 Sushie 提问"
      />
      <button type="submit" aria-label="发送" :disabled="thinking">↑</button>
    </form>

    <SSheet :open="sheet" title="更多操作" @close="sheet = false">
      <button class="opt" @click="reanalyze">🔄 重新分析</button>
      <button class="opt" @click="undo">🗑 删除这条记录</button>
    </SSheet>

    <SToast :show="!!toast" :text="toast" />
  </div>
</template>

<style scoped>
.sushie {
  padding-bottom: 130px;
}

.ahead {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ahead b {
  font-size: 16px;
  font-weight: 700;
}

.ahead .r {
  margin-left: auto;
  display: flex;
  gap: 8px;
}

.ahead .r button {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 13px;
  color: #6b5b4c;
  background: #fff;
  box-shadow: 0 6px 14px rgba(150, 115, 80, 0.1);
}

.ahead .r button:active {
  transform: scale(0.94);
}

.acard {
  margin-top: 14px;
  padding: 16px 16px 14px;
  border-radius: 22px;
  background: #fff;
  box-shadow: 0 12px 28px rgba(150, 115, 80, 0.1);
}

.row1 {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 11.5px;
  color: var(--ink-2);
}

.row1 em {
  width: 15px;
  height: 15px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-style: normal;
  font-size: 9px;
  background: #eaf0e2;
  color: var(--ok);
}

.row1 .more {
  margin-left: auto;
  font-size: 10.5px;
  color: var(--ink-3);
  padding: 2px 6px;
  border-radius: 8px;
}

.row1 .more:active {
  background: var(--paper-2);
}

.acard h3 {
  margin: 9px 0 13px;
  font-size: 15px;
  font-weight: 700;
}

.foodrow {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 9px 11px;
  border-radius: 15px;
  background: #fbf7f1;
}

.foodrow .tx b {
  display: block;
  margin-bottom: 3px;
  font-size: 12.5px;
  font-weight: 650;
}

.foodrow .tx span {
  font-size: 10.5px;
  color: #a99a88;
}

.kcal2 {
  margin-left: auto;
  text-align: right;
  font-size: 12px;
  font-weight: 650;
  color: #4a3e34;
}

.kcal2 i {
  display: block;
  margin-top: 2px;
  font-style: normal;
  font-size: 9px;
  font-weight: 400;
  color: var(--ink-3);
}

.nutri-mini {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  background: #fbf7f1;
  font-size: 10px;
  color: var(--ink-3);
}

.fold {
  width: 100%;
  margin-top: 10px;
  padding: 10px 0 0;
  border-top: 1px dashed #f0e6d9;
  text-align: left;
  font-size: 10.5px;
  color: #a99a88;
}

.ameta {
  display: flex;
  margin-top: 10px;
  font-size: 9.5px;
  color: #c0b2a0;
}

.ameta .sp {
  margin-left: auto;
  display: flex;
  gap: 12px;
}

.ameta .sp button {
  font-size: 9.5px;
  color: var(--ink-3);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.atext {
  margin-top: 20px;
  font-size: 11.8px;
  line-height: 1.9;
  color: #4a3e34;
}

.atext p {
  margin: 0 0 9px;
}

.atext .lead {
  color: #6b5b4c;
}

.atext .bul {
  position: relative;
  padding-left: 14px;
}

.atext .bul::before {
  content: "";
  position: absolute;
  left: 0;
  top: 8px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #d9c9b4;
}

.atext :deep(b) {
  font-weight: 700;
}

.sug {
  display: flex;
  flex-direction: column;
  gap: 9px;
  margin-top: 12px;
}

.sug div {
  display: flex;
  align-items: flex-start;
  gap: 9px;
}

.sug em {
  flex: 0 0 auto;
  width: 17px;
  height: 17px;
  margin-top: 2px;
  border-radius: 5px;
  display: grid;
  place-items: center;
  font-style: normal;
  font-size: 10px;
  font-weight: 700;
  background: var(--or-xs);
  color: var(--or-d);
}

.sug p {
  margin: 0;
}

.pct {
  margin-top: 14px !important;
  font-size: 10px;
  color: var(--ink-3);
}

.chat {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 18px;
}

.msg {
  max-width: 84%;
  padding: 10px 13px;
  border-radius: 14px;
  font-size: 11.5px;
  line-height: 1.75;
}

/* 等待模型回来的占位气泡 */
.msg.typing {
  opacity: 0.55;
  font-style: italic;
}

.msg.me {
  align-self: flex-end;
  background: var(--or);
  color: #fff8f0;
  border-bottom-right-radius: 5px;
}

.msg.sushie {
  align-self: flex-start;
  background: #fff;
  color: #4a3e34;
  border-bottom-left-radius: 5px;
  box-shadow: 0 8px 18px rgba(150, 115, 80, 0.1);
}

.ainput {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  height: 44px;
  padding: 0 6px 0 16px;
  border-radius: 22px;
  background: #fff;
  box-shadow: 0 10px 24px rgba(150, 115, 80, 0.12);
}

.ainput input {
  flex: 1;
  height: 100%;
  border: none;
  outline: none;
  background: none;
  font-size: 11.5px;
  color: var(--ink);
}

.ainput input::placeholder {
  color: #c0b2a0;
}

.ainput button {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--or);
  color: #fff;
  font-size: 14px;
  box-shadow: 0 2px 0 var(--or-d);
}

.opt {
  width: 100%;
  height: 50px;
  padding: 0 18px;
  border-radius: 16px;
  border: 1.5px solid var(--line);
  background: #fff;
  font-size: 13.5px;
  text-align: left;
}

.opt:active {
  background: var(--paper-2);
}

/* ============ 大屏（≥900px） ============ */
@media (min-width: 900px) {
  .sushie {
    max-width: 720px;
    padding-bottom: 48px;
  }

  .ahead b {
    font-size: 18px;
  }

  .acard {
    padding: 20px 20px 16px;
  }

  .acard h3 {
    font-size: 16px;
  }

  .atext {
    margin-top: 24px;
    font-size: 13px;
    line-height: 2;
  }

  .msg {
    font-size: 12.5px;
  }
}
</style>
