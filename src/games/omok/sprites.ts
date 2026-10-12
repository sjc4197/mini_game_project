import { rasterOf } from '@/pixel/compose'
import { PALETTE } from '@/pixel/palette'
import { rasterize } from '@/pixel/raster'
import type { SpriteDef } from '@/pixel/types'

/** 돌 지름 (dp). 셀 16 안에 2dp 여백 */
export const STONE_SIZE = 12

/**
 * 12×12 둥근 돌. o = 테두리(림), k = 몸통, h = 하이라이트(좌상), s = 음영(우하).
 * 흑돌은 어두운 보드 위에서도 읽히도록 밝은 림 + 하이라이트, 백돌은 어두운 림 + 음영.
 */
const STONE_ROWS: readonly string[] = [
  '....oooo....',
  '..oohhkkoo..',
  '.ohhkkkkkko.',
  '.ohkkkkkkko.',
  'ohkkkkkkkkko',
  'okkkkkkkkkko',
  'okkkkkkkkkso',
  'okkkkkkkkkso',
  '.okkkkkkkso.',
  '.okkkkkksso.',
  '..ookksoo...',
  '....oooo....',
]

export const BLACK_STONE: SpriteDef = {
  id: 'omok.black',
  w: STONE_SIZE,
  h: STONE_SIZE,
  palette: { o: PALETTE['line-0'], k: PALETTE.ink, h: PALETTE['line-1'], s: PALETTE.ink },
  rows: STONE_ROWS,
}

export const WHITE_STONE: SpriteDef = {
  id: 'omok.white',
  w: STONE_SIZE,
  h: STONE_SIZE,
  palette: { o: PALETTE['line-1'], k: PALETTE['text-0'], h: PALETTE.white, s: PALETTE['text-1'] },
  rows: STONE_ROWS,
}

export interface StoneSprites {
  black: HTMLCanvasElement
  white: HTMLCanvasElement
}

/** 1× 캔버스로 래스터화 (논리 캔버스에 그대로 drawImage) */
export function buildStoneSprites(): StoneSprites {
  return {
    black: rasterize(rasterOf(BLACK_STONE), 1),
    white: rasterize(rasterOf(WHITE_STONE), 1),
  }
}
