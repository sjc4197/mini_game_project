import { describe, expect, it } from 'vitest'
import { parentOf, screenKey, type Screen } from './screen'

describe('screenKey', () => {
  it('게임/dev 는 파라미터를 키에 포함', () => {
    expect(screenKey({ kind: 'game', gameId: 'tetris', difficulty: 'lv5' })).toBe('game:tetris:lv5')
    expect(screenKey({ kind: 'dev', page: 'tokens' })).toBe('dev:tokens')
  })
  it('나머지는 kind 그대로', () => {
    expect(screenKey({ kind: 'records', gameId: 'tetris' })).toBe('records')
    expect(screenKey({ kind: 'settings', from: 'lobby' })).toBe('settings')
  })
})

describe('parentOf', () => {
  const cases: [Screen, Screen][] = [
    [{ kind: 'select' }, { kind: 'title' }],
    [{ kind: 'lobby' }, { kind: 'select' }],
    [{ kind: 'records' }, { kind: 'lobby' }],
    [{ kind: 'settings', from: 'lobby' }, { kind: 'lobby' }],
    [{ kind: 'settings', from: 'title' }, { kind: 'title' }],
    [{ kind: 'game', gameId: 'x', difficulty: 'y' }, { kind: 'title' }],
    [{ kind: 'dev', page: 'gallery' }, { kind: 'title' }],
  ]
  it.each(cases)('%o → %o', (from, to) => {
    expect(parentOf(from)).toEqual(to)
  })
})
