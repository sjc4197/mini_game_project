import type { Rng } from '@/lib/rng'
import { inBounds, indexOf, other, xyOf } from './logic'
import type { OmokBoard, Player } from './types'

/**
 * 오목 AI — 5칸 창(window) 평가 + 네가맥스 탐색.
 *
 * 평가: 모든 가로·세로·대각선에서 연속 5칸 창을 훑어, 상대 돌이 없는 창마다 내 돌 수에 따라
 * 점수(1·10·100·1000)를 더한다. 열린 3은 창 3개, 막힌 3은 창 1개, 열린 4는 창 2개에 잡히므로
 * 열림/막힘과 띈 3(X X . X)이 자연스럽게 반영된다. 돌 4 + 빈칸 1인 창의 빈칸 = 완성점(다음 수에 5목).
 *
 * 쉬움: 착수 전후 점수 차(공격 + 방어)로 상위 3수 중 무작위. 즉시 승리·완성점 방어는 놓치지 않는다.
 * 어려움: 후보 8수를 깊이 4 알파베타로 탐색. 완성점이 있으면 승리/방어는 강제수(깊이를 소모하지 않음).
 */

export const WIN_SCORE = 1_000_000
/** 창 안의 내 돌 수 → 점수 (상대 돌이 없는 창만) */
const WEIGHT = [0, 1, 10, 100, 1000, WIN_SCORE] as const
/** 후보 = 돌에서 이 거리 이내의 빈칸 */
const NEAR = 2
/** 강제수 연장 한도 */
const EXTRA_PLY = 6

export interface SearchOptions {
  /** 탐색 깊이. 0 = 1수 평가만 */
  depth: number
  /** 노드마다 살펴보는 후보 수 */
  beam: number
  /** depth 0 일 때 상위 몇 수 중 무작위로 고를지 */
  pick: number
}

export const LEVELS: Readonly<Record<'easy' | 'hard', SearchOptions>> = {
  easy: { depth: 0, beam: 3, pick: 3 },
  hard: { depth: 4, beam: 8, pick: 1 },
}

type Pair = readonly [line: number, pos: number]

interface Ctx {
  size: number
  lines: Int16Array[]
  /** 교차점마다 지나는 (선, 선 안 위치) */
  cellLines: Pair[][]
  /** 완성점 중복 방지 세대 표시 [stone*n + cell] */
  seen: Int32Array
  gen: number
  /** scan 결과: 돌별 완성점 목록 */
  fours: [number[], number[], number[]]
  /** scan 결과: 돌별 창 점수 합 */
  score: [number, number, number]
  /** 후보 정렬 스크래치 */
  delta: Float64Array
}

const ctxCache = new Map<number, Ctx>()

function buildLines(size: number): Pick<Ctx, 'lines' | 'cellLines'> {
  const lines: Int16Array[] = []
  const cellLines: Pair[][] = Array.from({ length: size * size }, () => [])
  const add = (cells: number[]) => {
    if (cells.length < 5) return
    const id = lines.length
    lines.push(Int16Array.from(cells))
    cells.forEach((c, pos) => cellLines[c].push([id, pos]))
  }
  for (let y = 0; y < size; y++) add(Array.from({ length: size }, (_, x) => y * size + x))
  for (let x = 0; x < size; x++) add(Array.from({ length: size }, (_, y) => y * size + x))
  for (let k = -(size - 1); k <= size - 1; k++) {
    const cells: number[] = []
    for (let y = 0; y < size; y++) if (y + k >= 0 && y + k < size) cells.push(y * size + y + k)
    add(cells)
  }
  for (let k = 0; k <= 2 * (size - 1); k++) {
    const cells: number[] = []
    for (let y = 0; y < size; y++) if (k - y >= 0 && k - y < size) cells.push(y * size + k - y)
    add(cells)
  }
  return { lines, cellLines }
}

