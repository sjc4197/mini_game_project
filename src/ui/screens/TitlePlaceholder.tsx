import { useStore } from '@/app/store'
import styles from './TitlePlaceholder.module.css'

/** 4단계(공용 UI + 화면 머신)에서 진짜 TitleScreen 으로 교체되는 자리 표시 화면 */
export function TitlePlaceholder() {
  const navigate = useStore((s) => s.navigate)
  return (
    <main className={styles.title}>
      <h1 className={`t-display ${styles.logo}`}>도트 아케이드</h1>
      <p className={`t-body px-blink ${styles.press}`}>▶ PRESS START ◀</p>
      <p className={`t-caption ${styles.caption}`}>v0.1 · 1단계: 토큰 · 폰트 · --u · 스토어 골격</p>
      {import.meta.env.DEV && (
        <button
          type="button"
          className={`t-small ${styles.devLink}`}
          onClick={() => {
            location.hash = '#dev/tokens'
            navigate({ kind: 'dev', page: 'tokens' })
          }}
        >
          토큰 견본 보기 (#dev/tokens)
        </button>
      )}
    </main>
  )
}
