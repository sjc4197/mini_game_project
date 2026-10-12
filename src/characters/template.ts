import type { Point, SpriteDef } from '@/pixel/types'

/**
 * 공용 고양이 몸통 42×39 — 사용자 도안(docs/art/cat-design-walk.png 가운데 고양이, 걷는 포즈)을
 * 11.74px 격자로 샘플링한 뒤 손으로 정리한 것.
 * k 외곽선, r 털, d 진한 줄무늬·턱 아래 그림자, c 크림(입가·가슴·발·꼬리 끝), p 분홍(귀 안).
 * 눈·코·입은 비워 두고 faces.ts 의 15×9 타일을 CAT_POINTS.face 에 얹는다.
 */
export const CAT_ROWS: readonly string[] = [
  '...................kk...............kkk...',
  '..................krrk.............krrrk..',
  '.................kddrrkk..........krrdddk.',
  '.................kdpdrrrk........krrrdpdk.',
  '.................kdppdrrrkkkkkkkkdrrdppdk.',
  '.................kdpppdrrkddrdddrdkddppdk.',
  '..kkkk...........kdppppdrrddrrddrddrdppdk.',
  '.kcccck..........kdpppdrrrrddrdddrdrrdpdk.',
  'kcccccck.........kdppdrrrrrrddrddrdrrrddk.',
  'kcccccrrk........kdddrrrrrrrddrrdrdrrrrk..',
  'kccccrrdk........kddrrrrrrrrrdrrdrrrrrrk..',
  '.kccrrdddk.......krrrrrrrrrrrrrrrrrrrrrrk.',
  '..krrddddk.......krrrrrrrrrrrrrrrrrrrrrrk.',
  '...kddddrk.......kddrrrrrrrrrrrrrrrrrrrrdk',
  '...kddrrrk.......krrddrrrrrrrrrrrrrrrrrddk',
  '...kdrrrrk.......kdddddrrrrrrrrrrrrrrrrddk',
  '...krrrdk........kddrrrrrrrrrrccccrrrrrrrk',
  '...kddddk........krrrrrdrrrrccccccccrrrddk',
  '...kddddk........kdddddrrrccccccccccccrrdk',
  '....kddrrk.kkkkkkkkdddrrrccccccccccccccrk.',
  '....krrrdkkddrrddrkdrrrccccccccccccccccdk.',
  '.....krddddddrdddrdkddrrccccccccccccccdk..',
  '.....kdddrddrrddrrddkkddcccccccccccccdk...',
  '......kddrddrrddrrddrdkkddcccccccccdkk....',
  '.......krrddrrddrrddrrrddddddddddkkk......',
  '.......krrrdrrddrrrdrrrrrrdddddddk........',
  '.......krrrrrrrdrrrrrrrrrrrrrcccck........',
  '.......kdrrrrrrrrrrrrrrrrrrrccccrk........',
  '.......kdddrrrrrrrrrrrrrrrrrcccckk........',
  '.......krdddrrrdrrrrrdrrrrrrccckdkk.......',
  '......kddrrdddrdcccccdrrddrdcckdddk.......',
  '......krddrrrrkccccccdrdddddkkdrdrkk......',
  '.....krrrdddrkkkkkkkkkdrrrrk.kdrrrrk......',
  '.....krrrrddk.kdddk..kdrdddk..kdrrrck.....',
  '.....kcrrdrk..kdddk..kdrrrrk...krccck.....',
  '.....kcccck....kccck..krrrrk....kccck.....',
  '.....kcccck....kccck..kcccck.....kkk......',
  '......kkkk......kkk...kcccck..............',
  '.......................kkkk...............',
]

export const CAT_POINTS: Readonly<Record<'face' | 'side' | 'head' | 'think', Point>> = {
  face: { x: 24, y: 12 }, // 얼굴 타일 15×9: 눈 윗줄 한 칸 위
  side: { x: 13, y: 8 }, // 땀방울 4×6: 머리 왼쪽 빈 공간
  head: { x: 27, y: -3 }, // 반짝이 5×5: 두 귀 사이 위
  think: { x: 34, y: -3 }, // 생각 점 8×2: 오른쪽 귀 위
}

export type Pixel = [x: number, y: number, ch: string]

/** 지정 픽셀만 바꾼 새 행 배열. 투명('.')과 외곽선('k')은 건드리지 않는다 */
export function paint(rows: readonly string[], pixels: readonly Pixel[]): string[] {
  const out = rows.map((r) => r.split(''))
  for (const [x, y, ch] of pixels) {
    const row = out[y]
    if (!row) continue
    const cur = row[x]
    if (cur === undefined || cur === '.' || cur === 'k') continue
    row[x] = ch
  }
  return out.map((r) => r.join(''))
}

/** 사각형(양 끝 포함) 안에서 from 에 든 글자를 to 로 */
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
      s += x >= x0 && x <= x1 && from.includes(ch) ? to : ch
    }
    return s
  })
}

/** 모든 행에서 글자 치환 (예: 줄무늬 'd' → 털 'r') */
export function replaceAll(rows: readonly string[], from: string, to: string): string[] {
  return rows.map((r) => r.replaceAll(from, to))
}

