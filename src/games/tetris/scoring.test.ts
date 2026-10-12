import { describe, expect, it } from 'vitest'
import { comboPoints, gravitySecPerRow, levelFor, linePoints } from './scoring'

describe('⑩ 중력표 / ⑮ 레벨 / 점수 함수', () => {
  it('L1 1.000, L2 0.793, L10 ≈ 0.0642, L20 이상은 고정', () => {
    expect(gravitySecPerRow(1)).toBeCloseTo(1.0, 6)
    expect(gravitySecPerRow(2)).toBeCloseTo(0.793, 3)
    expect(gravitySecPerRow(10)).toBeCloseTo(0.0642, 3)
    expect(gravitySecPerRow(20)).toBe(gravitySecPerRow(25))
    expect(gravitySecPerRow(20)).toBeLessThan(0.001)
    expect(gravitySecPerRow(0)).toBe(gravitySecPerRow(1))
  })
  it('레벨 = 시작 + ⌊라인/10⌋', () => {
    expect(levelFor(1, 0)).toBe(1)
    expect(levelFor(1, 9)).toBe(1)
    expect(levelFor(1, 10)).toBe(2)
    expect(levelFor(5, 23)).toBe(7)
  })
  it('줄 점수 100/300/500/800 × 레벨, 테트리스 B2B ×1.5, 콤보 50×n×레벨', () => {
    expect(linePoints(1, 1, false)).toBe(100)
    expect(linePoints(2, 3, false)).toBe(900)
    expect(linePoints(3, 1, true)).toBe(500)
    expect(linePoints(4, 2, false)).toBe(1600)
    expect(linePoints(4, 1, true)).toBe(1200)
    expect(comboPoints(0, 5)).toBe(0)
    expect(comboPoints(1, 2)).toBe(100)
    expect(comboPoints(3, 1)).toBe(150)
  })
})
