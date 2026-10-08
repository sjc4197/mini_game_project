import type { SpriteDef } from '@/pixel/types'
import type { FaceKey } from './types'

/**
 * 공용 얼굴 타일 16×6 — 머리 아래쪽에 놓인다. 작은 점 눈(2×2) 두 개를 멀리, 가운데 작은 ω 입, 눈 바깥 볼터치.
 * e 눈, k 입, p 볼, b 눈물, y 별 눈. 눈·입 색은 캐릭터가 팔레트로 바꿀 수 있다(샴).
 */
export const FACE_PALETTE = {
  e: '$ink',
  k: '$ink',
  p: '#FF9DA6',
  b: '#6E9BFF',
  y: '#FFD166',
} as const

const face = (key: FaceKey, rows: readonly string[]): SpriteDef => ({
  id: `face.${key}`,
  w: 16,
  h: 6,
  palette: FACE_PALETTE,
  rows,
})

export const FACES: Readonly<Record<FaceKey, SpriteDef>> = {
  idle: face('idle', [
    '................',
    '...ee......ee...',
    'pp.ee......ee.pp',
    '......k.k.k.....',
    '.......k.k......',
    '................',
  ]),
  blink: face('blink', [
    '................',
    '................',
    'pp.ee......ee.pp',
    '......k.k.k.....',
    '.......k.k......',
    '................',
  ]),
  happy: face('happy', [
    '....e......e....',
    '...e.e....e.e...',
    'pp............pp',
    '......k.k.k.....',
    '.......k.k......',
    '................',
  ]),
  worried: face('worried', [
    '................',
    '...ee......ee...',
    'pp.ee......ee.pp',
    '......kk.kk.....',
    '........k.......',
    '................',
  ]),
  sad: face('sad', [
    '................',
    '...ee......ee...',
    '...ee......ee...',
    '...b..kkk..b....',
    '...b.k...k.b....',
    '................',
  ]),
  win: face('win', [
    '....y......y....',
    '...yyy....yyy...',
    'pp..y......y..pp',
    '......kkkk......',
    '......kkkk......',
    '................',
  ]),
  think: face('think', [
    '....ee......ee..',
    '....ee......ee..',
    'pp............pp',
    '................',
    '.......kk.......',
    '................',
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

/** 눈·입 색만 바꾼 얼굴 세트 (샴의 파란 눈 등) */
export function recolorFaces(
  prefix: string,
  overrides: Partial<Record<string, string>>,
): Record<FaceKey, SpriteDef> {
  const out = {} as Record<FaceKey, SpriteDef>
  for (const key of FACE_KEYS) {
    const f = FACES[key]
    out[key] = {
      ...f,
      id: `${prefix}.${f.id}`,
      palette: { ...f.palette, ...overrides } as SpriteDef['palette'],
    }
  }
  return out
}
