import { describe, expect, it } from 'vitest'
import { mulberry32, randInt } from './rng'

describe('mulberry32', () => {
  it('같은 시드 → 같은 수열, 다른 시드 → 다른 수열', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    const c = mulberry32(43)
    const sa = Array.from({ length: 5 }, () => a())
    const sb = Array.from({ length: 5 }, () => b())
    const sc = Array.from({ length: 5 }, () => c())
    expect(sa).toEqual(sb)
    expect(sa).not.toEqual(sc)
  })
  it('[0, 1) 범위, randInt 는 0..n-1', () => {
    const r = mulberry32(1)
    for (let i = 0; i < 10_000; i++) {
      const v = r()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
    const seen = new Set<number>()
    for (let i = 0; i < 1000; i++) seen.add(randInt(r, 4))
    expect([...seen].sort()).toEqual([0, 1, 2, 3])
  })
})
