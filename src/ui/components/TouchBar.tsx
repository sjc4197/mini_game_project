import { useState } from 'react'
import { input } from '@/app/input/input'
import type { TouchControl } from '@/games/types'
import styles from './TouchBar.module.css'

interface Props {
  controls: readonly TouchControl[]
  /** 토글 컨트롤 값 변경 → GameInstance.setOption */
  onToggle(option: string, value: boolean): void
}

const noop = (): void => {}

/**
 * 터치 조작 바. 키 버튼은 누르는 동안 InputService 에 keydown 을 주입하고 떼면 keyup → 게임은 키보드와 똑같이 본다
 * (DAS/ARR 도 그대로 동작). 토글은 게임 옵션으로 전달한다 (지뢰찾기 깃발 모드).
 */
export function TouchBar({ controls, onToggle }: Props) {
  const [toggles, setToggles] = useState<Record<string, boolean>>({})

  const press = (code: string) => input.keydown({ code, repeat: false, preventDefault: noop })
  const release = (code: string) => input.keyup({ code })

  return (
    <div className={styles.bar} role="group" aria-label="터치 조작">
      {controls.map((c) =>
        c.type === 'key' ? (
          <button
            key={c.id}
            type="button"
            tabIndex={-1}
            className={`t-h2 ${styles.btn} ${c.wide ? styles.wide : ''}`}
            aria-label={c.label}
            onContextMenu={(e) => e.preventDefault()}
            onPointerDown={(e) => {
              e.preventDefault()
              try {
                e.currentTarget.setPointerCapture(e.pointerId)
              } catch {
                /* 합성 이벤트 등 캡처 불가 */
              }
              press(c.code)
            }}
            onPointerUp={() => release(c.code)}
            onPointerCancel={() => release(c.code)}
            onLostPointerCapture={() => release(c.code)}
          >
            {c.label}
          </button>
        ) : (
          <button
            key={c.id}
            type="button"
            tabIndex={-1}
            className={`t-h2 ${styles.btn} ${styles.toggle} ${toggles[c.option] ? styles.on : ''}`}
            aria-pressed={!!toggles[c.option]}
            onContextMenu={(e) => e.preventDefault()}
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => {
              const next = !toggles[c.option]
              setToggles((t) => ({ ...t, [c.option]: next }))
              onToggle(c.option, next)
            }}
          >
            {toggles[c.option] ? c.labelOn : c.label}
          </button>
        ),
      )}
    </div>
  )
}
