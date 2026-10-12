import type { Rng } from '@/lib/rng'
import { CELL, type MsBoard, type MsDifficulty, type MsEvent } from './types'

/**
 * 지뢰찾기 순수 로직. 호스트/렌더를 모른다. 보드는 제자리에서 바뀌고 각 동작은 이벤트 배열을 돌려준다.
 * 규칙: 첫 클릭 뒤 배치(클릭 칸 + 3×3 제외 → 첫 클릭은 항상 0칸), 우클릭 = 깃발 토글, 코드 = 깃발 수 일치 시 나머지 열기,
 * 승리 = 안전 칸 전부(남은 지뢰 자동 깃발), 패배 = 지뢰 전부 표시 + 틀린 깃발.
 */

export function createBoard(d: Pick<MsDifficulty, 'cols' | 'rows' | 'mines'>, rng: Rng): MsBoard {
  const n = d.cols * d.rows
  return {
    cols: d.cols,
    rows: d.rows,
    mineCount: d.mines,
    mines: new Uint8Array(n),
    counts: new Uint8Array(n),
    state: new Uint8Array(n),
    status: 'ready',
    revealed: 0,
    flags: 0,
    exploded: -1,
    elapsedMs: 0,
    rng,
    scratch: new Int32Array(n),
  }
}

export const indexOf = (b: Pick<MsBoard, 'cols'>, x: number, y: number): number => y * b.cols + x
export const xyOf = (b: Pick<MsBoard, 'cols'>, i: number): [x: number, y: number] => [
  i % b.cols,
  Math.floor(i / b.cols),
]

export function forEachNeighbor(
  b: Pick<MsBoard, 'cols' | 'rows'>,
  i: number,
  fn: (j: number) => void,
): void {
  const x = i % b.cols
  const y = (i - x) / b.cols
  const x0 = x > 0 ? x - 1 : 0
  const x1 = x < b.cols - 1 ? x + 1 : b.cols - 1
  const y0 = y > 0 ? y - 1 : 0
  const y1 = y < b.rows - 1 ? y + 1 : b.rows - 1
  for (let yy = y0; yy <= y1; yy++) {
    for (let xx = x0; xx <= x1; xx++) {
      if (xx === x && yy === y) continue
      fn(yy * b.cols + xx)
    }
  }
}

export function neighborCount(b: Pick<MsBoard, 'cols' | 'rows'>, i: number): number {
  let n = 0
  forEachNeighbor(b, i, () => n++)
  return n
}

export function computeCounts(b: MsBoard): void {
  b.counts.fill(0)
  for (let i = 0; i < b.mines.length; i++) {
    if (!b.mines[i]) continue
    forEachNeighbor(b, i, (j) => {
      b.counts[j]!++
    })
  }
}

/**
 * 지뢰 배치: safe 칸과 그 3×3 이웃을 제외한 후보에서 무작위. 후보가 모자라면 safe 칸만 제외(폴백),
 * 그래도 모자라면 가능한 만큼만 놓고 mineCount 를 줄인다.
 */
export function placeMines(b: MsBoard, safe: number): void {
  const total = b.cols * b.rows
  const exclude = new Uint8Array(total)
  exclude[safe] = 1
  forEachNeighbor(b, safe, (j) => {
    exclude[j] = 1
  })
  let candidates: number[] = []
  for (let i = 0; i < total; i++) if (!exclude[i]) candidates.push(i)
  if (candidates.length < b.mineCount) {
    candidates = []
    for (let i = 0; i < total; i++) if (i !== safe) candidates.push(i)
  }
  const count = Math.min(b.mineCount, candidates.length)
  b.mines.fill(0)
  // 부분 Fisher–Yates: 앞 count 개만 섞는다
  for (let k = 0; k < count; k++) {
    const r = k + Math.floor(b.rng() * (candidates.length - k))
    const tmp = candidates[k]!
    candidates[k] = candidates[r]!
    candidates[r] = tmp
    b.mines[candidates[k]!] = 1
  }
  b.mineCount = count
  computeCounts(b)
}

/** 스택 기반 연쇄 열기. 열린 칸 수를 돌려준다. 깃발 칸은 연쇄를 막는다 */
function floodReveal(b: MsBoard, start: number): number {
  const stack = b.scratch
  let top = 0
  let n = 0
  stack[top++] = start
  b.state[start] = CELL.Revealed
  n++
  while (top > 0) {
    const i = stack[--top]!
    if (b.counts[i] !== 0) continue
    forEachNeighbor(b, i, (j) => {
      if (b.state[j] === CELL.Hidden && !b.mines[j]) {
        b.state[j] = CELL.Revealed
        n++
        stack[top++] = j
      }
    })
  }
  return n
}

