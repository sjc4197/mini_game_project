import type { Point, SpriteDef } from '@/pixel/types'

/**
 * 오리지널 "앉은 정면 뚱냥이" 템플릿 (32×32). scratchpad 의 sit-apply.cjs 가
 * 머리 타원 + 몸 타원(허리 들어감) + 귀 + 앞발 + 곡선 꼬리를 수식으로 생성하고 외곽선을 자동 계산한 결과.
 * 네 고양이가 같은 격자를 쓰고 팔레트·무늬(paint)·포인트(paintRect)만 다르다.
 *   k 외곽선  r 털  t 꼬리 털  f 앞발 털  p 귀 속  (d 줄무늬, w 가슴 패치는 paint 로)
 */
export const CAT_ROWS: readonly string[] = [
  '................................',
  '................................',
  '........k..............k........',
  '.......krk............krk.......',
  '.......kprk.kkkkkkk..krpk.......',
  '......krpprkrrrrrrrkkrpprk......',
  '......krrrrrrrrrrrrrrrrrkk......',
  '.......krrrrrrrrrrrrrrrk........',
  '.......krrrrrrrrrrrrrrrk..kk....',
  '......krrrrrrrrrrrrrrrrrkkttkk..',
  '......krrrrrrrrrrrrrrrrrktttttk.',
  '......krrrrrrrrrrrrrrrrrkktttttk',
  '......krrrrrrrrrrrrrrrrrk.kktttk',
  '....kkkrrrrrrrrrrrrrrrrrkkk.kttk',
  '.......krrrrrrrrrrrrrrrk....kttk',
  '.....kkkrrrrrrrrrrrrrrrkkk..kttk',
  '........krrrrrrrrrrrrrk.....kttk',
  '.......krrrrrrrrrrrrrrrk....kttk',
  '......krrrrrrrrrrrrrrrrrk...kttk',
  '.....krrrrrrrrrrrrrrrrrrrk..kttk',
  '.....krrrrrrrrrrrrrrrrrrrk..kttk',
  '.....krrrrrrrrrrrrrrrrrrrk.ktttk',
  '.....krrrrrrrrrrrrrrrrrrrkkttttk',
  '.....krrrrrrrrrrrrrrrrrrrktttttk',
  '.....krrrrrrrrrrrrrrrrrrrkttttk.',
  '.....krrrrrrrrrrrrrrrrrrrkttkk..',
  '.....krrrrrrrrrrrrrrrrrrrkkk....',
  '......krrrrrrrrrrrrrrrrrkk......',
  '.......kkkkkkkkkkkkkkkkk........',
  '..........kffk....kffk..........',
  '..........kffk....kffk..........',
  '..........kkkk....kkkk..........',
]

/** 얼굴 타일(16×6)·땀·반짝·생각 점의 기준점 (몸통 좌표) */
export const CAT_POINTS: Readonly<Record<'face' | 'side' | 'head' | 'think', Point>> = {
  face: { x: 7, y: 11 },
  side: { x: 26, y: 3 },
  head: { x: 1, y: 1 },
  think: { x: 22, y: -3 },
}

export type Pixel = [x: number, y: number, ch: string]

/** 태비 줄무늬: 이마 3 + 옆구리 좌우 2씩 + 꼬리 고리 2 */
export const TABBY_STRIPES: readonly Pixel[] = [
  [13, 6, 'd'],
  [13, 7, 'd'],
  [15, 6, 'd'],
  [15, 7, 'd'],
  [17, 6, 'd'],
  [17, 7, 'd'],
  [6, 21, 'd'],
  [7, 21, 'd'],
  [8, 21, 'd'],
  [6, 24, 'd'],
  [7, 24, 'd'],
  [8, 24, 'd'],
  [22, 21, 'd'],
  [23, 21, 'd'],
  [24, 21, 'd'],
  [22, 24, 'd'],
  [23, 24, 'd'],
  [24, 24, 'd'],
  [29, 15, 'd'],
  [30, 15, 'd'],
  [29, 19, 'd'],
  [30, 19, 'd'],
]

/** 가슴 패치 (둥근 흰 털) */
export const CHEST: readonly Pixel[] = [
  [13, 18, 'w'],
  [14, 18, 'w'],
  [15, 18, 'w'],
  [16, 18, 'w'],
  [17, 18, 'w'],
  [12, 19, 'w'],
  [13, 19, 'w'],
  [14, 19, 'w'],
  [15, 19, 'w'],
  [16, 19, 'w'],
  [17, 19, 'w'],
  [18, 19, 'w'],
  [11, 20, 'w'],
  [12, 20, 'w'],
  [13, 20, 'w'],
  [14, 20, 'w'],
  [15, 20, 'w'],
  [16, 20, 'w'],
  [17, 20, 'w'],
  [18, 20, 'w'],
  [19, 20, 'w'],
  [11, 21, 'w'],
  [12, 21, 'w'],
  [13, 21, 'w'],
  [14, 21, 'w'],
  [15, 21, 'w'],
  [16, 21, 'w'],
  [17, 21, 'w'],
  [18, 21, 'w'],
  [19, 21, 'w'],
  [11, 22, 'w'],
  [12, 22, 'w'],
  [13, 22, 'w'],
  [14, 22, 'w'],
  [15, 22, 'w'],
  [16, 22, 'w'],
  [17, 22, 'w'],
  [18, 22, 'w'],
  [19, 22, 'w'],
  [11, 23, 'w'],
  [12, 23, 'w'],
  [13, 23, 'w'],
  [14, 23, 'w'],
  [15, 23, 'w'],
  [16, 23, 'w'],
  [17, 23, 'w'],
  [18, 23, 'w'],
  [19, 23, 'w'],
  [11, 24, 'w'],
  [12, 24, 'w'],
  [13, 24, 'w'],
  [14, 24, 'w'],
  [15, 24, 'w'],
  [16, 24, 'w'],
  [17, 24, 'w'],
  [18, 24, 'w'],
  [19, 24, 'w'],
  [12, 25, 'w'],
  [13, 25, 'w'],
  [14, 25, 'w'],
  [15, 25, 'w'],
  [16, 25, 'w'],
  [17, 25, 'w'],
  [18, 25, 'w'],
  [13, 26, 'w'],
  [14, 26, 'w'],
  [15, 26, 'w'],
  [16, 26, 'w'],
  [17, 26, 'w'],
]

/** 특정 칸의 글자를 바꾼 새 행 배열 */
export function paint(rows: readonly string[], pixels: readonly Pixel[]): string[] {
  const out = rows.map((r) => r.split(''))
  for (const [x, y, ch] of pixels) {
    const row = out[y]
    if (row && x >= 0 && x < row.length && row[x] !== '.' && row[x] !== 'k') row[x] = ch
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

export function catBody(
  id: string,
  palette: SpriteDef['palette'],
  edit: (rows: readonly string[]) => readonly string[] = (r) => r,
): SpriteDef & { points: typeof CAT_POINTS } {
  return { id, w: 32, h: 32, palette, points: CAT_POINTS, rows: edit(CAT_ROWS) }
}
