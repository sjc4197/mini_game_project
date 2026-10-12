import { audio } from '@/app/audio/audio'
import { input } from '@/app/input/input'
import { createMascotReactor, type MascotReactor } from '@/app/mascot'
import { mergeResult } from '@/app/records'
import { useSession } from '@/app/session'
import { useStore } from '@/app/store'
import type { CharacterDef } from '@/characters/types'
import type { GameHost, GameModule, GameResult } from './types'

export interface HostOptions {
  module: GameModule
  difficulty: string
  character: CharacterDef
  onFinish?(result: GameResult): void
  onPause?(): void
  /** setHUD 코얼레싱 스케줄러 (기본 rAF, 없으면 setTimeout 0) */
  schedule?: (cb: () => void) => void
}

export interface HostHandle {
  host: GameHost
  /** 프레임(일시정지 등)이 표정을 직접 바꿀 때 */
  mascot: MascotReactor
  dispose(): void
}

const defaultSchedule = (cb: () => void): void => {
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => cb())
  else setTimeout(cb, 0)
}

/**
 * 게임 ↔ 셸 브리지. alive 가드: dispose 뒤에 늦게 도착한 호출은 전부 무시한다 (StrictMode 이중 실행, 비동기 콜백).
 * setHUD 는 한 프레임에 여러 번 불려도 한 번만 세션에 반영한다.
 */
export function createHost(o: HostOptions): HostHandle {
  const schedule = o.schedule ?? defaultSchedule
  let alive = true
  let finished = false
  let pending: Record<string, string | number> | null = null

  const mascot = createMascotReactor({
    character: o.character,
    gameId: o.module.id,
    getChatter: () => useStore.getState().settings.chatter,
    sink: (mood, line) => {
      if (alive) useSession.getState().setMascot(mood, line)
    },
  })

  const host: GameHost = {
    character: o.character,
    difficulty: o.difficulty,
    get settings() {
      return useStore.getState().settings
    },
    mascot,
    input,
    audio,
    setHUD(patch) {
      if (!alive) return
      if (pending) {
        Object.assign(pending, patch)
        return
      }
      pending = { ...patch }
      schedule(() => {
        const p = pending
        pending = null
        if (alive && p) useSession.getState().patchHud(p)
      })
    },
    finish(result) {
      if (!alive || finished) return
      finished = true
      const now = Date.now()
      const store = useStore.getState()
      const prev = store.records[o.module.id]?.[o.difficulty]
      const { entry, isRecord } = mergeResult(prev, result, o.module.scoring, o.character.id, now)
      store.setRecord(o.module.id, o.difficulty, entry)
      useSession
        .getState()
        .finish({ ...result, id: `${o.module.id}:${now}`, isRecord, best: entry.best })
      if (isRecord) {
        mascot.react('game.record')
        audio.play('levelup')
      }
      o.onFinish?.(result)
    },
    requestPause() {
      if (alive && !finished) o.onPause?.()
    },
    now: () => performance.now(),
  }

  return {
    host,
    mascot,
    dispose() {
      alive = false
      pending = null
      mascot.dispose()
    },
  }
}
