import { getLines } from '@/characters/lines'
import type { CharacterDef, LineKey } from '@/characters/types'
import type { MascotApi, MascotEvent, MascotPriority, MascotReactOptions } from '@/games/types'
import { clamp } from '@/lib/math'
import type { Mood } from '@/pixel/types'
import type { Chatter } from './store'

/** 표정 유지: ms(그 뒤 idle, 0 = 다음 이벤트까지) / 'sticky'(clear() 까지) / 'line'(표정은 건드리지 않고 말만; 식빵 자세는 깨운다) */
export type Hold = number | 'sticky' | 'line'

export interface ReactionSpec {
  mood: Mood
  priority: MascotPriority
  cooldownMs: number
  hold: Hold
}

/** 이벤트 → 반응 테이블 (docs/02 §3.4). 게임은 이벤트만 던지고 표정·타이밍은 여기서만 정한다 */
export const REACTIONS: Readonly<Record<MascotEvent, ReactionSpec>> = {
  'game.start': { mood: 'happy', priority: 2, cooldownMs: 0, hold: 2500 },
  'game.good': { mood: 'happy', priority: 1, cooldownMs: 4000, hold: 2000 },
  'game.great': { mood: 'win', priority: 2, cooldownMs: 2000, hold: 3000 },
  'game.risky': { mood: 'worried', priority: 2, cooldownMs: 6000, hold: 5000 },
  'game.safe': { mood: 'idle', priority: 2, cooldownMs: 6000, hold: 0 },
  'game.mistake': { mood: 'sad', priority: 2, cooldownMs: 3000, hold: 2000 },
  'game.think': { mood: 'think', priority: 1, cooldownMs: 15000, hold: 4000 },
  'game.fail': { mood: 'sad', priority: 3, cooldownMs: 0, hold: 'sticky' },
  'game.win': { mood: 'win', priority: 3, cooldownMs: 0, hold: 'sticky' },
  'game.record': { mood: 'win', priority: 3, cooldownMs: 0, hold: 'sticky' },
  'ui.lobby.hover': { mood: 'idle', priority: 1, cooldownMs: 1500, hold: 'line' },
  'ui.locked': { mood: 'idle', priority: 1, cooldownMs: 1500, hold: 'line' },
  'ui.idle': { mood: 'loaf', priority: 0, cooldownMs: 8000, hold: 0 }, // 식빵 자세로 쉬다가 다음 이벤트에 깨어남
}

/** 수다 설정 → 쿨다운 계수. quiet 는 추가로 우선순위 2 미만의 대사를 생략한다 */
export const CHATTER_FACTOR: Readonly<Record<Chatter, number>> = {
  quiet: 2,
  normal: 1,
  chatty: 0.5,
}

/** 대기열의 이벤트는 현재 말풍선이 이 시간 안에 끝나야 재생된다 */
export const QUEUE_GRACE_MS = 1500

/** 말풍선 표시 시간: 글자 수 비례, 1.5~5초 */
export function bubbleDuration(text: string): number {
  return clamp(900 + 90 * text.length, 1500, 5000)
}

export interface MascotReactorOptions {
  character: CharacterDef
  /** 게임 전용 대사표 조회용 */
  gameId?: string
  /** 표정/대사가 바뀔 때마다 호출 (보통 useSession.setMascot) */
  sink: (mood: Mood, line: string | null) => void
  getChatter?: () => Chatter
  /** 말풍선 없이 이 시간이 지나면 'ui.idle' 을 스스로 발화 (로비 잡담) */
  idleEveryMs?: number
  random?: () => number
}

export interface MascotReactor extends MascotApi {
  readonly mood: Mood
  readonly line: string | null
  dispose(): void
}

type Timer = ReturnType<typeof setTimeout>

interface Queued {
  event: MascotEvent
  opts: MascotReactOptions
  at: number
}

/**
 * 규칙: 새 이벤트 우선순위 ≥ 현재 → 즉시 교체. 낮으면 길이 1 대기열(최신 우선)에 두고 현재 말풍선이
 * QUEUE_GRACE_MS 안에 끝나면 재생, 아니면 폐기. 쿨다운은 (이벤트, lineKey) 단위 × 수다 계수.
 * sticky(우선순위 3) 상태에서는 더 낮은 이벤트를 전부 버린다 — clear() 로 해제.
 */
