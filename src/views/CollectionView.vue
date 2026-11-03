<script setup>
/**
 * 贴纸收藏（组员 5 · 2 / 3）
 * 以前是「手账 + 写死的月历图」拼起来的墙，现在全部来自真实记录：
 * 收藏的那几张排在前面，点爱心会有一次「点亮 + 粒子」的反馈，
 * 取消收藏时卡片收起，墙会自动补位（TransitionGroup）。
 */
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import SSticker from '../components/SSticker.vue'
import SDecoLayer from '../components/SDecoLayer.vue'
import SFavButton from '../components/SFavButton.vue'
import SEmpty from '../components/SEmpty.vue'
import SChip from '../components/SChip.vue'
import SToast from '../components/SToast.vue'
import { journal, openDraft, settings } from '../store/journal'
import { dateKey } from '../store/body'
import { isFav, toggleFav, prettyDate, dateKeyOf } from '../store/db'

const router = useRouter()

const filters = [
  { key: 'all', label: '全部' },
  { key: 'fav', label: '收藏' },
  { key: 'today', label: '今天' }
]
const filter = ref('all')
const toast = ref('')
let toastTimer = null

function showToast(text) {
  toast.value = text
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 1600)
}

const favCount = computed(() => journal.entries.filter((e) => isFav(e.id)).length)

const stickers = computed(() => {
  const list = journal.entries.map((e) => ({
    key: e.id,
    entry: e,
    src: e.img,
    deco: e.deco,
    name: e.name,
    date: dateKeyOf(e),
    meta: `${e.time} · ${settings.hideKcal ? '已记录' : `${e.kcal} kcal`}`
  }))
  // 收藏的排前面，其余按日期倒序
  return list.sort((a, b) => {
    const fa = isFav(a.key) ? 1 : 0
    const fb = isFav(b.key) ? 1 : 0
    if (fa !== fb) return fb - fa
    return a.date < b.date ? 1 : -1
  })
})

const list = computed(() => {
  if (filter.value === 'fav') return stickers.value.filter((s) => isFav(s.key))
  if (filter.value === 'today') return stickers.value.filter((s) => s.date === dateKey())
  return stickers.value
})

function openSticker(s) {
  openDraft(s.entry)
  router.push('/sticker-info')
}

function onFav(s) {
  const on = toggleFav(s.key)
  showToast(on ? `已收藏「${s.name}」` : '已取消收藏')
}
</script>

<template>
  <div class="page collection">
    <header class="chead">
      <button class="bak" aria-label="返回" @click="router.back()">‹</button>
      <b>贴纸收藏</b>
      <span class="count">收藏 {{ favCount }}</span>
    </header>

    <p class="csub">每一餐都是一张贴纸，攒着攒着就成册了。</p>

    <div class="filters">
      <button v-for="f in filters" :key="f.key" type="button" @click="filter = f.key">
        <SChip :active="filter === f.key">{{ f.label }}</SChip>
      </button>
    </div>

    <TransitionGroup v-if="list.length" name="wall" tag="div" class="wall">
      <button
        v-for="(s, i) in list"
        :key="s.key"
        class="wall-item"
        :style="{
          transform: `rotate(${i % 3 === 0 ? -1.6 : i % 3 === 1 ? 1.2 : 0}deg)`,
          '--d': Math.min(i, 12) * 45 + 'ms'
        }"
        @click="openSticker(s)"
      >
        <span class="wall-thumb">
          <SSticker :src="s.src" :alt="s.name" size="84px" border="4px" />
          <SDecoLayer :deco="s.deco" :base="21" />
          <SFavButton class="wall-fav" :active="isFav(s.key)" :size="24" @toggle="onFav(s)" />
        </span>
        <b>{{ s.name }}</b>
        <span class="wall-meta">{{ prettyDate(s.date) }} · {{ s.meta }}</span>
      </button>
    </TransitionGroup>

    <SEmpty
      v-else
      :title="filter === 'fav' ? '还没有收藏' : '还没有贴纸'"
      :desc="filter === 'fav' ? '在手账或历史里点一下爱心，就会收进来' : '拍下第一餐，贴纸会自动收进来'"
    >
      <button class="go-btn" @click="filter === 'fav' ? (filter = 'all') : router.push('/camera')">
        {{ filter === 'fav' ? '看看全部贴纸' : '去拍一张' }}
      </button>
    </SEmpty>

    <SToast :show="!!toast" :text="toast" />
  </div>
</template>

<style scoped>
.collection {
  padding-bottom: 60px;
}

.chead {
  display: flex;
  align-items: center;
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

.chead b {
  margin-left: 10px;
  font-size: 15px;
  font-weight: 700;
}

.count {
  margin-left: auto;
  padding: 3px 10px;
  border-radius: var(--r-pill);
  background: var(--or-xs);
  border: 1px solid var(--or-s);
  font-size: 10.5px;
  color: var(--or-d);
}

.csub {
  margin: 14px 0 0;
  font-size: 10.5px;
  line-height: 1.7;
  color: var(--ink-3);
}

.filters {
  display: flex;
  gap: 7px;
  margin: 14px 0 18px;
}

.filters button {
  line-height: 0;
}

.wall {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px 8px;
}

.wall-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 6px 10px;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 8px 18px rgba(150, 115, 80, 0.09);
  transition: transform 160ms var(--ease), box-shadow 160ms var(--ease);
  animation: pop-in 380ms var(--ease) both;
  animation-delay: var(--d, 0ms);
}

.wall-item:active {
  transform: scale(0.95) !important;
}

.wall-thumb {
  position: relative;
  width: 84px;
  height: 84px;
}

.wall-fav {
  position: absolute;
  right: -8px;
  bottom: -6px;
  z-index: 4;
}

.wall-item b {
  font-size: 10px;
  font-weight: 600;
  color: #4a3e34;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wall-meta {
  font-size: 8.5px;
  color: var(--ink-3);
}

/* 收藏 / 取消收藏时卡片的进出 */
.wall-enter-active {
  animation: pop-in 380ms var(--ease);
}

.wall-leave-active {
  transition: opacity 200ms var(--ease), transform 200ms var(--ease);
}

.wall-leave-to {
  opacity: 0;
  transform: scale(0.86);
}

.wall-move {
  transition: transform 300ms var(--ease);
}

.go-btn {
  margin-top: 14px;
  height: 40px;
  padding: 0 20px;
  border-radius: var(--r-14);
  background: var(--or);
  color: #fff8f0;
  font-size: 12.5px;
  font-weight: 650;
  box-shadow: 0 3px 0 var(--or-d);
}

/* ============ 大屏（≥900px） ============ */
@media (min-width: 900px) {
  .chead b {
    font-size: 17px;
  }

  .wall {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 18px 14px;
  }

  .wall-item {
    padding: 16px 8px 14px;
  }

  .wall-item:hover {
    box-shadow: 0 14px 28px rgba(150, 115, 80, 0.16);
  }

  .wall-item b {
    font-size: 11px;
  }
}
</style>
