import { rasterOf } from '@/pixel/compose'
import { PALETTE } from '@/pixel/palette'
import { rasterize } from '@/pixel/raster'
import type { Hex, SpriteDef } from '@/pixel/types'

/** 셀 한 변 (dp). 캔버스 논리 크기 = cols*CELL+2 (1dp 테두리) */
export const CELL_SIZE = 16
export const BORDER = 1

/** 숫자 1~8 색 (docs/02 §2.1: 열린 셀 --bg-1 위 대비 4.4:1 이상) */
export const DIGIT_COLORS: readonly Hex[] = [
  PALETTE.blue,
  PALETTE.lime,
  PALETTE.red,
  PALETTE.purple,
  PALETTE.orange,
  PALETTE.teal,
  PALETTE['text-0'],
  PALETTE['line-1'],
]

const DIGIT_ROWS: readonly (readonly string[])[] = [
  ['..c..', '.cc..', '..c..', '..c..', '..c..', '..c..', '.ccc.'],
  ['.ccc.', 'c...c', '....c', '...c.', '..c..', '.c...', 'ccccc'],
  ['cccc.', '....c', '....c', '.ccc.', '....c', '....c', 'cccc.'],
  ['...c.', '..cc.', '.c.c.', 'c..c.', 'ccccc', '...c.', '...c.'],
  ['ccccc', 'c....', 'cccc.', '....c', '....c', 'c...c', '.ccc.'],
  ['.ccc.', 'c....', 'c....', 'cccc.', 'c...c', 'c...c', '.ccc.'],
  ['ccccc', '....c', '...c.', '..c..', '.c...', '.c...', '.c...'],
  ['.ccc.', 'c...c', 'c...c', '.ccc.', 'c...c', 'c...c', '.ccc.'],
]

/** 숫자 n(1~8)의 5×7 스프라이트 */
export const DIGITS: readonly SpriteDef[] = DIGIT_ROWS.map((rows, i) => ({
  id: `ms.digit.${i + 1}`,
  w: 5,
  h: 7,
  palette: { c: DIGIT_COLORS[i]! },
  rows,
}))

const MINE_ROWS = [
  '....k....',
  '.k..k..k.',
  '..kkkkk..',
  '.kkwkkkk.',
  'kkkkkkkkk',
  '.kkkkkkk.',
  '..kkkkk..',
  '.k..k..k.',
  '....k....',
]

/** 지뢰 9×9: 몸통 --line-1 + 하이라이트 --text-0 */
export const MINE: SpriteDef = {
  id: 'ms.mine',
  w: 9,
  h: 9,
  palette: { k: PALETTE['line-1'], w: PALETTE['text-0'] },
  rows: MINE_ROWS,
}

/** 밟은 지뢰: 잉크 몸통 (빨간 바탕 위) */
export const MINE_EXPLODED: SpriteDef = {
  id: 'ms.mine.exploded',
  w: 9,
  h: 9,
  palette: { k: PALETTE.ink, w: PALETTE['text-0'] },
  rows: MINE_ROWS,
}

/** 깃발 9×10: 빨간 천 + 밝은 깃대 */
export const FLAG: SpriteDef = {
  id: 'ms.flag',
  w: 9,
  h: 10,
  palette: { p: PALETTE['text-0'], f: PALETTE.red },
  rows: [
    '..p......',
    '..pff....',
    '..pffff..',
    '..pffffff',
    '..pffff..',
    '..pff....',
    '..p......',
    '..p......',
    '.ppp.....',
    'ppppp....',
  ],
}

/** 틀린 깃발 위에 긋는 X 9×9 */
export const CROSS: SpriteDef = {
  id: 'ms.cross',
  w: 9,
  h: 9,
  palette: { r: PALETTE.red },
  rows: [
    'r.......r',
    'rr.....rr',
    '.rr...rr.',
    '..rr.rr..',
    '...rrr...',
    '..rr.rr..',
    '.rr...rr.',
    'rr.....rr',
    'r.......r',
  ],
}

export interface CellSprites {
  digits: readonly HTMLCanvasElement[]
  mine: HTMLCanvasElement
  mineExploded: HTMLCanvasElement
  flag: HTMLCanvasElement
  cross: HTMLCanvasElement
}

/** 1× 캔버스로 래스터화 (논리 캔버스에 그대로 drawImage) */
export function buildCellSprites(): CellSprites {
  const one = (def: SpriteDef) => rasterize(rasterOf(def), 1)
  return {
    digits: DIGITS.map(one),
    mine: one(MINE),
    mineExploded: one(MINE_EXPLODED),
    flag: one(FLAG),
    cross: one(CROSS),
  }
}
