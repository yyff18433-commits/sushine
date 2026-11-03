<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import SStatusBar from './components/SStatusBar.vue'
import STabBar from './components/STabBar.vue'
import { journal, settings } from './store/journal'
import { ensureSeed } from './store/db'
import { cartoonify } from './utils/cartoonify'
import { dieCut } from './utils/dieCut'

const route = useRoute()
const tab = computed(() => route.meta.tab || '')
/** 登录 / 挑标签这类全屏页：不要底部导航，大屏也不要让出左侧导航宽度 */
const bare = computed(() => !!route.meta.bare)

/**
 * 页面切换方向：层级变深 = 向前推入，变浅 = 向后退出。
 * 统一在 App 里算，页面不用各自操心。
 */
const depth = computed(() => Number(route.meta.depth ?? 1))
const direction = ref('fwd')
watch(depth, (to, from) => {
  direction.value = to >= from ? 'fwd' : 'back'
})

/**
 * 全站兜底：把文件拖到页面任何地方，都不要让浏览器直接打开它（那会丢掉当前页面状态）。
 * 真正接住拖拽的是各页面自己的 drop 处理，这里只管「别导航走」。
 */
function blockFileDrop(event) {
  if (event.dataTransfer?.types?.includes('Files')) event.preventDefault()
}

onMounted(() => {
  window.addEventListener('dragover', blockFileDrop)
  window.addEventListener('drop', blockFileDrop)
})

onBeforeUnmount(() => {
  window.removeEventListener('dragover', blockFileDrop)
  window.removeEventListener('drop', blockFileDrop)
})

/**
 * 启动时：
 * 1. 先补一段历史记录（日历/历史页要有东西可看，且只补一次）；
 * 2. 再把还没风格化的旧记录补成贴纸，
 *    避免首页出现「真实照片 + 插画贴纸」两种质感混排。
 */
onMounted(async () => {
  ensureSeed()

  for (const entry of journal.entries.slice()) {
    if (entry.cartoonized || !entry.img || entry.img.startsWith('data:')) continue
    try {
      const cartoon = await cartoonify(entry.img, { style: settings.cartoonStyle, size: 800 })
      entry.img = await dieCut(cartoon, { size: 800, pad: 44, wobble: 14, border: 17 })
      entry.cartoonized = true
    } catch {
      entry.cartoonized = true // 失败就别反复重试
    }
  }
})
</script>

<template>
  <div class="phone" :class="{ 'phone--bare': bare }">
    <SStatusBar />
    <main class="screen" :class="{ 'screen--tab': !!tab, 'screen--bare': bare }">
      <RouterView v-slot="{ Component }">
        <Transition :name="direction" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </main>
    <STabBar :active="tab" :visible="!!tab && !bare" />

    <!-- 浮层宿主：弹窗 / 底部面板 / Toast 都挂在这里，层级永远高于底部导航 -->
    <div id="overlay-root" class="overlay-root"></div>
  </div>
</template>

<style scoped>
/* 全屏页：大屏时也不能被 base.css 里的 .screen{left:244px} 推出去 */
.screen--bare {
  left: 0;
}

/* 大屏时 .tabbar--hidden 会被强制 display:flex，这里用更具体的选择器把全屏页的导航藏干净 */
.phone--bare :deep(.tabbar) {
  display: none;
}

.overlay-root {
  position: absolute;
  inset: 0;
  z-index: 30;
  pointer-events: none;
}

.overlay-root :deep(> *) {
  pointer-events: auto;
}
</style>
