import { useCallback, useEffect } from 'react'
import { input } from '@/app/input/input'
import { useStore } from '@/app/store'
import { CHARACTERS, findCharacter, getCharacterClips } from '@/characters'
import { PixelSprite } from '@/ui/components/PixelSprite'
import styles from './TitleScreen.module.css'

const VERSION = 'v0.1'

export function TitleScreen() {
  const navigate = useStore((s) => s.navigate)
  const selectedId = useStore((s) => s.selectedCharacterId)

  // 저장된 캐릭터가 있으면 로비로, 없으면 캐릭터 선택으로
  const start = useCallback(() => {
    navigate(findCharacter(selectedId) ? { kind: 'lobby' } : { kind: 'select' })
  }, [navigate, selectedId])
  const openSettings = useCallback(() => navigate({ kind: 'settings', from: 'title' }), [navigate])
  const openRecords = useCallback(() => navigate({ kind: 'records' }), [navigate])

  useEffect(() => {
    const offs = [
      input.on('confirm', () => (start(), true), { scope: 'ui' }),
      input.on('settings', () => (openSettings(), true), { scope: 'ui' }),
      input.on('records', () => (openRecords(), true), { scope: 'ui' }),
    ]
    return () => offs.forEach((off) => off())
  }, [start, openSettings, openRecords])

  const goDev = (page: 'tokens' | 'gallery') => {
    location.hash = `#dev/${page}`
    navigate({ kind: 'dev', page })
  }

  return (
    <main className={styles.screen} onClick={start}>
      <div className={styles.logoBox}>
        <h1 className={`t-display ${styles.logo}`}>도트 아케이드</h1>
      </div>

      <div className={styles.cats} aria-label="캐릭터들">
        {CHARACTERS.map((c, i) => (
          <PixelSprite
            key={c.id}
            clip={getCharacterClips(c)[c.id === selectedId ? 'happy' : 'idle']}
            scaleU={2}
            animate
            phaseMs={i * 250}
            label={c.name}
          />
        ))}
      </div>

      <p className={`t-body px-blink ${styles.press}`}>▶ PRESS START ◀</p>

      <footer className={`t-caption ${styles.footer}`} onClick={(e) => e.stopPropagation()}>
        <span>{VERSION}</span>
        <button type="button" className={styles.link} onClick={openSettings}>
          S 설정
        </button>
        <button type="button" className={styles.link} onClick={openRecords}>
          R 기록
        </button>
        {import.meta.env.DEV && (
          <>
            <button type="button" className={styles.link} onClick={() => goDev('gallery')}>
              DEV 갤러리
            </button>
            <button type="button" className={styles.link} onClick={() => goDev('tokens')}>
              DEV 토큰
            </button>
          </>
        )}
      </footer>
    </main>
  )
}
