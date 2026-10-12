import type { SessionResult } from '@/app/session'
import type { GameModule } from '@/games/types'
import { formatClock } from '@/lib/format'
import { MenuList } from './MenuList'
import { Overlay } from './Overlay'
import styles from './ResultOverlay.module.css'

interface Props {
  module: GameModule
  result: SessionResult
  onRestart(): void
  onLobby(): void
}

/** 결과 모달: 클리어/게임 오버 + 점수(모듈 포맷) + BEST + NEW RECORD + 플레이 시간 */
export function ResultOverlay({ module, result, onRestart, onLobby }: Props) {
  const win = result.outcome === 'win'
  const timeBased = module.scoring.betterIs === 'lower'
  return (
    <Overlay
      title={<span className={win ? styles.win : styles.lose}>{win ? '★ 클리어! ★' : '게임 오버'}</span>}
    >
      <div className={styles.score}>
        <span className={`t-small ${styles.muted}`}>{win ? '기록' : timeBased ? '시간' : '점수'}</span>
        <span className="t-num-l">{module.scoring.format(result.score)}</span>
        {result.isRecord && <span className={`t-h2 px-blink ${styles.record}`}>NEW RECORD!</span>}
      </div>
      <div className={`t-small ${styles.meta}`}>
        <span>BEST {result.best ? module.scoring.format(result.best.value) : '—'}</span>
        <span>플레이 시간 {formatClock(result.durationMs)}</span>
      </div>
      <MenuList
        scope="overlay"
        orientation="horizontal"
        items={[
          { id: 'restart', label: '다시하기', hint: 'R', variant: 'primary', onSelect: onRestart },
          { id: 'lobby', label: '로비', hint: 'Esc', onSelect: onLobby },
        ]}
        onCancel={onLobby}
      />
    </Overlay>
  )
}
