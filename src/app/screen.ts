/** 화면 상태 머신. 라우터 라이브러리 없음, URL 해시 동기화 없음(DEV 의 #dev 만 예외) */
export type DevPage = 'tokens' | 'gallery'

export type Screen =
  | { kind: 'boot' }
  | { kind: 'title' }
  | { kind: 'select' }
  | { kind: 'lobby' }
  | { kind: 'game'; gameId: string; difficulty: string }
  | { kind: 'records'; gameId?: string }
  | { kind: 'settings'; from: 'title' | 'lobby' }
  | { kind: 'dev'; page: DevPage }

/** 같은 키면 "같은 화면" — 전환 커튼을 띄울지 판단하는 기준 */
export function screenKey(s: Screen): string {
  switch (s.kind) {
    case 'game':
      return `game:${s.gameId}:${s.difficulty}`
    case 'dev':
      return `dev:${s.page}`
    default:
      return s.kind
  }
}

/** Esc / 뒤로가기 목적지. 게임 화면은 일시정지 오버레이가 처리하므로 여기 없음 */
export function parentOf(s: Screen): Screen {
  switch (s.kind) {
    case 'select':
      return { kind: 'title' }
    case 'lobby':
      return { kind: 'select' }
    case 'records':
      return { kind: 'lobby' }
    case 'settings':
      return { kind: s.from }
    default:
      return { kind: 'title' }
  }
}
