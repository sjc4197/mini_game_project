import { describe, expect, it } from 'vitest'
import { mulberry32 } from '@/lib/rng'
import { WIN_SCORE, candidates, chooseMove, evaluate, moveDelta } from './ai'
import { createBoard, indexOf, place } from './logic'
import { STONE, type OmokBoard } from './types'

type XY = [number, number]
const set = (b: OmokBoard, stone: 1 | 2, cells: XY[]) =>
  cells.forEach(([x, y]) => (b.cells[indexOf(b, x, y)] = stone))
const row = (x0: number, y: number, n: number): XY[] =>
  Array.from({ length: n }, (_, i) => [x0 + i, y])

describe('정적 평가', () => {
  it('열린 3 > 막힌 3, 띈 3 > 막힌 3, 열린 4 > 막힌 4', () => {
    const open3 = createBoard()
    set(open3, 1, row(5, 7, 3))
    const closed3 = createBoard()
    set(closed3, 1, row(5, 7, 3))
    set(closed3, 2, [[4, 7]])
    expect(evaluate(open3, 1)).toBeGreaterThan(evaluate(closed3, 1))
    const broken3 = createBoard()
    set(broken3, 1, [
      [5, 7],
      [6, 7],
      [8, 7],
    ])
    expect(evaluate(broken3, 1)).toBeGreaterThan(evaluate(closed3, 1))
    const open4 = createBoard()
    set(open4, 1, row(5, 7, 4))
    const closed4 = createBoard()
    set(closed4, 1, row(5, 7, 4))
    set(closed4, 2, [[4, 7]])
    expect(evaluate(open4, 2)).toBeLessThan(evaluate(closed4, 2))
  })
  it('완성점: 내 차례에 4 가 있으면 WIN, 상대 열린 4 는 -WIN, 상대 막힌 4 는 그냥 불리', () => {
    const b = createBoard()
    set(b, 1, row(5, 7, 4))
    expect(evaluate(b, 1)).toBe(WIN_SCORE)
    expect(evaluate(b, 2)).toBe(-WIN_SCORE)
    set(b, 2, [[4, 7]])
    expect(evaluate(b, 2)).toBeLessThan(0)
    expect(evaluate(b, 2)).toBeGreaterThan(-WIN_SCORE)
  })
  it('관점 대칭: 흑백을 바꾸면 값이 같고, 같은 판의 반대 관점은 부호가 바뀐다', () => {
    const b = createBoard()
    set(b, 1, [
      [5, 5],
      [6, 6],
      [9, 3],
    ])
    set(b, 2, [
      [5, 6],
      [5, 7],
    ])
    const swapped = createBoard()
    set(swapped, 2, [
      [5, 5],
      [6, 6],
      [9, 3],
    ])
    set(swapped, 1, [
      [5, 6],
      [5, 7],
    ])
    expect(evaluate(b, 1)).toBe(evaluate(swapped, 2))
    expect(evaluate(b, 1)).toBe(-evaluate(b, 2))
    expect(evaluate(b, 1)).not.toBe(0)
  })
  it('착수 점수 차: 상대 열린 3 차단 > 먼 곳, 내 4 만들기 > 상대 돌 옆 1', () => {
    const b = createBoard()
    set(b, 1, row(5, 7, 3))
    set(b, 2, [[5, 11]])
    expect(moveDelta(b, indexOf(b, 8, 7), 2)).toBeGreaterThan(moveDelta(b, indexOf(b, 0, 0), 2))
    expect(moveDelta(b, indexOf(b, 8, 7), 1)).toBeGreaterThan(moveDelta(b, indexOf(b, 5, 12), 2))
  })
  it('후보는 돌 주변 거리 2 이내 빈칸, 빈 보드는 중앙', () => {
    const b = createBoard()
    expect(candidates(b)).toEqual([indexOf(b, 7, 7)])
    set(b, 1, [[7, 7]])
    const c = candidates(b)
    expect(c).toHaveLength(24)
    expect(c).toContain(indexOf(b, 5, 5))
    expect(c).not.toContain(indexOf(b, 7, 7))
    expect(c).not.toContain(indexOf(b, 4, 7))
  })
})

