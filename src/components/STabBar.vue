<script setup>
import { useRouter } from 'vue-router'

defineProps({
  active: { type: String, default: 'home' },
  /** 小屏是否显示；大屏永远显示为左侧导航栏 */
  visible: { type: Boolean, default: true }
})

const router = useRouter()
const go = (to) => router.push(to)
</script>

<template>
  <nav class="tabbar" :class="{ 'tabbar--hidden': !visible }" aria-label="主导航">
    <!-- 大屏专属：品牌区 -->
    <div class="brand">
      <span class="brand-logo">Sushine</span>
      <span class="brand-sub">认真记录每一餐</span>
    </div>

    <button class="tb" :class="{ on: active === 'home' }" @click="go('/home')">
      <svg viewBox="0 0 24 24">
        <path d="M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2z" />
        <path d="M9.5 8.5h5M9.5 12h5" />
      </svg>
      <span>Today</span>
    </button>

    <button class="tb" :class="{ on: active === 'month' }" @click="go('/month')">
      <svg viewBox="0 0 24 24">
        <rect x="4" y="5.5" width="16" height="14.5" rx="3" />
        <path d="M8.5 3v4M15.5 3v4M4 10.5h16" />
      </svg>
      <span>日历</span>
    </button>

    <button class="fab" aria-label="拍一张" @click="go('/camera')">
      <svg viewBox="0 0 24 24">
        <path
          d="M4 8.6h3.1l1.5-2.1h6.8l1.5 2.1H20a1.5 1.5 0 0 1 1.5 1.5v7.4A1.5 1.5 0 0 1 20 19H4a1.5 1.5 0 0 1-1.5-1.5v-7.4A1.5 1.5 0 0 1 4 8.6z"
        />
        <circle cx="12" cy="13.4" r="3.1" />
      </svg>
      <span class="fab-label">拍一张</span>
    </button>

    <button class="tb" :class="{ on: active === 'sushie' }" @click="go('/sushie')">
      <svg viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="8" />
        <path d="M15 9l-1.8 4.4L9 15l1.8-4.4z" />
      </svg>
      <span>Sushie</span>
    </button>

    <button class="tb" :class="{ on: active === 'profile' }" @click="go('/profile')">
      <svg viewBox="0 0 24 24">
        <circle cx="12" cy="8.4" r="3.5" />
        <path d="M5.2 20c0-3.8 3-6.4 6.8-6.4s6.8 2.6 6.8 6.4" />
      </svg>
      <span>我的</span>
    </button>
  </nav>
</template>

<style scoped>
.tabbar {
  position: absolute;
  left: 14px;
  right: 14px;
  bottom: 20px;
  height: 82px;
  z-index: 9;
  display: flex;
  align-items: center;
  padding: 0 6px;
  background: #fff;
  border-radius: 28px;
  box-shadow: 0 16px 34px rgba(150, 115, 80, 0.16);
}

.tb {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  font-size: 9px;
  color: var(--ink-3);
  transition: color var(--dur) var(--ease);
}

.tb svg {
  width: 20px;
  height: 20px;
  fill: none;
  stroke: #b7a896;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: stroke var(--dur) var(--ease);
}

.tb.on {
  color: var(--or-d);
  font-weight: 650;
}

.tb.on svg {
  stroke: var(--or-d);
}

.fab {
  flex: 0 0 66px;
  width: 66px;
  height: 66px;
  margin-top: -40px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: linear-gradient(180deg, #e1956a, #cd784c);
  box-shadow: var(--sh-fab), 0 0 0 5px #faf6f0;
  transition: transform 140ms var(--ease);
}

.fab:active {
  transform: scale(0.95);
}

.fab svg {
  width: 25px;
  height: 25px;
  fill: none;
  stroke: #fff;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* 仅大屏显示的元素 */
.brand,
.fab-label {
  display: none;
}

.tabbar--hidden {
  display: none;
}

/* ============================================================
   ≥768px：底部导航 → 左侧竖向导航栏
   ============================================================ */
@media (min-width: 768px) {
  .tabbar--hidden {
    display: flex;
  }

  .tabbar {
    left: 0;
    right: auto;
    top: 0;
    bottom: 0;
    width: var(--rail-w);
    height: 100%;
    flex-direction: column;
    align-items: stretch;
    justify-content: flex-start;
    gap: 6px;
    padding: 30px 18px 24px;
    border-radius: 0;
    border-right: 1px solid var(--line);
    background: rgba(255, 253, 249, 0.86);
    backdrop-filter: blur(8px);
    box-shadow: none;
  }

  .brand {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 0 12px 20px;
    margin-bottom: 10px;
    border-bottom: 1px dashed var(--line);
  }

  .brand-logo {
    font-size: 25px;
    font-weight: 800;
    letter-spacing: -0.01em;
    color: var(--ink);
  }

  .brand-sub {
    font-size: 10px;
    letter-spacing: 0.18em;
    color: var(--ink-3);
  }

  .tb {
    flex: none;
    flex-direction: row;
    justify-content: flex-start;
    gap: 12px;
    padding: 12px 14px;
    border-radius: 14px;
    font-size: 13px;
    color: var(--ink-2);
    transition: background 180ms var(--ease), color 180ms var(--ease);
  }

  .tb svg {
    width: 19px;
    height: 19px;
  }

  .tb:hover {
    background: var(--paper-2);
  }

  .tb.on {
    background: var(--or-xs);
    color: var(--or-d);
    font-weight: 650;
  }

  .fab {
    flex: none;
    width: 100%;
    height: 48px;
    margin: 14px 0 0;
    border-radius: 16px;
    flex-direction: row;
    gap: 10px;
    box-shadow: 0 4px 0 var(--or-d), 0 10px 20px rgba(185, 107, 69, 0.2);
  }

  .fab svg {
    width: 20px;
    height: 20px;
  }

  .fab-label {
    display: inline;
    font-size: 13.5px;
    font-weight: 650;
    letter-spacing: 0.04em;
    color: #fff;
  }
}
</style>
