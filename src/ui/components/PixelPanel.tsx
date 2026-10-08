import type { HTMLAttributes } from 'react'

/** 테두리 패널 (ui.css 의 .panel) */
export function PixelPanel({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={className ? `panel ${className}` : 'panel'} {...rest}>
      {children}
    </div>
  )
}
