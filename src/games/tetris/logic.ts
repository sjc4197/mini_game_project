import type { Rng } from '@/lib/rng'
import { createDas, dasStep } from './das'
import { PIECE_INDEX, cellsOf, rotateCcw, rotateCw } from './pieces'
import {
  CLEAR_TOTAL_MS,
  HARD_DROP_POINTS,
  LOCK_DELAY_MS,
  LOCK_RESET_MAX,
  SOFT_DROP_MULT,
  SOFT_DROP_POINTS,
  comboPoints,
  gravitySecPerRow,
  isDifficult,
  levelFor,
  linePoints,
} from './scoring'
import { kicksFor } from './srs'
import {
  COLS,
  HIDDEN_ROWS,
  NEXT_COUNT,
  NO_INPUT,
  PIECE_TYPES,
  ROWS,
  SPAWN_X,
  SPAWN_Y,
  type ActivePiece,
  type DasSettings,
  type PieceType,
  type Rotation,
  type StepInput,
  type TetrisEvent,
  type TetrisState,
} from './types'

/**
 * 테트리스 순수 로직 (모던 가이드라인). 호스트/렌더를 모른다.
 * step(dt, input) 이 중력·락 딜레이·DAS·클리어 연출 타이밍을 전부 누산기로 돌리므로 pause 하면 자동으로 멈춘다.
 */

export interface CreateOptions {
  startLevel: number
  rng: Rng
  das: DasSettings
  /** 테스트용 고정 조각 순서 */
  sequence?: PieceType[]
}

export function createGame(o: CreateOptions): TetrisState {
  const s: TetrisState = {
    board: new Uint8Array(ROWS * COLS),
    active: null,
    hold: null,
    holdUsed: false,
    queue: [],
    bag: [],
    sequence: o.sequence ? o.sequence.slice() : [],
    rng: o.rng,
    phase: 'ready',
    startLevel: o.startLevel,
    level: o.startLevel,
    lines: 0,
    score: 0,
    combo: -1,
    b2b: false,
    gravityAcc: 0,
    lockTimer: 0,
    lockResets: 0,
    lowestY: 0,
    grounded: false,
    clearing: null,
    das: createDas(),
    dasSettings: o.das,
    stats: { pieces: 0, tetrises: 0, maxCombo: 0 },
    elapsedMs: 0,
    overReason: null,
  }
  refillQueue(s)
  return s
}

// ---- 조각 공급 ----

function nextFromBag(s: TetrisState): PieceType {
  if (s.sequence.length > 0) return s.sequence.shift()!
  if (s.bag.length === 0) {
    s.bag = PIECE_TYPES.slice()
    for (let i = s.bag.length - 1; i > 0; i--) {
      const j = Math.floor(s.rng() * (i + 1))
      const t = s.bag[i]!
      s.bag[i] = s.bag[j]!
      s.bag[j] = t
    }
  }
  return s.bag.pop()!
}

export function refillQueue(s: TetrisState): void {
  while (s.queue.length < NEXT_COUNT) s.queue.push(nextFromBag(s))
}

// ---- 충돌/이동 ----

export const cellAt = (s: Pick<TetrisState, 'board'>, x: number, y: number): number =>
  s.board[y * COLS + x] ?? 0

export function collides(
  s: Pick<TetrisState, 'board'>,
  type: PieceType,
  rot: Rotation,
  x: number,
  y: number,
): boolean {
  for (const [dx, dy] of cellsOf(type, rot)) {
    const cx = x + dx
    const cy = y + dy
    if (cx < 0 || cx >= COLS || cy < 0 || cy >= ROWS) return true
    if (s.board[cy * COLS + cx]) return true
  }
  return false
}

const canMove = (s: TetrisState, p: ActivePiece, dx: number, dy: number): boolean =>
  !collides(s, p.type, p.rot, p.x + dx, p.y + dy)

/** 착지 상태에서 성공한 이동/회전 → 락 타이머 리셋 (최대 LOCK_RESET_MAX) */
function onSuccessfulShift(s: TetrisState): void {
  if (s.grounded && s.lockResets < LOCK_RESET_MAX) {
    s.lockTimer = 0
    s.lockResets++
  }
}

export function tryMove(s: TetrisState, dx: number, dy: number): boolean {
  const p = s.active
  if (!p || s.phase !== 'falling') return false
  if (!canMove(s, p, dx, dy)) return false
  p.x += dx
  p.y += dy
  if (dx !== 0) onSuccessfulShift(s)
  return true
}

