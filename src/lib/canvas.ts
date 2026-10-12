import { fitScale } from './fit'

/**
 * 게임용 픽셀 캔버스. 게임은 논리 크기(w×h)의 오프스크린 ctx 에만 그리고 present() 로 표시 캔버스에
 * 정수 배율(디바이스 px)로 확대한다. 컨테이너 크기/DPR 이 바뀌면 배율을 다시 잡는다.
 */
export interface PixelCanvas {
  readonly w: number
  readonly h: number
  /** 논리 캔버스 2D 컨텍스트 (여기에 그린다) */
  readonly ctx: CanvasRenderingContext2D
  /** 현재 배율: 1 논리 px = scale 디바이스 px */
  readonly scale: number
  readonly element: HTMLCanvasElement
  mount(container: HTMLElement): void
  /** 오프스크린 → 표시 캔버스 */
  present(): void
  resize(): void
  /** 포인터 클라이언트 좌표 → 논리 좌표 (캔버스 밖이면 null) */
  toLogical(clientX: number, clientY: number): { x: number; y: number } | null
  destroy(): void
}

export function createPixelCanvas(w: number, h: number): PixelCanvas {
  const off = document.createElement('canvas')
  off.width = w
  off.height = h
  const ctx = off.getContext('2d')
  if (!ctx) throw new Error('2d context unavailable')
  ctx.imageSmoothingEnabled = false

  const display = document.createElement('canvas')
  display.className = 'board-canvas'
  const dctx = display.getContext('2d')
  let scale = 1
  let container: HTMLElement | null = null
  let observer: ResizeObserver | null = null

  const present = (): void => {
    if (!dctx) return
    dctx.imageSmoothingEnabled = false
    dctx.clearRect(0, 0, display.width, display.height)
    dctx.drawImage(off, 0, 0, display.width, display.height)
  }
  const resize = (): void => {
    if (!container) return
    const dpr = window.devicePixelRatio || 1
    scale = fitScale(container.clientWidth, container.clientHeight, w, h, dpr)
    display.width = w * scale
    display.height = h * scale
    display.style.width = `${(w * scale) / dpr}px`
    display.style.height = `${(h * scale) / dpr}px`
    present()
  }
  const onWindowResize = (): void => resize()

  return {
    w,
    h,
    ctx,
    element: display,
    get scale() {
      return scale
    },
    mount(el) {
      container = el
      el.appendChild(display)
      if (typeof ResizeObserver !== 'undefined') {
        observer = new ResizeObserver(() => resize())
        observer.observe(el)
      }
      window.addEventListener('resize', onWindowResize)
      resize()
    },
    present,
    resize,
    toLogical(clientX, clientY) {
      const r = display.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) return null
      const x = Math.floor(((clientX - r.left) / r.width) * w)
      const y = Math.floor(((clientY - r.top) / r.height) * h)
      if (x < 0 || y < 0 || x >= w || y >= h) return null
      return { x, y }
    },
    destroy() {
      observer?.disconnect()
      observer = null
      window.removeEventListener('resize', onWindowResize)
      display.remove()
      container = null
    },
  }
}
