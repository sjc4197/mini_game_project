import { rasterOf } from '@/pixel/compose'
import { PALETTE } from '@/pixel/palette'
import { rasterize } from '@/pixel/raster'
import type { SpriteDef } from '@/pixel/types'

/** 먹이: 츄르 8×8 (빨간 뚜껑 + 크림 봉지 + 주황 띠) */
export const FOOD: SpriteDef = {
  id: 'snake.food',
  w: 8,
  h: 8,
  palette: { k: PALETTE.ink, r: PALETTE.red, y: '#FFE9A8', o: PALETTE.orange, w: PALETTE.white },
  rows: [
    '..kkkk..',
    '..krrk..',
    '..kwyk..',
    '.kyyyyk.',
    '.kyooyk.',
    '.kyyyyk.',
    '.kyyyyk.',
    '..kkkk..',
  ],
}

export interface SnakeSprites {
  food: HTMLCanvasElement
}

/** 1× 캔버스로 래스터화 */
export function buildSnakeSprites(): SnakeSprites {
  return { food: rasterize(rasterOf(FOOD), 1) }
}
