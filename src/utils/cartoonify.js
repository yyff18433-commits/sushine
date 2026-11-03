/**
 * 照片 → 贴纸（纯 Canvas，零依赖，离线可跑）
 *
 * 四种画法，共同点是都不做「描边」——
 * 描边会把米粒、芝麻、油光都勾成一圈圈小线，成片时看着就很脏。
 *
 *  photo      原图贴纸：真实照片，只做反锐化掩模
 *  watercolor 水彩：保边平滑 + 多主色，再掺回一点原图，像淡彩
 *  cutout     剪纸：强力平滑 + 很少的几种颜色，边缘硬切
 *  pixel      像素：缩小再最近邻放大，颗粒感来自像素格而非噪点
 */

export const CARTOON_STYLES = [
  { id: 'photo', label: '原图贴纸', hint: '真实照片 · 只锐化' },
  { id: 'watercolor', label: '水彩', hint: '多色 · 柔和' },
  { id: 'cutout', label: '剪纸', hint: '少色 · 硬边' },
  { id: 'pixel', label: '像素', hint: '复古像素画' }
]

const PRESETS = {
  // photo：不降细节，只做轻微锐化 + 提透，像 nosh 那样「真实照片 + 贴纸外形」
  photo: { photo: true, sharpen: 0.62, saturation: 1.06, contrast: 1.04 },

  // diffusion 越大越平整；k 越大越保细节；palette = 主色数量；smooth = 众数滤波半径
  watercolor: {
    diffusion: 9, k: 20, palette: 18, saturation: 1.14, warm: 0.8, smooth: 1, mix: 0.24
  },
  cutout: {
    diffusion: 13, k: 24, palette: 8, saturation: 1.26, warm: 1, smooth: 2, mix: 0
  },
  // block = 每个「大像素」占多少像素（800/9 ≈ 89 格）
  pixel: { pixel: true, block: 9, palette: 22, saturation: 1.18, warm: 0.6 }
}

export async function cartoonify(src, options = {}) {
  const styleId = PRESETS[options.style] ? options.style : 'photo'
  const cfg = PRESETS[styleId]
  const wantSize = Math.max(320, Math.round(options.size ?? 720))

  const img = await loadImage(src)

  // 1. 只降不升：原图短边比目标还小就按原尺寸来，别硬放大
  const out = Math.max(320, Math.min(wantSize, Math.round(Math.min(img.width, img.height))))

  const canvas = document.createElement('canvas')
  canvas.width = out
  canvas.height = out
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  const scale = Math.max(out / img.width, out / img.height)
  const dw = img.width * scale
  const dh = img.height * scale
  ctx.drawImage(img, (out - dw) / 2, (out - dh) / 2, dw, dh)

  const imageData = ctx.getImageData(0, 0, out, out)
  const data = imageData.data
  const n = out * out

  // 2. 拆通道成浮点，扩散要反复读写
  const R = new Float32Array(n)
  const G = new Float32Array(n)
  const B = new Float32Array(n)
  for (let p = 0, i = 0; p < n; p++, i += 4) {
    R[p] = data[i]
    G[p] = data[i + 1]
    B[p] = data[i + 2]
  }

  if (cfg.photo) {
    // 3. 原图模式：不降分辨率、不压色阶，只把照片拔干净一点
    unsharp(R, G, B, out, cfg.sharpen)
    const sat = cfg.saturation
    const con = cfg.contrast
    for (let p = 0; p < n; p++) {
      const r = R[p]
      const g = G[p]
      const b = B[p]
      const gray = 0.299 * r + 0.587 * g + 0.114 * b
      R[p] = clamp((gray + (r - gray) * sat - 128) * con + 128)
      G[p] = clamp((gray + (g - gray) * sat - 128) * con + 128)
      B[p] = clamp((gray + (b - gray) * sat - 128) * con + 128)
    }
    for (let p = 0, i = 0; p < n; p++, i += 4) {
      data[i] = R[p]
      data[i + 1] = G[p]
      data[i + 2] = B[p]
      data[i + 3] = 255
    }
    ctx.putImageData(imageData, 0, 0)
    return canvas
  }

  // 3. 像素画：先把图缩成几十格，再最近邻放大，颗粒就是像素格
  if (cfg.pixel) return pixelate(canvas, out, cfg)

  // 4. 保边平滑（「不糊」的关键）
  diffuse(R, G, B, out, cfg.diffusion, cfg.k)

  // 5. 绘本配色
  const sat = cfg.saturation
  for (let p = 0; p < n; p++) {
    const r = R[p]
    const g = G[p]
    const b = B[p]
    const gray = 0.299 * r + 0.587 * g + 0.114 * b
    R[p] = clamp(gray + (r - gray) * sat + 7 * cfg.warm)
    G[p] = clamp(gray + (g - gray) * sat + 3 * cfg.warm)
    B[p] = clamp(gray + (b - gray) * sat - 3 * cfg.warm)
  }

  // 6. 主色量化 → 索引图
  const palette = kmeansPalette(R, G, B, out, cfg.palette)
  const idxLut = paletteIndexLUT(palette)
  const idx = new Uint8Array(n)
  for (let p = 0, i = 0; p < n; p++, i += 4) {
    idx[p] = idxLut[lutKey(R[p], G[p], B[p])]
  }

  // 7. 众数滤波：抹掉孤立杂色块。少了这步，米粒、芝麻会变成一粒粒小虫
  const clean = majorityFilter(idx, out, cfg.smooth, palette.length)

  // 8. 合成；mix > 0 时掺回一点原图，边缘就不像「硬切色块」
  const mix = cfg.mix || 0
  for (let p = 0, i = 0; p < n; p++, i += 4) {
    const c = palette[clean[p]]
    let r = c[0]
    let g = c[1]
    let b = c[2]
    if (mix > 0) {
      r += (data[i] - r) * mix
      g += (data[i + 1] - g) * mix
      b += (data[i + 2] - b) * mix
    }
    data[i] = r
    data[i + 1] = g
    data[i + 2] = b
    data[i + 3] = 255
  }

  ctx.putImageData(imageData, 0, 0)
  // 直接返回 canvas：调用方紧接着要喂给 dieCut，
  // 中间过一道 PNG 编解码不但慢（800px 要 200ms+），还会丢精度
  return canvas
}