function lose(b: MsBoard, index: number): void {
  b.status = 'lost'
  b.exploded = index
  for (let j = 0; j < b.mines.length; j++) {
    if (b.mines[j]) {
      if (b.state[j] !== CELL.Flagged) b.state[j] = CELL.Revealed
    } else if (b.state[j] === CELL.Flagged) {
      b.state[j] = CELL.WrongFlag
    }
  }
}

function checkWin(b: MsBoard): boolean {
  if (b.revealed !== b.cols * b.rows - b.mineCount) return false
  b.status = 'won'
  for (let j = 0; j < b.mines.length; j++) {
    if (b.mines[j] && b.state[j] === CELL.Hidden) {
      b.state[j] = CELL.Flagged
      b.flags++
    }
  }
  return true
}

const ended = (b: MsBoard): boolean => b.status === 'won' || b.status === 'lost'

/** 칸 열기 (좌클릭 / Enter) */
export function reveal(b: MsBoard, i: number): MsEvent[] {
  const ev: MsEvent[] = []
  if (ended(b) || i < 0 || i >= b.state.length) return ev
  if (b.state[i] !== CELL.Hidden) return ev
  if (b.status === 'ready') {
    placeMines(b, i)
    b.status = 'playing'
    ev.push({ type: 'start' })
  }
  if (b.mines[i]) {
    lose(b, i)
    ev.push({ type: 'lost', index: i })
    return ev
  }
  const n = floodReveal(b, i)
  b.revealed += n
  ev.push({ type: 'reveal', count: n })
  if (checkWin(b)) ev.push({ type: 'won' })
  return ev
}

/** 깃발 토글 (우클릭 / X). 시작 전에도 가능, 열린 칸·종료 뒤에는 무시 */
export function toggleFlag(b: MsBoard, i: number): MsEvent[] {
  if (ended(b) || i < 0 || i >= b.state.length) return []
  const s = b.state[i]
  if (s === CELL.Hidden) {
    b.state[i] = CELL.Flagged
    b.flags++
    return [{ type: 'flag', on: true }]
  }
  if (s === CELL.Flagged) {
    b.state[i] = CELL.Hidden
    b.flags--
    return [{ type: 'flag', on: false }]
  }
  return []
}

/**
 * 코드: 열린 숫자 칸 주변 깃발 수가 숫자와 같으면 나머지 숨은 이웃을 전부 연다.
 * 깃발이 틀렸으면 지뢰를 밟는다. 0칸·숨은 칸·불일치는 아무것도 열지 않는다.
 */
export function chord(b: MsBoard, i: number): MsEvent[] {
  const ev: MsEvent[] = []
  if (b.status !== 'playing' || i < 0 || i >= b.state.length) return ev
  if (b.state[i] !== CELL.Revealed || b.counts[i] === 0) return ev
  let flags = 0
  forEachNeighbor(b, i, (j) => {
    if (b.state[j] === CELL.Flagged) flags++
  })
  if (flags !== b.counts[i]) {
    ev.push({ type: 'invalid' })
    return ev
  }
  let hit = -1
  forEachNeighbor(b, i, (j) => {
    if (hit < 0 && b.state[j] === CELL.Hidden && b.mines[j]) hit = j
  })
  if (hit >= 0) {
    lose(b, hit)
    ev.push({ type: 'lost', index: hit })
    return ev
  }
  let n = 0
  forEachNeighbor(b, i, (j) => {
    if (b.state[j] === CELL.Hidden) n += floodReveal(b, j)
  })
  b.revealed += n
  ev.push({ type: 'reveal', count: n })
  if (checkWin(b)) ev.push({ type: 'won' })
  return ev
}

/** 타이머: playing 중에만 누적 */
export function tick(b: MsBoard, dtMs: number): void {
  if (b.status === 'playing') b.elapsedMs += dtMs
}

/** 남은 지뢰 = 지뢰 − 깃발 (음수 허용) */
export const remainingMines = (b: MsBoard): number => b.mineCount - b.flags

/** 숨은 안전 칸 수 (마스코트 'think' 트리거용) */
export const remainingSafe = (b: MsBoard): number => b.cols * b.rows - b.mineCount - b.revealed
