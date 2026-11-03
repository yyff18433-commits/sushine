/**
 * 把一张图做成「模切贴纸」（die-cut sticker）：
 * 沿边缘生成一条不规则闭合路径，中间填白色当贴纸白边，
 * 再把画面裁进内圈，输出透明背景 —— 看起来就像从贴纸册上撕下来的一张。
 *
 * 纯 Canvas，无依赖。
 * 输出优先用 WebP（带 alpha，同样清晰度体积只有 PNG 的 1/4 左右），
 * 浏览器不支持编码时退回 PNG。
 */
export async function dieCut(src, options = {}) {
  const { size = 620, pad = 46, wobble = 14, border = 18, seed = 7 } = options
  // cartoonify 直接给 canvas，省一次编解码；也兼容图片地址
  const img = src instanceof HTMLCanvasElement ? src : await loadImage(src)

  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  const outerPts = wobblePoints(size, pad, wobble, seed)
  const innerPts = wobblePoints(size, pad + border, wobble * 0.85, seed + 11)

  // 1. 白色贴纸底（就是那圈白边）
  ctx.save()
  smoothPath(ctx, outerPts)
  ctx.fillStyle = '#FFFDF9'
  ctx.fill()
  ctx.restore()

  // 2. 画面裁进内圈
  ctx.save()
  smoothPath(ctx, innerPts)
  ctx.clip()
  const scale = Math.max(size / img.width, size / img.height)
  const dw = img.width * scale
  const dh = img.height * scale
  ctx.drawImage(img, (size - dw) / 2, (size - dh) / 2, dw, dh)
  ctx.restore()

  return encode(canvas)
}

/** WebP 能编就编，不能编（老 Safari）退回 PNG */
function encode(canvas) {
  try {
    const webp = canvas.toDataURL('image/webp', 0.9)
    if (webp.startsWith('data:image/webp')) return webp
  } catch {
    /* 忽略，走 PNG */
  }
  return canvas.toDataURL('image/png')
}

/** 沿矩形四条边打点，每个点带随机抖动，再平滑成闭合曲线 */
function wobblePoints(size, pad, amp, seed) {
  const rand = mulberry32(seed)
  const x0 = pad
  const y0 = pad
  const x1 = size - pad
  const y1 = size - pad
  const step = (x1 - x0) / 7
  const pts = []

  for (let x = x0; x < x1; x += step) pts.push([x, y0 + (rand() - 0.5) * amp])
  for (let y = y0; y < y1; y += step) pts.push([x1 + (rand() - 0.5) * amp, y])
  for (let x = x1; x > x0; x -= step) pts.push([x, y1 + (rand() - 0.5) * amp])
  for (let y = y1; y > y0; y -= step) pts.push([x0 + (rand() - 0.5) * amp, y])
  return pts
}

/** 用「过中点二次贝塞尔」把多边形变成顺滑的手绘感轮廓 */
function smoothPath(ctx, pts) {
  const n = pts.length
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]

  ctx.beginPath()
  const start = mid(pts[n - 1], pts[0])
  ctx.moveTo(start[0], start[1])
  for (let i = 0; i < n; i++) {
    const p = pts[i]
    const q = pts[(i + 1) % n]
    const m = mid(p, q)
    ctx.quadraticCurveTo(p[0], p[1], m[0], m[1])
  }
  ctx.closePath()
}

function mulberry32(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}
