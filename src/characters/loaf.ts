import type { Point, SpriteDef } from '@/pixel/types'

/**
 * 식빵 자세 고양이 템플릿 (32×24). 사용자가 준 레퍼런스(주황 식빵 고양이 픽셀아트, 36×24 격자)를
 * 그대로 읽어 들여 32×24 로 옮기고, 얼굴(눈 2·입 3·볼 2 픽셀)만 떼어내 표정 타일로 분리한 것.
 * 네 고양이가 같은 격자를 쓰고 팔레트(k 외곽선, r 털, d 줄무늬/귀 안쪽)와 포인트만 다르다.
 */
export const LOAF_ROWS: readonly string[] = [
  '................................',
  '......k.......k.................',
  '.....krk.....krk................',
  '.....krdk...kdrk................',
  '.....krdkkkkkdrk.........kkk....',
  '....krrrddrdrrrdk.......kdrk....',
  '....krrrrrrrrrrrk.......krdk....',
  '...krrrrrrrrrrrrdkkkkk...krk....',
  '...krrrrrrrrrrrrrdrdrdk..kdk....',
  '...krrrrrrrrrrrrrdrdrdrkkkrk....',
  '...krrrrrrrrrrrrrrrrrrrrkrk.....',
  '...krrrrrrrrrrrrrrrrrrrrkrk.....',
  '...krrrrrrrrrrrrrrrrrrrrrk......',
  '...kdrrrrrrrrrrrrrrrrrrrrk......',
  '...kdrrrrrrrrrrrrrrrrrrrrk......',
  '...kdrrrrrrrrrrrrrrrrrrrrk......',
  '...kdrrrrrrrrrrrrrrrrrrrdk......',
  '....kdrrrrrrrrrrrrrrrrrdk.......',
  '.....kdrrrrrrrrrrrrrrrdk........',
  '......kdrrrrdrrrdrddrdk.........',
  '.......krkkrkkkkkdkkdk..........',
  '.......kk..kk...kk..kk..........',
  '................................',
  '................................',
]

/** 얼굴 타일(12×4)·땀·반짝·생각 점의 기준점 (몸통 좌표) */
export const LOAF_POINTS: Readonly<Record<'face' | 'side' | 'head' | 'think', Point>> = {
  face: { x: 5, y: 6 },
  side: { x: 16, y: 0 },
  head: { x: 0, y: -2 },
  think: { x: 16, y: -5 },
}

export type Pixel = [x: number, y: number, ch: string]

/** 특정 칸의 글자를 바꾼 새 행 배열 */
export function paint(rows: readonly string[], pixels: readonly Pixel[]): string[] {
  const out = rows.map((r) => r.split(''))
  for (const [x, y, ch] of pixels) {
    const row = out[y]
    if (row && x >= 0 && x < row.length) row[x] = ch
  }
  return out.map((r) => r.join(''))
}

/** 사각 영역 안에서 from 글자를 to 로 (포인트 칠하기) */
export function paintRect(
  rows: readonly string[],
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  from: string,
  to: string,
): string[] {
  return rows.map((row, y) => {
    if (y < y0 || y > y1) return row
    let s = ''
    for (let x = 0; x < row.length; x++) {
      const ch = row[x] ?? '.'
      s += x >= x0 && x <= x1 && ch === from ? to : ch
    }
    return s
  })
}

export function loafBody(
  id: string,
  palette: SpriteDef['palette'],
  edit: (rows: readonly string[]) => readonly string[] = (r) => r,
): SpriteDef & { points: typeof LOAF_POINTS } {
  return { id, w: 32, h: 24, palette, points: LOAF_POINTS, rows: edit(LOAF_ROWS) }
}
