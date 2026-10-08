import { create } from 'zustand'
import { createJSONStorage, persist, subscribeWithSelector } from 'zustand/middleware'
import type { Outcome } from '@/games/types'
import {
  DEFAULT_PERSISTED,
  PERSIST_KEY,
  PERSIST_VERSION,
  migratePersisted,
  safeStorage,
  sanitizePersisted,
} from './persist'
import { parentOf, type Screen, type ScreenFx } from './screen'

export type UiScale = 'auto' | 2 | 3
export type Chatter = 'quiet' | 'normal' | 'chatty'

export interface Settings {
  sound: boolean
  /** 0..1 */
  volume: number
  crt: boolean
  uiScale: UiScale
  chatter: Chatter
  reducedMotion: 'system' | 'on'
  tetris: { das: number; arr: number }
}

export interface RecordBest {
  value: number
  characterId: string
  /** ISO 8601 */
  date: string
}

export interface RecordHistoryEntry {
  score: number
  outcome: Outcome
  characterId: string
  at: number
}

export interface RecordEntry {
  best: RecordBest | null
  plays: number
  wins: number
  lastScore: number | null
  lastPlayedAt: number
  /** 최근 10개 */
  history: RecordHistoryEntry[]
}

/** records[gameId][difficulty] */
export type GameRecords = Record<string, RecordEntry>

export interface PersistedState {
  selectedCharacterId: string | null
  settings: Settings
  records: Record<string, GameRecords>
}

export interface AppState extends PersistedState {
  /** 비영속 — 새로고침하면 항상 boot → title */
  screen: Screen
  /** 다음 전환에 쓸 커튼 효과 (비영속) */
  screenFx: ScreenFx
  navigate(to: Screen, fx?: ScreenFx): void
  back(): void
  selectCharacter(id: string | null): void
  updateSettings(patch: Partial<Settings>): void
  setRecord(gameId: string, difficulty: string, entry: RecordEntry): void
  resetRecords(gameId?: string): void
}

export const useStore = create<AppState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        ...DEFAULT_PERSISTED,
        screen: { kind: 'boot' },
        screenFx: 'fade',

        navigate: (to, fx = 'fade') => set({ screen: to, screenFx: fx }),
        back: () => set({ screen: parentOf(get().screen), screenFx: 'fade' }),
        selectCharacter: (id) => set({ selectedCharacterId: id }),
        updateSettings: (patch) =>
          set((s) => ({
            settings: {
              ...s.settings,
              ...patch,
              tetris: { ...s.settings.tetris, ...(patch.tetris ?? {}) },
            },
          })),
        setRecord: (gameId, difficulty, entry) =>
          set((s) => ({
            records: {
              ...s.records,
              [gameId]: { ...(s.records[gameId] ?? {}), [difficulty]: entry },
            },
          })),
        resetRecords: (gameId) =>
          set((s) => {
            if (!gameId) return { records: {} }
            const next = { ...s.records }
            delete next[gameId]
            return { records: next }
          }),
      }),
      {
        name: PERSIST_KEY,
        version: PERSIST_VERSION,
        storage: createJSONStorage(() => safeStorage),
        partialize: (s): PersistedState => ({
          selectedCharacterId: s.selectedCharacterId,
          settings: s.settings,
          records: s.records,
        }),
        migrate: (state, version) => migratePersisted(state, version),
        // 깊은 병합 대신 sanitize: 구버전/손상 데이터의 누락 키를 기본값으로 메운다
        merge: (persisted, current) => ({ ...current, ...sanitizePersisted(persisted) }),
      },
    ),
  ),
)
