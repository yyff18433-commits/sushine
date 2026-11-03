<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import SButton from '../components/SButton.vue'
import { IMAGES } from '../data/mock'
import { auth, login, register, guest } from '../store/auth'

const router = useRouter()

/** login | register —— 同一个页面两种状态，切起来不丢输入 */
const mode = ref('login')
const isRegister = computed(() => mode.value === 'register')

const form = reactive({ name: '', email: '', pass: '' })
const error = ref('')
const showPass = ref(false)

function switchMode() {
  mode.value = isRegister.value ? 'login' : 'register'
  error.value = ''
}

function validate() {
  if (isRegister.value && !form.name.trim()) return '给自己起个昵称吧'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return '邮箱格式好像不太对'
  if (form.pass.length < 6) return '密码至少 6 位'
  return ''
}

function submit() {
  const message = validate()
  error.value = message
  if (message) return

  const res = isRegister.value
    ? register({ name: form.name, email: form.email, pass: form.pass })
    : login({ email: form.email, pass: form.pass })

  if (!res.ok) {
    error.value = res.message
    return
  }
  // 新注册 → 去挑标签；老用户已挑过 → 直接进首页
  router.replace(isRegister.value || !auth.user.onboarded ? '/tags' : '/home')
}

function useGuest() {
  guest()
  router.replace('/home')
}
</script>

<template>
  <div class="auth">
    <!-- 左侧海报：大屏才显示，移动端收到表单里 -->
    <aside class="poster">
      <div class="poster-in">
        <div class="pm-brand">
          <b>Sushine</b>
          <span>食 物 手 账</span>
        </div>

        <h1 class="pm-title">把每一餐<br />过成一张手账</h1>
        <p class="pm-sub">拍一张照片，顺手记下热量，还把它做成贴纸攒起来。</p>

        <div class="collage" aria-hidden="true">
          <figure class="shot a">
            <img :src="IMAGES.duck" alt="" />
            <figcaption>鸭腿饭 · 680 kcal</figcaption>
          </figure>
          <figure class="shot b">
            <img :src="IMAGES.noodles" alt="" />
            <figcaption>番茄鸡蛋面 · 560</figcaption>
          </figure>
          <figure class="shot c">
            <img :src="IMAGES.latte" alt="" />
            <figcaption>拿铁 · 180</figcaption>
          </figure>
        </div>

        <p class="pm-foot">食物识别 · 热量估算 · 贴纸收藏 · 周报月报</p>
      </div>
    </aside>

    <!-- 右侧表单 -->
    <section class="panel">
      <div class="card">
        <p class="kicker">S U S H I N E</p>
        <h2 class="title">{{ isRegister ? '创建你的手账' : '欢迎回来' }}</h2>
        <p class="lead">
          {{ isRegister ? '注册后挑几个口味标签，Sushine 就认识你了' : '登录，接着上次的记录往下写' }}
        </p>

        <form class="form" @submit.prevent="submit">
          <label v-if="isRegister" class="field">
            <span>昵称</span>
            <input
              v-model="form.name"
              type="text"
              maxlength="12"
              autocomplete="nickname"
              placeholder="比如 Potato"
            />
          </label>

          <label class="field">
            <span>邮箱</span>
            <input v-model="form.email" type="email" autocomplete="email" placeholder="you@example.com" />
          </label>

          <label class="field">
            <span>密码</span>
            <span class="pw">
              <input
                v-model="form.pass"
                :type="showPass ? 'text' : 'password'"
                :autocomplete="isRegister ? 'new-password' : 'current-password'"
                placeholder="至少 6 位"
              />
              <button
                type="button"
                class="eye"
                :aria-label="showPass ? '隐藏密码' : '显示密码'"
                @click="showPass = !showPass"
              >
                {{ showPass ? '隐藏' : '显示' }}
              </button>
            </span>
          </label>

          <p v-if="error" class="err" role="alert">{{ error }}</p>

          <SButton class="go" block type="submit">
            {{ isRegister ? '注册，去挑标签' : '登录' }}
          </SButton>
        </form>

        <div class="row2">
          <button class="link" type="button" @click="error = '演示版本，密码随便填就行（至少 6 位）'">
            忘记密码？
          </button>
          <button class="link" type="button" @click="switchMode">
            {{ isRegister ? '已有账号？去登录' : '还没有账号？立即注册' }}
          </button>
        </div>

        <button class="guest" type="button" @click="useGuest">
          先用演示账号逛逛 <i>→</i>
        </button>

        <p class="safe">账号只存在这台设备上，不上传任何服务器</p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.auth {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  background: var(--paper);
}

/* ---------------- 左：海报 ---------------- */
.poster {
  display: none;
}

/* ---------------- 右：表单 ---------------- */
.panel {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 96px 22px 40px;
}

.card {
  width: 100%;
  max-width: 372px;
}

.kicker {
  margin: 0 0 10px;
  font-size: 9.5px;
  letter-spacing: 0.28em;
  color: var(--ink-3);
}

.title {
  margin: 0;
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -0.01em;
}

.lead {
  margin: 9px 0 26px;
  font-size: 11.5px;
  line-height: 1.7;
  color: var(--ink-3);
}

.form {
  display: block;
}

.field {
  display: block;
  margin-bottom: 14px;
}

