import { describe, expect, it } from 'vitest'
import { PIECES, cellsOf, rotateCcw, rotateCw } from './pieces'
import { PIECE_TYPES, type Rotation } from './types'

describe('① 조각 정의', () => {
  it('모든 (type, rot) 은 셀 4개, 중복 없음, 바운딩 박스 안', () => {
    for (const t of PIECE_TYPES) {
      expect(PIECES[t]).toHaveLength(4)
      for (let r = 0; r < 4; r++) {
        const cells = cellsOf(t, r as Rotation)
        expect(cells).toHaveLength(4)
        const keys = new Set(cells.map(([x, y]) => `${x},${y}`))
        expect(keys.size).toBe(4)
        const size = t === 'I' ? 4 : 3
        for (const [x, y] of cells) {
          expect(x).toBeGreaterThanOrEqual(0)
          expect(y).toBeGreaterThanOrEqual(0)
          expect(x).toBeLessThan(size)
          expect(y).toBeLessThan(size)
        }
      }
    }
  })
})

describe('② 회전 상태', () => {
  it('CW×4 는 원래대로, CW→CCW 는 항등', () => {
    for (let r = 0; r < 4; r++) {
      const rot = r as Rotation
      expect(rotateCw(rotateCw(rotateCw(rotateCw(rot))))).toBe(rot)
      expect(rotateCcw(rotateCw(rot))).toBe(rot)
    }
    expect(rotateCw(3)).toBe(0)
    expect(rotateCcw(0)).toBe(3)
  })
  it('O 는 네 상태가 같고, 나머지는 CW 두 번이 180° 모양(점대칭)', () => {
    for (let r = 0; r < 4; r++) expect(PIECES.O[r]).toEqual(PIECES.O[0])
    const norm = (cells: readonly (readonly [number, number])[]) =>
      cells.map(([x, y]) => `${x},${y}`).sort().join(' ')
    for (const t of ['T', 'S', 'Z', 'J', 'L'] as const) {
      for (let r = 0; r < 4; r++) {
        const a = cellsOf(t, r as Rotation)
        const b = cellsOf(t, rotateCw(rotateCw(r as Rotation)))
        // 3×3 박스 안에서 180° 회전 = (2-x, 2-y)
        const rotated = a.map(([x, y]) => [2 - x, 2 - y] as const)
        expect(norm(rotated)).toBe(norm(b))
      }
    }
  })
})
