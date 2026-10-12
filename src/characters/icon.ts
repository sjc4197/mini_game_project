import type { Hex, PaletteRef, SpriteDef } from '@/pixel/types'
import type { CharacterDef } from './types'

/** 기록표/목록용 12×11 미니 얼굴 — 캐릭터 팔레트(외곽선·털·눈·코)만 바꿔 쓴다 */
const ICON_ROWS: readonly string[] = [
  'kk........kk',
  'krk......krk',
  'krrk....krrk',
  'krdrkkkkrdrk',
  'krrrrrrrrrrk',
  'krerrrrrrerk',
  'krerrrrrrerk',
  'krrrrrpprrrk',
  'krrrrrrrrrrk',
  '.krrrrrrrrk.',
  '..kkkkkkkk..',
]

const cache = new Map<string, SpriteDef>()

export function characterIcon(c: CharacterDef): SpriteDef {
  const hit = cache.get(c.id)
  if (hit) return hit
  const body = c.body.palette
  const face = c.faces?.idle?.palette
  const pick = (key: string, fallback: Hex | PaletteRef): Hex | PaletteRef => body[key] ?? fallback
  const def: SpriteDef = {
    id: `${c.id}.icon`,
    w: 12,
    h: 11,
    palette: {
      k: pick('k', '$ink'),
      r: pick('r', '$base'),
      d: pick('d', pick('r', '$base')),
      e: face?.e ?? '#340C04',
      p: pick('p', '#FA9B78'),
    },
    rows: ICON_ROWS,
  }
  cache.set(c.id, def)
  return def
}
