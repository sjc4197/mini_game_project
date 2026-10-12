import { describe, expect, it } from 'vitest'
import { AudioService } from './audio'
import { DEFAULT_GAIN, SFX, SFX_NAMES, recipeDuration } from './sfx'

describe('SFX 레시피', () => {
  it('17개 전부 스텝/주파수/길이/게인이 유효', () => {
    expect(SFX_NAMES).toHaveLength(17)
    for (const name of SFX_NAMES) {
      const r = SFX[name]
      expect(r.steps.length, name).toBeGreaterThan(0)
      for (const s of r.steps) {
        expect(s.freq, name).toBeGreaterThan(0)
        expect(s.ms, name).toBeGreaterThan(0)
        if (s.slide !== undefined) expect(s.slide, name).toBeGreaterThan(0)
      }
      expect(r.gain ?? DEFAULT_GAIN, name).toBeLessThanOrEqual(1)
      expect(recipeDuration(r), name).toBeLessThanOrEqual(800)
    }
    expect(recipeDuration(SFX.win)).toBe(510)
    expect(recipeDuration(SFX.select)).toBe(25)
  })
})

describe('AudioService (컨텍스트 없는 환경)', () => {
  it('언락 전에는 play/apply 가 아무것도 하지 않고 throw 도 없다', () => {
    const svc = new AudioService()
    expect(svc.ready).toBe(false)
    expect(() => svc.apply({ sound: false, volume: 0.5 })).not.toThrow()
    expect(() => svc.play('confirm')).not.toThrow()
  })
})
