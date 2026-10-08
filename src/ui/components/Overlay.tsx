import type { ReactNode } from 'react'
import styles from './Overlay.module.css'

interface Props {
  title?: ReactNode
  children: ReactNode
  className?: string
}

/** 딤 + 중앙 패널 모달 베이스 (일시정지/결과/확인). 입력 스코프 전환은 호출 측이 담당 */
export function Overlay({ title, children, className }: Props) {
  return (
    <div className={styles.dim} role="dialog" aria-modal="true">
      <div className={`panel ${styles.box} ${className ?? ''}`}>
        {title !== undefined && <h2 className={`t-h1 ${styles.title}`}>{title}</h2>}
        {children}
      </div>
    </div>
  )
}
