import { describe, expect, it } from 'vitest'
import { clamp, lerp, mod } from './math'

describe('math', () => {
  it('clamp limits to [min, max]', () => {
    expect(clamp(5, 0, 3)).toBe(3)
    expect(clamp(-1, 0, 3)).toBe(0)
    expect(clamp(2, 0, 3)).toBe(2)
  })

  it('lerp interpolates', () => {
    expect(lerp(0, 10, 0.5)).toBe(5)
  })

  it('mod handles negatives', () => {
    expect(mod(-1, 4)).toBe(3)
    expect(mod(5, 4)).toBe(1)
  })
})
