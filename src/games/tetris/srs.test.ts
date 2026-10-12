import { describe, expect, it } from 'vitest'
import { mulberry32 } from '@/lib/rng'
import { createGame, start, tryRotate } from './logic'
import { KICKS_I, KICKS_JLSTZ, kicksFor } from './srs'
import { COLS, ROWS } from './types'

/** Tetris Wiki 원본 (y 위 +). 우리 표는 y 부호만 반전이어야 한다 */
const WIKI_JLSTZ: Record<string, [number, number][]> = {
  '01': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '10': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '12': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '21': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '23': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  '32': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '30': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '03': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
}
const WIKI_I: Record<string, [number, number][]> = {
  '01': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  '10': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  '12': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
  '21': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  '23': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  '32': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  '30': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  '03': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
}

describe('③ SRS 킥 표', () => {
  it('8전이 × 5개, wiki 표의 y 반전과 일치', () => {
    for (const [table, wiki] of [
      [KICKS_JLSTZ, WIKI_JLSTZ],
      [KICKS_I, WIKI_I],
    ] as const) {
      expect(Object.keys(table).sort()).toEqual(Object.keys(wiki).sort())
      for (const key of Object.keys(wiki)) {
        expect(table[key]).toHaveLength(5)
        expect(table[key]!.map(([x, y]) => [x, y])).toEqual(wiki[key]!.map(([x, y]) => [x, 0 - y]))
      }
    }
    expect(kicksFor('O', 0, 1)).toEqual([[0, 0]])
    expect(kicksFor('T', 0, 1)).toBe(KICKS_JLSTZ['01'])
    expect(kicksFor('I', 3, 0)).toBe(KICKS_I['30'])
  })
})

describe('④ 킥 적용', () => {
  const settings = { das: 167, arr: 33 }
  it('I 가 왼쪽 벽에 세로로 붙은 채 R→0: (+2,0) 킥', () => {
    const s = createGame({ startLevel: 1, rng: mulberry32(1), das: settings, sequence: ['I'] })
    start(s)
    const p = s.active!
    p.rot = 1
    p.x = -2 // 세로 I 의 셀 x = p.x + 2 = 0 (왼쪽 벽)
    p.y = 10
    expect(tryRotate(s, -1)).toBe(true) // R→0: (0,0) 실패(x=-2..1 중 -2,-1 벽) → (+2,0)
    expect([p.rot, p.x, p.y]).toEqual([0, 0, 10])
  })
  it('T 가 바닥에서 0→R: (0,0) 실패 → (-1,0) 실패 → (-1,-1) 성공', () => {
    const s = createGame({ startLevel: 1, rng: mulberry32(1), das: settings, sequence: ['T'] })
    start(s)
    const p = s.active!
    p.rot = 0
    p.x = 4
    p.y = ROWS - 2 // 셀 y: p.y(위), p.y+1(바닥 행). R 은 y+2 가 필요 → 바닥 밖
    // (-1,0) 도 y+2 가 밖 → 실패, (-1,-1) 성공
    expect(tryRotate(s, 1)).toBe(true)
    expect([p.rot, p.x, p.y]).toEqual([1, 3, ROWS - 3])
  })
  it('다섯 킥이 전부 실패하면 아무것도 바뀌지 않는다', () => {
    const s = createGame({ startLevel: 1, rng: mulberry32(1), das: settings, sequence: ['I'] })
    start(s)
    // 보드를 가득 채우고 I 자리만 비운다
    s.board.fill(1)
    const p = s.active!
    p.rot = 0
    p.x = 3
    p.y = 10
    for (const dx of [0, 1, 2, 3]) s.board[(p.y + 1) * COLS + p.x + dx] = 0
    const before = { ...p }
    expect(tryRotate(s, 1)).toBe(false)
    expect(tryRotate(s, -1)).toBe(false)
    expect(s.active).toEqual(before)
  })
})
