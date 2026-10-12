import type { GameModule } from '@/games/types'
import { MenuList } from './MenuList'
import { Overlay } from './Overlay'
import styles from './DifficultyPicker.module.css'

interface Props {
  module: GameModule
  onPick(difficultyId: string): void
  onClose(): void
}

/** 난이도 선택 모달 (로비 카드 Enter → 여기 → wipe 전환으로 게임 시작) */
export function DifficultyPicker({ module, onPick, onClose }: Props) {
  const initial = Math.max(
    0,
    module.difficulties.findIndex((d) => d.id === module.defaultDifficulty),
  )
  return (
    <Overlay title={`${module.title} · 난이도`}>
      <MenuList
        scope="overlay"
        initialIndex={initial}
        items={module.difficulties.map((d) => ({
          id: d.id,
          label: d.label,
          hint: d.description,
          onSelect: () => onPick(d.id),
        }))}
        onCancel={onClose}
      />
      <span className={`t-small ${styles.hint}`}>↑↓ 선택 · Enter 시작 · Esc 닫기</span>
    </Overlay>
  )
}
