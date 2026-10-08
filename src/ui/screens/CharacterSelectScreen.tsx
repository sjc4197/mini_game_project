import { useCallback, useEffect } from 'react'
import { useStore } from '@/app/store'
import { applyCharacterTheme } from '@/app/theme'
import { CHARACTERS, findCharacter, getCharacter } from '@/characters'
import { Mascot } from '@/ui/components/Mascot'
import { PixelButton } from '@/ui/components/PixelButton'
import { useKeyNav } from '@/ui/hooks/useKeyNav'
import styles from './CharacterSelectScreen.module.css'

export function CharacterSelectScreen() {
  const navigate = useStore((s) => s.navigate)
  const back = useStore((s) => s.back)
  const selectCharacter = useStore((s) => s.selectCharacter)
  const savedId = useStore((s) => s.selectedCharacterId)
  const savedIndex = Math.max(
    0,
    CHARACTERS.findIndex((c) => c.id === savedId),
  )

  const confirm = useCallback(
    (i: number) => {
      const c = CHARACTERS[i]
      if (!c) return
      selectCharacter(c.id)
      navigate({ kind: 'lobby' })
    },
    [selectCharacter, navigate],
  )

  const { index, setIndex } = useKeyNav({
    count: CHARACTERS.length,
    columns: 2,
    initialIndex: savedIndex,
    onConfirm: confirm,
    onCancel: back,
  })
  const focused = CHARACTERS[index] ?? getCharacter(null)

  // 포커스 캐릭터의 테마를 즉시 미리보기. 화면을 떠날 때는 저장된 캐릭터(없으면 중립)로 복구
  useEffect(() => {
    applyCharacterTheme(focused)
  }, [focused])
  useEffect(
    () => () => applyCharacterTheme(findCharacter(useStore.getState().selectedCharacterId)),
    [],
  )

  return (
    <main className={styles.screen}>
      <header className={styles.header}>
        <PixelButton size="small" tabIndex={-1} onMouseDown={(e) => e.preventDefault()} onClick={back}>
          ◀ 타이틀
        </PixelButton>
        <h1 className="t-h1">캐릭터 선택</h1>
        <span />
      </header>

      <div className={styles.body}>
        <ul className={styles.cards} role="listbox" aria-label="캐릭터">
          {CHARACTERS.map((c, i) => (
            <li
              key={c.id}
              role="option"
              aria-selected={i === index}
              className={i === index ? `${styles.card} ${styles.focused}` : styles.card}
              onMouseEnter={() => setIndex(i)}
              onClick={() => (i === index ? confirm(i) : setIndex(i))}
            >
              <Mascot
                character={c}
                mood={i === index ? 'happy' : 'idle'}
                scaleU={2}
                animate
                phaseMs={i * 200}
              />
              <span className="t-h2">{c.name}</span>
              {c.id === savedId && <span className={`t-caption ${styles.badge}`}>현재</span>}
            </li>
          ))}
        </ul>

        <section className={`panel ${styles.preview}`} aria-live="polite">
          <div className={styles.previewSprite}>
            <Mascot character={focused} mood="idle" scaleU={3} animate />
          </div>
          <h2 className={`t-h1 ${styles.name}`}>{focused.name}</h2>
          <p className={`t-body ${styles.bio}`}>“{focused.bio}”</p>
          <dl className={`t-small ${styles.meta}`}>
            <dt>성격</dt>
            <dd>{focused.personality}</dd>
            <dt>전문</dt>
            <dd>{focused.specialty}</dd>
            <dt>컬러</dt>
            <dd>
              <span className={styles.swatch} style={{ background: focused.accent.base }} />
              {focused.accent.base}
            </dd>
          </dl>
          <PixelButton
            variant="primary"
            tabIndex={-1}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => confirm(index)}
          >
            이 캐릭터로 시작
            <span className={`t-small ${styles.key}`}>Enter</span>
          </PixelButton>
        </section>
      </div>

      <footer className={`t-small ${styles.hint}`}>←→↑↓ 이동 · Enter/Z 선택 · Esc/X 뒤로</footer>
    </main>
  )
}
