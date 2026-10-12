import { MenuList } from './MenuList'
import { Overlay } from './Overlay'

interface Props {
  onResume(): void
  onRestart(): void
  onLobby(): void
}

/** 일시정지 모달 — 입력 스코프 'overlay' 는 GameScreen 이 전환 */
export function PauseOverlay({ onResume, onRestart, onLobby }: Props) {
  return (
    <Overlay title="일시정지">
      <MenuList
        scope="overlay"
        items={[
          { id: 'resume', label: '계속하기', hint: 'Esc', variant: 'primary', onSelect: onResume },
          { id: 'restart', label: '다시 시작', hint: 'R', onSelect: onRestart },
          { id: 'lobby', label: '로비로', onSelect: onLobby },
        ]}
        onCancel={onResume}
      />
    </Overlay>
  )
}