.field > span {
  display: block;
  margin-bottom: 7px;
  font-size: 10.5px;
  letter-spacing: 0.08em;
  color: var(--ink-2);
}

.field input {
  width: 100%;
  height: 48px;
  padding: 0 15px;
  border-radius: 14px;
  border: 1.5px solid var(--line);
  background: #fffdf9;
  font-size: 14px;
  color: var(--ink);
  transition: border-color 160ms var(--ease), box-shadow 160ms var(--ease);
}

.field input::placeholder {
  color: #c7b9a8;
}

.field input:focus {
  outline: none;
  border-color: var(--or-300);
  box-shadow: 0 0 0 4px rgba(217, 136, 95, 0.14);
}

/* 密码框：右边挂一个「显示/隐藏」 */
.pw {
  position: relative;
  display: block;
}

.pw input {
  padding-right: 62px;
}

.eye {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  padding: 8px 10px;
  font-size: 10.5px;
  color: var(--ink-3);
  border-radius: 9px;
}

.eye:active {
  background: var(--paper-2);
}

.err {
  margin: 2px 0 12px;
  padding: 9px 13px;
  border-radius: 11px;
  background: #fceeeb;
  font-size: 11px;
  color: var(--err);
}

.go {
  margin-top: 6px;
}

.row2 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 14px;
}

.link {
  font-size: 10.5px;
  color: var(--ink-2);
  text-decoration: underline;
  text-decoration-color: rgba(124, 108, 94, 0.35);
  text-underline-offset: 3px;
}

.link:active {
  color: var(--or-d);
}

.guest {
  width: 100%;
  margin-top: 22px;
  padding: 14px 0;
  border-top: 1.5px dashed var(--line);
  border-bottom: 1.5px dashed var(--line);
  font-size: 12px;
  color: var(--or-d);
  letter-spacing: 0.02em;
}

.guest i {
  font-style: normal;
  margin-left: 4px;
}

.safe {
  margin: 18px 0 0;
  text-align: center;
  font-size: 9.5px;
  color: #c9bcac;
}

/* ============ 大屏：左海报 + 右表单 ============ */
@media (min-width: 980px) {
  .auth {
    flex-direction: row;
    align-items: stretch;
    background: var(--card);
  }

  .poster {
    display: flex;
    align-items: center;
    width: 52%;
    padding: 56px 64px;
    overflow: hidden;
    position: relative;
    background: linear-gradient(158deg, #fdf2ea 0%, #f8e5d0 54%, #f1d2b6 100%);
  }

  /* 顶上的暖光斑 */
  .poster::before {
    content: "";
    position: absolute;
    right: -170px;
    top: -140px;
    width: 520px;
    height: 520px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(217, 136, 95, 0.3), transparent 68%);
    pointer-events: none;
  }

  /* 模切线 */
  .poster::after {
    content: "";
    position: absolute;
    inset: 26px;
    border: 1.5px dashed rgba(160, 140, 115, 0.38);
    border-radius: 26px;
    pointer-events: none;
  }

  .poster-in {
    position: relative;
    z-index: 1;
    max-width: 440px;
  }

  .pm-brand {
    display: flex;
    align-items: baseline;
    gap: 12px;
    margin-bottom: 34px;
  }

  .pm-brand b {
    font-size: 24px;
    font-weight: 800;
    letter-spacing: -0.01em;
    color: var(--ink);
  }

  .pm-brand span {
    font-size: 9.5px;
    letter-spacing: 0.24em;
    color: var(--ink-3);
  }

  .pm-title {
    margin: 0;
    font-family: var(--hand);
    font-size: 40px;
    line-height: 1.32;
    font-weight: 700;
    letter-spacing: 0.02em;
    color: #6d5342;
  }

  .pm-sub {
    margin: 16px 0 0;
    font-size: 12px;
    line-height: 1.9;
    color: #8b7361;
    max-width: 330px;
  }

  /* 三张贴纸错位排开 */
  .collage {
    position: relative;
    height: 226px;
    margin-top: 34px;
  }

  .shot {
    position: absolute;
    width: 31%;
    margin: 0;
    padding: 7px 7px 20px;
    border-radius: 9px;
    background: #fffdf9;
    box-shadow: 0 14px 30px rgba(150, 105, 70, 0.22);
    transition: transform 320ms var(--ease);
  }

  .shot img {
    display: block;
    width: 100%;
    aspect-ratio: 1;
    object-fit: cover;
    border-radius: 5px;
  }

  .shot figcaption {
    margin-top: 5px;
    text-align: center;
    font-size: 8px;
    letter-spacing: 0.02em;
    color: var(--ink-3);
  }

  .shot.a {
    left: 0;
    top: 12px;
    transform: rotate(-6deg);
  }

  .shot.b {
    left: 34%;
    top: -10px;
    transform: rotate(3deg);
  }

  .shot.c {
    left: 68%;
    top: 20px;
    transform: rotate(-2.5deg);
  }

  .collage:hover .shot.a {
    transform: rotate(-8deg) translateY(-5px);
  }

  .collage:hover .shot.c {
    transform: rotate(0deg) translateY(-5px);
  }

  .pm-foot {
    margin: 16px 0 0;
    font-size: 9.5px;
    letter-spacing: 0.12em;
    color: #b39c86;
  }

  .panel {
    width: 48%;
    padding: 56px 56px;
  }

  .card {
    max-width: 388px;
  }
}
</style>
