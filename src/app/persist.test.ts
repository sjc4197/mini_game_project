import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PERSISTED,
  DEFAULT_SETTINGS,
  createSafeStorage,
  migratePersisted,
  sanitizePersisted,
  sanitizeSettings,
} from './persist'

describe('sanitizeSettings', () => {
  it('빈 값/엉뚱한 타입 → 기본값', () => {
    expect(sanitizeSettings(undefined)).toEqual(DEFAULT_SETTINGS)
    expect(sanitizeSettings('garbage')).toEqual(DEFAULT_SETTINGS)
    expect(sanitizeSettings({ sound: 'yes', volume: 'loud', uiScale: 7 })).toEqual(DEFAULT_SETTINGS)
  })
  it('부분 객체는 누락 키를 기본값으로 메운다 (중첩 tetris 포함)', () => {
    const s = sanitizeSettings({ crt: true, tetris: { das: 100 } })
    expect(s.crt).toBe(true)
    expect(s.tetris).toEqual({ das: 100, arr: 33 })
    expect(s.sound).toBe(true)
  })
  it('범위를 벗어난 숫자는 클램프', () => {
    expect(sanitizeSettings({ volume: 5 }).volume).toBe(1)
    expect(sanitizeSettings({ volume: -1 }).volume).toBe(0)
    expect(sanitizeSettings({ tetris: { arr: 999 } }).tetris.arr).toBe(200)
  })
  it('열거형 값은 목록에 있는 것만 통과', () => {
    expect(sanitizeSettings({ uiScale: 3 }).uiScale).toBe(3)
    expect(sanitizeSettings({ uiScale: '3' }).uiScale).toBe('auto')
    expect(sanitizeSettings({ chatter: 'chatty' }).chatter).toBe('chatty')
    expect(sanitizeSettings({ chatter: 'loud' }).chatter).toBe('normal')
  })
})

describe('sanitizePersisted / migratePersisted', () => {
  it('손상 데이터 → 기본 상태, 절대 throw 하지 않음', () => {
    expect(sanitizePersisted(null)).toEqual(DEFAULT_PERSISTED)
    expect(sanitizePersisted([1, 2, 3])).toEqual(DEFAULT_PERSISTED)
    expect(migratePersisted({ selectedCharacterId: 42 }, 0)).toEqual(DEFAULT_PERSISTED)
  })
  it('유효한 값은 보존', () => {
    const out = sanitizePersisted({
      selectedCharacterId: 'peong',
      settings: { crt: true },
      records: { minesweeper: {} },
    })
    expect(out.selectedCharacterId).toBe('peong')
    expect(out.settings.crt).toBe(true)
    expect(out.records).toEqual({ minesweeper: {} })
  })
})

describe('createSafeStorage', () => {
  it('storage 가 없으면 null/무시', () => {
    const s = createSafeStorage(() => undefined)
    expect(s.getItem('k')).toBeNull()
    expect(() => s.setItem('k', 'v')).not.toThrow()
    expect(() => s.removeItem('k')).not.toThrow()
  })
  it('storage 가 throw 해도 삼킨다 (쿼터 초과·프라이빗 모드)', () => {
    const throwing = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('quota')
      },
      removeItem: () => {
        throw new Error('blocked')
      },
    } as unknown as Storage
    const s = createSafeStorage(() => throwing)
    expect(s.getItem('k')).toBeNull()
    expect(() => s.setItem('k', 'v')).not.toThrow()
    expect(() => s.removeItem('k')).not.toThrow()
  })
  it('정상 storage 는 그대로 위임', () => {
    const map = new Map<string, string>()
    const mem = {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => void map.set(k, v),
      removeItem: (k: string) => void map.delete(k),
    } as unknown as Storage
    const s = createSafeStorage(() => mem)
    s.setItem('a', '1')
    expect(s.getItem('a')).toBe('1')
    s.removeItem('a')
    expect(s.getItem('a')).toBeNull()
  })
})
