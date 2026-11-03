<script setup>
import { onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { brand } from '../data/mock'
import { auth } from '../store/auth'

const router = useRouter()
let timer = null

function enter() {
  if (timer) clearTimeout(timer)
  timer = null
  // 登录过就直接进手账，没登录就先去登录页
  router.replace(auth.user ? '/home' : '/login')
}

onMounted(() => {
  timer = setTimeout(enter, 2000)
})

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer)
})
</script>

<template>
  <div class="splash" @click="enter">
    <div class="glow" aria-hidden="true"></div>

    <div class="logo-card">
      <i class="tape" aria-hidden="true"></i>
      <h1 class="logo">{{ brand.name }}</h1>
      <p class="logo-sub">食 物 手 账</p>
    </div>

    <p class="slogan">{{ brand.slogan }}</p>
    <div class="dots" aria-hidden="true"><i></i><i></i><i></i></div>

    <p class="skip">跳过</p>
    <span class="home-bar" aria-hidden="true"></span>
  </div>
</template>

<style scoped>
.splash {
  position: relative;
  height: 100%;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
}

.glow {
  position: absolute;
  left: 50%;
  top: 44%;
  width: 430px;
  height: 430px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.96), rgba(255, 255, 255, 0) 66%);
  pointer-events: none;
}

.logo-card {
  position: relative;
  width: 238px;
  margin-top: 346px;
  padding: 30px 18px 26px;
  border-radius: 26px;
  text-align: center;
  background: #fffdfa;
  transform: rotate(-1.6deg);
  box-shadow: 0 22px 46px rgba(150, 115, 80, 0.17), 0 0 0 1px rgba(120, 90, 60, 0.04);
}

.tape {
  position: absolute;
  left: 50%;
  top: -12px;
  width: 78px;
  height: 24px;
  border-radius: 2px;
  background: rgba(238, 216, 176, 0.9);
  transform: translateX(-50%) rotate(-3deg);
}

.logo {
  margin: 0;
  font-size: 39px;
  line-height: 1.16;
  font-weight: 800;
  letter-spacing: 0.005em;
  color: #c0703d;
}

.logo-sub {
  margin: 10px 0 0;
  font-family: var(--hand);
  font-size: 12px;
  letter-spacing: 0.34em;
  color: #bda58c;
}

.slogan {
  margin: 46px 0 0;
  font-size: 13px;
  letter-spacing: 0.2em;
  color: #a2907c;
}

.dots {
  display: flex;
  gap: 7px;
  margin-top: 22px;
}

.dots i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #eacdb5;
}

.skip {
  margin: 0;
  margin-top: auto;
  margin-bottom: 92px;
  font-size: 11.5px;
  letter-spacing: 0.18em;
  color: #bbaa96;
}

.home-bar {
  position: absolute;
  left: 50%;
  bottom: 12px;
  width: 126px;
  height: 5px;
  border-radius: 3px;
  background: #d9ccbf;
  transform: translateX(-50%);
}

@media (max-height: 760px) {
  .logo-card {
    margin-top: 220px;
  }
}

/* ============ 大屏（≥900px） ============ */
@media (min-width: 900px) {
  .logo-card {
    width: 320px;
    margin-top: 24vh;
    padding: 40px 24px 34px;
  }

  .logo {
    font-size: 52px;
  }

  .logo-sub {
    font-size: 14px;
    margin-top: 14px;
  }

  .slogan {
    margin-top: 56px;
    font-size: 15px;
  }

  .skip {
    margin-bottom: 64px;
  }
}
</style>
