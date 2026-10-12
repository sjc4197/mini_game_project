import { describe, expect, it } from 'vitest'
import { LOBBY_SLOTS, UPCOMING, lobbyEntries } from './registry'
import type { GameModule } from './types'

const stub = (id: string, devOnly = false): GameModule => ({
  id,
  title: id,
  description: '',
  difficulties: [{ id: 'd', label: 'd' }],
  defaultDifficulty: 'd',
  hud: [],
  scoring: { betterIs: 'higher', countsWhen: 'any', format: String },
  controls: { keyboard: [] },
  logical: { w: 1, h: 1 },
  devOnly,
  create: () => {
    throw new Error('stub')
  },
})

describe('lobbyEntries', () => {
  it('모듈이 없으면 예정 게임 + 빈 슬롯으로 LOBBY_SLOTS 칸, 전부 잠김', () => {
    const entries = lobbyEntries([])
    expect(entries).toHaveLength(Math.max(LOBBY_SLOTS, UPCOMING.length))
    expect(entries.slice(0, UPCOMING.length).map((e) => e.id)).toEqual(UPCOMING.map((u) => u.id))
    expect(entries.every((e) => e.module === null)).toBe(true)
    expect(entries[0]?.icon).toBeDefined()
  })

  it('등록된 모듈이 예정 자리를 열고, 그 외 모듈은 뒤에 붙는다', () => {
    const tetris = stub('tetris')
    const sample = stub('sample', true)
    const entries = lobbyEntries([sample, tetris])
    const planned = UPCOMING.map((u) => u.id)
    expect(entries.map((e) => e.id)).toEqual([...planned, 'sample'])
    expect(entries[0]?.module).toBeNull()
    expect(entries[planned.indexOf('tetris')]?.module).toBe(tetris)
    expect(entries[planned.indexOf('omok')]?.module).toBeNull()
    expect(entries[planned.length]?.module).toBe(sample)
  })

  it('예정 게임이 슬롯보다 적으면 빈 슬롯으로 채운다', () => {
    const entries = lobbyEntries([], UPCOMING.slice(0, 2))
    expect(entries).toHaveLength(LOBBY_SLOTS)
    expect(entries.slice(2).every((e) => e.id.startsWith('soon-') && e.module === null)).toBe(true)
  })

  it('모듈이 슬롯보다 많으면 전부 노출', () => {
    const many = [...UPCOMING.map((u) => u.id), 'a', 'b', 'c'].map((id) => stub(id))
    expect(lobbyEntries(many)).toHaveLength(UPCOMING.length + 3)
  })
})
