/**
 * 게임 모듈 ↔ 셸 경계 계약의 단일 출처.
 * 1단계에서는 기록/세션이 필요로 하는 결과 타입만 두고, 6단계에서 GameModule/GameInstance/GameHost 를 채운다.
 */
export type Outcome = 'win' | 'lose' | 'quit'

export interface GameResult {
  outcome: Outcome
  /** 지뢰찾기: 경과 ms, 테트리스: 점수 — 해석은 ScoringSpec 이 담당 */
  score: number
  durationMs: number
  /** 결과 화면용 부가 통계 (lines, level, tetrises …) */
  stats?: Record<string, number>
}

export interface ScoringSpec {
  betterIs: 'lower' | 'higher'
  /** best 갱신 조건: 승리 시만(지뢰찾기) / 항상(테트리스) */
  countsWhen: 'win' | 'any'
  format(value: number): string
}