export function tryRotate(s: TetrisState, dir: 1 | -1): boolean {
  const p = s.active
  if (!p || s.phase !== 'falling') return false
  const to = dir === 1 ? rotateCw(p.rot) : rotateCcw(p.rot)
  for (const [kx, ky] of kicksFor(p.type, p.rot, to)) {
    if (!collides(s, p.type, to, p.x + kx, p.y + ky)) {
      p.rot = to
      p.x += kx
      p.y += ky
      onSuccessfulShift(s)
      return true
    }
  }
  return false
}

export function ghostY(s: TetrisState): number {
  const p = s.active
  if (!p) return 0
  let y = p.y
  while (!collides(s, p.type, p.rot, p.x, y + 1)) y++
  return y
}

// ---- 스폰/홀드/락 ----

function spawn(s: TetrisState, type: PieceType, ev: TetrisEvent[]): void {
  const p: ActivePiece = { type, rot: 0, x: SPAWN_X, y: SPAWN_Y }
  if (collides(s, p.type, p.rot, p.x, p.y)) {
    s.active = p
    s.phase = 'over'
    s.overReason = 'blockout'
    ev.push({ type: 'over', reason: 'blockout' })
    return
  }
  if (!collides(s, p.type, p.rot, p.x, p.y + 1)) p.y += 1 // 스폰 드롭
  s.active = p
  s.phase = 'falling'
  s.lockTimer = 0
  s.lockResets = 0
  s.lowestY = p.y
  s.gravityAcc = 0
  s.grounded = false
  s.stats.pieces++
  ev.push({ type: 'spawn', piece: type })
}

function spawnNext(s: TetrisState, ev: TetrisEvent[]): void {
  const type = s.queue.shift() ?? nextFromBag(s)
  refillQueue(s)
  s.holdUsed = false
  spawn(s, type, ev)
}

export function start(s: TetrisState): TetrisEvent[] {
  const ev: TetrisEvent[] = []
  if (s.phase !== 'ready') return ev
  spawnNext(s, ev)
  return ev
}

export function holdPiece(s: TetrisState): TetrisEvent[] {
  const ev: TetrisEvent[] = []
  const p = s.active
  if (!p || s.phase !== 'falling') return ev
  if (s.holdUsed) {
    ev.push({ type: 'holdDenied' })
    return ev
  }
  const held = s.hold
  s.hold = p.type
  ev.push({ type: 'hold' })
  if (held === null) spawnNext(s, ev)
  else spawn(s, held, ev)
  s.holdUsed = true
  return ev
}

function lockPiece(s: TetrisState, ev: TetrisEvent[]): void {
  const p = s.active
  if (!p) return
  let allHidden = true
  for (const [dx, dy] of cellsOf(p.type, p.rot)) {
    const cy = p.y + dy
    if (cy >= HIDDEN_ROWS) allHidden = false
    s.board[cy * COLS + p.x + dx] = PIECE_INDEX[p.type]
  }
  ev.push({ type: 'lock' })
  s.active = null
  if (allHidden) {
    s.phase = 'over'
    s.overReason = 'lockout'
    ev.push({ type: 'over', reason: 'lockout' })
    return
  }
  // 가득 찬 행
  const rows: number[] = []
  for (let y = 0; y < ROWS; y++) {
    let full = true
    for (let x = 0; x < COLS; x++) {
      if (!s.board[y * COLS + x]) {
        full = false
        break
      }
    }
    if (full) rows.push(y)
  }
  if (rows.length === 0) {
    s.combo = -1
    spawnNext(s, ev)
    return
  }
  const n = rows.length
  const levelBefore = s.level
  s.combo++
  if (s.combo > s.stats.maxCombo) s.stats.maxCombo = s.combo
  const difficult = isDifficult(n)
  const points = linePoints(n, levelBefore, difficult && s.b2b) + comboPoints(s.combo, levelBefore)
  const b2bApplied = difficult && s.b2b
  s.b2b = difficult
  if (difficult) s.stats.tetrises++
  s.score += points
  s.lines += n
  ev.push({ type: 'clear', lines: n, rows, tetris: difficult, b2b: b2bApplied, combo: s.combo, points })
  const newLevel = levelFor(s.startLevel, s.lines)
  if (newLevel > s.level) {
    s.level = newLevel
    ev.push({ type: 'levelup', level: newLevel })
  }
  s.phase = 'clearing'
  s.clearing = { rows, t: 0 }
}

