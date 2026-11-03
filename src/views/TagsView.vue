<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import SButton from '../components/SButton.vue'
import { auth, setTags } from '../store/auth'
import { randomTags } from '../data/tags'

const router = useRouter()

const MAX = 6
const MIN = 2

const picks = ref([])
const selected = ref([])

const name = computed(() => auth.user?.name || '你')
const avatar = computed(() => (name.value.trim()[0] || 'P').toUpperCase())
const ready = computed(() => selected.value.length >= MIN)

/** 换一批：随机抽新一轮，但已经选中的要留着，不能「选了又消失」 */
function reroll() {
  const next = randomTags(3)
  for (const tag of selected.value) {
    if (!next.includes(tag)) next.unshift(tag)
  }
  picks.value = next
}

function toggle(tag) {
  const i = selected.value.indexOf(tag)
  if (i > -1) {
    selected.value.splice(i, 1)
  } else if (selected.value.length < MAX) {
    selected.value.push(tag)
  }
}

function done() {
  if (!ready.value) return
  setTags(selected.value)
  router.replace('/home')
}

onMounted(() => {
  if (!auth.user) {
    router.replace('/login')
    return
  }
  // 从「我的 → 我的标签」进来时，回填已选的
  if (auth.user.tags?.length) selected.value = [...auth.user.tags].slice(0, MAX)
  reroll()
})
</script>

<template>
  <div class="onboard">
    <header class="head">
      <span class="step">2 / 2 · 口味标签</span>
      <h1 class="title">给你贴几个标签</h1>
      <p class="sub">随机挑了一批，选 2–6 个最像你的。以后在「我的」里还能改。</p>
    </header>

    <!-- 实时预览：就是「我的」页那张卡的样子 -->
    <div class="preview">
      <span class="av">{{ avatar }}</span>
      <div class="who">
        <b>{{ name }}</b>
        <span>{{ selected.length ? selected.join(' · ') : '还不挑，就先空着' }}</span>
      </div>
      <em class="cnt">{{ selected.length }}/{{ MAX }}</em>
    </div>

    <div class="tags">
      <button
        v-for="tag in picks"
        :key="tag"
        type="button"
        class="tg"
        :class="{ on: selected.includes(tag) }"
        :aria-pressed="selected.includes(tag)"
        @click="toggle(tag)"
      >
        {{ tag }}
      </button>
    </div>

    <div class="ops">
      <button class="reroll" type="button" @click="reroll">🎲 换一批</button>
      <p class="hint">
        {{ selected.length < MIN ? `再选 ${MIN - selected.length} 个就能继续` : '好了，点右下角完成' }}
      </p>
    </div>

    <SButton class="done" block :disabled="!ready" @click="done">完成，开始记录</SButton>
  </div>
</template>

<style scoped>
.onboard {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  padding: 82px 22px 30px;
}

.head {
  margin-bottom: 20px;
}

.step {
  display: inline-block;
  padding: 5px 12px;
  border-radius: var(--r-pill);
  background: var(--or-xs);
  font-size: 9.5px;
  letter-spacing: 0.1em;
  color: var(--or-d);
}

.title {
  margin: 14px 0 0;
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.01em;
}

.sub {
  margin: 9px 0 0;
  font-size: 11px;
  line-height: 1.75;
  color: var(--ink-3);
}

/* 预览卡：跟 ProfileView 的 .pcard 同一套视觉 */
.preview {
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 14px 16px;
  border-radius: 22px;
  background: #fff;
  box-shadow: 0 12px 28px rgba(150, 115, 80, 0.1);
}

.av {
  flex: 0 0 auto;
  width: 46px;
  height: 46px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 20px;
  font-weight: 700;
  color: #c0703d;
  background: #fbe7d6;
}

.who {
  min-width: 0;
}

.who b {
  display: block;
  margin-bottom: 5px;
  font-size: 15px;
  font-weight: 700;
}

.who span {
  display: block;
  font-size: 10.5px;
  line-height: 1.6;
  color: var(--ink-3);
}

.cnt {
  margin-left: auto;
  font-style: normal;
  font-size: 10px;
  color: var(--or-d);
  letter-spacing: 0.06em;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
  margin: 22px 0 0;
}

.tg {
  padding: 9px 15px;
  border-radius: var(--r-pill);
  border: 1.5px solid var(--line);
  background: #fffcf5;
  font-size: 12px;
  color: var(--ink-2);
  transition: background 160ms var(--ease), border-color 160ms var(--ease),
    color 160ms var(--ease), transform 160ms var(--ease);
}

.tg.on {
  background: var(--or);
  border-color: var(--or);
  color: #fff8f0;
  font-weight: 650;
}

.tg:active {
  transform: scale(0.96);
}

.ops {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin: auto 0 16px;
  padding-top: 24px;
}

.reroll {
  padding: 9px 15px;
  border-radius: var(--r-pill);
  border: 1.5px dashed var(--line);
  font-size: 11.5px;
  color: var(--ink-2);
}

.hint {
  margin: 0;
  font-size: 10px;
  color: var(--ink-3);
  text-align: right;
}

.done {
  flex: 0 0 auto;
}

/* 大屏：内容居中成一列，别铺满整屏 */
@media (min-width: 768px) {
  .onboard {
    max-width: 560px;
    margin: 0 auto;
    padding: 56px 0 40px;
  }
}
</style>
