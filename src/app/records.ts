import type { GameRecords, RecordEntry } from './store'

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
