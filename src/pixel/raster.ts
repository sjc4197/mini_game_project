import type { Raster } from './types'

/**
 * Raster → 캔버스. 1× ImageData 를 만든 뒤 정수 배율로 확대(imageSmoothingEnabled=false).
 * 캐시는 raster 객체 기준(WeakMap)이라 accent 가 바뀌어 다시 compose 되면 자동으로 새 항목이 된다.
 * scale 은 "디바이스 픽셀" 기준 정수 (PixelSprite 가 scaleU × uDevice 로 넘긴다).
 */
const canvasCache = new WeakMap<Raster, Map<number, HTMLCanvasElement>>()
const urlCache = new WeakMap<Raster, Map<number, string>>()

/** '#RRGGBB' 또는 '#RRGGBBAA' → [r, g, b, a(0..255)] */
export function hexToRgba(hex: string): [number, number, number, number] {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.replace(/./g, (c) => c + c) : h.padEnd(8, 'F'), 16)
  if (h.length <= 6) {
    const v = parseInt(h.length === 3 ? h.replace(/./g, (c) => c + c) : h, 16)
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255, 255]
  }
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]
}

function paint1x(raster: Raster): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = raster.w
  canvas.height = raster.h
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  const img = ctx.createImageData(raster.w, raster.h)
  const rgba = raster.colors.map(hexToRgba)
  const px = img.data
  for (let i = 0; i < raster.data.length; i++) {
    const ci = raster.data[i] ?? 0
    if (ci === 0) continue
    const c = rgba[ci - 1]
    if (!c) continue
    const o = i * 4
    px[o] = c[0]
    px[o + 1] = c[1]
    px[o + 2] = c[2]
    px[o + 3] = c[3]
  }
  ctx.putImageData(img, 0, 0)
  return canvas
}

export function rasterize(raster: Raster, scale: number): HTMLCanvasElement {
  const s = Math.max(1, Math.round(scale))
  let byScale = canvasCache.get(raster)
  if (!byScale) {
    byScale = new Map()
    canvasCache.set(raster, byScale)
  }
  const hit = byScale.get(s)
  if (hit) return hit
  let base = byScale.get(1)
  if (!base) {
    base = paint1x(raster)
    byScale.set(1, base)
  }
  if (s === 1) return base
  const canvas = document.createElement('canvas')
  canvas.width = raster.w * s
  canvas.height = raster.h * s
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(base, 0, 0, canvas.width, canvas.height)
  }
  byScale.set(s, canvas)
  return canvas
}

/** <img src> / CSS url() 용 데이터 URL (정적 아이콘·9-slice) */
export function rasterDataUrl(raster: Raster, scale: number): string {
  const s = Math.max(1, Math.round(scale))
  let byScale = urlCache.get(raster)
  if (!byScale) {
    byScale = new Map()
    urlCache.set(raster, byScale)
  }
  const hit = byScale.get(s)
  if (hit) return hit
  const url = rasterize(raster, s).toDataURL()
  byScale.set(s, url)
  return url
}
