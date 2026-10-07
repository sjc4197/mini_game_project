import { describe, expect, it } from 'vitest'
import { computeUnit, pickBase } from './metrics'

describe('computeUnit — --u × DPR 는 항상 정수 디바이스 픽셀', () => {
  it('DPR 1 → base 그대로', () => {
    expect(computeUnit(2, 1)).toEqual({ u: 2, uDevice: 2 })
    expect(computeUnit(3, 1)).toEqual({ u: 3, uDevice: 3 })
  })
  it('DPR 1.25 → 2.5 를 3 device px 로 반올림, CSS px 는 2.4', () => {
    expect(computeUnit(2, 1.25)).toEqual({ u: 2.4, uDevice: 3 })
  })
  it('DPR 1.5 → 3 device px, CSS 2px', () => {
    expect(computeUnit(2, 1.5)).toEqual({ u: 2, uDevice: 3 })
  })
  it('DPR 2 → 4 device px', () => {
    expect(computeUnit(2, 2)).toEqual({ u: 2, uDevice: 4 })
  })
  it('base 3, DPR 1.25 → 3.75 → 4 device px → 3.2 CSS px', () => {
    expect(computeUnit(3, 1.25)).toEqual({ u: 3.2, uDevice: 4 })
  })
  it('디바이스 픽셀은 최소 1, 잘못된 DPR 은 1로 취급', () => {
    expect(computeUnit(0.2, 1)).toEqual({ u: 1, uDevice: 1 })
    expect(computeUnit(2, Number.NaN)).toEqual({ u: 2, uDevice: 2 })
    expect(computeUnit(2, 0)).toEqual({ u: 2, uDevice: 2 })
  })
  it('u × dpr 가 정수 (부동소수 오차 범위 내)', () => {
    for (const dpr of [1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3]) {
      const { u, uDevice } = computeUnit(2, dpr)
      expect(Math.abs(u * dpr - uDevice)).toBeLessThan(1e-3)
    }
  })
})

describe('pickBase', () => {
  it('auto: 1800×1000 이상이면 3, 아니면 2', () => {
    expect(pickBase(1920, 1080, 'auto')).toBe(3)
    expect(pickBase(1799, 1080, 'auto')).toBe(2)
    expect(pickBase(1920, 999, 'auto')).toBe(2)
    expect(pickBase(1366, 768, 'auto')).toBe(2)
  })
  it('강제값은 뷰포트와 무관', () => {
    expect(pickBase(800, 600, 3)).toBe(3)
    expect(pickBase(2560, 1440, 2)).toBe(2)
  })
})
