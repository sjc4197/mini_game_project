import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cheese } from '@/characters/cheese'
import type { LineKey } from '@/characters/types'
import type { Mood } from '@/pixel/types'
import { bubbleDuration, createMascotReactor, type MascotReactorOptions } from './mascot'

const L = (key: LineKey): readonly string[] => cheese.lines[key] ?? []

describe('mascot reactor', () => {
  let sink: ReturnType<typeof vi.fn<(mood: Mood, line: string | null) => void>>
  const make = (extra: Partial<MascotReactorOptions> = {}) =>
    createMascotReactor({ character: cheese, sink, random: () => 0, ...extra })
  const last = () => sink.mock.calls.at(-1)

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
    sink = vi.fn()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('말풍선 시간은 글자 수 비례, 1.5~5초', () => {
    expect(bubbleDuration('')).toBe(1500)
    expect(bubbleDuration('x'.repeat(11))).toBe(900 + 90 * 11)
    expect(bubbleDuration('x'.repeat(100))).toBe(5000)
  })

  it('이벤트 → 표정 + 대사. 말풍선이 끝나면 대사만 사라지고 hold 뒤에 idle', () => {
    const r = make()
    r.react('game.good', { line: '좋아' }) // bubble 1500, hold 2000
    expect(last()).toEqual(['happy', '좋아'])
    vi.advanceTimersByTime(1500)
    expect(last()).toEqual(['happy', null])
    vi.advanceTimersByTime(500)
    expect(last()).toEqual(['idle', null])
  })

  it('대사가 hold 보다 길면 표정도 말풍선이 끝날 때까지 유지', () => {
    const r = make()
    const text = 'x'.repeat(40) // 4500ms > hold 2000
    r.react('game.good', { line: text })
    vi.advanceTimersByTime(4499)
    expect(r.mood).toBe('happy')
    vi.advanceTimersByTime(1)
    expect(r.mood).toBe('idle')
    expect(r.line).toBeNull()
  })

  it('쿨다운 안의 같은 이벤트는 버린다 (수다 설정이 계수를 곱한다)', () => {
    const r = make()
    r.react('game.good', { line: 'a' })
    vi.advanceTimersByTime(1000)
    r.react('game.good', { line: 'b' })
    expect(r.line).toBe('a')
    vi.advanceTimersByTime(3000) // t=4000 ≥ cooldown 4000
    r.react('game.good', { line: 'b' })
    expect(r.line).toBe('b')

    const chatty = make({ getChatter: () => 'chatty' })
    chatty.react('game.good', { line: 'a' })
    vi.advanceTimersByTime(2000)
    chatty.react('game.good', { line: 'b' })
    expect(chatty.line).toBe('b')

    const quiet = make({ getChatter: () => 'quiet' })
    quiet.react('game.great', { line: 'a' })
    vi.advanceTimersByTime(3000)
    quiet.react('game.great', { line: 'b' }) // normal 이면 2000 지나 재생, quiet 는 4000
    expect(quiet.line).toBeNull()
    vi.advanceTimersByTime(1000)
    quiet.react('game.great', { line: 'b' })
    expect(quiet.line).toBe('b')
  })

  it('쿨다운은 lineKey 별이라 로비에서 다른 카드로 옮기면 바로 말한다', () => {
    const r = make()
    r.react('ui.lobby.hover', { lineKey: 'lobby:minesweeper' })
    const first = r.line
    r.react('ui.lobby.hover', { lineKey: 'lobby:tetris' })
    expect(r.line).not.toBe(first)
    expect(L('lobby:tetris')).toContain(r.line)
    r.react('ui.lobby.hover', { lineKey: 'lobby:minesweeper' })
    expect(L('lobby:tetris')).toContain(r.line)
  })

  it('낮은 우선순위는 대기열에 두고 말풍선이 1.5초 안에 끝나면 재생', () => {
    const r = make()
    r.react('game.start', { line: 'x'.repeat(10) }) // bubble 1800
    vi.advanceTimersByTime(1000)
    r.react('game.think', { line: 't' })
    expect(r.line).not.toBe('t')
    vi.advanceTimersByTime(800)
    expect(last()).toEqual(['think', 't'])
  })

  it('대기열 이벤트가 1.5초 넘게 기다리면 폐기', () => {
    const r = make()
    r.react('game.start', { line: 'x'.repeat(10) }) // bubble 1800
    vi.advanceTimersByTime(100)
    r.react('game.think', { line: 't' })
    vi.advanceTimersByTime(1700)
    expect(last()).toEqual(['happy', null])
    vi.advanceTimersByTime(10_000)
    expect(sink.mock.calls.some(([m]) => m === 'think')).toBe(false)
  })

  it('높은 우선순위는 즉시 교체하고 대기열을 비운다', () => {
    const r = make()
    r.react('game.start', { line: 's' })
    r.react('game.think', { line: 't' }) // 대기
    r.react('game.great', { line: 'G' })
    expect(last()).toEqual(['win', 'G'])
    vi.advanceTimersByTime(10_000)
    expect(sink.mock.calls.some(([m]) => m === 'think')).toBe(false)
  })

  it('sticky(실패/승리)는 clear() 까지 유지하고 낮은 이벤트를 버린다', () => {
    const r = make()
    r.react('game.fail', { line: 'f' })
    vi.advanceTimersByTime(10_000)
    expect(r.mood).toBe('sad')
    r.react('game.good', { line: 'g' })
    expect(r.mood).toBe('sad')
    expect(r.line).toBeNull()
    r.clear()
    expect(last()).toEqual(['idle', null])
    r.react('game.good', { line: 'g' })
    expect(last()).toEqual(['happy', 'g'])
  })

  it('quiet 는 우선순위 2 미만의 대사를 생략하지만 표정은 바꾼다', () => {
    const r = make({ getChatter: () => 'quiet' })
    r.react('game.good', { line: 'g' })
    expect(last()).toEqual(['happy', null])
    r.react('game.great', { line: 'G' })
    expect(last()).toEqual(['win', 'G'])
  })

  it('대사표에서 최근 2개를 피해 고른다', () => {
    const r = make()
    const pool = L('game.start')
    expect(pool.length).toBe(3)
    const picked: (string | null)[] = []
    for (let i = 0; i < 4; i++) {
      r.react('game.start')
      picked.push(r.line)
    }
    expect(picked).toEqual([pool[0], pool[1], pool[2], pool[0]])
  })

  it('idleEveryMs 가 지나면 스스로 ui.idle 을 말하며 식빵 자세로 쉰다', () => {
    const r = make({ idleEveryMs: 1000 })
    vi.advanceTimersByTime(999)
    expect(sink).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(last()?.[0]).toBe('loaf')
    expect(L('ui.idle')).toContain(last()?.[1])
    vi.advanceTimersByTime(10_000)
    expect(r.mood).toBe('loaf') // 다음 이벤트까지 식빵 자세 유지
    r.react('ui.lobby.hover', { line: 'h' })
    expect(r.mood).toBe('idle') // 말만 하는 이벤트도 식빵 자세는 깨운다
    r.dispose()
  })

  it('setMood / say / dispose', () => {
    const r = make()
    r.setMood('worried')
    expect(last()).toEqual(['worried', null])
    r.setMood('think', 500)
    vi.advanceTimersByTime(500)
    expect(last()).toEqual(['idle', null])
    r.say('hi')
    expect(last()).toEqual(['idle', 'hi'])
    const calls = sink.mock.calls.length
    r.dispose()
    vi.advanceTimersByTime(10_000)
    r.react('game.good')
    expect(sink.mock.calls.length).toBe(calls)
  })
})