/* ---------------- 锐化（原图模式） ---------------- */

/** 反锐化掩模：c + amount*(c - blur(c))，比拉对比度更像「变清楚」而不是「变硬」 */
function unsharp(R, G, B, size, amount) {
  const sigma = Math.max(0.6, 0.9 * (size / 720))
  const br = gaussBlur(R, size, sigma)
  const bg = gaussBlur(G, size, sigma)
  const bb = gaussBlur(B, size, sigma)
  for (let p = 0; p < size * size; p++) {
    R[p] = clamp(R[p] + amount * (R[p] - br[p]))
    G[p] = clamp(G[p] + amount * (G[p] - bg[p]))
    B[p] = clamp(B[p] + amount * (B[p] - bb[p]))
  }
}

/* ---------------- 保边平滑：Perona–Malik 各向异性扩散 ---------------- */

/**
 * 沿「亮度差小」的方向扩散、沿「亮度差大」的方向几乎不扩散，
 * 效果就是平坦区被抹平、轮廓被留住。
 * 传导系数用 1/(1+(d/K)^2)（不用 exp，256 项查表，快很多）。
 */
function diffuse(R, G, B, size, iterations, K) {
  if (iterations <= 0) return
  const n = size * size
  const coef = new Float32Array(256)
  for (let d = 0; d < 256; d++) {
    const t = d / K
    coef[d] = 1 / (1 + t * t)
  }

  let r0 = R
  let g0 = G
  let b0 = B
  let r1 = new Float32Array(n)
  let g1 = new Float32Array(n)
  let b1 = new Float32Array(n)
  const lum = new Float32Array(n)
  const lambda = 0.24

  for (let it = 0; it < iterations; it++) {
    for (let p = 0; p < n; p++) {
      lum[p] = 0.299 * r0[p] + 0.587 * g0[p] + 0.114 * b0[p]
    }

    // 先整体拷贝（边框不动），下面只重写内部像素
    r1.set(r0)
    g1.set(g0)
    b1.set(b0)

    for (let y = 1; y < size - 1; y++) {
      let p = y * size + 1
      for (let x = 1; x < size - 1; x++, p++) {
        const lc = lum[p]
        const cW = coef[Math.abs(lum[p - 1] - lc) | 0]
        const cE = coef[Math.abs(lum[p + 1] - lc) | 0]
        const cN = coef[Math.abs(lum[p - size] - lc) | 0]
        const cS = coef[Math.abs(lum[p + size] - lc) | 0]

        r1[p] =
          r0[p] +
          lambda *
            (cW * (r0[p - 1] - r0[p]) +
              cE * (r0[p + 1] - r0[p]) +
              cN * (r0[p - size] - r0[p]) +
              cS * (r0[p + size] - r0[p]))
        g1[p] =
          g0[p] +
          lambda *
            (cW * (g0[p - 1] - g0[p]) +
              cE * (g0[p + 1] - g0[p]) +
              cN * (g0[p - size] - g0[p]) +
              cS * (g0[p + size] - g0[p]))
        b1[p] =
          b0[p] +
          lambda *
            (cW * (b0[p - 1] - b0[p]) +
              cE * (b0[p + 1] - b0[p]) +
              cN * (b0[p - size] - b0[p]) +
              cS * (b0[p + size] - b0[p]))
      }
    }

    // 交换读写缓冲，结果始终落在 r0/g0/b0
    const tr = r0
    r0 = r1
    r1 = tr
    const tg = g0
    g0 = g1
    g1 = tg
    const tb = b0
    b0 = b1
    b1 = tb
  }

  R.set(r0)
  G.set(g0)
  B.set(b0)
}

