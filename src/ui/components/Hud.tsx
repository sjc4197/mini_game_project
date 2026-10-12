import type { HudValues } from '@/app/session'
import type { GameModule } from '@/games/types'
import { PixelButton } from './PixelButton'
import styles from './Hud.module.css'

interface Props {
  module: GameModule
  difficultyLabel: string
  values: HudValues
  paused: boolean
  onPause(): void
}

/** 게임 화면 상단: 좌 제목·난이도, 중 HUD 값(모듈이 정의), 우 일시정지 */
export function Hud({ module, difficultyLabel, values, paused, onPause }: Props) {
  return (
    <header className={styles.hud}>
      <h1 className={`t-h2 ${styles.title}`}>
        {module.title}
        <span className={styles.diff}> · {difficultyLabel}</span>
      </h1>
      <dl className={styles.values}>
        {module.hud.map((f) => {
          const v = values[f.key]
          return (
            <div key={f.key} className={styles.field}>
              <dt className={`t-caption ${styles.label}`}>{f.label}</dt>
              <dd className={`t-num ${styles.value}`}>
                {v === undefined ? '—' : f.format ? f.format(v) : v}
              </dd>
            </div>
          )
        })}
      </dl>
      <PixelButton
        size="small"
        tabIndex={-1}
        className={styles.pause}
        aria-pressed={paused}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onPause}
      >
        II 일시정지<span className={styles.key}>Esc</span>
      </PixelButton>
    </header>
  )
}
