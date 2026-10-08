import {
  DEFAULT_BINDINGS,
  PREVENT_DEFAULT_CODES,
  actionsForCode,
  type Action,
  type InputScope,
} from './bindings'

/** 테스트에서 합성 이벤트를 넣을 수 있도록 KeyboardEvent 의 부분집합만 요구 */
export interface KeyLike {
  code: string
  repeat?: boolean
  target?: EventTarget | null
  preventDefault(): void
}

/** true 를 돌려주면 브라우저 기본 동작을 막는다 (UI 스코프에서 Enter/Space 로 버튼이 두 번 눌리는 것 방지) */
export type ActionListener = (action: Action) => boolean | void

interface Sub {
  cb: ActionListener
  scopes: readonly InputScope[]
}

const isEditable = (t: EventTarget | null | undefined): boolean => {
  const el = t as (HTMLElement & { isContentEditable?: boolean }) | null | undefined
  if (!el || typeof el.tagName !== 'string') return false
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable === true
}

/**
 * 키 입력 싱글턴. window 에서 keydown/keyup/blur 를 받아
 *  - 이벤트 API: on(action, cb, { scope }) — 현재 스코프에 등록된 구독자만 호출 (메뉴/오버레이용)
 *  - 폴링 API: isDown / takePress / heldMs / lastPressed — 'game' 스코프에서만 true (게임 루프용)
 * e.repeat 는 무시한다 (OS 키 반복 제거 — DAS/ARR 는 게임이 직접 계산).
 */
export class InputService {
  private scope: InputScope = 'ui'
  private readonly downAt = new Map<string, number>()
  private readonly presses = new Map<Action, number>()
  private readonly subs = new Map<Action, Set<Sub>>()
  private installed = false
  /** 테스트에서 시간을 주입 */
  now: () => number = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())

  install(target: Window = window): void {
    if (this.installed) return
    this.installed = true
    target.addEventListener('keydown', (e) => this.keydown(e))
    target.addEventListener('keyup', (e) => this.keyup(e))
    target.addEventListener('blur', () => this.releaseAll())
  }

  getScope(): InputScope {
    return this.scope
  }

  /** 스코프 전환 시 눌린 키/미소비 입력은 전부 버린다 (오버레이 닫힌 뒤 키 고착 방지) */
  setScope(scope: InputScope): void {
    if (scope === this.scope) return
    this.scope = scope
    this.releaseAll()
  }

  keydown(e: KeyLike): void {
    if (e.repeat || isEditable(e.target)) return
    const actions = actionsForCode(e.code)
    if (actions.length === 0) return
    const t = this.now()
    if (!this.downAt.has(e.code)) this.downAt.set(e.code, t)
    let consumed = false
    for (const action of actions) {
      this.presses.set(action, (this.presses.get(action) ?? 0) + 1)
      const subs = this.subs.get(action)
      if (subs) {
        for (const s of subs) {
          if (s.scopes.includes(this.scope) && s.cb(action) === true) consumed = true
        }
      }
    }
    if (consumed || (this.scope !== 'ui' && PREVENT_DEFAULT_CODES.has(e.code))) e.preventDefault()
  }

  keyup(e: Pick<KeyLike, 'code'>): void {
    this.downAt.delete(e.code)
  }

  releaseAll(): void {
    this.downAt.clear()
    this.presses.clear()
  }

  // ---- 폴링 API (game 스코프 전용) ----

  isDown(action: Action): boolean {
    if (this.scope !== 'game') return false
    return DEFAULT_BINDINGS[action].some((code) => this.downAt.has(code))
  }

  /** 마지막 호출 이후 새로 눌렸으면 true (소비됨 — 한 프레임에 한 번만 처리) */
  takePress(action: Action): boolean {
    if (this.scope !== 'game') return false
    const n = this.presses.get(action) ?? 0
    if (n === 0) return false
    this.presses.set(action, 0)
    return true
  }

  /** 눌린 지 경과 ms, 안 눌렸으면 null */
  heldMs(action: Action, now = this.now()): number | null {
    if (this.scope !== 'game') return null
    let earliest: number | null = null
    for (const code of DEFAULT_BINDINGS[action]) {
      const t = this.downAt.get(code)
      if (t !== undefined && (earliest === null || t < earliest)) earliest = t
    }
    return earliest === null ? null : now - earliest
  }

  /** 두 액션 중 나중에 눌린 쪽 (←→ 동시 입력 해소). 둘 다 안 눌렸으면 null */
  lastPressed(a: Action, b: Action): Action | null {
    const ta = this.pressedAt(a)
    const tb = this.pressedAt(b)
    if (ta === null && tb === null) return null
    if (ta === null) return b
    if (tb === null) return a
    return tb > ta ? b : a
  }

  private pressedAt(action: Action): number | null {
    if (this.scope !== 'game') return null
    let latest: number | null = null
    for (const code of DEFAULT_BINDINGS[action]) {
      const t = this.downAt.get(code)
      if (t !== undefined && (latest === null || t > latest)) latest = t
    }
    return latest
  }

  // ---- 이벤트 API ----

  on(action: Action, cb: ActionListener, opts: { scope: InputScope | InputScope[] }): () => void {
    const sub: Sub = { cb, scopes: Array.isArray(opts.scope) ? opts.scope : [opts.scope] }
    let set = this.subs.get(action)
    if (!set) {
      set = new Set()
      this.subs.set(action, set)
    }
    set.add(sub)
    return () => {
      set.delete(sub)
    }
  }
}

export const input = new InputService()
