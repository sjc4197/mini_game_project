import type { ReactNode } from 'react'
import type { CharacterDef } from '@/characters/types'
import type { Mood } from '@/pixel/types'
import { Mascot } from './Mascot'
import styles from './MascotStrip.module.css'

interface Props {
  character: CharacterDef
  mood: Mood
  line: string | null
  /** 오른쪽 끝 부가 정보 (BEST 등) */
  children?: ReactNode
}

/** 좁은 화면용 가로 스트립: 1u 마스코트 + 한 줄 말풍선 + 부가 정보 */
export function MascotStrip({ character, mood, line, children }: Props) {
  return (
    <aside className={`panel ${styles.strip}`} aria-label={`${character.name} 마스코트`}>
      <div className={styles.stage}>
        <Mascot character={character} mood={mood} scaleU={1} animate />
      </div>
      <div className={styles.bubble} role="status" aria-live="polite" data-visible={line !== null}>
        <span key={line ?? ''} className={`t-small ${styles.text}`}>
          {line ?? ''}
        </span>
      </div>
      {children !== undefined && <div className={`t-caption ${styles.extra}`}>{children}</div>}
    </aside>
  )
}
