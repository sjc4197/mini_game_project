import type { ButtonHTMLAttributes } from 'react'
import { audio } from '@/app/audio/audio'

export interface PixelButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary'
  size?: 'body' | 'small'
  /** MenuList 가 관리하는 포커스 (키보드/마우스 공통 모양) */
  focused?: boolean
  /** hover → select, 클릭 → confirm 효과음 (MenuList 처럼 직접 내는 쪽은 false) */
  sfx?: boolean
}

/** 1dp 테두리 + 베벨 + 2dp 하드 섀도 버튼 (레시피는 ui.css 의 .btn) */
export function PixelButton({
  variant = 'default',
  size = 'body',
  focused = false,
  sfx = true,
  className,
  children,
  type = 'button',
  onMouseEnter,
  onClick,
  disabled,
  ...rest
}: PixelButtonProps) {
  const cls = [
    'btn',
    variant === 'primary' ? 'btn-primary' : '',
    size === 'small' ? 't-small' : 't-body',
    focused ? 'is-focused' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <button
      type={type}
      className={cls}
      data-nav
      disabled={disabled}
      onMouseEnter={(e) => {
        if (sfx && !disabled) audio.play('select')
        onMouseEnter?.(e)
      }}
      onClick={(e) => {
        if (sfx && !disabled) audio.play('confirm')
        onClick?.(e)
      }}
      {...rest}
    >
      {children}
    </button>
  )
}
