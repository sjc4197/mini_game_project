/**
 * 오목 포인터: 누른 교차점에서 그대로 떼면 tap. 마우스/펜은 움직일 때 hover(미리보기), 터치는 hover 없음.
 * 터치는 인스턴스가 "첫 탭 = 커서, 같은 곳 두 번째 탭 = 착수"로 해석한다 (손가락이 칸을 가리므로).
 */
export interface TapActions {
  tap(cell: number, touch: boolean): void
  hover(cell: number): void
}

export type TapKind = 'down' | 'move' | 'up' | 'leave' | 'cancel'

export interface TapMachine {
  /** buttons = PointerEvent.buttons (좌1 우2 중4), cell = 교차점 인덱스 또는 -1 */
  handle(kind: TapKind, buttons: number, cell: number, touch?: boolean): void
  reset(): void
}

export function createTapMachine(a: TapActions): TapMachine {
  let pressing = false
  let pressCell = -1
  return {
    reset() {
      pressing = false
      pressCell = -1
    },
    handle(kind, buttons, cell, touch = false) {
      switch (kind) {
        case 'down':
          pressing = (buttons & 1) === 1
          pressCell = pressing ? cell : -1
          if (!touch) a.hover(cell)
          break
        case 'move':
          if (!pressing && !touch) a.hover(cell)
          break
        case 'up': {
          const wasPressing = pressing
          const from = pressCell
          pressing = false
          pressCell = -1
          if (wasPressing && cell >= 0 && cell === from) a.tap(cell, touch)
          a.hover(touch ? -1 : cell)
          break
        }
        case 'leave':
          if (!pressing) a.hover(-1)
          break
        case 'cancel':
          pressing = false
          pressCell = -1
          break
      }
    },
  }
}

export interface TapHandle {
  detach(): void
}

/** DOM 연결: 캔버스 요소 + 좌표→교차점 변환 */
export function attachTap(
  el: HTMLElement,
  toCell: (clientX: number, clientY: number) => number,
  actions: TapActions,
): TapHandle {
  const m = createTapMachine(actions)
  const on = (kind: TapKind) => (e: PointerEvent) => {
    if (kind === 'down') {
      e.preventDefault()
      try {
        el.setPointerCapture(e.pointerId)
      } catch {
        /* 캡처 실패해도 동작 */
      }
    }
    m.handle(kind, e.buttons, toCell(e.clientX, e.clientY), e.pointerType === 'touch')
  }
  const down = on('down')
  const move = on('move')
  const up = on('up')
  const leave = on('leave')
  const cancel = on('cancel')
  const blur = (): void => {
    m.reset()
    actions.hover(-1)
  }
  const context = (e: Event): void => e.preventDefault()

  el.addEventListener('pointerdown', down)
  el.addEventListener('pointermove', move)
  el.addEventListener('pointerup', up)
  el.addEventListener('pointerleave', leave)
  el.addEventListener('pointercancel', cancel)
  el.addEventListener('contextmenu', context)
  window.addEventListener('blur', blur)
  el.style.touchAction = 'none'
  return {
    detach() {
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointerleave', leave)
      el.removeEventListener('pointercancel', cancel)
      el.removeEventListener('contextmenu', context)
      window.removeEventListener('blur', blur)
    },
  }
}