/** 클리어 연출이 끝나면 행을 지우고 내린다 */
function collapse(s: TetrisState, ev: TetrisEvent[]): void {
  const rows = s.clearing?.rows ?? []
  s.clearing = null
  if (rows.length > 0) {
    const remove = new Set(rows)
    let write = ROWS - 1
    for (let read = ROWS - 1; read >= 0; read--) {
      if (remove.has(read)) continue
      if (write !== read) s.board.copyWithin(write * COLS, read * COLS, read * COLS + COLS)
      write--
    }
    for (let y = write; y >= 0; y--) s.board.fill(0, y * COLS, y * COLS + COLS)
  }
  ev.push({ type: 'collapse' })
  spawnNext(s, ev)
}

export function hardDrop(s: TetrisState): TetrisEvent[] {
  const ev: TetrisEvent[] = []
  const p = s.active
  if (!p || s.phase !== 'falling') return ev
  const gy = ghostY(s)
  const rows = gy - p.y
  p.y = gy
  s.score += rows * HARD_DROP_POINTS
  ev.push({ type: 'harddrop', rows })
  lockPiece(s, ev)
  return ev
}

// ---- 프레임 ----

export function step(s: TetrisState, dt: number, input: StepInput = NO_INPUT): TetrisEvent[] {
  const ev: TetrisEvent[] = []
  if (s.phase === 'ready' || s.phase === 'over') return ev
  s.elapsedMs += dt

  if (s.phase === 'clearing' && s.clearing) {
    s.clearing.t += dt
    if (s.clearing.t >= CLEAR_TOTAL_MS) collapse(s, ev)
    return ev
  }
  const p = s.active
  if (!p) return ev

  // 1) 홀드 / 회전 (엣지)
  if (input.hold) {
    ev.push(...holdPiece(s))
    if (s.phase !== 'falling') return ev
  }
  if (input.rotateCw && tryRotate(s, 1)) ev.push({ type: 'rotate' })
  else if (input.rotateCcw && tryRotate(s, -1)) ev.push({ type: 'rotate' })

  // 2) 좌우 (DAS/ARR)
  const das = dasStep(s.das, dt, input.left, input.right, input.prefer, s.dasSettings)
  if (das.dir !== 0) {
    let moved = 0
    const limit = das.toWall ? COLS : das.moves
    for (let i = 0; i < limit; i++) {
      if (!tryMove(s, das.dir, 0)) break
      moved++
    }
    if (moved > 0) ev.push({ type: 'move' })
  }

  // 3) 하드 드롭
  if (input.hardDrop) {
    ev.push(...hardDrop(s))
    return ev
  }

  // 4) 중력 (소프트 드롭 ×20)
  const active = s.active
  if (!active) return ev
  s.gravityAcc += ((dt / 1000) * (input.soft ? SOFT_DROP_MULT : 1)) / gravitySecPerRow(s.level)
  let rows = Math.floor(s.gravityAcc)
  s.gravityAcc -= rows
  let dropped = 0
  while (rows-- > 0) {
    if (!tryMove(s, 0, 1)) {
      s.gravityAcc = 0
      break
    }
    dropped++
  }
  if (dropped > 0 && input.soft) {
    s.score += dropped * SOFT_DROP_POINTS
    ev.push({ type: 'softdrop', rows: dropped })
  }
  if (active.y > s.lowestY) {
    s.lowestY = active.y
    s.lockResets = 0
  }

  // 5) 락 딜레이
  s.grounded = !canMove(s, active, 0, 1)
  if (s.grounded) {
    s.lockTimer += dt
    if (s.lockTimer >= LOCK_DELAY_MS) lockPiece(s, ev)
  } else {
    s.lockTimer = 0
  }
  return ev
}

/** 보드 상태 스냅샷 (테스트/디버그) */
export function snapshot(s: TetrisState): string {
  const lines: string[] = []
  for (let y = 0; y < ROWS; y++) {
    let line = ''
    for (let x = 0; x < COLS; x++) line += s.board[y * COLS + x] ? '#' : '.'
    lines.push(line)
  }
  return lines.join('\n')
}
