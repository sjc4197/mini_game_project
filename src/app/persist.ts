import type { StateStorage } from 'zustand/middleware'
import type { PersistedState, Settings } from './store'

export const PERSIST_KEY = 'minigames.store'
export const PERSIST_VERSION = 1

export const DEFAULT_SETTINGS: Settings = {
  sound: true,
  volume: 0.8,
  crt: false,
  uiScale: 'auto',
  chatter: 'normal',
  reducedMotion: 'system',
  tetris: { das: 167, arr: 33 },
}

export const DEFAULT_PERSISTED: PersistedState = {
  selectedCharacterId: null,
  settings: DEFAULT_SETTINGS,
  records: {},
}

/** localStorage 가 없거나(프라이빗 모드) 쿼터 초과로 throw 해도 게임이 계속되도록 전부 try/catch */
export function createSafeStorage(getStorage: () => Storage | undefined): StateStorage {
  const storage = (): Storage | undefined => {
    try {
      return getStorage()
    } catch {
      return undefined
    }
  }
  return {
    getItem: (name) => {
      try {
        return storage()?.getItem(name) ?? null
      } catch {
        return null
      }
    },
    setItem: (name, value) => {
      try {
        storage()?.setItem(name, value)
      } catch {
        /* 쿼터 초과·프라이빗 모드: 메모리 상태만 유지 */
      }
    },
    removeItem: (name) => {
      try {
        storage()?.removeItem(name)
      } catch {
        /* ignore */
      }
    },
  }
}

export const safeStorage = createSafeStorage(() =>
  typeof localStorage === 'undefined' ? undefined : localStorage,
)

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const num = (v: unknown, fallback: number, min = -Infinity, max = Infinity): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback

const bool = (v: unknown, fallback: boolean): boolean => (typeof v === 'boolean' ? v : fallback)

const oneOf = <T>(v: unknown, options: readonly T[], fallback: T): T =>
  (options as readonly unknown[]).includes(v) ? (v as T) : fallback

/** 어떤 형태가 와도 throw 하지 않고 완전한 Settings 를 돌려준다 (누락 키는 기본값) */
export function sanitizeSettings(raw: unknown): Settings {
  const r = isRecord(raw) ? raw : {}
  const t = isRecord(r.tetris) ? r.tetris : {}
  const d = DEFAULT_SETTINGS
  return {
    sound: bool(r.sound, d.sound),
    volume: num(r.volume, d.volume, 0, 1),
    crt: bool(r.crt, d.crt),
    uiScale: oneOf(r.uiScale, ['auto', 2, 3] as const, d.uiScale),
    chatter: oneOf(r.chatter, ['quiet', 'normal', 'chatty'] as const, d.chatter),
    reducedMotion: oneOf(r.reducedMotion, ['system', 'on'] as const, d.reducedMotion),
    tetris: {
      das: num(t.das, d.tetris.das, 0, 500),
      arr: num(t.arr, d.tetris.arr, 0, 200),
    },
  }
}

export function sanitizePersisted(raw: unknown): PersistedState {
  const r = isRecord(raw) ? raw : {}
  return {
    selectedCharacterId: typeof r.selectedCharacterId === 'string' ? r.selectedCharacterId : null,
    settings: sanitizeSettings(r.settings),
    records: isRecord(r.records) ? (r.records as PersistedState['records']) : {},
  }
}

/**
 * zustand persist 의 migrate. 저장 버전이 PERSIST_VERSION 보다 낮을 때 호출된다.
 * 버전별 변환이 필요해지면 switch(fromVersion) 폴스루 사다리를 추가하고, 마지막엔 반드시 sanitize.
 */
export function migratePersisted(state: unknown, fromVersion: number): PersistedState {
  void fromVersion // v1 이 첫 버전: 변환 없음
  return sanitizePersisted(state)
}
