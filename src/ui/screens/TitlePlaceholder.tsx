import { useStore } from '@/app/store'
import styles from './TitlePlaceholder.module.css'

/** 4단계(공용 UI + 화면 머신)에서 진짜 TitleScreen 으로 교체되는 자리 표시 화면 */
export function TitlePlaceholder() {
  const navigate = useStore((s) => s.navigate)
  const goDev = (page: 'tokens' | 'gallery') => {
    location.hash = `#dev/${page}`
    navigate({ kind: 'dev', page })
  }
  return (
    <main className={styles.title}>
      <h1 className={`t-display ${styles.logo}`}>도트 아케이드</h1>
      <p className={`t-body px-blink ${styles.press}`}>▶ PRESS START ◀</p>
      <p className={`t-caption ${styles.caption}`}>v0.1 · 2단계: 스프라이트 엔진 + 갤러리</p>
      {import.meta.env.DEV && (
        <div className={styles.devLinks}>
          <button
            type="button"
            className={`t-small ${styles.devLink}`}
            onClick={() => goDev('gallery')}
          >
            스프라이트 갤러리 (#dev/gallery)
          </button>
          <button
            type="button"
            className={`t-small ${styles.devLink}`}
            onClick={() => goDev('tokens')}
          >
            토큰 견본 (#dev/tokens)
          </button>
        </div>
      )}
    </main>
  )
}
