/**
 * rAF + 고정 타임스텝 누산기. 모든 게임 타이머는 update(dt) 누산으로 돌리므로 pause 하면 자동으로 멈춘다.
 * raf/now 를 주입할 수 있어 테스트에서 프레임을 손으로 밀어 넣는다.
 */
export interface LoopOptions {
  update(dtMs: number): void
  /** alpha = 누산기 잔여 비율(0..1) — 보간이 필요한 게임만 사용 */
  render(alpha: number): void
  stepMs?: number
  /** 탭 전환 등으로 생긴 긴 공백은 이 값으로 자른다 (죽음의 나선 방지) */
  maxFrameMs?: number
  raf?: (cb: (t: number) => void) => number
  caf?: (id: number) => void
  now?: () => number
}

export interface Loop {
  start(): void
  stop(): void
  pause(): void
  resume(): void
  readonly running: boolean
  readonly paused: boolean
  /** 한 프레임 처리 (테스트/수동 구동용) */
  tick(nowMs: number): void
}

export function createLoop(o: LoopOptions): Loop {
  const step = o.stepMs ?? 1000 / 60
  const maxFrame = o.maxFrameMs ?? 250
  const raf = o.raf ?? ((cb) => requestAnimationFrame(cb))
  const caf = o.caf ?? ((id) => cancelAnimationFrame(id))
  const now = o.now ?? (() => performance.now())
  let running = false
  let paused = false
  let last = 0
  let acc = 0
  let handle: number | null = null

  const cancel = (): void => {
    if (handle !== null) caf(handle)
    handle = null
  }
  const frame = (t: number): void => {
    handle = null
    if (!running || paused) return
    tick(t)
    if (running && !paused) handle = raf(frame)
  }
  const tick = (t: number): void => {
    const dt = Math.min(Math.max(0, t - last), maxFrame)
    last = t
    acc += dt
    let guard = 0
    while (acc >= step) {
      o.update(step)
      acc -= step
      if (++guard > 1000) {
        acc = 0
        break
      }
    }
    o.render(acc / step)
  }

  return {
    start() {
      if (running) return
      running = true
      paused = false
      last = now()
      acc = 0
      handle = raf(frame)
    },
    stop() {
      running = false
      paused = false
      cancel()
    },
    pause() {
      if (!running || paused) return
      paused = true
      cancel()
    },
    resume() {
      if (!running || !paused) return
      paused = false
      last = now()
      acc = 0
      handle = raf(frame)
    },
    get running() {
      return running
    },
    get paused() {
      return paused
    },
    tick,
  }
}