/** 턱 아래 그림자 두 줄 — 줄무늬('d')를 지운 고양이(우유·샴)가 그림자만 's' 로 되살릴 때 */
export function chinShadow(rows: readonly string[]): string[] {
  return paintRect(paintRect(rows, 23, 24, 32, 24, 'r', 's'), 26, 25, 32, 25, 'r', 's')
}

/** 공용 몸통에 캐릭터 팔레트(+선택적 행 편집)를 붙인 SpriteDef */
export function catBody(
  id: string,
  palette: SpriteDef['palette'],
  edit: (rows: readonly string[]) => readonly string[] = (r) => r,
): SpriteDef & { points: typeof CAT_POINTS } {
  return { id, w: 42, h: 39, rows: edit(CAT_ROWS), palette, points: CAT_POINTS }
}

/**
 * 식빵 자세 46×34 — 사용자 도안(docs/art/cat-design-loaf.png)을 8.25px 격자로 샘플링 → 3×3 최빈값 필터 → 손질.
 * 추가 키 b = 빵 크러스트(오른쪽 어두운 면). 줄무늬 d 와 분리해 두어 우유/샴은 줄무늬만 지우고 크러스트 음영은 남긴다.
 * 얼굴은 비워 두고 정면용 대칭 타일(faces.ts LOAF_FACES 17×9)을 LOAF_POINTS.face 에 얹는다. 김(STEAM)은 LOAF_POINTS.steam 위치.
 */
export const LOAF_ROWS: readonly string[] = [
  '.......................kkkkkkkk...............',
  '...................kkkkrrrrrrddkkkk...........',
  '...............kkkkdddddddrrrrdddrkkk.........',
  '..kkk.......kkkrrrrrkkrrdddddrrrrddrrk........',
  '.krrrkk..kkkrrrrrddkrrkrrrrddddrrrdrrrk.......',
  '.krppdrkkrrrrrrrrdkrdrkdrrrrrdddrrrrrrdk......',
  '.krpppdrkrrrrrrrrkrdpddkddrrrrddrrrrrrddk.....',
  '.krpppdrkkkkkkkkkrdppddkdddrrrrrrrrrrrbbbk....',
  '.krpprrrddrddrddkrdpppdkrddrrrrrrrrrrrbbbk....',
  '.krdrrrrddrddrddrrdpppdkrrrrrrrrrrrrbbbbbk....',
  '.kdrrrrrddrddrddccrddddkrrrrrrrrrrbbbbbbbk....',
  '.krccrrrddrddrddcccrrddkrrrrrrrrbbbbbbbbk.....',
  '.kcccrrrrrrddrrrrrcccrdkrrrrrrbbbbbbbbbbk.....',
  '.kccrrrrrrrrrrrrrrrcccrkbbbbbbbbbbbbbbbbk.....',
  '.krrrrrrrrrrrrrrrrrcccrkbbbbbbbbbbbbbbbbk.....',
  '.krrrrrrrrrrrrrrrrrrccckbbbbbbbbbbbbbbbbkk....',
  '.krrrrrrrrrrrrrrrrrrccckbbbbbbbbbbbbbbbbkddk..',
  '.kdrrrrrrrrrrrrrrrrrrcrkbbbbbbbbbbbbbbbbkdddk.',
  '.kdrrrrrrrrrrrrrrrrrrrdkbbbbbbbbbbbbbbbbkdddk.',
  '.kdrrrrrcccccrrrrrrrrrdkbbbbbbbbdkkkddddkddddk',
  '.krrrrcccccccccrrrrrrddkbbbbbbbbkcccddddkkddrk',
  '.krrrcccccccccccrrrrdddkbbbbbbbbkccckdddkkdddk',
  '.krrccccccccccccccrrdddkbbbbbbbbkcccckdddrrddk',
  '.krcccccccccccccccrrrddkbbbbbbbbkcccrdddddrddk',
  '.krcccccccccccccccccccckbbbbbbbbkcrrddrrddddk.',
  '.krcccccccccccccccccccckbbbbbbbbdkddddrrddddk.',
  '.krcccccccccccccccccccckbbbbbbbbddkdddddddkk..',
  '.krcccccccccccccccccccckbbbbbbbbddkkkkkkkk....',
  '.krcccccccccccccccccccckbbbbbbbbkk............',
  '.krcckkkkkcckkkkkcccccckbbbbbbkk..............',
  '..krkrrrrrkkrrrrrkccccckbbbbkk................',
  '...kkccccckkccccckccccbkkkk...................',
  '....kckckckkckckckcccckk......................',
  '.....kkkkkkkkkkkkkkkkkk.......................',
]

export const LOAF_POINTS: Readonly<Record<'face' | 'steam', Point>> = {
  face: { x: 4, y: 15 }, // 정면 얼굴 타일 17×9 (머리 중심 col 12 기준 대칭)
  steam: { x: 17, y: -7 },
}

/** 식빵 자세 SpriteDef (팔레트는 몸통과 공유, b 키 필요) */
export function catLoaf(
  id: string,
  palette: SpriteDef['palette'],
  edit: (rows: readonly string[]) => readonly string[] = (r) => r,
): SpriteDef & { points: typeof LOAF_POINTS } {
  return { id, w: 46, h: 34, rows: edit(LOAF_ROWS), palette, points: LOAF_POINTS }
}
