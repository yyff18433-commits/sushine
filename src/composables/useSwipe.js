/**
 * 横向滑动（组员 5 · 2）
 *
 * 只做一件事：判断这一下是「横着划」还是「竖着滚」。
 * 竖着滚就完全放行，让页面正常滚动；横着划才接管，并把位移交给调用方。
 * 松手后按阈值吸附到「开着」或「关着」，不做自由停靠 —— 列表里自由停靠很难受。
 *
 * 用法：
 *   const { dx, dragging, open, onDown, close, toggle } = useSwipe({ max: 140 })
 *   <div @pointerdown="onDown" :style="{ transform: `translateX(${dx}px)` }">
 */
import { ref } from 'vue'

export function useSwipe({ max = 140, lock = 8 } = {}) {
  const dx = ref(0)
  const dragging = ref(false)
  const open = ref(false)

  let startX = 0
  let startY = 0
  let axis = ''
  let base = 0
  let active = false

  function onDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    active = true
    startX = e.clientX
    startY = e.clientY
    axis = ''
    base = open.value ? -max : 0
    dragging.value = true
    window.addEventListener('pointermove', onMove, { passive: false })
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  function onMove(e) {
    if (!active) return
    const mx = e.clientX - startX
    const my = e.clientY - startY

    if (!axis) {
      if (Math.abs(mx) < lock && Math.abs(my) < lock) return
      axis = Math.abs(mx) > Math.abs(my) * 1.2 ? 'x' : 'y'
      if (axis === 'y') {
        dragging.value = false
        release()
        return
      }
    }

    if (axis !== 'x') return
    if (e.cancelable) e.preventDefault()

    let next = base + mx
    // 两个方向都给阻尼，边界不会「撞墙」
    if (next > 0) next *= 0.28
    if (next < -max) next = -max + (next + max) * 0.3
    dx.value = next
  }

  function onUp() {
    if (!active) return
    const passed = dx.value < -max / 2
    open.value = passed
    dx.value = passed ? -max : 0
    active = false
    dragging.value = false
    release()
  }

  function release() {
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    window.removeEventListener('pointercancel', onUp)
  }

  function close() {
    open.value = false
    dx.value = 0
    active = false
    dragging.value = false
    release()
  }

  function toggle() {
    open.value = !open.value
    dx.value = open.value ? -max : 0
  }

  return { dx, dragging, open, onDown, close, toggle }
}
