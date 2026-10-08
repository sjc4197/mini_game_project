import type { ReactNode } from 'react'
import type { InputScope } from '@/app/input/bindings'
import { useCursorImage } from '@/ui/hooks/useCursorImage'
import { useKeyNav } from '@/ui/hooks/useKeyNav'
import { PixelButton } from './PixelButton'
import styles from './MenuList.module.css'

export interface MenuItem {
  id: string
  label: ReactNode
  onSelect: () => void
  disabled?: boolean
  variant?: 'default' | 'primary'
  /** 오른쪽에 작게 표시 (단축키 등) */
  hint?: ReactNode
}

interface Props {
  items: readonly MenuItem[]
  scope?: InputScope | InputScope[]
  orientation?: 'vertical' | 'horizontal'
  onCancel?: () => void
  initialIndex?: number
  className?: string
}

/**
 * 키보드(↑↓ / ←→, Enter/Z, Esc/X) + 마우스(hover = 포커스, 클릭 = 선택) 메뉴.
 * 버튼은 tabIndex=-1: DOM 포커스가 Space/Enter 를 가로채지 않게 하고 포커스 표시는 .is-focused 로 통일.
 */
export function MenuList({
  items,
  scope = 'ui',
  orientation = 'vertical',
  onCancel,
  initialIndex = 0,
  className,
}: Props) {
  const cursor = useCursorImage()
  const { index, setIndex } = useKeyNav({
    count: items.length,
    columns: orientation === 'horizontal' ? Math.max(1, items.length) : 1,
    initialIndex,
    scope,
    onConfirm: (i) => {
      const item = items[i]
      if (item && !item.disabled) item.onSelect()
    },
    onCancel,
  })

  return (
    <ul
      className={[
        styles.menu,
        orientation === 'horizontal' ? styles.horizontal : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      role="menu"
      style={{ '--cursor-img': `url(${cursor})` }}
    >
      {items.map((item, i) => (
        <li key={item.id} role="none" className={styles.item}>
          <PixelButton
            role="menuitem"
            tabIndex={-1}
            focused={i === index}
            disabled={item.disabled}
            variant={item.variant}
            aria-disabled={item.disabled}
            onMouseEnter={() => setIndex(i)}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setIndex(i)
              if (!item.disabled) item.onSelect()
            }}
          >
            {item.label}
            {item.hint !== undefined && (
              <span className={`t-small ${styles.hint}`}>{item.hint}</span>
            )}
          </PixelButton>
        </li>
      ))}
    </ul>
  )
}