describe('chooseMove', () => {
  it.each(['easy', 'hard'] as const)('%s: 즉시 이길 수 있으면 이긴다', (level) => {
    const b = createBoard()
    set(b, 2, [
      [2, 2],
      [3, 3],
      [4, 4],
      [5, 5],
    ])
    set(b, 1, [
      [1, 1],
      [0, 14],
      [1, 14],
      [2, 14],
    ]) // (1,1) 은 흑이 막아 승리 지점은 (6,6) 하나
    b.turn = STONE.White
    expect(chooseMove(b, 2, level, mulberry32(1))).toBe(indexOf(b, 6, 6))
  })
  it.each(['easy', 'hard'] as const)('%s: 상대의 4 는 막는다 (띈 4 포함)', (level) => {
    const b = createBoard()
    set(b, 1, row(4, 7, 4))
    set(b, 2, [
      [4, 8],
      [5, 8],
    ])
    b.turn = STONE.White
    expect([indexOf(b, 3, 7), indexOf(b, 8, 7)]).toContain(chooseMove(b, 2, level, mulberry32(3)))
    const c = createBoard()
    set(c, 1, [
      [4, 7],
      [5, 7],
      [7, 7],
      [8, 7],
    ])
    set(c, 2, [
      [4, 8],
      [5, 8],
    ])
    c.turn = STONE.White
    expect(chooseMove(c, 2, level, mulberry32(3))).toBe(indexOf(c, 6, 7))
  })
  it('hard: 상대의 열린 3 은 막는다', () => {
    const b = createBoard()
    set(b, 1, row(5, 7, 3))
    set(b, 2, [
      [5, 9],
      [9, 9],
    ])
    b.turn = STONE.White
    const m = chooseMove(b, 2, 'hard', mulberry32(5))
    expect([indexOf(b, 4, 7), indexOf(b, 8, 7)]).toContain(m)
  })
  it('hard: 띈 3 (X X . X) 도 막는다', () => {
    const b = createBoard()
    set(b, 1, [
      [4, 7],
      [5, 7],
      [7, 7],
    ])
    set(b, 2, [
      [5, 10],
      [9, 10],
    ])
    b.turn = STONE.White
    const m = chooseMove(b, 2, 'hard', mulberry32(5))
    expect([indexOf(b, 3, 7), indexOf(b, 6, 7), indexOf(b, 8, 7)]).toContain(m)
  })
  it('hard: 더블 4 를 만들 수 있으면 만든다', () => {
    // 흑 가로 (5..7,7) + 세로 (8,4..6) → (8,7) 에 두면 가로 4 + 세로 4, 백은 하나만 막는다
    const b = createBoard()
    set(b, 1, [
      [5, 7],
      [6, 7],
      [7, 7],
      [8, 4],
      [8, 5],
      [8, 6],
    ])
    set(b, 2, [
      [4, 7],
      [8, 3],
      [0, 0],
      [1, 0],
      [2, 0],
      [0, 14],
    ])
    b.turn = STONE.Black
    expect(chooseMove(b, 1, 'hard', mulberry32(7))).toBe(indexOf(b, 8, 7))
  })
  it('항상 빈칸에 두고, 같은 시드면 같은 수', () => {
    const run = (seed: number) => {
      const rng = mulberry32(seed)
      const b = createBoard()
      const moves: number[] = []
      for (let i = 0; i < 20 && b.status === 'playing'; i++) {
        const m = chooseMove(b, b.turn, i % 2 ? 'easy' : 'hard', rng)
        expect(b.cells[m]).toBe(0)
        place(b, m)
        moves.push(m)
      }
      return moves
    }
    expect(run(42)).toEqual(run(42))
    expect(run(42)).not.toEqual(run(43))
  })
  it('hard 는 중반 국면에서 300ms 안에 두고 보드를 원래대로 돌려놓는다', () => {
    const b = createBoard()
    const rng = mulberry32(9)
    for (let i = 0; i < 30 && b.status === 'playing'; i++)
      place(b, chooseMove(b, b.turn, 'easy', rng))
    const before = Uint8Array.from(b.cells)
    const t0 = performance.now()
    const m = chooseMove(b, b.turn, 'hard', rng)
    const ms = performance.now() - t0
    expect(b.cells[m]).toBe(0)
    expect(Array.from(b.cells)).toEqual(Array.from(before))
    expect(ms).toBeLessThan(300)
  })
})
