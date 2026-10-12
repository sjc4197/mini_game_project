import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSession } from '@/app/session'
import { useStore } from '@/app/store'
import { cheese } from '@/characters/cheese'
import { createHost } from './host'
import type { GameModule } from './types'

const module: GameModule = {
  id: 'stub',
  title: 'stub',
  description: '',
  difficulties: [{ id: 'd', label: 'd' }],
  defaultDifficulty: 'd',
  hud: [],
  scoring: { betterIs: 'higher', countsWhen: 'any', format: String },
  controls: { keyboard: [] },
  logical: { w: 1, h: 1 },
  create: () => {
    throw new Error('stub')
  },
}

describe('createHost', () => {
  beforeEach(() => {
    useSession.getState().reset()
    useStore.getState().resetRecords()
  })

  it('setHUD 는 한 스케줄 안에서 합쳐져 한 번만 세션에 반영된다', () => {
    const queue: (() => void)[] = []
    const { host } = createHost({ module, difficulty: 'd', character: cheese, schedule: (cb) => queue.push(cb) })
    host.setHUD({ score: 1 })
    host.setHUD({ score: 2, time: '00:01' })
    expect(queue).toHaveLength(1)
    expect(useSession.getState().hud).toEqual({})
    queue[0]!()
    expect(useSession.getState().hud).toEqual({ score: 2, time: '00:01' })
  })

  it('finish 는 한 번만, 세션을 finished 로 바꾸고 콜백을 부른다', () => {
    const onFinish = vi.fn()
    const { host } = createHost({ module, difficulty: 'd', character: cheese, onFinish })
    host.finish({ outcome: 'win', score: 3, durationMs: 100 })
    host.finish({ outcome: 'lose', score: 0, durationMs: 200 })
    expect(onFinish).toHaveBeenCalledTimes(1)
    const s = useSession.getState()
    expect(s.status).toBe('finished')
    expect(s.result?.score).toBe(3)
    expect(s.result?.id).toContain('stub:')
    expect(s.result?.isRecord).toBe(true)
    expect(s.result?.best?.value).toBe(3)
    expect(useStore.getState().records.stub?.d?.plays).toBe(1)
  })

  it('기록을 못 깨면 isRecord=false, 마스코트는 신기록 때만 game.record', () => {
    const a = createHost({ module, difficulty: 'd', character: cheese })
    a.host.finish({ outcome: 'win', score: 10, durationMs: 1 })
    expect(useSession.getState().mood).toBe('win')
    a.dispose()
    useSession.getState().reset()
    const b = createHost({ module, difficulty: 'd', character: cheese })
    b.host.finish({ outcome: 'win', score: 5, durationMs: 1 })
    expect(useSession.getState().result?.isRecord).toBe(false)
    expect(useSession.getState().result?.best?.value).toBe(10)
    expect(useSession.getState().mood).toBe('idle')
    expect(useStore.getState().records.stub?.d?.plays).toBe(2)
    b.dispose()
  })

  it('dispose 뒤에는 HUD/마스코트/일시정지 요청이 전부 무시된다', () => {
    const queue: (() => void)[] = []
    const onPause = vi.fn()
    const { host, dispose } = createHost({
      module,
      difficulty: 'd',
      character: cheese,
      onPause,
      schedule: (cb) => queue.push(cb),
    })
    host.setHUD({ score: 1 })
    dispose()
    queue.forEach((cb) => cb())
    expect(useSession.getState().hud).toEqual({})
    host.mascot.react('game.good', { line: 'x' })
    expect(useSession.getState().line).toBeNull()
    host.requestPause()
    expect(onPause).not.toHaveBeenCalled()
  })

  it('마스코트 이벤트가 세션의 표정/대사로 흐른다', () => {
    const { host, dispose } = createHost({ module, difficulty: 'd', character: cheese })
    host.mascot.react('game.start', { line: '시작!' })
    expect(useSession.getState().mood).toBe('happy')
    expect(useSession.getState().line).toBe('시작!')
    dispose()
  })
})
