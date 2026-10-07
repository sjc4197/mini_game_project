/**
 * 엔진 검증용 샘플 — 펑이(체리폭탄) 초안. docs/02-design-system.md B6 의 실증 스프라이트.
 * 3단계에서 characters/ 로 옮기며 귀여움 기준(볼터치·눈 하이라이트)을 반영해 다듬는다.
 */
import { compose, squash } from './compose'
import type { Accent } from './palette'
import type { Clip, Point, SpriteDef } from './types'

/** 몸통 24×24 가 놓이는 32×32 스테이지 — 머리 위 8dp, 좌우 4dp 가 반짝이/땀/생각 점 공간 */
export const STAGE = { w: 32, h: 32, bodyAt: { x: 4, y: 8 } as Point } as const

export const SAMPLE_BODY: SpriteDef = {
  id: 'sample.peong.body',
  w: 24,
  h: 24,
  palette: {
    k: '$ink', // 외곽선
    r: '$base', // 몸통
    d: '$dark', // 음영
    h: '$light', // 하이라이트
    c: '#7C88B8', // 뚜껑
    t: '#B4BDDC', // 심지
    s: '#FFD166', // 불꽃
    o: '#FFA94D', // 불꽃 중심
  },
  points: {
    face: { x: 6, y: 12 },
    side: { x: 19, y: 7 },
    head: { x: 2, y: -4 },
    think: { x: -3, y: -2 },
  },
  rows: [
    '................s.......',
    '...............sos......',
    '...............ts.......',
    '.............tt.........',
    '............t...........',
    '..........kkkk..........',
    '.........kcccck.........',
    '.........kcccck.........',
    '.........kkkkkk.........',
    '.......kkhhrrrrkk.......',
    '......krhhrrrrrrrk......',
    '.....krhhrrrrrrrrrk.....',
    '.....krrrrrrrrrrrrk.....',
    '....krrrrrrrrrrrrrrk....',
    '....krrrrrrrrrrrrrdk....',
    '....krrrrrrrrrrrrrdk....',
    '....krrrrrrrrrrrrrdk....',
    '....krrrrrrrrrrrrrdk....',
    '....krrrrrrrrrrrrrdk....',
    '.....krrrrrrrrrrddk.....',
    '.....krrrrrrrrrdddk.....',
    '......krrrrrrddddk......',
    '.......kkddddddkk.......',
    '.........kkkkkk.........',
  ],
}

/** 몸통 좌표 기준 squash 행 (배 부근) */
export const SAMPLE_SQUASH_ROW = 16

export const SAMPLE_FACE_IDLE: SpriteDef = {
  id: 'sample.face.idle',
  w: 12,
  h: 8,
  palette: { w: '$white', k: '$ink' },
  rows: [
    '..ww....ww..',
    '.wwww..wwww.',
    '.wkkw..wkkw.',
    '.wkkw..wkkw.',
    '..ww....ww..',
    '............',
    '...k....k...',
    '....kkkk....',
  ],
}

export const SAMPLE_FACE_WORRIED: SpriteDef = {
  id: 'sample.face.worried',
  w: 12,
  h: 8,
  palette: { w: '$white', k: '$ink' },
  rows: [
    '............',
    '.wwww..wwww.',
    '.kkww..kkww.',
    '.kkww..kkww.',
    '..ww....ww..',
    '............',
    '...kk..kk...',
    '.....kk.....',
  ],
}

export const SAMPLE_SWEAT: SpriteDef = {
  id: 'sample.extra.sweat',
  w: 4,
  h: 6,
  palette: { b: '#6E9BFF', w: '$white' },
  rows: ['..b.', '..b.', '.bbb', 'bwbb', 'bbbb', '.bb.'],
}

/** 테스트/갤러리 덤프용: hex → 문자 (몸통/얼굴/땀 팔레트의 역매핑) */
export function sampleCharFor(accent: Accent): (hex: string) => string {
  const map: Record<string, string> = {
    '#0D1020': 'k',
    [accent.base.toUpperCase()]: 'r',
    [accent.dark.toUpperCase()]: 'd',
    [accent.light.toUpperCase()]: 'h',
    '#7C88B8': 'c',
    '#B4BDDC': 't',
    '#FFD166': 's',
    '#FFA94D': 'o',
    '#FFFFFF': 'w',
    '#6E9BFF': 'b',
  }
  return (hex) => map[hex] ?? '?'
}

const onStage = (p: Point): Point => ({ x: STAGE.bodyAt.x + p.x, y: STAGE.bodyAt.y + p.y })

export type SampleMood = 'idle' | 'worried'

/** 스테이지 합성 + squash 프레임으로 2프레임 클립 2종 */
export function buildSampleClips(accent: Accent): Record<SampleMood, Clip> {
  const face = SAMPLE_BODY.points!.face!
  const side = SAMPLE_BODY.points!.side!
  const squashRow = STAGE.bodyAt.y + SAMPLE_SQUASH_ROW
  const base = { w: STAGE.w, h: STAGE.h, accent }

  const idleA = compose({
    ...base,
    key: 'sample:idle:0',
    layers: [
      { sprite: SAMPLE_BODY, at: STAGE.bodyAt },
      { sprite: SAMPLE_FACE_IDLE, at: onStage(face) },
    ],
  })
  const worriedA = compose({
    ...base,
    key: 'sample:worried:0',
    layers: [
      { sprite: SAMPLE_BODY, at: STAGE.bodyAt },
      { sprite: SAMPLE_FACE_WORRIED, at: onStage(face) },
      { sprite: SAMPLE_SWEAT, at: onStage(side) },
    ],
  })
  return {
    idle: {
      id: 'sample:idle',
      frames: [idleA, squash(idleA, squashRow, 'sample:idle:1')],
      fps: 2,
      loop: true,
    },
    worried: {
      id: 'sample:worried',
      frames: [worriedA, squash(worriedA, squashRow, 'sample:worried:1')],
      fps: 3,
      loop: true,
    },
  }
}
