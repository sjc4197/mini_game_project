import type { Rng } from '@/lib/rng'
import {
  COLS,
  DIR_VECTORS,
  FOOD_SCORE,
  MIN_TICK_MS,
  OPPOSITE,
  QUEUE_MAX,
  ROWS,
  SNAKE_SPEEDS,
  SPEEDUP_EVERY,
  SPEEDUP_MS,
  START_LENGTH,
  type Dir,
  type SnakeEvent,
  type SnakeSpeed,
  type SnakeState,
} from './types'

/**
 * 스네이크 순수 로직. 틱마다 한 칸 전진, 벽·몸에 닿으면 죽음, 먹이를 먹으면 +1 성장.
 * 'ready' 상태에서는 첫 방향 입력이 들어올 때까지 움직이지 않는다. 난수는 주입(결정적 테스트).
 */

export interface SnakeOptions {
  cols?: number
  rows?: number
  speed?: SnakeSpeed
  rng: Rng
}

export const indexOf = (s: Pick<SnakeState, 'cols'>, x: number, y: number): number => y * s.cols + x
export const xyOf = (s: Pick<SnakeState, 'cols'>, i: number): [x: number, y: number] => [
  i % s.cols,
  Math.floor(i / s.cols),
]

export function createGame(o: SnakeOptions): SnakeState {
  const cols = o.cols ?? COLS
  const rows = o.rows ?? ROWS
  const speed = o.speed ?? SNAKE_SPEEDS[1]!
  const hx = Math.floor(cols / 2)
  const hy = Math.floor(rows / 2)
  const body: number[] = []
  for (let i = 0; i < Math.min(START_LENGTH, hx + 1); i++) body.push(indexOf({ cols }, hx - i, hy))
  const s: SnakeState = {
    cols,
    rows,
    body,
    dir: 'right',
    queue: [],
    food: -1,
    score: 0,
    eaten: 0,
    grow: 0,
    tickMs: speed.tickMs,
    acc: 0,
    elapsedMs: 0,
    status: 'ready',
    cause: null,
    mult: speed.mult,
  }
  s.food = pickFood(s, o.rng)
  return s
}

/** 몸이 없는 셀 목록 */
export function emptyCells(s: Pick<SnakeState, 'cols' | 'rows' | 'body'>): number[] {
  const mask = new Uint8Array(s.cols * s.rows)
  for (const i of s.body) mask[i] = 1
  const out: number[] = []
  for (let i = 0; i < mask.length; i++) if (!mask[i]) out.push(i)
  return out
}

/** 빈 셀 중 무작위 하나 (없으면 -1) */
export function pickFood(s: Pick<SnakeState, 'cols' | 'rows' | 'body'>, rng: Rng): number {
  const empty = emptyCells(s)
  if (empty.length === 0) return -1
  return empty[Math.floor(rng() * empty.length)]!
}

/**
 * 방향 입력. 같은 방향·마지막 예약 방향의 반대(180°)·버퍼 초과는 무시.
 * ready 상태에서 유효한 입력이 들어오면 게임 시작.
 */
export function turn(s: SnakeState, dir: Dir): SnakeEvent[] {
  if (s.status !== 'ready' && s.status !== 'playing') return []
  const last = s.queue.length > 0 ? s.queue[s.queue.length - 1]! : s.dir
  if (dir === last || dir === OPPOSITE[last] || s.queue.length >= QUEUE_MAX) return []
  const ev: SnakeEvent[] = []
  s.queue.push(dir)
  ev.push({ type: 'turn', dir })
  if (s.status === 'ready') {
    s.status = 'playing'
    ev.push({ type: 'start' })
  }
  return ev
}

/** 한 칸 전진 */
export function step(s: SnakeState, rng: Rng): SnakeEvent[] {
  if (s.status !== 'playing') return []
  const ev: SnakeEvent[] = []
  const next = s.queue.shift()
  if (next) s.dir = next
  const [dx, dy] = DIR_VECTORS[s.dir]
  const head = s.body[0]!
  const [hx, hy] = xyOf(s, head)
  const nx = hx + dx
  const ny = hy + dy
  if (nx < 0 || ny < 0 || nx >= s.cols || ny >= s.rows) {
    s.status = 'dead'
    s.cause = 'wall'
    ev.push({ type: 'die', cause: 'wall' })
    return ev
  }
  const nh = indexOf(s, nx, ny)
  // 꼬리는 이번 틱에 비켜나므로(성장 중이 아니면) 꼬리 칸으로 들어가는 건 허용
  const tailMoves = s.grow === 0
  const limit = tailMoves ? s.body.length - 1 : s.body.length
  for (let i = 0; i < limit; i++) {
    if (s.body[i] === nh) {
      s.status = 'dead'
      s.cause = 'self'
      ev.push({ type: 'die', cause: 'self' })
      return ev
    }
  }
  s.body.unshift(nh)
  if (s.grow > 0) s.grow--
  else s.body.pop()
  ev.push({ type: 'move', head: nh })

  if (nh === s.food) {
    s.grow++
    s.eaten++
    s.score += FOOD_SCORE * s.mult
    ev.push({ type: 'eat', food: nh, score: s.score, length: s.body.length + s.grow })
    if (s.eaten % SPEEDUP_EVERY === 0 && s.tickMs > MIN_TICK_MS) {
      s.tickMs = Math.max(MIN_TICK_MS, s.tickMs - SPEEDUP_MS)
      ev.push({ type: 'speedup', tickMs: s.tickMs })
    }
    if (s.body.length + s.grow >= s.cols * s.rows) {
      s.status = 'won'
      s.food = -1
      ev.push({ type: 'win' })
      return ev
    }
    s.food = pickFood(s, rng)
  }
  return ev
}

/** 시간 누적 → 틱 간격마다 전진. playing 이 아니면 아무것도 하지 않는다 */
export function tick(s: SnakeState, dt: number, rng: Rng): SnakeEvent[] {
  if (s.status !== 'playing') return []
  s.elapsedMs += dt
  s.acc += dt
  const ev: SnakeEvent[] = []
  while (s.acc >= s.tickMs && s.status === 'playing') {
    s.acc -= s.tickMs
    ev.push(...step(s, rng))
  }
  return ev
}