function ctxFor(size: number): Ctx {
  let ctx = ctxCache.get(size)
  if (!ctx) {
    const n = size * size
    ctx = {
      size,
      ...buildLines(size),
      seen: new Int32Array(3 * n),
      gen: 0,
      fours: [[], [], []],
      score: [0, 0, 0],
      delta: new Float64Array(n),
    }
    ctxCache.set(size, ctx)
  }
  return ctx
}

/** 전체 보드 창 평가 → ctx.score / ctx.fours */
function scan(ctx: Ctx, cells: Uint8Array): void {
  const { lines, seen, size } = ctx
  const n = size * size
  const gen = ++ctx.gen
  const f1 = ctx.fours[1]
  const f2 = ctx.fours[2]
  f1.length = 0
  f2.length = 0
  let s1 = 0
  let s2 = 0
  for (const line of lines) {
    const len = line.length
    let b = 0
    let w = 0
    let eSum = 0 // 창 안 빈칸 위치 합 (빈칸이 1개면 그 위치)
    for (let i = 0; i < len; i++) {
      const v = cells[line[i]]
      if (v === 1) b++
      else if (v === 2) w++
      else eSum += i
      if (i >= 5) {
        const u = cells[line[i - 5]]
        if (u === 1) b--
        else if (u === 2) w--
        else eSum -= i - 5
      }
      if (i < 4) continue
      if (w === 0) {
        if (b === 0) continue
        s1 += WEIGHT[b]
        if (b === 4) {
          const c = line[eSum]
          if (seen[n + c] !== gen) {
            seen[n + c] = gen
            f1.push(c)
          }
        }
      } else if (b === 0) {
        s2 += WEIGHT[w]
        if (w === 4) {
          const c = line[eSum]
          if (seen[2 * n + c] !== gen) {
            seen[2 * n + c] = gen
            f2.push(c)
          }
        }
      }
    }
  }
  ctx.score[1] = s1
  ctx.score[2] = s2
}

let wb = 0
let ww = 0
/** line[from..to] 안에 완전히 들어가는 창들의 점수 → wb / ww */
function windowScore(cells: Uint8Array, line: Int16Array, from: number, to: number): void {
  let b = 0
  let w = 0
  wb = 0
  ww = 0
  for (let i = from; i <= to; i++) {
    const v = cells[line[i]]
    if (v === 1) b++
    else if (v === 2) w++
    if (i - from >= 5) {
      const u = cells[line[i - 5]]
      if (u === 1) b--
      else if (u === 2) w--
    }
    if (i - from < 4) continue
    if (w === 0) wb += WEIGHT[b]
    else if (b === 0) ww += WEIGHT[w]
  }
}

function deltaAt(ctx: Ctx, cells: Uint8Array, cell: number, stone: Player): number {
  let delta = 0
  for (const [id, pos] of ctx.cellLines[cell]) {
    const line = ctx.lines[id]
    const from = Math.max(0, pos - 4)
    const to = Math.min(line.length - 1, pos + 4)
    windowScore(cells, line, from, to)
    const b0 = wb
    const w0 = ww
    cells[cell] = stone
    windowScore(cells, line, from, to)
    cells[cell] = 0
    delta += stone === 1 ? wb - b0 + (w0 - ww) : ww - w0 + (b0 - wb)
  }
  return delta
}

/** 착수 전후 창 점수 차 = 공격(내 점수 증가) + 방어(상대 점수 감소) */
export function moveDelta(
  b: Pick<OmokBoard, 'size' | 'cells'>,
  cell: number,
  stone: Player,
): number {
  return deltaAt(ctxFor(b.size), b.cells, cell, stone)
}

/** 정적 평가: toMove 관점. 완성점이 있으면 ±WIN_SCORE */
export function evaluate(b: Pick<OmokBoard, 'size' | 'cells'>, toMove: Player): number {
  const ctx = ctxFor(b.size)
  scan(ctx, b.cells)
  const opp = other(toMove)
  if (ctx.fours[toMove].length > 0) return WIN_SCORE
  if (ctx.fours[opp].length >= 2) return -WIN_SCORE
  return ctx.score[toMove] - ctx.score[opp]
}

