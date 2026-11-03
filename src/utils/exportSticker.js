/**
 * 把一张食物贴纸导出成 PNG。
 * 小红书评论区明确有人在问「单独的贴纸能不能下载」，官方做不到 —— 这里补上。
 * 纯 Canvas 合成，不依赖任何库，也不上传服务器。
 */
export async function exportStickerPNG({ src, name, note, fileName }) {
  const img = await loadImage(src)

  const W = 560
  const H = 720

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  // 1. 纸底
  ctx.fillStyle = '#FBF6EE'
  ctx.fillRect(0, 0, W, H)

  // 2. 贴纸：保持模切轮廓完整，不裁切
  const maxW = W - 90
  const maxH = 470
  const scale = Math.min(maxW / img.width, maxH / img.height)
  const dw = img.width * scale
  const dh = img.height * scale
  const dx = (W - dw) / 2
  const dy = 44 + (maxH - dh) / 2

  ctx.save()
  ctx.shadowColor = 'rgba(140, 105, 75, 0.22)'
  ctx.shadowBlur = 22
  ctx.shadowOffsetY = 10
  ctx.drawImage(img, dx, dy, dw, dh)
  ctx.restore()

  // 3. 名称
  const font = '"PingFang SC", "Microsoft YaHei", system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#3D332B'
  ctx.font = `600 40px ${font}`
  ctx.fillText(truncate(name || '这一餐', 12), W / 2, 580)

  // 4. 备注（有才画，一行）
  if (note) {
    ctx.fillStyle = '#A99C8D'
    ctx.font = `400 21px ${font}`
    ctx.fillText(truncate(note, 22), W / 2, 626)
  }

  // 5. 水印
  ctx.fillStyle = 'rgba(169, 156, 141, 0.85)'
  ctx.font = `500 17px ${font}`
  ctx.fillText('Sushine · 认真记录每一餐', W / 2, note ? 672 : 640)

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
  download(blob, fileName || `sushine-sticker-${Date.now()}.png`)
}

function truncate(text, max) {
  const s = String(text).trim()
  return s.length > max ? `${s.slice(0, max)}…` : s
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function download(blob, fileName) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
