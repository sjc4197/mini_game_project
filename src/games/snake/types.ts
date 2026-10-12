export const COLS = 20
export const ROWS = 14
export const START_LENGTH = 3
/** 입력 버퍼 길이 */
export const QUEUE_MAX = 2
/** 먹이 하나 점수 (× 속도 배수) */
export const FOOD_SCORE = 10
/** 먹이 SPEEDUP_EVERY 개마다 틱 SPEEDUP_MS 감소, MIN_TICK_MS 까지 */
export const SPEEDUP_EVERY = 5
export const SPEEDUP_MS = 6
export const MIN_TICK_MS = 60

export type Dir = 'up' | 'down' | 'left' | 'right'

export const DIR_VECTORS: Readonly<Record<Dir, readonly [dx: number, dy: number]>> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
}

export const OPPOSITE: Readonly<Record<Dir, Dir>> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
}

export interface SnakeSpeed {
  id: string
  label: string
  description: string
  /** 한 칸 전진 간격 (ms) */
  tickMs: number
  /** 점수 배수 */
  mult: number
}

export const SNAKE_SPEEDS: readonly SnakeSpeed[] = [
  { id: 'slow', label: '느긋', description: '천천히 · 점수 ×1', tickMs: 180, mult: 1 },
  { id: 'normal', label: '보통', description: '점수 ×2', tickMs: 130, mult: 2 },
  { id: 'fast', label: '빠름', description: '쌩쌩 · 점수 ×3', tickMs: 90, mult: 3 },
]

export type SnakeStatus = 'ready' | 'playing' | 'dead' | 'won'

export interface SnakeState {
  readonly cols: number
  readonly rows: number
  /** 머리부터 꼬리 순 셀 인덱스 (index = y*cols + x) */
  body: number[]
  /** 현재 진행 방향 */
  dir: Dir
  /** 버퍼된 방향 입력 (최대 QUEUE_MAX) */
  queue: Dir[]
  /** 먹이 셀, 없으면 -1 */
  food: number
  score: number
  eaten: number
  /** 남은 성장 칸 수 (먹은 직후 1) */
  grow: number
  tickMs: number
  /** 다음 전진까지 누적 ms */
  acc: number
  elapsedMs: number
  status: SnakeStatus
  /** 죽은 원인 */
  cause: 'wall' | 'self' | null
  readonly mult: number
}

export type SnakeEvent =
  | { type: 'start' }
  | { type: 'turn'; dir: Dir }
  | { type: 'move'; head: number }
  | { type: 'eat'; food: number; score: number; length: number }
  | { type: 'speedup'; tickMs: number }
  | { type: 'die'; cause: 'wall' | 'self' }
  | { type: 'win' }
