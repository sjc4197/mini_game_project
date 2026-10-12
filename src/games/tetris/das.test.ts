import { describe, expect, it } from 'vitest'
import { createDas, dasStep } from './das'

const S = { das: 167, arr: 33 }

describe('⑲ DAS/ARR', () => {
  it('첫 입력 즉시 1회, DAS 전까지 0, 충전 순간 1회, 이후 ARR 마다 1회', () => {
    const d = createDas()
    expect(dasStep(d, 0, false, true, 1, S).moves).toBe(1)
    let moves = 0
    for (let t = 0; t < 160; t += 16) moves += dasStep(d, 16, false, true, 1, S).moves
    expect(moves).toBe(0)
    expect(dasStep(d, 16, false, true, 1, S).moves).toBe(1) // 176ms ≥ 167
    let arrMoves = 0
    for (let t = 0; t < 330; t += 16) arrMoves += dasStep(d, 16, false, true, 1, S).moves
    expect(arrMoves).toBe(Math.floor((330 + (176 - 167)) / 33)) // 누적 잔량 포함 ≈ 10
  })
  it('방향 전환은 즉시 1회 + 타이머 재시작, 떼면 0, 다시 누르면 남은 키로 재시작', () => {
    const d = createDas()
    dasStep(d, 0, false, true, 1, S)
    dasStep(d, 100, false, true, 1, S)
    const r = dasStep(d, 16, true, false, -1, S)
    expect([r.moves, r.dir]).toEqual([1, -1])
    expect(d.timer).toBe(0)
    expect(dasStep(d, 16, false, false, 0, S).moves).toBe(0)
    expect(d.dir).toBe(0)
    expect(dasStep(d, 16, true, false, -1, S).moves).toBe(1)
  })
  it('양쪽 동시엔 최근 키(prefer) 를 따른다', () => {
    const d = createDas()
    dasStep(d, 0, true, false, -1, S)
    const r = dasStep(d, 16, true, true, 1, S)
    expect([r.moves, r.dir]).toEqual([1, 1])
    const back = dasStep(d, 16, true, false, -1, S)
    expect([back.moves, back.dir]).toEqual([1, -1])
  })
  it('ARR 0 은 충전 뒤 벽까지', () => {
    const d = createDas()
    const zero = { das: 100, arr: 0 }
    dasStep(d, 0, false, true, 1, zero)
    expect(dasStep(d, 50, false, true, 1, zero).toWall).toBe(false)
    const r = dasStep(d, 60, false, true, 1, zero)
    expect(r.toWall).toBe(true)
    expect(dasStep(d, 16, false, true, 1, zero).toWall).toBe(true)
  })
})
