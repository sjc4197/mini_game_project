import { useEffect, useRef, useState } from 'react'
import type { InputScope } from '@/app/input/bindings'
import { input } from '@/app/input/input'
import { clamp } from '@/lib/math'

export interface KeyNavOptions {
  count: number
  /** 그리드면 열 수 (세로 목록 1, 가로 목록 = count) */
  columns?: number
  onConfirm?: (index: number) => void
  onCancel?: () => void
  scope?: InputScope | InputScope[]
  initialIndex?: number
  enabled?: boolean
  onMove?: (index: number) => void
}

/**
 * 메뉴/카드 그리드 키보드 내비. 방향키로 포커스 이동(끝에서 멈춤), confirm/cancel 액션 전달.
 * 마우스 hover 는 setIndex 로 같은 포커스를 쓴다 → 키보드와 마우스가 같은 모양.
 */
export function useKeyNav({
  count,
  columns = 1,
  onConfirm,
  onCancel,
  scope = 'ui',
  initialIndex = 0,
  enabled = true,
  onMove,
}: KeyNavOptions) {
  const [index, setIndexState] = useState(() => clamp(initialIndex, 0, Math.max(0, count - 1)))
  const ref = useRef({ index, count, columns, onConfirm, onCancel, onMove })
  ref.current = { index, count, columns, onConfirm, onCancel, onMove }

  const setIndex = (next: number) => {
    const c = Math.max(0, ref.current.count - 1)
    const v = clamp(next, 0, c)
    if (v !== ref.current.index) {
      setIndexState(v)
      ref.current.onMove?.(v)
    }
  }

  useEffect(() => {
    if (!enabled) return
    const move = (delta: number) => {
      setIndex(ref.current.index + delta)
      return true
    }
    const cols = Math.max(1, columns)
    const vertical = cols === 1
    const offs = [
      input.on('left', () => (vertical ? false : move(-1)), { scope }),
      input.on('right', () => (vertical ? false : move(1)), { scope }),
      input.on('up', () => move(vertical ? -1 : -cols), { scope }),
      input.on('down', () => move(vertical ? 1 : cols), { scope }),
      input.on(
        'confirm',
        () => {
          ref.current.onConfirm?.(ref.current.index)
          return true
        },
        { scope },
      ),
      input.on(
        'cancel',
        () => {
          if (!ref.current.onCancel) return false
          ref.current.onCancel()
          return true
        },
        { scope },
      ),
    ]
    return () => offs.forEach((off) => off())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, scope, columns])

  // count 가 줄어 인덱스가 범위를 벗어나면 보정
  useEffect(() => {
    if (index > count - 1) setIndexState(Math.max(0, count - 1))
  }, [count, index])

  return { index, setIndex }
}
