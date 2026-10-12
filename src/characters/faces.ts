import type { SpriteDef } from '@/pixel/types'
import type { FaceKey } from './types'

/**
 * 공용 얼굴 타일 15×9 — 몸통의 CAT_POINTS.face(눈 윗줄 한 칸 위)에 놓인다.
 * 도안 그대로: 왼쪽 눈 4×4 + 오른쪽 눈 3×4(3/4 시점), 왼쪽 위 흰 점, 분홍 코 3+1, ω 입.
 * e 눈, w 눈 하이라이트, k 입, p 코, b 눈물, y 별 눈. 캐릭터는 recolorFaces 로 색만 바꾼다.
 */
export const FACE_PALETTE = {
  e: '#340C04',
  k: '#340C04',
  w: '#FFFFFF',
  p: '#FA9B78',
  b: '#6E9BFF',
  y: '#FFD166',
} as const

const face = (key: FaceKey, rows: readonly string[]): SpriteDef => ({
  id: `face.${key}`,
  w: 15,
  h: 9,
  palette: FACE_PALETTE,
  rows,
})

export const FACES: Readonly<Record<FaceKey, SpriteDef>> = {
  idle: face('idle', [
    '...............',
    '.eeee......eee.',
    '.ewee......ewe.',
    '.eeee......eee.',
    '.eeee......eee.',
    '.......ppp.....',
    '........p......',
    '.....k..k..k...',
    '......kk.kk....',
  ]),
  blink: face('blink', [
    '...............',
    '...............',
    '...............',
    '.eeee......eee.',
    '...............',
    '.......ppp.....',
    '........p......',
    '.....k..k..k...',
    '......kk.kk....',
  ]),
  happy: face('happy', [
    '...............',
    '...............',
    '..ee........e..',
    '.e..e......e.e.',
    '...............',
    '.......ppp.....',
    '........p......',
    '.....k..k..k...',
    '......kk.kk....',
  ]),
  worried: face('worried', [
    '...............',
    '..eee......ee..',
    '.eeee......ewe.',
    '.ewee......eee.',
    '.eeee......eee.',
    '.......ppp.....',
    '........p......',
    '......k.k.k....',
    '.......k.k.....',
  ]),
  sad: face('sad', [
    '...............',
    '.eee........ee.',
    '.eeee......eee.',
    '.ewee......ewe.',
    '.eeee......eee.',
    '.b.....ppp.....',
    '........p......',
    '......kk.kk....',
    '.....k..k..k...',
  ]),
  win: face('win', [
    '...............',
    '..y.........y..',
    '.yyy.......yyy.',
    '..y.........y..',
    '...............',
    '.......ppp.....',
    '........p......',
    '.....k.....k...',
    '......kkkkk....',
  ]),
  think: face('think', [
    '.eeee......eee.',
    '.ewee......ewe.',
    '.eeee......eee.',
    '.eeee......eee.',
    '...............',
    '.......ppp.....',
    '........p......',
    '......kkk......',
    '...............',
  ]),
}

export const FACE_KEYS: readonly FaceKey[] = [
  'idle',
  'blink',
  'happy',
  'worried',
  'sad',
  'win',
  'think',
]

/** 공용 타일의 색만 바꾼 캐릭터 전용 세트 (외곽선·눈·코 색을 몸통 팔레트에 맞출 때) */
export function recolorFaces(
  prefix: string,
  overrides: Partial<Record<keyof typeof FACE_PALETTE, `#${string}`>>,
): Partial<Record<FaceKey, SpriteDef>> {
  const out: Partial<Record<FaceKey, SpriteDef>> = {}
  for (const key of FACE_KEYS) {
    const base = FACES[key]
    out[key] = { ...base, id: `${prefix}.face.${key}`, palette: { ...base.palette, ...overrides } }
  }
  return out
}
