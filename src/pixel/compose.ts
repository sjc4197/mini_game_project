import { NEUTRAL_ACCENT, PALETTE, type Accent } from './palette'
import type { Hex, Layer, PaletteRef, Point, Raster, SpriteDef } from './types'

export const TRANSPARENT = '.'
const MAX_COLORS = 255

/** $참조를 실제 hex 로. hex 는 대문자로 정규화해 같은 색이 중복 등록되지 않게 한다 */
export function resolveColor(value: Hex | PaletteRef, accent: Accent): string {
  switch (value) {
    case '$base':
      return accent.base.toUpperCase()
    case '$dark':
      return accent.dark.toUpperCase()
    case '$light':
      return accent.light.toUpperCase()
    case '$ink':
      return PALETTE.ink
    case '$white':
      return PALETTE.white
    default:
      return value.toUpperCase()
  }
}

/** 행 길이·팔레트 키 검증. 빈 배열이면 정상 */
export function validateSprite(def: SpriteDef): string[] {
  const errors: string[] = []
  if (def.rows.length !== def.h) {
    errors.push(`${def.id}: rows.length ${def.rows.length} != h ${def.h}`)
  }
  def.rows.forEach((row, y) => {
    if (row.length !== def.w) errors.push(`${def.id}: row ${y} length ${row.length} != w ${def.w}`)
    for (const ch of row) {
      if (ch !== TRANSPARENT && !(ch in def.palette)) {
        errors.push(`${def.id}: row ${y} unknown palette key '${ch}'`)
      }
    }
  })
  return errors
}

export function assertSprite(def: SpriteDef): SpriteDef {
  const errors = validateSprite(def)
  if (errors.length > 0) throw new Error(errors.join('\n'))
  return def
}

export function createRaster(key: string, w: number, h: number): Raster {
  return { key, w, h, data: new Uint8Array(w * h), colors: [] }
}

function colorIndex(raster: Raster, hex: string): number {
  const i = raster.colors.indexOf(hex)
  if (i >= 0) return i + 1
  if (raster.colors.length >= MAX_COLORS) throw new Error(`raster ${raster.key}: too many colors`)
  raster.colors.push(hex)
  return raster.colors.length
}

/** 스프라이트 한 장을 raster 에 그린다. 밖으로 나가는 부분은 잘린다 */
export function blit(
  raster: Raster,
  def: SpriteDef,
  at: Point,
  accent: Accent = NEUTRAL_ACCENT,
  clear = false,
): void {
  const lookup = new Map<string, number>()
  for (let y = 0; y < def.h; y++) {
    const ty = at.y + y
    if (ty < 0 || ty >= raster.h) continue
    const row = def.rows[y] ?? ''
    for (let x = 0; x < def.w; x++) {
      const tx = at.x + x
      if (tx < 0 || tx >= raster.w) continue
      const ch = row[x] ?? TRANSPARENT
      const idx = ty * raster.w + tx
      if (ch === TRANSPARENT) {
        if (clear) raster.data[idx] = 0
        continue
      }
      let ci = lookup.get(ch)
      if (ci === undefined) {
        const value = def.palette[ch]
        if (value === undefined) throw new Error(`${def.id}: unknown palette key '${ch}'`)
        ci = colorIndex(raster, resolveColor(value, accent))
        lookup.set(ch, ci)
      }
      raster.data[idx] = ci
    }
  }
}

export interface ComposeOptions {
  key: string
  w: number
  h: number
  layers: readonly Layer[]
  accent?: Accent
}

/** 레이어를 순서대로 합성한 새 raster */
export function compose({ key, w, h, layers, accent = NEUTRAL_ACCENT }: ComposeOptions): Raster {
  const raster = createRaster(key, w, h)
  for (const layer of layers) blit(raster, layer.sprite, layer.at, accent, layer.clear)
  return raster
}

/** 지정 행을 삭제하고 맨 위에 빈 행을 삽입 → 그 행 위쪽이 1dp 내려온다 (발은 고정: "숨쉬기") */
export function squash(raster: Raster, row: number, key = `${raster.key}~squash`): Raster {
  const { w, h } = raster
  const out = createRaster(key, w, h)
  out.colors = raster.colors.slice()
  const r = Math.min(Math.max(row, 0), h - 1)
  for (let y = 1; y < h; y++) {
    const srcY = y <= r ? y - 1 : y
    out.data.set(raster.data.subarray(srcY * w, srcY * w + w), y * w)
  }
  return out
}

/** 전체를 (dx, dy) 만큼 이동. 음수 = 왼쪽/위. 잘리는 부분은 버림 */
export function shift(raster: Raster, dx: number, dy: number, key = `${raster.key}~shift`): Raster {
  const { w, h } = raster
  const out = createRaster(key, w, h)
  out.colors = raster.colors.slice()
  for (let y = 0; y < h; y++) {
    const sy = y - dy
    if (sy < 0 || sy >= h) continue
    for (let x = 0; x < w; x++) {
      const sx = x - dx
      if (sx < 0 || sx >= w) continue
      out.data[y * w + x] = raster.data[sy * w + sx] ?? 0
    }
  }
  return out
}

/** 1dp 위로 띄우기 (호버 로봇 등) */
export const bob = (raster: Raster, key = `${raster.key}~bob`): Raster => shift(raster, 0, -1, key)

/** 디버그/테스트용: 색 → 문자 매핑으로 그리드 문자열 배열을 만든다 */
export function rasterToRows(raster: Raster, charFor: (hex: string) => string): string[] {
  const chars = raster.colors.map(charFor)
  const rows: string[] = []
  for (let y = 0; y < raster.h; y++) {
    let line = ''
    for (let x = 0; x < raster.w; x++) {
      const ci = raster.data[y * raster.w + x] ?? 0
      line += ci === 0 ? TRANSPARENT : (chars[ci - 1] ?? '?')
    }
    rows.push(line)
  }
  return rows
}

/** 단일 스프라이트를 그대로 raster 로 (갤러리 레이어 분해, 아이콘) */
export function rasterOf(
  def: SpriteDef,
  accent: Accent = NEUTRAL_ACCENT,
  key = `sprite:${def.id}`,
): Raster {
  return compose({ key, w: def.w, h: def.h, layers: [{ sprite: def, at: { x: 0, y: 0 } }], accent })
}
