import { beforeEach, describe, expect, it, vi } from 'vitest'
import { InputService } from './input'

const key = (code: string, repeat = false) => ({ code, repeat, preventDefault: vi.fn() })

let svc: InputService
let t = 0

beforeEach(() => {
  svc = new InputService()
  t = 1000
  svc.now = () => t
})

describe('이벤트 API', () => {
  it('현재 스코프에 등록된 구독자만 호출되고, true 를 돌려주면 preventDefault', () => {
    const ui = vi.fn(() => true)
    const game = vi.fn()
    svc.on('confirm', ui, { scope: 'ui' })
    svc.on('confirm', game, { scope: 'game' })
    const e = key('Enter')
    svc.keydown(e)
    expect(ui).toHaveBeenCalledWith('confirm')
    expect(game).not.toHaveBeenCalled()
    expect(e.preventDefault).toHaveBeenCalled()
  })
  it('구독 해제', () => {
    const cb = vi.fn()
    const off = svc.on('back', cb, { scope: ['ui', 'overlay'] })
    svc.keydown(key('Escape'))
    off()
    svc.keydown(key('Escape'))
    expect(cb).toHaveBeenCalledTimes(1)
  })
  it('e.repeat 는 무시, 한 키가 여러 액션을 발화 (Space = confirm + hardDrop + chord)', () => {
    const confirm = vi.fn()
    const hard = vi.fn()
    svc.on('confirm', confirm, { scope: 'ui' })
    svc.on('hardDrop', hard, { scope: 'ui' })
    svc.keydown(key('Space', true))
    expect(confirm).not.toHaveBeenCalled()
    svc.keydown(key('Space'))
    expect(confirm).toHaveBeenCalledTimes(1)
    expect(hard).toHaveBeenCalledTimes(1)
  })
  it('UI 스코프에서는 구독자가 소비하지 않으면 기본 동작을 막지 않는다, game 스코프에선 방향키/Space 를 막는다', () => {
    const e1 = key('ArrowDown')
    svc.keydown(e1)
    expect(e1.preventDefault).not.toHaveBeenCalled()
    svc.setScope('game')
    const e2 = key('ArrowDown')
    svc.keydown(e2)
    expect(e2.preventDefault).toHaveBeenCalled()
    const e3 = key('KeyZ')
    svc.keydown(e3)
    expect(e3.preventDefault).not.toHaveBeenCalled()
  })
})

describe('폴링 API (game 스코프)', () => {
  it('ui 스코프에서는 전부 비활성', () => {
    svc.keydown(key('ArrowLeft'))
    expect(svc.isDown('left')).toBe(false)
    expect(svc.takePress('left')).toBe(false)
    expect(svc.heldMs('left')).toBeNull()
  })
  it('isDown / heldMs / keyup', () => {
    svc.setScope('game')
    svc.keydown(key('ArrowLeft'))
    expect(svc.isDown('left')).toBe(true)
    t = 1200
    expect(svc.heldMs('left')).toBe(200)
    svc.keyup({ code: 'ArrowLeft' })
    expect(svc.isDown('left')).toBe(false)
    expect(svc.heldMs('left')).toBeNull()
  })
  it('takePress 는 한 번만 true', () => {
    svc.setScope('game')
    svc.keydown(key('Space'))
    expect(svc.takePress('hardDrop')).toBe(true)
    expect(svc.takePress('hardDrop')).toBe(false)
    svc.keydown(key('Space'))
    svc.keydown(key('Space'))
    expect(svc.takePress('hardDrop')).toBe(true) // 밀린 입력은 1회로 합쳐짐
    expect(svc.takePress('hardDrop')).toBe(false)
  })
  it('lastPressed: 나중에 누른 방향이 우선, 떼면 남은 쪽', () => {
    svc.setScope('game')
    svc.keydown(key('ArrowLeft'))
    t = 1050
    svc.keydown(key('ArrowRight'))
    expect(svc.lastPressed('left', 'right')).toBe('right')
    svc.keyup({ code: 'ArrowRight' })
    expect(svc.lastPressed('left', 'right')).toBe('left')
    svc.keyup({ code: 'ArrowLeft' })
    expect(svc.lastPressed('left', 'right')).toBeNull()
  })
  it('스코프 전환/releaseAll 로 눌린 키와 미소비 입력이 사라진다', () => {
    svc.setScope('game')
    svc.keydown(key('ArrowLeft'))
    svc.keydown(key('Space'))
    svc.setScope('overlay')
    svc.setScope('game')
    expect(svc.isDown('left')).toBe(false)
    expect(svc.takePress('hardDrop')).toBe(false)
  })
})
