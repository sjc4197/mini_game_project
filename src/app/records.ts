import type { GameResult, ScoringSpec } from '@/games/types'
import type { GameRecords, RecordEntry } from './store'

export const HISTORY_MAX = 10

/** 전체 플레이/클리어 합계 (로비 마스코트 패널) */
export function totalPlays(all: Record<string, GameRecords>): { plays: number; wins: number } {
  let plays = 0
  let wins = 0
  for (const byDifficulty of Object.values(all)) {
    for (const entry of Object.values(byDifficulty)) {
      plays += entry.plays
      wins += entry.wins
    }
  }
  return { plays, wins }
}

/** 가장 최근에 플레이한 난이도의 best (로비 카드 한 줄 표시용). best 가 없으면 null */
export function latestBest(
  byDifficulty: GameRecords | undefined,
): { difficulty: string; entry: RecordEntry } | null {
  if (!byDifficulty) return null
  let latest: { difficulty: string; entry: RecordEntry } | null = null
  for (const [difficulty, entry] of Object.entries(byDifficulty)) {
    if (!entry.best) continue
    if (!latest || entry.lastPlayedAt > latest.entry.lastPlayedAt) latest = { difficulty, entry }
  }
  return latest
}

export const EMPTY_ENTRY: RecordEntry = {
  best: null,
  plays: 0,
  wins: 0,
  lastScore: null,
  lastPlayedAt: 0,
  history: [],
}

/**
 * 결과 1건을 기록에 합친다 (순수). best 갱신 조건은 ScoringSpec(betterIs / countsWhen).
 * isRecord = 이번 결과로 best 가 바뀜 (첫 기록 포함).
 */
export function mergeResult(
  prev: RecordEntry | undefined,
  result: GameResult,
  scoring: ScoringSpec,
  characterId: string,
  now: number,
): { entry: RecordEntry; isRecord: boolean } {
  const entry: RecordEntry = prev
    ? { ...prev, history: prev.history.slice() }
    : { ...EMPTY_ENTRY, history: [] }
  entry.plays += 1
  if (result.outcome === 'win') entry.wins += 1
  entry.lastScore = result.score
  entry.lastPlayedAt = now
  entry.history.unshift({ score: result.score, outcome: result.outcome, characterId, at: now })
  if (entry.history.length > HISTORY_MAX) entry.history.length = HISTORY_MAX

  let isRecord = false
  const counts = scoring.countsWhen === 'any' || result.outcome === 'win'
  if (counts) {
    const better =
      !entry.best ||
      (scoring.betterIs === 'lower'
        ? result.score < entry.best.value
        : result.score > entry.best.value)
    if (better) {
      entry.best = { value: result.score, characterId, date: new Date(now).toISOString() }
      isRecord = true
    }
  }
  return { entry, isRecord }
}
