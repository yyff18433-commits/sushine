/**
 * 图片文件读取工具。
 *
 * 为什么要压缩：blob URL 刷新就失效（存不住），原图几 MB 会撑爆 localStorage。
 * 上限给到 1280，是因为贴纸画布按 800 出图 —— 源图再小就白瞎了。
 */
const MAX_MB = 15

export function fileToDataURL(file, max = 1280, quality = 0.92) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        const ctx = canvas.getContext('2d')
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.onerror = () => resolve('')
      img.src = reader.result
    }
    reader.onerror = () => resolve('')
    reader.readAsDataURL(file)
  })
}

/**
 * 带校验的版本：给上传入口用，返回 { ok, url } 或 { ok:false, message }。
 * 校验收在这里，免得每个入口各写一遍提示文案。
 */
export async function readImageFile(file, { max = 1280, maxMB = MAX_MB } = {}) {
  if (!file) return { ok: false, message: '没有拿到文件' }

  if (file.type && !file.type.startsWith('image/')) {
    return { ok: false, message: '这个格式不支持，换 jpg / png / webp 吧' }
  }
  if (file.size > maxMB * 1024 * 1024) {
    return { ok: false, message: `图有点大，换张 ${maxMB}MB 以内的` }
  }

  const url = await fileToDataURL(file, max)
  if (!url) return { ok: false, message: '这张图读不出来，换一张试试' }
  return { ok: true, url }
}

/** 从粘贴板 / 拖拽的 DataTransfer 里捞第一张图片 */
export function firstImageFile(list) {
  return Array.from(list || []).find((f) => f.type && f.type.startsWith('image/')) || null
}
