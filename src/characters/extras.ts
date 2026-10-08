import type { SpriteDef } from '@/pixel/types'

/** 부속 스프라이트 — 얼굴 밖에 붙는 땀/반짝이/생각 점 */

export const SWEAT: SpriteDef = {
  id: 'extra.sweat',
  w: 4,
  h: 6,
  palette: { b: '#6E9BFF', w: '$white' },
  rows: ['..b.', '..b.', '.bbb', 'bwbb', 'bbbb', '.bb.'],
}

export const SPARKLE_A: SpriteDef = {
  id: 'extra.sparkle.a',
  w: 5,
  h: 5,
  palette: { y: '#FFD166', w: '$white' },
  rows: ['..y..', '..y..', 'yywyy', '..y..', '..y..'],
}

export const SPARKLE_B: SpriteDef = {
  id: 'extra.sparkle.b',
  w: 5,
  h: 5,
  palette: { y: '#FFD166', w: '$white' },
  rows: ['.....', '.y.y.', '..w..', '.y.y.', '.....'],
}

const dots = (id: string, rows: readonly string[]): SpriteDef => ({
  id,
  w: 8,
  h: 2,
  palette: { w: '$white' },
  rows,
})

/** 생각 점 . / .. / ... */
export const DOTS: readonly SpriteDef[] = [
  dots('extra.dots.1', ['ww......', 'ww......']),
  dots('extra.dots.2', ['ww.ww...', 'ww.ww...']),
  dots('extra.dots.3', ['ww.ww.ww', 'ww.ww.ww']),
]
