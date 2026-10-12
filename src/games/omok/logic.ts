import { SIZE, STONE, type OmokBoard, type OmokEvent, type Player, type Stone } from './types'

/**
 * 오목 순수 로직. 15×15, 흑 선공, 자유룰(5목 이상 승리, 금수 없음), 빈칸 없으면 무승부.
 */

export const DIRS: readonly (readonly [dx: number, dy: number])[] = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1],
]

export function createBoard(size = SIZE): OmokBoard {
  return {
    size,
    cells: new Uint8Array(size * size),
    turn: STONE.Black,
    moves: 0,
    status: 'playing',
    winner: STONE.Empty,
    winLine: [],
    lastMove: -1,
    history: [],
  }
}

export const indexOf = (b: Pick<OmokBoard, 'size'>, x: number, y: number): number => y * b.size + x
export const xyOf = (b: Pick<OmokBoard, 'size'>, i: number): [x: number, y: number] => [
  i % b.size,
  Math.floor(i / b.size),
]
export const inBounds = (b: Pick<OmokBoard, 'size'>, x: number, y: number): boolean =>
  x >= 0 && y >= 0 && x < b.size && y < b.size
export const stoneAt = (b: Pick<OmokBoard, 'size' | 'cells'>, x: number, y: number): Stone =>
  inBounds(b, x, y) ? ((b.cells[y * b.size + x] ?? 0) as Stone) : STONE.Empty
export const other = (p: Player): Player => (p === STONE.Black ? STONE.White : STONE.Black)

/** index 를 지나는 dir 방향의 같은 돌 연속 구간 (index 포함) */
export function runThrough(
  b: Pick<OmokBoard, 'size' | 'cells'>,
  index: number,
  stone: Stone,
  dir: readonly [number, number],
): number[] {
  const [x0, y0] = xyOf(b, index)
  const [dx, dy] = dir
  const line = [index]
  for (let s = 1; ; s++) {
    const x = x0 - dx * s
    const y = y0 - dy * s
    if (stoneAt(b, x, y) !== stone) break
    line.unshift(indexOf(b, x, y))
  }
  for (let s = 1; ; s++) {
    const x = x0 + dx * s
    const y = y0 + dy * s
    if (stoneAt(b, x, y) !== stone) break
    line.push(indexOf(b, x, y))
  }
  return line
}

/** index 에 stone 이 있다고 보고 승리 줄(5개 이상)을 찾는다. 없으면 null */
export function findWin(
  b: Pick<OmokBoard, 'size' | 'cells'>,
  index: number,
  stone: Stone,
): number[] | null {
  for (const dir of DIRS) {
    const line = runThrough(b, index, stone, dir)
    if (line.length >= 5) return line
  }
  return null
}

export function place(b: OmokBoard, index: number): OmokEvent[] {
  if (
    b.status !== 'playing' ||
    index < 0 ||
    index >= b.cells.length ||
    b.cells[index] !== STONE.Empty
  ) {
    return [{ type: 'invalid' }]
  }
  const stone = b.turn
  b.cells[index] = stone
  b.moves++
  b.lastMove = index
  b.history.push(index)
  const ev: OmokEvent[] = [{ type: 'place', index, stone }]
  const win = findWin(b, index, stone)
  if (win) {
    b.status = 'won'
    b.winner = stone
    b.winLine = win
    ev.push({ type: 'win', stone, line: win })
    return ev
  }
  if (b.moves >= b.cells.length) {
    b.status = 'draw'
    ev.push({ type: 'draw' })
    return ev
  }
  b.turn = other(stone)
  return ev
}

/** 마지막 수 무르기 (AI 탐색/되돌리기용). 종료 상태도 되돌린다 */
export function undo(b: OmokBoard): boolean {
  const index = b.history.pop()
  if (index === undefined) return false
  const stone = b.cells[index] as Player
  b.cells[index] = STONE.Empty
  b.moves--
  b.status = 'playing'
  b.winner = STONE.Empty
  b.winLine = []
  b.turn = stone
  b.lastMove = b.history[b.history.length - 1] ?? -1
  return true
}

/** 빈 교차점 목록 */
export function emptyCells(b: Pick<OmokBoard, 'cells'>): number[] {
  const out: number[] = []
  for (let i = 0; i < b.cells.length; i++) if (b.cells[i] === STONE.Empty) out.push(i)
  return out
}
