import type { ReactNode } from 'react'
import { MenuList } from './MenuList'
import { Overlay } from './Overlay'

interface Props {
  title: ReactNode
  message?: ReactNode
  confirmLabel: string
  onConfirm(): void
  onCancel(): void
}

/** 되돌릴 수 없는 동작 확인 (기록 초기화 등). 기본 포커스는 취소 */
export function ConfirmOverlay({ title, message, confirmLabel, onConfirm, onCancel }: Props) {
  return (
    <Overlay title={title}>
      {message !== undefined && <p className="t-small">{message}</p>}
      <MenuList
        scope="overlay"
        orientation="horizontal"
        items={[
          { id: 'cancel', label: '취소', hint: 'Esc', onSelect: onCancel },
          { id: 'ok', label: confirmLabel, variant: 'primary', onSelect: onConfirm },
        ]}
        onCancel={onCancel}
      />
    </Overlay>
  )
}