/** 후보: 돌에서 거리 NEAR 이내의 빈칸. 돌이 없으면 중앙 */
export function candidates(b: Pick<OmokBoard, 'size' | 'cells'>): number[] {
  const size = b.size
  const mark = new Uint8Array(size * size)
  let any = false
  for (let i = 0; i < b.cells.length; i++) {
    if (!b.cells[i]) continue
    any = true
    const [x, y] = xyOf(b, i)
    for (let dy = -NEAR; dy <= NEAR; dy++)
      for (let dx = -NEAR; dx <= NEAR; dx++) {
        const xx = x + dx
        const yy = y + dy
        if (!inBounds(b, xx, yy)) continue
        const j = indexOf(b, xx, yy)
        if (!b.cells[j]) mark[j] = 1
      }
  }
  if (!any) return [indexOf(b, Math.floor(size / 2), Math.floor(size / 2))]
  const out: number[] = []
  for (let i = 0; i < mark.length; i++) if (mark[i]) out.push(i)
  return out
}

/** 후보를 착수 점수 차 내림차순으로 limit 개 */
function ordered(ctx: Ctx, cells: Uint8Array, stone: Player, limit: number): number[] {
  const list = candidates({ size: ctx.size, cells })
  const d = ctx.delta
  for (const c of list) d[c] = deltaAt(ctx, cells, c, stone)
  list.sort((p, q) => d[q] - d[p])
  return list.length > limit ? list.slice(0, limit) : list
}

/** 네가맥스 + 알파베타. stone 차례, stone 관점 값 */
function negamax(
  ctx: Ctx,
  cells: Uint8Array,
  stone: Player,
  opts: SearchOptions,
  depth: number,
  ply: number,
  alpha: number,
  beta: number,
): number {
  scan(ctx, cells)
  const opp = other(stone)
  if (ctx.fours[stone].length > 0) return WIN_SCORE - ply
  if (ctx.fours[opp].length >= 2) return -(WIN_SCORE - ply - 1)
  if (depth <= 0 || ply >= opts.depth + EXTRA_PLY) return ctx.score[stone] - ctx.score[opp]
  let moves: number[]
  let forced = false
  if (ctx.fours[opp].length === 1) {
    moves = [ctx.fours[opp][0]]
    forced = true
  } else {
    moves = ordered(ctx, cells, stone, opts.beam)
    if (moves.length === 0) return 0
  }
  let best = -Infinity
  for (const m of moves) {
    cells[m] = stone
    const v = -negamax(ctx, cells, opp, opts, forced ? depth : depth - 1, ply + 1, -beta, -alpha)
    cells[m] = 0
    if (v > best) best = v
    if (v > alpha) alpha = v
    if (alpha >= beta) break
  }
  return best
}

/** 다음 수 선택. 반환은 교차점 인덱스 (둘 곳이 없으면 -1). b.cells 는 탐색 중 잠시 바뀌었다가 복원된다 */
export function chooseMove(b: OmokBoard, stone: Player, level: 'easy' | 'hard', rng: Rng): number {
  return chooseMoveWith(b, stone, LEVELS[level], rng)
}

export function chooseMoveWith(b: OmokBoard, stone: Player, opts: SearchOptions, rng: Rng): number {
  const ctx = ctxFor(b.size)
  const cells = b.cells
  scan(ctx, cells)
  const opp = other(stone)
  if (ctx.fours[stone].length > 0) return ctx.fours[stone][0]
  if (ctx.fours[opp].length > 0) return ctx.fours[opp][0]
  const list = ordered(ctx, cells, stone, opts.depth <= 0 ? opts.pick : opts.beam)
  if (list.length === 0) return -1
  if (opts.depth <= 0) return list[Math.floor(rng() * list.length)]
  let best = -Infinity
  let ties: number[] = []
  for (const m of list) {
    cells[m] = stone
    const v = -negamax(ctx, cells, opp, opts, opts.depth - 1, 1, -Infinity, -(best - 1))
    cells[m] = 0
    if (v > best) {
      best = v
      ties = [m]
    } else if (v === best) ties.push(m)
  }
  return ties[Math.floor(rng() * ties.length)]
}