/* ---------------- 主色提取：k-means ---------------- */

function kmeansPalette(R, G, B, size, k) {
  const step = Math.max(1, Math.round(size / 80))
  const pts = []
  for (let y = 0; y < size; y += step) {
    for (let x = 0; x < size; x += step) {
      const p = y * size + x
      pts.push(R[p], G[p], B[p])
    }
  }
  const m = pts.length / 3
  const rand = mulberry32(20240513)
  const centers = []

  // k-means++ 播种，保证每次结果一致
  const first = Math.floor(rand() * m) * 3
  centers.push([pts[first], pts[first + 1], pts[first + 2]])
  const d2 = new Float32Array(m).fill(Infinity)

  while (centers.length < k) {
    const c = centers[centers.length - 1]
    let sum = 0
    for (let i = 0; i < m; i++) {
      const dr = pts[i * 3] - c[0]
      const dg = pts[i * 3 + 1] - c[1]
      const db = pts[i * 3 + 2] - c[2]
      const d = dr * dr + dg * dg + db * db
      if (d < d2[i]) d2[i] = d
      sum += d2[i]
    }
    if (sum <= 0) break
    let target = rand() * sum
    let pick = m - 1
    for (let i = 0; i < m; i++) {
      target -= d2[i]
      if (target <= 0) {
        pick = i
        break
      }
    }
    centers.push([pts[pick * 3], pts[pick * 3 + 1], pts[pick * 3 + 2]])
  }

  // Lloyd 迭代
  for (let iter = 0; iter < 10; iter++) {
    const acc = centers.map(() => [0, 0, 0, 0])
    for (let i = 0; i < m; i++) {
      const r = pts[i * 3]
      const g = pts[i * 3 + 1]
      const b = pts[i * 3 + 2]
      let best = 0
      let bd = Infinity
      for (let c = 0; c < centers.length; c++) {
        const dr = r - centers[c][0]
        const dg = g - centers[c][1]
        const db = b - centers[c][2]
        const d = dr * dr + dg * dg + db * db
        if (d < bd) {
          bd = d
          best = c
        }
      }
      acc[best][0] += r
      acc[best][1] += g
      acc[best][2] += b
      acc[best][3]++
    }
    let moved = 0
    for (let c = 0; c < centers.length; c++) {
      const count = acc[c][3]
      if (!count) continue
      const nr = acc[c][0] / count
      const ng = acc[c][1] / count
      const nb = acc[c][2] / count
      moved +=
        Math.abs(nr - centers[c][0]) + Math.abs(ng - centers[c][1]) + Math.abs(nb - centers[c][2])
      centers[c] = [nr, ng, nb]
    }
    if (moved < 1.5) break
  }

  return centers
}

/** 32³ 的最近主色查找表：每像素只做一次位运算索引，不做 k 次距离计算 */
function paletteIndexLUT(palette) {
  const lut = new Uint8Array(32768)
  for (let r = 0; r < 32; r++) {
    for (let g = 0; g < 32; g++) {
      for (let b = 0; b < 32; b++) {
        const cr = (r << 3) + 4
        const cg = (g << 3) + 4
        const cb = (b << 3) + 4
        let best = 0
        let bd = Infinity
        for (let c = 0; c < palette.length; c++) {
          const dr = cr - palette[c][0]
          const dg = cg - palette[c][1]
          const db = cb - palette[c][2]
          // 按人眼敏感度加权
          const d = dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11
          if (d < bd) {
            bd = d
            best = c
          }
        }
        lut[(((r << 5) | g) << 5) | b] = best
      }
    }
  }
  return lut
}

function lutKey(r, g, b) {
  return (((clamp(r) | 0) >> 3) << 10) | (((clamp(g) | 0) >> 3) << 5) | ((clamp(b) | 0) >> 3)
}

