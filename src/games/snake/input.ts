import type { Dir } from './types'

/** 스와이프 최소 거리 (CSS px) */
export const SWIPE_MIN_PX = 16

/** 드래그 벡터 → 방향 (너무 짧으면 null). 더 긴 축을 따른다 */
export function swipeDir(dx: number, dy: number, min = SWIPE_MIN_PX): Dir | null {
  if (Math.abs(dx) < min && Math.abs(dy) < min) return null
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'right' : 'left'
  return dy > 0 ? 'down' : 'up'
}

export interface SwipeHandle {
  detach(): void
}

/** 캔버스 위 드래그/스와이프(터치·마우스) → 방향 콜백 */
export function attachSwipe(el: HTMLElement, onDir: (dir: Dir) => void): SwipeHandle {
  let start: { id: number; x: number; y: number } | null = null
  const down = (e: PointerEvent): void => {
    e.preventDefault()
    start = { id: e.pointerId, x: e.clientX, y: e.clientY }
    try {
      el.setPointerCapture(e.pointerId)
    } catch {
      /* 캡처 실패해도 동작 */
    }
  }
  const up = (e: PointerEvent): void => {
    if (!start || start.id !== e.pointerId) return
    const dir = swipeDir(e.clientX - start.x, e.clientY - start.y)
    start = null
    if (dir) onDir(dir)
  }
  const cancel = (): void => {
    start = null
  }
  const context = (e: Event): void => e.preventDefault()
  el.addEventListener('pointerdown', down)
  el.addEventListener('pointerup', up)
  el.addEventListener('pointercancel', cancel)
  el.addEventListener('contextmenu', context)
  window.addEventListener('blur', cancel)
  el.style.touchAction = 'none'
  return {
    detach() {
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', cancel)
      el.removeEventListener('contextmenu', context)
      window.removeEventListener('blur', cancel)
    },
  }
}
