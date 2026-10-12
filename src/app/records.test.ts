import { describe, expect, it } from 'vitest'
import type { ScoringSpec } from '@/games/types'
import { HISTORY_MAX, latestBest, mergeResult, totalPlays } from './records'

const lowerWin: ScoringSpec = { betterIs: 'lower', countsWhen: 'win', format: String }
const higherAny: ScoringSpec = { betterIs: 'higher', countsWhen: 'any', format: String }

describe('mergeResult', () => {
  it('첫 승리는 기록이 되고 plays/wins/history 가 쌓인다', () => {
    const r = mergeResult(undefined, { outcome: 'win', score: 5000, durationMs: 5000 }, lowerWin, 'cheese', 1000)
    expect(r.isRecord).toBe(true)
    expect(r.entry.best).toEqual({ value: 5000, characterId: 'cheese', date: new Date(1000).toISOString() })
    expect([r.entry.plays, r.entry.wins, r.entry.lastScore, r.entry.lastPlayedAt]).toEqual([1, 1, 5000, 1000])
    expect(r.entry.history).toEqual([{ score: 5000, outcome: 'win', characterId: 'cheese', at: 1000 }])
  })

  it('lower: 더 짧은 시간만 best 갱신, 패배는 countsWhen=win 이면 best 를 건드리지 않는다', () => {
    let { entry } = mergeResult(undefined, { outcome: 'win', score: 5000, durationMs: 0 }, lowerWin, 'a', 1)
    let r = mergeResult(entry, { outcome: 'win', score: 6000, durationMs: 0 }, lowerWin, 'b', 2)
    expect(r.isRecord).toBe(false)
    expect(r.entry.best?.value).toBe(5000)
    r = mergeResult(r.entry, { outcome: 'lose', score: 100, durationMs: 0 }, lowerWin, 'b', 3)
    expect(r.isRecord).toBe(false)
    expect(r.entry.best?.value).toBe(5000)
    expect([r.entry.plays, r.entry.wins]).toEqual([3, 2])
    r = mergeResult(r.entry, { outcome: 'win', score: 4000, durationMs: 0 }, lowerWin, 'b', 4)
    expect(r.isRecord).toBe(true)
    expect(r.entry.best).toMatchObject({ value: 4000, characterId: 'b' })
    entry = r.entry
    expect(entry.history[0]?.score).toBe(4000)
  })

  it('higher/any: 패배 점수도 best 가 될 수 있다', () => {
    const a = mergeResult(undefined, { outcome: 'lose', score: 300, durationMs: 0 }, higherAny, 'a', 1)
    expect(a.isRecord).toBe(true)
    const b = mergeResult(a.entry, { outcome: 'lose', score: 200, durationMs: 0 }, higherAny, 'a', 2)
    expect(b.isRecord).toBe(false)
    const c = mergeResult(b.entry, { outcome: 'win', score: 900, durationMs: 0 }, higherAny, 'a', 3)
    expect(c.isRecord).toBe(true)
    expect(c.entry.best?.value).toBe(900)
  })

  it('history 는 최근 HISTORY_MAX 개만, 원본 entry 는 바뀌지 않는다', () => {
    let entry = mergeResult(undefined, { outcome: 'win', score: 1, durationMs: 0 }, higherAny, 'a', 0).entry
    const first = entry
    for (let i = 1; i <= HISTORY_MAX + 3; i++)
      entry = mergeResult(entry, { outcome: 'win', score: i, durationMs: 0 }, higherAny, 'a', i).entry
    expect(entry.history).toHaveLength(HISTORY_MAX)
    expect(entry.history[0]?.at).toBe(HISTORY_MAX + 3)
    expect(first.history).toHaveLength(1)
    expect(first.plays).toBe(1)
  })
})

describe('totalPlays / latestBest', () => {
  it('합계와 최근 난이도 best', () => {
    const e1 = mergeResult(undefined, { outcome: 'win', score: 10, durationMs: 0 }, lowerWin, 'a', 100).entry
    const e2 = mergeResult(undefined, { outcome: 'lose', score: 10, durationMs: 0 }, lowerWin, 'a', 200).entry
    const e3 = mergeResult(undefined, { outcome: 'win', score: 30, durationMs: 0 }, lowerWin, 'a', 300).entry
    expect(totalPlays({ ms: { easy: e1, normal: e2 }, t: { lv1: e3 } })).toEqual({ plays: 3, wins: 2 })
    expect(latestBest({ easy: e1, normal: e2, hard: e3 })?.difficulty).toBe('hard')
    expect(latestBest({ normal: e2 })).toBeNull()
    expect(latestBest(undefined)).toBeNull()
  })
})
