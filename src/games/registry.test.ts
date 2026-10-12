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
    expect(entries).toHaveLength(LOBBY_SLOTS)
    expect(entries.slice(0, UPCOMING.length).map((e) => e.id)).toEqual(UPCOMING.map((u) => u.id))
    expect(entries.every((e) => e.module === null)).toBe(true)
    expect(entries[0]?.icon).toBeDefined()
  })

  it('등록된 모듈이 예정 자리를 열고, 그 외 모듈은 뒤에 붙는다', () => {
    const tetris = stub('tetris')
    const sample = stub('sample', true)
    const entries = lobbyEntries([sample, tetris])
    expect(entries.map((e) => e.id)).toEqual(['minesweeper', 'tetris', 'sample', 'soon-3'])
    expect(entries[0]?.module).toBeNull()
    expect(entries[1]?.module).toBe(tetris)
    expect(entries[2]?.module).toBe(sample)
    expect(entries[3]?.module).toBeNull()
  })

  it('모듈이 슬롯보다 많으면 전부 노출', () => {
    const many = ['minesweeper', 'tetris', 'a', 'b', 'c'].map((id) => stub(id))
    expect(lobbyEntries(many)).toHaveLength(5)
  })
})
