/**
 * 액션 ↔ 물리 키(KeyboardEvent.code) 바인딩.
 * e.key 가 아니라 e.code 를 쓰는 이유: 한글 IME 가 켜져 있으면 e.key 가 'Process' 가 된다.
 * 한 키가 여러 액션에 묶일 수 있다 (Space = confirm/hardDrop/chord). 어떤 액션을 들을지는 구독자(화면/게임)가 고른다.
 */
export const ACTIONS = [
  'left',
  'right',
  'up',
  'down',
  'confirm',
  'cancel',
  'back',
  'pause',
  'restart',
  'settings',
  'records',
  'rotateCw',
  'rotateCcw',
  'hardDrop',
  'hold',
  'flag',
  'chord',
] as const

export type Action = (typeof ACTIONS)[number]

/** ui: 메뉴/화면, game: 게임 보드 활성, overlay: 일시정지/결과 모달 */
export type InputScope = 'ui' | 'game' | 'overlay'

export const DEFAULT_BINDINGS: Readonly<Record<Action, readonly string[]>> = {
  left: ['ArrowLeft'],
  right: ['ArrowRight'],
  up: ['ArrowUp'],
  down: ['ArrowDown'],
  confirm: ['Enter', 'Space', 'KeyZ'],
  cancel: ['Escape', 'KeyX', 'Backspace'],
  back: ['Escape', 'Backspace'],
  pause: ['Escape', 'KeyP'],
  restart: ['KeyR'],
  settings: ['KeyS'],
  records: ['KeyR'],
  rotateCw: ['ArrowUp', 'KeyX'],
  rotateCcw: ['KeyZ', 'ControlLeft'],
  hardDrop: ['Space'],
  hold: ['KeyC', 'ShiftLeft', 'ShiftRight'],
  flag: ['KeyX'],
  chord: ['Space'],
}

/** 게임/오버레이 스코프에서 브라우저 기본 동작(스크롤)을 막을 키 */
export const PREVENT_DEFAULT_CODES: ReadonlySet<string> = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Space',
])

const byCode = new Map<string, Action[]>()
for (const action of ACTIONS) {
  for (const code of DEFAULT_BINDINGS[action]) {
    const list = byCode.get(code) ?? []
    list.push(action)
    byCode.set(code, list)
  }
}

const EMPTY: readonly Action[] = []

export function actionsForCode(code: string): readonly Action[] {
  return byCode.get(code) ?? EMPTY
}
