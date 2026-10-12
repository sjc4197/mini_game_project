/**
 * 게임 모듈 ↔ 셸 경계 계약의 단일 출처.
 * 게임은 이 파일의 타입만 알고, React/스토어/오디오 구현은 모른다 (호스트가 브리지).
 */
import type { InputService } from '@/app/input/input'
import type { Settings } from '@/app/store'
import type { CharacterDef, LineKey } from '@/characters/types'
import type { Mood, SpriteDef } from '@/pixel/types'

export type Outcome = 'win' | 'lose' | 'quit'

export interface GameResult {
  outcome: Outcome
  /** 지뢰찾기: 경과 ms, 테트리스: 점수 — 해석은 ScoringSpec 이 담당 */
  score: number
  durationMs: number
  /** 결과 화면용 부가 통계 (lines, level, tetrises …) */
  stats?: Record<string, number>
  /** 결과창 제목 덮어쓰기 (예: 2인 대전 '흑 승리!'). 없으면 outcome 에 따라 클리어/게임 오버 */
  title?: string
  /** 제목 색. 없으면 outcome 에 따라 win/lose */
  tone?: 'win' | 'lose' | 'neutral'
  /** 점수 라벨 덮어쓰기 (기본: 승리 '기록', 시간 기반 '시간', 그 외 '점수') */
  scoreLabel?: string
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

/** 효과음 이름 (레시피는 docs/02 부록 C, 구현은 7단계 app/audio) */
export type SfxName =
  | 'select'
  | 'confirm'
  | 'back'
  | 'deny'
  | 'reveal'
  | 'flood'
  | 'flag'
  | 'boom'
  | 'win'
  | 'move'
  | 'rotate'
  | 'drop'
  | 'lock'
  | 'clear'
  | 'tetris'
  | 'levelup'
  | 'gameover'

export type MascotPriority = 0 | 1 | 2 | 3

export interface MascotReactOptions {
  /** 대사표 대신 이 문장을 그대로 */
  line?: string
  /** 이벤트 기본 키 대신 이 키의 대사표 (예: 'lobby:tetris') */
  lineKey?: LineKey
  /** 표정 유지 시간(ms) 덮어쓰기 */
  hold?: number
  priority?: MascotPriority
}

export interface MascotApi {
  react(event: MascotEvent, opts?: MascotReactOptions): void
  /** 말풍선 없이 표정만 (예: 셀을 누르는 동안 worried). holdMs 가 없으면 다음 변경까지 유지 */
  setMood(mood: Mood, holdMs?: number): void
  say(text: string): void
  /** 표정·말풍선·대기열 초기화 (결과창 닫힘 / 재시작 시 프레임이 호출) */
  clear(): void
}

export interface Difficulty {
  id: string
  label: string
  description?: string
}

export interface HudField {
  key: string
  label: string
  format?(value: string | number): string
}

export interface GameControls {
  keyboard: readonly string[]
  mouse?: readonly string[]
}

export type GameInstanceState =
  'created' | 'mounted' | 'running' | 'paused' | 'finished' | 'destroyed'

/** 터치 조작 바 항목: 키 버튼(누르는 동안 keydown 주입) 또는 게임 옵션 토글 */
export type TouchControl =
  | { type: 'key'; id: string; label: string; code: string; wide?: boolean }
  | { type: 'toggle'; id: string; label: string; labelOn: string; option: string }

export interface GameInstance {
  readonly state: GameInstanceState
  mount(el: HTMLElement): void
  /** 터치 바 토글 등 프레임이 넘기는 옵션 */
  setOption?(option: string, value: boolean): void
  start(): void
  pause(): void
  resume(): void
  /** 멱등. 이후 어떤 메서드도 효과 없음 */
  destroy(): void
}

/** 셸이 게임에 넘기는 서비스 묶음 */
export interface GameHost {
  readonly character: CharacterDef
  readonly difficulty: string
  readonly settings: Readonly<Settings>
  readonly mascot: MascotApi
  readonly input: InputService
  readonly audio: { play(name: SfxName): void }
  /** 이 게임·난이도의 현재 최고 기록 값 (없으면 null). 플레이 중 돌파 연출용 */
  readonly best: number | null
  /** rAF 코얼레싱 — 한 프레임에 여러 번 불러도 한 번만 반영 */
  setHUD(patch: Record<string, string | number>): void
  finish(result: GameResult): void
  requestPause(): void
  now(): number
}

export interface GameModule {
  id: string
  title: string
  description: string
  icon?: SpriteDef
  difficulties: readonly Difficulty[]
  defaultDifficulty: string
  hud: readonly HudField[]
  scoring: ScoringSpec
  controls: GameControls
  /** 논리 캔버스 크기(dp) — 프레임이 정수 배율을 정한다 */
  logical: { w: number; h: number }
  /** 터치 기기에서 보드 아래에 띄울 조작 버튼 */
  touchControls?: readonly TouchControl[]
  /** DEV 빌드에서만 로비에 노출 (샘플 게임) */
  devOnly?: boolean
  create(host: GameHost): GameInstance
}
