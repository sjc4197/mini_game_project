/**
 * 포인터 상태기계 (docs/02 부록 A).
 * 버튼이 눌린 채 다른 버튼을 누르거나 떼면 pointerdown/up 이 아니라 pointermove 가 오고 e.buttons 만 바뀌므로,
 * 모든 이벤트에서 changed = prev ^ cur 로 전이를 계산한다.
 *  - 우(2) 단독 press 즉시 → secondary (깃발)
 *  - 좌+우 또는 중(4) → chordArmed, pressStart(cell, chord=true) (3×3 눌림 표시)
 *  - 좌만 → pressStart(cell, false)
 *  - release: chordArmed && !chordDone → chord(cell) / 좌 release & !chordArmed → primary(cell)
 *  - cur===0 → pressCancel / 변화 없는 move → pressing ? pressMove : hover
 */
export interface PointerActions {
  primary(cell: number): void
  secondary(cell: number): void
  chord(cell: number): void
  pressStart(cell: number, chord: boolean): void
  pressMove(cell: number): void
  pressCancel(): void
  hover(cell: number): void
}

export type PointerKind = 'down' | 'move' | 'up' | 'leave' | 'cancel'

export interface PointerMachine {
  /** buttons = PointerEvent.buttons 비트마스크 (좌1 우2 중4), cell = 셀 인덱스 또는 -1 */
  handle(kind: PointerKind, buttons: number, cell: number): void
  reset(): void
}

export function createPointerMachine(a: PointerActions): PointerMachine {
  let prev = 0
  let chordArmed = false
  let chordDone = false
  let pressing = false

  const reset = (): void => {
    if (pressing || chordArmed) a.pressCancel()
    prev = 0
    chordArmed = false
    chordDone = false
    pressing = false
  }

  return {
    reset,
    handle(kind, buttons, cell) {
      if (kind === 'cancel') {
        reset()
        return
      }
      if (kind === 'leave') {
        if (!pressing) a.hover(-1)
        return
      }
      const cur = buttons & 7
      const changed = prev ^ cur
      const pressedNow = changed & cur
      const releasedNow = changed & prev

      if (pressedNow & 2 && (cur & 5) === 0) {
        a.secondary(cell)
      }
      if ((cur & 3) === 3 || cur & 4) {
        if (!chordArmed) {
          chordArmed = true
          chordDone = false
        }
        pressing = true
        a.pressStart(cell, true)
      } else if (pressedNow & 1 && !chordArmed) {
        pressing = true
        a.pressStart(cell, false)
      }

      if (releasedNow) {
        if (chordArmed && !chordDone) {
          chordDone = true
          pressing = false
          a.pressCancel()
          a.chord(cell)
        } else if (releasedNow & 1 && !chordArmed) {
          pressing = false
          a.pressCancel()
          a.primary(cell)
        }
      }

      if (cur === 0) {
        if (pressing) a.pressCancel()
        chordArmed = false
        chordDone = false
        pressing = false
      }

      if (changed === 0 && kind === 'move') {
        if (pressing) a.pressMove(cell)
        else a.hover(cell)
      }
      prev = cur
    },
  }
}

export interface PointerHandle {
  detach(): void
  /** 터치: 탭이 열기 대신 깃발 */
  setFlagMode(on: boolean): void
}

const LONG_PRESS_MS = 350
const TAP_MOVE_PX = 8

interface TouchState {
  id: number
  cell: number
  x: number
  y: number
  timer: ReturnType<typeof setTimeout> | null
  fired: boolean
  cancelled: boolean
}

/**
 * DOM 연결: 캔버스 요소 + 좌표→셀 변환.
 * 마우스/펜은 버튼 상태기계, 터치는 탭(열기) / 길게 누르기(깃발 + 진동) / 깃발 모드(탭 = 깃발).
 */
export function attachPointer(
  el: HTMLElement,
  toCell: (clientX: number, clientY: number) => number,
  actions: PointerActions,
): PointerHandle {
  const m = createPointerMachine(actions)
  let flagMode = false
  let touch: TouchState | null = null
  const endTouch = (): void => {
    if (touch?.timer) clearTimeout(touch.timer)
    touch = null
  }
  const onTouch = (kind: PointerKind, e: PointerEvent): void => {
    const cell = toCell(e.clientX, e.clientY)
    if (kind === 'down') {
      endTouch()
      const t: TouchState = {
        id: e.pointerId,
        cell,
        x: e.clientX,
        y: e.clientY,
        timer: null,
        fired: false,
        cancelled: false,
      }
      t.timer = setTimeout(() => {
        t.fired = true
        actions.pressCancel()
        actions.secondary(t.cell)
        navigator.vibrate?.(20)
      }, LONG_PRESS_MS)
      touch = t
      actions.pressStart(cell, false)
      return
    }
    if (!touch || touch.id !== e.pointerId) return
    if (kind === 'move') {
      if (!touch.cancelled && Math.hypot(e.clientX - touch.x, e.clientY - touch.y) > TAP_MOVE_PX) {
        touch.cancelled = true
        if (touch.timer) clearTimeout(touch.timer)
        actions.pressCancel()
      }
      return
    }
    const t = touch
    endTouch()
    actions.pressCancel()
    if (kind === 'up' && !t.fired && !t.cancelled) {
      if (flagMode) actions.secondary(t.cell)
      else actions.primary(t.cell)
    }
  }
  const on = (kind: PointerKind) => (e: PointerEvent) => {
    if (kind === 'down') {
      e.preventDefault()
      try {
        el.setPointerCapture(e.pointerId)
      } catch {
        /* 캡처 실패해도 동작 */
      }
    }
    if (e.pointerType === 'touch') {
      onTouch(kind, e)
      return
    }
    m.handle(kind, e.buttons, toCell(e.clientX, e.clientY))
  }
  const down = on('down')
  const move = on('move')
  const up = on('up')
  const leave = on('leave')
  const cancel = on('cancel')
  const blur = (): void => {
    m.reset()
    if (touch) {
      endTouch()
      actions.pressCancel()
    }
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
      endTouch()
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointerleave', leave)
      el.removeEventListener('pointercancel', cancel)
      el.removeEventListener('contextmenu', context)
      window.removeEventListener('blur', blur)
    },
    setFlagMode(on) {
      flagMode = on
    },
  }
}
