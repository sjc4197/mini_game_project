/**
 * 공용 애니메이션 티커. 스프라이트가 N개여도 requestAnimationFrame 은 1개.
 * 구독자마다 fps 누산기를 두고, 프레임을 넘길 때만 콜백한다. 탭이 숨겨지면 멈춘다.
 */
interface Sub {
  fps: number
  cb: () => void
  acc: number
}

const MAX_DT = 250

class Ticker {
  private readonly subs = new Set<Sub>()
  private raf = 0
  private last = 0
  private running = false
  private visibilityHooked = false

  /** phaseMs: 시작 누산값. 여러 스프라이트의 프레임 전환 시점을 어긋나게 할 때 */
  subscribe(fps: number, cb: () => void, phaseMs = 0): () => void {
    const sub: Sub = { fps: Math.max(0.1, fps), cb, acc: phaseMs }
    this.subs.add(sub)
    this.hookVisibility()
    this.start()
    return () => {
      this.subs.delete(sub)
      if (this.subs.size === 0) this.stop()
    }
  }

  private hookVisibility(): void {
    if (this.visibilityHooked || typeof document === 'undefined') return
    this.visibilityHooked = true
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.stop()
      else if (this.subs.size > 0) this.start()
    })
  }

  private start(): void {
    if (this.running || typeof requestAnimationFrame === 'undefined') return
    if (typeof document !== 'undefined' && document.hidden) return
    this.running = true
    this.last = performance.now()
    this.raf = requestAnimationFrame(this.frame)
  }

  private stop(): void {
    if (!this.running) return
    this.running = false
    cancelAnimationFrame(this.raf)
  }

  private readonly frame = (t: number): void => {
    if (!this.running) return
    const dt = Math.min(t - this.last, MAX_DT)
    this.last = t
    for (const s of this.subs) {
      const step = 1000 / s.fps
      s.acc += dt
      if (s.acc >= step) {
        s.acc %= step // 밀린 프레임은 건너뛴다 (최대 1회 콜백/rAF)
        s.cb()
      }
    }
    this.raf = requestAnimationFrame(this.frame)
  }
}

export const ticker = new Ticker()
