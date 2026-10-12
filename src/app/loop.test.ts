import { describe, expect, it, vi } from 'vitest'
import { createLoop } from './loop'

function harness(opts: { stepMs?: number; maxFrameMs?: number } = {}) {
  const queue: ((t: number) => void)[] = []
  let t = 0
  const update = vi.fn()
  const render = vi.fn()
  const loop = createLoop({
    update,
    render,
    stepMs: opts.stepMs ?? 10,
    maxFrameMs: opts.maxFrameMs ?? 50,
    raf: (cb) => {
      queue.push(cb)
      return queue.length
    },
    caf: () => {
      queue.length = 0
    },
    now: () => t,
  })
  /** 시간을 ms 만큼 흘리고 예약된 프레임 1개를 실행 */
  const frame = (ms: number) => {
    t += ms
    const cb = queue.shift()
    if (cb) cb(t)
  }
  return { loop, update, render, frame, queue, time: () => t }
}

describe('createLoop', () => {
  it('경과 시간만큼 고정 스텝으로 update 하고 매 프레임 render', () => {
    const h = harness()
    h.loop.start()
    h.frame(40) // maxFrameMs(50) 안쪽
    expect(h.update).toHaveBeenCalledTimes(4)
    expect(h.update).toHaveBeenCalledWith(10)
    expect(h.render).toHaveBeenCalledTimes(1)
    h.frame(5) // 누산 5 → 스텝 미달
    expect(h.update).toHaveBeenCalledTimes(4)
    expect(h.render).toHaveBeenCalledTimes(2)
    h.frame(5) // 누산 10 → 스텝 1회
    expect(h.update).toHaveBeenCalledTimes(5)
  })

  it('긴 공백은 maxFrameMs 로 잘라 죽음의 나선을 막는다', () => {
    const h = harness()
    h.loop.start()
    h.frame(5000)
    expect(h.update).toHaveBeenCalledTimes(5)
  })

  it('pause 중엔 프레임 예약도 update 도 없고, resume 은 밀린 시간을 따라잡지 않는다', () => {
    const h = harness()
    h.loop.start()
    h.frame(20)
    expect(h.update).toHaveBeenCalledTimes(2)
    h.loop.pause()
    expect(h.loop.paused).toBe(true)
    expect(h.queue).toHaveLength(0)
    h.frame(1000)
    expect(h.update).toHaveBeenCalledTimes(2)
    h.loop.resume()
    expect(h.queue).toHaveLength(1)
    h.frame(10)
    expect(h.update).toHaveBeenCalledTimes(3)
  })

  it('stop 뒤에는 프레임이 돌지 않고 start 는 멱등', () => {
    const h = harness()
    h.loop.start()
    h.loop.start()
    expect(h.queue).toHaveLength(1)
    h.loop.stop()
    expect(h.loop.running).toBe(false)
    expect(h.queue).toHaveLength(0)
    h.frame(100)
    expect(h.update).not.toHaveBeenCalled()
  })
})
