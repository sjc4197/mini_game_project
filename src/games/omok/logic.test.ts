import { describe, expect, it } from 'vitest'
import { createBoard, emptyCells, findWin, indexOf, place, undo } from './logic'
import { SIZE, STONE, type OmokBoard } from './types'

/** 흑/백 번갈아 두되, 지정 좌표를 순서대로 */
const play = (b: OmokBoard, moves: [number, number][]) =>
  moves.flatMap(([x, y]) => place(b, indexOf(b, x, y)))
/** 백 버림수 후보: 3칸 간격 격자(서로 인접하지 않아 백이 줄을 만들 수 없음), 오른쪽 아래부터 */
const THROWAWAY: [number, number][] = []
for (let y = 12; y >= 0; y -= 3) for (let x = 12; x >= 0; x -= 3) THROWAWAY.push([x, y])

/** 흑이 (x,y) 목록에 두고 백은 흑 줄과 겹치지 않는 빈 버림수를 둔다 */
function blackLine(b: OmokBoard, cells: [number, number][]): ReturnType<typeof place> {
  const reserved = new Set(cells.map(([x, y]) => indexOf(b, x, y)))
  let ev: ReturnType<typeof place> = []
  for (const [x, y] of cells) {
    ev = place(b, indexOf(b, x, y))
    if (b.status !== 'playing') break
    const spare = THROWAWAY.map(([tx, ty]) => indexOf(b, tx, ty)).find(
      (i) => b.cells[i] === STONE.Empty && !reserved.has(i),
    )
    place(b, spare!)
  }
  return ev
}

describe('착수 규칙', () => {
  it('흑 선공, 번갈아 두고 moves/lastMove/history 가 쌓인다', () => {
    const b = createBoard()
    expect(b.turn).toBe(STONE.Black)
    expect(place(b, indexOf(b, 7, 7))).toEqual([
      { type: 'place', index: indexOf(b, 7, 7), stone: 1 },
    ])
    expect(b.turn).toBe(STONE.White)
    place(b, indexOf(b, 8, 8))
    expect(b.turn).toBe(STONE.Black)
    expect(b.moves).toBe(2)
    expect(b.lastMove).toBe(indexOf(b, 8, 8))
    expect(b.history).toEqual([indexOf(b, 7, 7), indexOf(b, 8, 8)])
  })
  it('빈칸이 아니거나 범위 밖이면 invalid, 상태는 그대로', () => {
    const b = createBoard()
    place(b, 0)
    expect(place(b, 0)).toEqual([{ type: 'invalid' }])
    expect(place(b, -1)).toEqual([{ type: 'invalid' }])
    expect(place(b, SIZE * SIZE)).toEqual([{ type: 'invalid' }])
    expect(b.moves).toBe(1)
    expect(b.turn).toBe(STONE.White)
  })
})

describe('승리 판정', () => {
  it.each([
    ['가로', [0, 1, 2, 3, 4].map((i) => [3 + i, 5] as [number, number])],
    ['세로', [0, 1, 2, 3, 4].map((i) => [5, 3 + i] as [number, number])],
    ['대각선 ↘', [0, 1, 2, 3, 4].map((i) => [2 + i, 2 + i] as [number, number])],
    ['대각선 ↗', [0, 1, 2, 3, 4].map((i) => [2 + i, 10 - i] as [number, number])],
  ])('%s 5목 → won, winLine 5개', (_n, cells) => {
    const b = createBoard()
    const ev = blackLine(b, cells)
    expect(ev.map((e) => e.type)).toEqual(['place', 'win'])
    expect(b.status).toBe('won')
    expect(b.winner).toBe(STONE.Black)
    expect(b.winLine).toHaveLength(5)
    expect(place(b, indexOf(b, 0, 0))).toEqual([{ type: 'invalid' }])
  })
  it('가장자리·모서리에서도 판정', () => {
    const b = createBoard()
    blackLine(b, [
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
      [4, 0],
    ])
    expect(b.status).toBe('won')
    const c = createBoard()
    blackLine(c, [
      [14, 10],
      [14, 11],
      [14, 12],
      [14, 13],
      [14, 14],
    ])
    expect(c.status).toBe('won')
  })
  it('4개는 승리가 아니고, 가운데를 채워 5개가 되면 승리(줄은 양쪽을 합친다)', () => {
    const b = createBoard()
    blackLine(b, [
      [3, 7],
      [4, 7],
      [6, 7],
      [7, 7],
    ])
    expect(b.status).toBe('playing')
    const ev = blackLine(b, [[5, 7]])
    expect(ev[1]).toMatchObject({ type: 'win' })
    expect(b.winLine.sort((p, q) => p - q)).toEqual([3, 4, 5, 6, 7].map((x) => indexOf(b, x, 7)))
  })
  it('6목(장목)도 자유룰에선 승리', () => {
    const b = createBoard()
    blackLine(b, [
      [2, 2],
      [3, 2],
      [4, 2],
      [6, 2],
      [7, 2],
    ])
    expect(b.status).toBe('playing')
    blackLine(b, [[5, 2]])
    expect(b.status).toBe('won')
    expect(b.winLine).toHaveLength(6)
  })
  it('백도 이길 수 있다', () => {
    const b = createBoard()
    play(b, [
      [0, 0],
      [5, 5],
      [0, 1],
      [6, 5],
      [0, 2],
      [7, 5],
      [0, 3],
      [8, 5],
      [14, 14],
      [9, 5],
    ])
    expect(b.status).toBe('won')
    expect(b.winner).toBe(STONE.White)
  })
  it('findWin 은 가정 착수로도 판정한다 (돌을 놓기 전)', () => {
    const b = createBoard()
    blackLine(b, [
      [3, 3],
      [4, 4],
      [5, 5],
      [6, 6],
    ])
    expect(findWin(b, indexOf(b, 7, 7), STONE.Black)).toHaveLength(5)
    expect(findWin(b, indexOf(b, 7, 7), STONE.White)).toBeNull()
  })
})

describe('무승부 · 무르기', () => {
  it('빈칸이 없으면 draw', () => {
    const b = createBoard(5)
    // 5×5 를 승리 없이 채우는 패턴 (행마다 흑백 2-2-1 로 섞음)
    const pattern = ['BBWWB', 'WWBBW', 'BBWWB', 'WWBBW', 'BBWWB']
    // place 는 turn 을 번갈아 강제하므로 cells 를 직접 채우고 마지막 수만 place 로
    pattern.forEach((row, y) =>
      [...row].forEach((ch, x) => (b.cells[indexOf(b, x, y)] = ch === 'B' ? 1 : 2)),
    )
    b.cells[indexOf(b, 4, 4)] = 0
    b.moves = 24
    b.turn = STONE.Black
    const ev = place(b, indexOf(b, 4, 4))
    expect(ev.map((e) => e.type)).toEqual(['place', 'draw'])
    expect(b.status).toBe('draw')
    expect(emptyCells(b)).toEqual([])
  })
  it('undo 는 마지막 수와 종료 상태를 되돌린다', () => {
    const b = createBoard()
    blackLine(b, [
      [3, 3],
      [4, 3],
      [5, 3],
      [6, 3],
      [7, 3],
    ])
    expect(b.status).toBe('won')
    expect(undo(b)).toBe(true)
    expect(b.status).toBe('playing')
    expect(b.turn).toBe(STONE.Black)
    expect(b.cells[indexOf(b, 7, 3)]).toBe(0)
    expect(b.winLine).toEqual([])
    const empty = createBoard()
    expect(undo(empty)).toBe(false)
  })
})
