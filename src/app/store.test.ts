import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from './persist'
import { useStore } from './store'

// node 환경: localStorage 가 없으므로 safeStorage 가 조용히 무시 → 기본값으로 시작
beforeEach(() => {
  useStore.setState({
    screen: { kind: 'boot' },
    selectedCharacterId: null,
    settings: DEFAULT_SETTINGS,
    records: {},
  })
})

describe('useStore', () => {
  it('기본 상태', () => {
    const s = useStore.getState()
    expect(s.screen).toEqual({ kind: 'boot' })
    expect(s.selectedCharacterId).toBeNull()
    expect(s.settings).toEqual(DEFAULT_SETTINGS)
  })
  it('navigate / back', () => {
    useStore.getState().navigate({ kind: 'settings', from: 'lobby' })
    expect(useStore.getState().screen).toEqual({ kind: 'settings', from: 'lobby' })
    useStore.getState().back()
    expect(useStore.getState().screen).toEqual({ kind: 'lobby' })
  })
  it('updateSettings 는 중첩 tetris 를 보존하며 병합', () => {
    useStore.getState().updateSettings({ crt: true, tetris: { das: 120, arr: 33 } })
    useStore.getState().updateSettings({ volume: 0.5 })
    const s = useStore.getState().settings
    expect(s.crt).toBe(true)
    expect(s.volume).toBe(0.5)
    expect(s.tetris).toEqual({ das: 120, arr: 33 })
  })
  it('setRecord / resetRecords', () => {
    const entry = {
      best: { value: 31000, characterId: 'peong', date: '2026-10-07' },
      plays: 1,
      wins: 1,
      lastScore: 31000,
      lastPlayedAt: 1,
      history: [],
    }
    useStore.getState().setRecord('minesweeper', 'beginner', entry)
    useStore.getState().setRecord('tetris', 'lv1', { ...entry, best: null })
    expect(useStore.getState().records.minesweeper?.beginner).toEqual(entry)
    useStore.getState().resetRecords('minesweeper')
    expect(useStore.getState().records.minesweeper).toBeUndefined()
    expect(useStore.getState().records.tetris).toBeDefined()
    useStore.getState().resetRecords()
    expect(useStore.getState().records).toEqual({})
  })
})
