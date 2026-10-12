import type { ReactNode } from 'react'
import type { CharacterDef } from '@/characters/types'
import type { Mood } from '@/pixel/types'
import { Mascot } from './Mascot'
import { SpeechBubble } from './SpeechBubble'
import styles from './MascotPanel.module.css'

interface Props {
  character: CharacterDef
  mood: Mood
  line: string | null
  scaleU?: number
  className?: string
  /** 아래 부가 정보 (BEST, 플레이 통계 …) */
  children?: ReactNode
}

/** 말풍선 + 마스코트 + 부가 정보. 로비와 게임 화면이 공유 */
export function MascotPanel({ character, mood, line, scaleU = 2, className, children }: Props) {
  return (
    <aside
      className={className ? `panel ${styles.panel} ${className}` : `panel ${styles.panel}`}
      aria-label={`${character.name} 마스코트`}
    >
      <SpeechBubble line={line} />
      <div className={styles.stage}>
        <Mascot character={character} mood={mood} scaleU={scaleU} animate />
      </div>
      <span className={`t-caption ${styles.name}`}>{character.name}</span>
      {children !== undefined && <div className={styles.extra}>{children}</div>}
    </aside>
  )
}
