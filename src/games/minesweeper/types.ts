import type { Rng } from '@/lib/rng'

/** 칸 상태 (enum 금지 → as const) */
export const CELL = { Hidden: 0, Revealed: 1, Flagged: 2, WrongFlag: 3 } as const
export type CellState = (typeof CELL)[keyof typeof CELL]

export type MsStatus = 'ready' | 'playing' | 'won' | 'lost'

export interface MsDifficulty {
  id: string
  label: string
  description: string
  cols: number
  rows: number
  mines: number
}

export const MS_DIFFICULTIES: readonly MsDifficulty[] = [
  { id: 'easy', label: '초급', description: '9×9 · 지뢰 10', cols: 9, rows: 9, mines: 10 },
  { id: 'normal', label: '중급', description: '16×16 · 지뢰 40', cols: 16, rows: 16, mines: 40 },
  { id: 'hard', label: '고급', description: '30×16 · 지뢰 99', cols: 30, rows: 16, mines: 99 },
]

/** 보드 모델 — 전부 typed array, 인덱스 = y * cols + x */
export interface MsBoard {
  readonly cols: number
  readonly rows: number
  /** 실제 배치된 지뢰 수 (폴백으로 줄어들 수 있음) */
  mineCount: number
  readonly mines: Uint8Array
  readonly counts: Uint8Array
  readonly state: Uint8Array
  status: MsStatus
  /** 열린 안전 칸 수 */
  revealed: number
  flags: number
  /** 밟은 지뢰 인덱스, 없으면 -1 */
  exploded: number
  elapsedMs: number
  readonly rng: Rng
  /** flood fill 스택 (1회 할당) */
  readonly scratch: Int32Array
}

/** 로직이 돌려주는 의미 이벤트 — index.ts 가 효과음/마스코트/HUD 로 매핑 */
export type MsEvent =
  | { type: 'start' }
  | { type: 'reveal'; count: number }
  | { type: 'flag'; on: boolean }
  | { type: 'invalid' }
  | { type: 'won' }
  | { type: 'lost'; index: number }
