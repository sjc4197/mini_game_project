export const SIZE = 15

/** 교차점 값 (enum 금지 → as const) */
export const STONE = { Empty: 0, Black: 1, White: 2 } as const
export type Stone = (typeof STONE)[keyof typeof STONE]
export type Player = 1 | 2

export type OmokStatus = 'playing' | 'won' | 'draw'

export interface OmokMode {
  id: string
  label: string
  description: string
  /** null = 2인 대전, 아니면 컴퓨터 레벨 */
  ai: 'easy' | 'hard' | null
}

export const OMOK_MODES: readonly OmokMode[] = [
  { id: 'pvp', label: '2인 대전', description: '한 화면에서 번갈아', ai: null },
  { id: 'easy', label: '컴퓨터 · 쉬움', description: '내가 흑(선공)', ai: 'easy' },
  { id: 'hard', label: '컴퓨터 · 어려움', description: '내가 흑(선공)', ai: 'hard' },
]

export interface OmokBoard {
  readonly size: number
  /** size*size, 인덱스 = y*size + x */
  readonly cells: Uint8Array
  turn: Player
  moves: number
  status: OmokStatus
  winner: Stone
  /** 승리한 돌들의 인덱스 (5개 이상) */
  winLine: number[]
  lastMove: number
  history: number[]
}

export type OmokEvent =
  | { type: 'place'; index: number; stone: Player }
  | { type: 'win'; stone: Player; line: number[] }
  | { type: 'draw' }
  | { type: 'invalid' }