export function createMascotReactor(o: MascotReactorOptions): MascotReactor {
  const getChatter = o.getChatter ?? ((): Chatter => 'normal')
  const random = o.random ?? Math.random
  let mood: Mood = 'idle'
  let line: string | null = null
  let priority: MascotPriority = 0
  let sticky = false
  let disposed = false
  let lineTimer: Timer | null = null
  let holdTimer: Timer | null = null
  let idleTimer: Timer | null = null
  let holdToken = 0
  let queued: Queued | null = null
  const lastFired = new Map<string, number>()
  const recent = new Map<LineKey, string[]>()

  const emit = (): void => {
    if (!disposed) o.sink(mood, line)
  }
  const stop = (t: Timer | null): null => {
    if (t !== null) clearTimeout(t)
    return null
  }
  const cooldownKey = (event: MascotEvent, opts: MascotReactOptions): string =>
    `${event}|${opts.lineKey ?? ''}`

  /** 같은 키에서 최근 2개(풀이 작으면 1개/0개)를 피해 무작위. lineKey 에 대사가 없으면 이벤트 기본 키로 */
  function pickLine(key: LineKey, fallback?: LineKey): string | null {
    let pool = getLines(o.character, key, o.gameId)
    if (pool.length === 0 && fallback && fallback !== key) {
      key = fallback
      pool = getLines(o.character, key, o.gameId)
    }
    if (pool.length === 0) return null
    const used = recent.get(key) ?? []
    const n = Math.min(2, pool.length - 1)
    const avoid = n > 0 ? used.slice(-n) : []
    const candidates = pool.filter((l) => !avoid.includes(l))
    const list = candidates.length > 0 ? candidates : pool
    const choice = list[Math.floor(random() * list.length)] ?? list[0] ?? null
    if (choice !== null) recent.set(key, [...used, choice].slice(-2))
    return choice
  }

  function armIdle(): void {
    idleTimer = stop(idleTimer)
    if (!o.idleEveryMs || disposed) return
    idleTimer = setTimeout(() => {
      idleTimer = null
      react('ui.idle')
      // 쿨다운 등으로 버려졌으면 다시 재운다
      if (idleTimer === null) armIdle()
    }, o.idleEveryMs)
  }

  function endBubble(): void {
    lineTimer = null
    line = null
    const q = queued
    queued = null
    if (q && Date.now() - q.at <= QUEUE_GRACE_MS) {
      fire(q.event, q.opts)
      return
    }
    if (holdTimer === null && !sticky) priority = 0
    emit()
    armIdle()
  }

  function showLine(text: string | null): void {
    lineTimer = stop(lineTimer)
    line = text
    if (text !== null) lineTimer = setTimeout(endBubble, bubbleDuration(text))
  }

  function setHold(hold: Hold): void {
    holdTimer = stop(holdTimer)
    const token = ++holdToken
    if (hold === 'sticky') {
      sticky = true
      return
    }
    if (typeof hold !== 'number' || hold <= 0) return
    holdTimer = setTimeout(() => {
      if (token !== holdToken) return
      holdTimer = null
      mood = 'idle'
      if (line === null) priority = 0
      emit()
    }, hold)
  }

  function fire(event: MascotEvent, opts: MascotReactOptions): void {
    const spec = REACTIONS[event]
    const p = opts.priority ?? spec.priority
    lastFired.set(cooldownKey(event, opts), Date.now())
    priority = p
    const suppressed = getChatter() === 'quiet' && p < 2
    const text = suppressed ? null : (opts.line ?? pickLine(opts.lineKey ?? event, event))
    if (spec.hold === 'line') {
      if (mood === 'loaf') mood = 'idle'
    } else {
      mood = spec.mood
      const hold = opts.hold ?? spec.hold
      // 말풍선이 떠 있는 동안 표정이 먼저 풀리지 않게 (0 = 무기한은 그대로)
      setHold(typeof hold === 'number' && hold > 0 && text ? Math.max(hold, bubbleDuration(text)) : hold)
    }
    showLine(text)
    emit()
    armIdle()
  }

  function react(event: MascotEvent, opts: MascotReactOptions = {}): void {
    if (disposed) return
    const spec = REACTIONS[event]
    const p = opts.priority ?? spec.priority
    const now = Date.now()
    const last = lastFired.get(cooldownKey(event, opts))
    const cooldown = spec.cooldownMs * CHATTER_FACTOR[getChatter()]
    if (last !== undefined && now - last < cooldown) return
    if (sticky && p < 3) return
    if (line !== null && p < priority) {
      queued = { event, opts, at: now }
      return
    }
    queued = null
    fire(event, opts)
  }

  function setMood(m: Mood, holdMs = 0): void {
    if (disposed) return
    mood = m
    setHold(holdMs)
    emit()
  }

  function say(text: string): void {
    if (disposed) return
    showLine(text)
    emit()
    armIdle()
  }

  function clear(): void {
    if (disposed) return
    lineTimer = stop(lineTimer)
    holdTimer = stop(holdTimer)
    holdToken++
    queued = null
    sticky = false
    priority = 0
    mood = 'idle'
    line = null
    emit()
    armIdle()
  }

  function dispose(): void {
    disposed = true
    lineTimer = stop(lineTimer)
    holdTimer = stop(holdTimer)
    idleTimer = stop(idleTimer)
    queued = null
  }

  armIdle()

  return {
    react,
    setMood,
    say,
    clear,
    dispose,
    get mood() {
      return mood
    },
    get line() {
      return line
    },
  }
}
