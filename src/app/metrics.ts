import type { UiScale } from './store'

/**
 * DisplayMetrics — 1dp = --u CSS px 를 결정한다.
 * 핵심 규칙: --u × DPR 이 항상 정수 디바이스 픽셀이 되게 반올림한다.
 *   base 2, DPR 1.00 → 2 device px → --u 2px
 *   base 2, DPR 1.25 → 2.5 → 3 device px → --u 2.4px  (12u 글자 = 28.8 CSS px = 36 device px = 네이티브 3배)
 *   base 2, DPR 1.50 → 3 device px → --u 2px
 *   base 2, DPR 2.00 → 4 device px → --u 2px
 */
export interface Metrics {
  base: 2 | 3
  dpr: number
  /** CSS px per dp */
  u: number
  /** device px per dp (정수) */
  uDevice: number
  viewportW: number
  viewportH: number
}

export function pickBase(viewportW: number, viewportH: number, uiScale: UiScale): 2 | 3 {
  if (uiScale !== 'auto') return uiScale
  return viewportW >= 1800 && viewportH >= 1000 ? 3 : 2
}

export function computeUnit(base: number, dpr: number): { u: number; uDevice: number } {
  const safeDpr = Number.isFinite(dpr) && dpr > 0 ? dpr : 1
  const uDevice = Math.max(1, Math.round(base * safeDpr))
  return { u: Number((uDevice / safeDpr).toFixed(4)), uDevice }
}

type Listener = (m: Metrics) => void

const sameMetrics = (a: Metrics, b: Metrics): boolean =>
  a.base === b.base &&
  a.dpr === b.dpr &&
  a.u === b.u &&
  a.uDevice === b.uDevice &&
  a.viewportW === b.viewportW &&
  a.viewportH === b.viewportH

class DisplayMetrics {
  private current: Metrics = { base: 2, dpr: 1, u: 2, uDevice: 2, viewportW: 0, viewportH: 0 }
  private readonly listeners = new Set<Listener>()
  private uiScale: UiScale = 'auto'
  private mql: MediaQueryList | null = null
  private installed = false

  get = (): Metrics => this.current

  subscribe = (fn: Listener): (() => void) => {
    this.listeners.add(fn)
    return () => {
      this.listeners.delete(fn)
    }
  }

  /** main.tsx 에서 첫 페인트 전에 1회 */
  install(uiScale: UiScale): void {
    if (this.installed || typeof window === 'undefined') return
    this.installed = true
    this.uiScale = uiScale
    window.addEventListener('resize', this.recompute)
    this.watchDpr()
    this.recompute()
  }

  setUiScale(uiScale: UiScale): void {
    if (uiScale === this.uiScale) return
    this.uiScale = uiScale
    if (this.installed) this.recompute()
  }

  /** DPR 은 모니터 이동/브라우저 확대 시 바뀐다. 현재 값의 media query 가 깨지는 순간 재구독 */
  private watchDpr(): void {
    this.mql?.removeEventListener('change', this.onDprChange)
    this.mql = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`)
    this.mql.addEventListener('change', this.onDprChange)
  }

  private readonly onDprChange = (): void => {
    this.watchDpr()
    this.recompute()
  }

  private readonly recompute = (): void => {
    const viewportW = window.innerWidth
    const viewportH = window.innerHeight
    const dpr = window.devicePixelRatio || 1
    const base = pickBase(viewportW, viewportH, this.uiScale)
    const { u, uDevice } = computeUnit(base, dpr)
    const next: Metrics = { base, dpr, u, uDevice, viewportW, viewportH }
    if (sameMetrics(this.current, next)) return
    const unitChanged = this.current.u !== u
    this.current = next
    if (unitChanged) {
      document.documentElement.style.setProperty('--u', `${u}px`)
      document.documentElement.dataset.ui = String(base)
    }
    for (const fn of this.listeners) fn(next)
  }
}

export const metrics = new DisplayMetrics()
