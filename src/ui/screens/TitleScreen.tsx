import { useCallback, useEffect, useState } from 'react'
import { audio } from '@/app/audio/audio'
import { input } from '@/app/input/input'
import { useStore } from '@/app/store'
import { CHARACTERS, getCharacterClips } from '@/characters'
import { PixelSprite } from '@/ui/components/PixelSprite'
import styles from './TitleScreen.module.css'

const VERSION = 'v0.1'
/** 타이틀에서 이 글자를 차례로 치면 개발자 모드 토글 (샘플 게임 표시) */
const DEV_WORD = 'dev'
const TOAST_MS = 2000

export function TitleScreen() {
  const navigate = useStore((s) => s.navigate)
  const selectedId = useStore((s) => s.selectedCharacterId)
  const devMode = useStore((s) => s.settings.devMode)
  const [toast, setToast] = useState<string | null>(null)

  // 시작하면 항상 캐릭터 선택으로 (저장된 고양이에 포커스가 가 있다)
  const start = useCallback(() => {
    audio.play('confirm')
    navigate({ kind: 'select' })
  }, [navigate])
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

  // 키워드 'dev' 입력 → 개발자 모드 토글
  useEffect(() => {
    let typed = ''
    let timer: ReturnType<typeof setTimeout> | null = null
    const onKey = (e: KeyboardEvent): void => {
      if (e.repeat || !/^Key[A-Z]$/.test(e.code)) return
      typed = (typed + e.code.slice(3).toLowerCase()).slice(-DEV_WORD.length)
      if (typed !== DEV_WORD) return
      typed = ''
      const next = !useStore.getState().settings.devMode
      useStore.getState().updateSettings({ devMode: next })
      audio.play(next ? 'levelup' : 'back')
      setToast(`개발자 모드 ${next ? 'ON' : 'OFF'}`)
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => setToast(null), TOAST_MS)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      if (timer) clearTimeout(timer)
    }
  }, [])

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
        {(toast || devMode) && (
          <span className={styles.dev} role="status">
            {toast ?? '개발자 모드'}
          </span>
        )}
      </footer>
    </main>
  )
}
