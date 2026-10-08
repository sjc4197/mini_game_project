/**
 * 게임 모듈 ↔ 셸 경계 계약의 단일 출처.
 * 1~3단계: 결과/채점/마스코트 이벤트 타입. 6단계에서 GameModule/GameInstance/GameHost 를 채운다.
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

/**
 * 게임이 던지는 "의미 이벤트". 어떤 표정·대사로 반응할지는 마스코트 시스템 + 캐릭터 대사표가 결정한다.
 * (게임을 추가해도 캐릭터 코드를 건드리지 않기 위한 간접층)
 */
export type MascotEvent =
  | 'game.start'
  | 'game.good'
  | 'game.great'
  | 'game.risky'
  | 'game.safe'
  | 'game.mistake'
  | 'game.think'
  | 'game.fail'
  | 'game.win'
  | 'game.record'
  | 'ui.lobby.hover'
  | 'ui.locked'
  | 'ui.idle'
