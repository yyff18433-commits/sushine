import { createRouter, createWebHashHistory } from 'vue-router'
import { auth } from '../store/auth'

/**
 * 页面流转（与 UI 高保真 10 屏一一对应）
 * 00 Login → 01 Splash → 02 Home → 03 Camera → 04 Sticker → 05 StickerInfo → 06 Edit → 07 Sushie
 * 08 Report / 09 Month / 10 Profile
 * meta.tab 决定底部导航高亮项
 * meta.bare = 全屏页（登录 / 挑标签）：不显示底部导航，也不再让出左侧导航宽度
 * meta.depth = 层级，App.vue 据此决定页面是「向前推入」还是「向后退出」
 */
const routes = [
  { path: '/', redirect: '/splash' },

  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginView.vue'),
    meta: { title: '登录 / 注册', bare: true, depth: 0 }
  },
  {
    path: '/tags',
    name: 'tags',
    component: () => import('../views/TagsView.vue'),
    meta: { title: '挑口味标签', bare: true, depth: 0 }
  },

  {
    path: '/splash',
    name: 'splash',
    component: () => import('../views/SplashView.vue'),
    meta: { title: '启动页', depth: 0 }
  },
  {
    path: '/home',
    name: 'home',
    component: () => import('../views/HomeView.vue'),
    meta: { title: '首页', tab: 'home', depth: 1 }
  },
  {
    path: '/camera',
    name: 'camera',
    component: () => import('../views/CameraView.vue'),
    meta: { title: '拍照', depth: 2 }
  },
  {
    path: '/sticker',
    name: 'sticker',
    component: () => import('../views/StickerView.vue'),
    meta: { title: '贴纸生成', depth: 3 }
  },
  {
    path: '/sticker-info',
    name: 'sticker-info',
    component: () => import('../views/StickerInfoView.vue'),
    meta: { title: '贴纸信息', depth: 4 }
  },
  {
    path: '/edit',
    name: 'edit',
    component: () => import('../views/EditView.vue'),
    meta: { title: '编辑信息', depth: 5 }
  },
  {
    path: '/decorate',
    name: 'decorate',
    component: () => import('../views/DecorateView.vue'),
    meta: { title: '贴纸装饰', depth: 5 }
  },
  {
    path: '/sushie',
    name: 'sushie',
    component: () => import('../views/SushieView.vue'),
    meta: { title: 'Sushie 分析', tab: 'sushie', depth: 1 }
  },
  {
    path: '/report',
    name: 'report',
    component: () => import('../views/ReportView.vue'),
    meta: { title: '今日 / 周报', depth: 2 }
  },
  {
    path: '/month',
    name: 'month',
    component: () => import('../views/MonthView.vue'),
    meta: { title: '月度记录 / 历史', tab: 'month', depth: 1 }
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('../views/ProfileView.vue'),
    meta: { title: '我的', tab: 'profile', depth: 1 }
  },
  {
    path: '/body',
    name: 'body',
    component: () => import('../views/BodyView.vue'),
    meta: { title: '身体数据', depth: 2 }
  },
  {
    path: '/activity',
    name: 'activity',
    component: () => import('../views/ActivityView.vue'),
    meta: { title: '运动记录', depth: 2 }
  },
  {
    path: '/collection',
    name: 'collection',
    component: () => import('../views/CollectionView.vue'),
    meta: { title: '贴纸收藏', depth: 2 }
  },

  { path: '/:pathMatch(.*)*', redirect: '/home' }
]

const router = createRouter({
  // hash 模式：构建产物可直接本地打开，答辩演示不用起服务
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 })
})

/**
 * 登录守卫：
 *  1. 没登录 → 先去 /login（启动页、登录页本身放行）
 *  2. 已登录还去 /login → 回首页
 *  3. 刚注册但还没挑标签 → 一律先去 /tags
 */
router.beforeEach((to) => {
  const open = to.name === 'login' || to.name === 'splash'
  if (!auth.user && !open) return { name: 'login' }
  if (auth.user && to.name === 'login') return { name: 'home' }
  if (auth.user && !auth.user.onboarded && to.name !== 'tags') return { name: 'tags' }
  return true
})

export default router
