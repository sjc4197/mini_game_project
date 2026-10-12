import { useCallback, useEffect, useRef, useState } from 'react'
import { input } from '@/app/input/input'
import { createMascotReactor, type MascotReactor } from '@/app/mascot'
import { latestBest, totalPlays } from '@/app/records'
import { useSession } from '@/app/session'
import { useStore, type GameRecords } from '@/app/store'
import { getCharacter } from '@/characters'
import type { LineKey } from '@/characters/types'
import { lobbyEntries, type LobbyEntry } from '@/games/registry'
import type { GameModule } from '@/games/types'
import { MascotPanel } from '@/ui/components/MascotPanel'
import { PixelButton } from '@/ui/components/PixelButton'
import { PixelIcon } from '@/ui/components/PixelIcon'
import { useKeyNav } from '@/ui/hooks/useKeyNav'
import { LOCK_ICON } from '@/ui/sprites'
import styles from './LobbyScreen.module.css'

const IDLE_CHATTER_MS = 12_000

const lineKeyOf = (e: LobbyEntry): LineKey => (e.module ? `lobby:${e.id}` : 'lobby:locked')

function bestLabel(m: GameModule, byDifficulty: GameRecords | undefined): string {
  const latest = latestBest(byDifficulty)
  if (!latest?.entry.best) return '기록 없음'
  const label = m.difficulties.find((d) => d.id === latest.difficulty)?.label ?? latest.difficulty
  return `BEST ${m.scoring.format(latest.entry.best.value)} · ${label}`
}

export function LobbyScreen() {
  const navigate = useStore((s) => s.navigate)
  const back = useStore((s) => s.back)
  const records = useStore((s) => s.records)
  const selectedId = useStore((s) => s.selectedCharacterId)
  const character = getCharacter(selectedId)
  const mood = useSession((s) => s.mood)
  const line = useSession((s) => s.line)
  const [entries] = useState(() => lobbyEntries())
  const [shaking, setShaking] = useState<string | null>(null)
  const reactor = useRef<MascotReactor | null>(null)

  const confirm = useCallback(
    (i: number) => {
      const e = entries[i]
      if (!e) return
      if (!e.module) {
        setShaking(e.id)
        reactor.current?.react('ui.locked')
        return
      }
      // 6b: 난이도 피커를 거쳐 시작
      navigate({ kind: 'game', gameId: e.module.id, difficulty: e.module.defaultDifficulty }, 'wipe')
    },
    [entries, navigate],
  )

  const { index, setIndex } = useKeyNav({
    count: entries.length,
    columns: 2,
    onConfirm: confirm,
    onCancel: back,
    onMove: (i) => {
      const e = entries[i]
      if (e) reactor.current?.react('ui.lobby.hover', { lineKey: lineKeyOf(e) })
    },
  })

  // 마스코트 리액터는 화면 수명과 같다. 첫 대사는 첫 카드 기준, 이후 포커스 이동마다 교체
  useEffect(() => {
    const r = createMascotReactor({
      character,
      getChatter: () => useStore.getState().settings.chatter,
      idleEveryMs: IDLE_CHATTER_MS,
      sink: (m, l) => useSession.getState().setMascot(m, l),
    })
    reactor.current = r
    const first = entries[0]
    if (first) r.react('ui.lobby.hover', { lineKey: lineKeyOf(first) })
    return () => {
      r.dispose()
      reactor.current = null
      useSession.getState().setMascot('idle', null)
    }
  }, [character, entries])

  const openRecords = useCallback(() => navigate({ kind: 'records' }), [navigate])
  const openSettings = useCallback(() => navigate({ kind: 'settings', from: 'lobby' }), [navigate])
  useEffect(() => {
    const offs = [
      input.on('records', () => (openRecords(), true), { scope: 'ui' }),
      input.on('settings', () => (openSettings(), true), { scope: 'ui' }),
    ]
    return () => offs.forEach((off) => off())
  }, [openRecords, openSettings])

  const { plays, wins } = totalPlays(records)
  const winRate = plays > 0 ? Math.round((wins / plays) * 100) : 0
  const noFocus = (e: React.MouseEvent) => e.preventDefault()

  return (
    <main className={styles.screen}>
      <header className={styles.header}>
        <PixelButton size="small" tabIndex={-1} onMouseDown={noFocus} onClick={back}>
          ◀ 캐릭터 변경
        </PixelButton>
        <h1 className="t-h1">게임 선택</h1>
        <div className={styles.headerRight}>
          <PixelButton size="small" tabIndex={-1} onMouseDown={noFocus} onClick={openRecords}>
            기록<span className={styles.key}>R</span>
          </PixelButton>
          <PixelButton size="small" tabIndex={-1} onMouseDown={noFocus} onClick={openSettings}>
            설정<span className={styles.key}>S</span>
          </PixelButton>
        </div>
      </header>

      <div className={styles.body}>
        <ul className={styles.cards} role="listbox" aria-label="게임">
          {entries.map((e, i) => (
            <li
              key={e.id}
              role="option"
              aria-selected={i === index}
              aria-disabled={!e.module}
              className={[
                styles.card,
                i === index ? styles.focused : '',
                e.module ? '' : styles.locked,
                shaking === e.id ? 'px-shake' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onMouseEnter={() => setIndex(i)}
              onClick={() => (i === index ? confirm(i) : setIndex(i))}
              onAnimationEnd={() => setShaking(null)}
            >
              <div className={styles.icon}>
                <PixelIcon sprite={e.icon ?? LOCK_ICON} scaleU={2} />
              </div>
              <span className="t-h2">{e.title}</span>
              <span className={`t-small ${styles.desc}`}>{e.description}</span>
              {e.module ? (
                <span className={`t-small ${styles.best}`}>
                  {bestLabel(e.module, records[e.module.id])}
                </span>
              ) : (
                <span className={`t-caption ${styles.soon}`}>
                  <PixelIcon sprite={LOCK_ICON} scaleU={1} />
                  COMING SOON
                </span>
              )}
            </li>
          ))}
        </ul>

        <MascotPanel character={character} mood={mood} line={line} className={styles.mascot}>
          <span className="t-small">
            플레이 {plays} · 클리어 {winRate}%
          </span>
        </MascotPanel>
      </div>

      <footer className={`t-small ${styles.hint}`}>
        ←→↑↓ 이동 · Enter 선택 · R 기록 · S 설정 · Esc 캐릭터 변경
      </footer>
    </main>
  )
}
