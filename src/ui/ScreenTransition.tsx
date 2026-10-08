import { useEffect, useRef } from 'react'
import type { ScreenFx } from '@/app/screen'
import type { CurtainPhase } from './router'
import styles from './ScreenTransition.module.css'

interface Props {
  phase: CurtainPhase
  fx: ScreenFx
  onEnd: () => void
}

/** 잉크색 커튼. animationend + 400ms 타임아웃 폴백(숨은 탭 등)으로 onEnd 를 한 phase 당 정확히 1회 보장 */
export function Curtain({ phase, fx, onEnd }: Props) {
  const firedFor = useRef<CurtainPhase>('idle')

  useEffect(() => {
    firedFor.current = 'idle'
    if (phase === 'idle') return
    const timer = setTimeout(() => fire(phase), 400)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const fire = (p: CurtainPhase) => {
    if (p === 'idle' || firedFor.current === p) return
    firedFor.current = p
    onEnd()
  }

  const cls = [styles.curtain, styles[fx], phase !== 'idle' ? styles[phase] : '']
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={cls}
      onAnimationEnd={phase !== 'idle' ? () => fire(phase) : undefined}
      aria-hidden
    />
  )
}
