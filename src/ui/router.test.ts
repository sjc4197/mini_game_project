import { describe, expect, it } from 'vitest'
import { routerReducer, type RouterState } from './router'

const idle: RouterState = { shown: { kind: 'title' }, phase: 'idle', fx: 'fade' }

describe('routerReducer', () => {
  it('목적지가 바뀌면 closing 시작(보여 주는 화면은 그대로), 같으면 그대로', () => {
    expect(routerReducer(idle, { type: 'sync', target: { kind: 'title' }, fx: 'fade' })).toBe(idle)
    const s = routerReducer(idle, { type: 'sync', target: { kind: 'select' }, fx: 'wipe' })
    expect(s).toEqual({ shown: { kind: 'title' }, phase: 'closing', fx: 'wipe' })
  })
  it('closing 끝 → 최신 목적지로 교체하고 opening, opening 끝 → idle', () => {
    let s = routerReducer(idle, { type: 'sync', target: { kind: 'select' }, fx: 'fade' })
    s = routerReducer(s, { type: 'sync', target: { kind: 'lobby' }, fx: 'fade' }) // 전환 중 목적지 변경: 마지막에 반영
    expect(s.phase).toBe('closing')
    expect(s.shown).toEqual({ kind: 'title' })
    s = routerReducer(s, { type: 'end', target: { kind: 'lobby' } })
    expect(s).toEqual({ shown: { kind: 'lobby' }, phase: 'opening', fx: 'fade' })
    s = routerReducer(s, { type: 'end', target: { kind: 'lobby' } })
    expect(s.phase).toBe('idle')
  })
  it('idle 에서 end 는 무시, 게임 화면은 파라미터가 다르면 다른 화면', () => {
    expect(routerReducer(idle, { type: 'end', target: { kind: 'select' } })).toBe(idle)
    const g: RouterState = {
      shown: { kind: 'game', gameId: 'a', difficulty: '1' },
      phase: 'idle',
      fx: 'fade',
    }
    expect(
      routerReducer(g, {
        type: 'sync',
        target: { kind: 'game', gameId: 'a', difficulty: '2' },
        fx: 'wipe',
      }).phase,
    ).toBe('closing')
  })
})