/* ---------------- 众数滤波：清掉孤立杂色块 ---------------- */

/**
 * 量化后每个像素只属于某个主色，在索引图上做邻域众数，
 * 孤立的小色块（米粒、芝麻、油光点）会被周围的主色吃掉，
 * 大块区域不受影响 —— 这是「不要像虫子」的关键一步。
 */
function majorityFilter(idx, size, radius, k) {
  if (!radius) return idx
  const out = new Uint8Array(idx.length)
  out.set(idx)
  const count = new Uint16Array(32)
  const r = radius

  for (let y = r; y < size - r; y++) {
    let p = y * size + r
    for (let x = r; x < size - r; x++, p++) {
      count.fill(0)
      for (let dy = -r; dy <= r; dy++) {
        let q = p + dy * size - r
        for (let dx = -r; dx <= r; dx++, q++) count[idx[q]]++
      }
      let best = idx[p]
      let bc = 0
      for (let c = 0; c < k; c++) {
        if (count[c] > bc) {
          bc = count[c]
          best = c
        }
      }
      out[p] = best
    }
  }
  return out
}

/* ---------------- 像素画 ---------------- */

/** 缩到几十格 → 主色量化 → 关掉平滑放大回去 */
function pixelate(canvas, out, cfg) {
  const sw = Math.max(24, Math.round(out / cfg.block))
  const small = document.createElement('canvas')
  small.width = sw
  small.height = sw
  const sctx = small.getContext('2d', { willReadFrequently: true })
  sctx.imageSmoothingEnabled = true
  sctx.imageSmoothingQuality = 'high'
  sctx.drawImage(canvas, 0, 0, sw, sw)

  const image = sctx.getImageData(0, 0, sw, sw)
  const d = image.data
  const m = sw * sw
  const R = new Float32Array(m)
  const G = new Float32Array(m)
  const B = new Float32Array(m)
  for (let p = 0, i = 0; p < m; p++, i += 4) {
    R[p] = d[i]
    G[p] = d[i + 1]
    B[p] = d[i + 2]
  }

  const sat = cfg.saturation
  for (let p = 0; p < m; p++) {
    const r = R[p]
    const g = G[p]
    const b = B[p]
    const gray = 0.299 * r + 0.587 * g + 0.114 * b
    R[p] = clamp(gray + (r - gray) * sat + 5 * cfg.warm)
    G[p] = clamp(gray + (g - gray) * sat + 2 * cfg.warm)
    B[p] = clamp(gray + (b - gray) * sat - 2 * cfg.warm)
  }

  const palette = kmeansPalette(R, G, B, sw, cfg.palette)
  const idxLut = paletteIndexLUT(palette)
  for (let p = 0, i = 0; p < m; p++, i += 4) {
    const c = palette[idxLut[lutKey(R[p], G[p], B[p])]]
    d[i] = c[0]
    d[i + 1] = c[1]
    d[i + 2] = c[2]
    d[i + 3] = 255
  }
  sctx.putImageData(image, 0, 0)

  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, out, out)
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(small, 0, 0, out, out)
  return canvas
}

/* ---------------- 高斯模糊 ---------------- */

function gaussBlur(src, size, sigma) {
  const radius = Math.min(6, Math.max(1, Math.ceil(sigma * 3)))
  const kernel = new Float32Array(radius * 2 + 1)
  let sum = 0
  for (let i = -radius; i <= radius; i++) {
    const w = Math.exp(-(i * i) / (2 * sigma * sigma))
    kernel[i + radius] = w
    sum += w
  }
  for (let i = 0; i < kernel.length; i++) kernel[i] /= sum

  const n = size * size
  const tmp = new Float32Array(n)
  for (let y = 0; y < size; y++) {
    const row = y * size
    for (let x = 0; x < size; x++) {
      let acc = 0
      for (let t = -radius; t <= radius; t++) {
        let xx = x + t
        if (xx < 0) xx = 0
        else if (xx >= size) xx = size - 1
        acc += src[row + xx] * kernel[t + radius]
      }
      tmp[row + x] = acc
    }
  }

  const out = new Float32Array(n)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let acc = 0
      for (let t = -radius; t <= radius; t++) {
        let yy = y + t
        if (yy < 0) yy = 0
        else if (yy >= size) yy = size - 1
        acc += tmp[yy * size + x] * kernel[t + radius]
      }
      out[y * size + x] = acc
    }
  }
  return out
}

/* ---------------- 小工具 ---------------- */

function clamp(v, min = 0, max = 255) {
  return v < min ? min : v > max ? max : v
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
