import { create } from 'zustand'
import type { GameResult } from '@/games/types'
import type { Mood } from '@/pixel/types'

/** 게임 한 판 동안만 사는 비영속 상태. HUD/말풍선만 구독하므로 캔버스 컨테이너는 리렌더되지 않는다 */
export type SessionStatus = 'idle' | 'running' | 'paused' | 'finished'

export type HudValues = Record<string, string | number>

export type SessionResult = GameResult & { id: string }

export interface SessionState {
  status: SessionStatus
  hud: HudValues
  mood: Mood
  line: string | null
  result: SessionResult | null
  reset(hud?: HudValues): void
  patchHud(patch: HudValues): void
  setMascot(mood: Mood, line?: string | null): void
  setStatus(status: SessionStatus): void
  finish(result: SessionResult): void
}

export const useSession = create<SessionState>()((set) => ({
  status: 'idle',
  hud: {},
  mood: 'idle',
  line: null,
  result: null,

  reset: (hud = {}) => set({ status: 'idle', hud, mood: 'idle', line: null, result: null }),
  patchHud: (patch) =>
    set((s) => {
      let changed = false
      for (const key in patch) {
        if (s.hud[key] !== patch[key]) {
          changed = true
          break
        }
      }
      return changed ? { hud: { ...s.hud, ...patch } } : s
    }),
  setMascot: (mood, line = null) => set({ mood, line }),
  setStatus: (status) => set({ status }),
  finish: (result) => set({ status: 'finished', result }),
}))
