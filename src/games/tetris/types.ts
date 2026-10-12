import type { Rng } from '@/lib/rng'

export const PIECE_TYPES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'] as const
export type PieceType = (typeof PIECE_TYPES)[number]
export type Rotation = 0 | 1 | 2 | 3

export const COLS = 10
export const VISIBLE_ROWS = 20
export const HIDDEN_ROWS = 4
export const ROWS = VISIBLE_ROWS + HIDDEN_ROWS
/** 스폰 위치 (바운딩 박스 좌상단, 숨김 행 안) */
export const SPAWN_X = 3
export const SPAWN_Y = 2
export const NEXT_COUNT = 5

export interface ActivePiece {
  type: PieceType
  rot: Rotation
  x: number
  y: number
}

export type Phase = 'ready' | 'falling' | 'clearing' | 'over'

export interface TetrisDifficulty {
  id: string
  label: string
  description: string
  startLevel: number
}

export const TETRIS_DIFFICULTIES: readonly TetrisDifficulty[] = [
  { id: 'lv1', label: '레벨 1', description: '천천히 시작', startLevel: 1 },
  { id: 'lv5', label: '레벨 5', description: '보통 속도', startLevel: 5 },
  { id: 'lv10', label: '레벨 10', description: '빠르게 시작', startLevel: 10 },
]

export interface DasSettings {
  das: number
  arr: number
}

export interface DasState {
  dir: -1 | 0 | 1
  timer: number
  charged: boolean
  arrAcc: number
}

export interface TetrisStats {
  pieces: number
  tetrises: number
  maxCombo: number
}

export interface TetrisState {
  /** ROWS*COLS, 0 = 빈 칸, n = PIECE_TYPES[n-1] */
  readonly board: Uint8Array
  active: ActivePiece | null
  hold: PieceType | null
  holdUsed: boolean
  queue: PieceType[]
  bag: PieceType[]
  /** 테스트용 고정 순서 (비면 7-bag) */
  sequence: PieceType[]
  readonly rng: Rng
  phase: Phase
  readonly startLevel: number
  level: number
  lines: number
  score: number
  /** 연속 클리어 수 (-1 = 없음) */
  combo: number
  b2b: boolean
  gravityAcc: number
  lockTimer: number
  lockResets: number
  lowestY: number
  grounded: boolean
  clearing: { rows: number[]; t: number } | null
  das: DasState
  readonly dasSettings: DasSettings
  stats: TetrisStats
  elapsedMs: number
  overReason: 'blockout' | 'lockout' | null
}

/** 프레임 입력: 눌림(held)과 이번 프레임의 새 입력(press) */
export interface StepInput {
  left: boolean
  right: boolean
  soft: boolean
  /** 좌우 동시 입력 시 우선할 방향 (나중에 누른 쪽), 없으면 0 */
  prefer: -1 | 0 | 1
  rotateCw: boolean
  rotateCcw: boolean
  hardDrop: boolean
  hold: boolean
}

export const NO_INPUT: StepInput = {
  left: false,
  right: false,
  soft: false,
  prefer: 0,
  rotateCw: false,
  rotateCcw: false,
  hardDrop: false,
  hold: false,
}

export type TetrisEvent =
  | { type: 'spawn'; piece: PieceType }
  | { type: 'move' }
  | { type: 'rotate' }
  | { type: 'softdrop'; rows: number }
  | { type: 'harddrop'; rows: number }
  | { type: 'lock' }
  | { type: 'hold' }
  | { type: 'holdDenied' }
  | {
      type: 'clear'
      lines: number
      rows: number[]
      tetris: boolean
      b2b: boolean
      combo: number
      points: number
    }
  | { type: 'levelup'; level: number }
  | { type: 'collapse' }
  | { type: 'over'; reason: 'blockout' | 'lockout' }
