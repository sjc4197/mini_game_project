import styles from './SpeechBubble.module.css'

interface Props {
  line: string | null
  className?: string
}

/** 픽셀 말풍선 (꼬리 아래 중앙). 대사가 없어도 자리를 지켜 레이아웃이 뛰지 않는다 */
export function SpeechBubble({ line, className }: Props) {
  return (
    <div
      className={className ? `${styles.bubble} ${className}` : styles.bubble}
      data-visible={line !== null}
      role="status"
      aria-live="polite"
    >
      {line !== null && (
        <span key={line} className={`t-body ${styles.text}`}>
          {line}
        </span>
      )}
    </div>
  )
}
