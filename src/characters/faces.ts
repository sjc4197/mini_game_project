import type { SpriteDef } from '@/pixel/types'
import type { FaceKey } from './types'

/**
 * 공용 얼굴 타일 12×4 — 레퍼런스 고양이의 얼굴 배치 그대로: 눈 1픽셀 두 개(멀리), 가운데 작은 ω 입(3픽셀), 눈 바깥 아래 볼터치 1픽셀.
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
  w: 12,
  h: 4,
  palette: FACE_PALETTE,
  rows,
})

export const FACES: Readonly<Record<FaceKey, SpriteDef>> = {
  idle: face('idle', ['............', '..e..k..e...', '.p..k.k..p..', '............']),
  blink: face('blink', ['............', '.ee..k..ee..', '.p..k.k..p..', '............']),
  happy: face('happy', ['..e.....e...', '.e.e.k.e.e..', '.p..k.k..p..', '............']),
  worried: face('worried', ['............', '..e.k.k.e...', '.p...k...p..', '............']),
  sad: face('sad', ['............', '..e.k.k.e...', '..b..k..b...', '..b.....b...']),
  win: face('win', ['..y.....y...', '.yyy...yyy..', '..y.kkk.y...', '.....k......']),
  think: face('think', ['...e.....e..', '............', '.p...k...p..', '............']),
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
