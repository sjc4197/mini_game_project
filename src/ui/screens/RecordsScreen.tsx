import { useCallback, useEffect, useMemo, useState } from 'react'
import { audio } from '@/app/audio/audio'
import { input } from '@/app/input/input'
import type { Screen } from '@/app/screen'
import { useStore, type RecordEntry } from '@/app/store'
import { findCharacter } from '@/characters'
import { characterIcon } from '@/characters/icon'
import { listGames } from '@/games/registry'
import type { GameModule } from '@/games/types'
import { formatDate } from '@/lib/format'
import { ConfirmOverlay } from '@/ui/components/ConfirmOverlay'
import { PixelButton } from '@/ui/components/PixelButton'
import { PixelIcon } from '@/ui/components/PixelIcon'
import { useKeyNav } from '@/ui/hooks/useKeyNav'
import styles from './RecordsScreen.module.css'

type RecordsScreenState = Extract<Screen, { kind: 'records' }>

function CharacterChip({ id }: { id: string }) {
  const c = findCharacter(id)
  if (!c) return <span className={styles.unknown}>?</span>
  return (
    <span className={styles.chip}>
      <PixelIcon sprite={characterIcon(c)} scaleU={1} accent={c.accent} />
      {c.name}
    </span>
  )
}

/**
 * 기록: ←→ 게임 탭, ↑↓ 난이도/버튼, Enter 실행, Esc 뒤로.
 * 난이도별 BEST(캐릭터·날짜) + 플레이/클리어율 + 최근 10판.
 */
export function RecordsScreen({ screen }: { screen: RecordsScreenState }) {
  const back = useStore((s) => s.back)
  const records = useStore((s) => s.records)
  const resetRecords = useStore((s) => s.resetRecords)
  const devMode = useStore((s) => s.settings.devMode)
  const games = useMemo(() => listGames(devMode), [devMode])
  const [tab, setTab] = useState(() =>
    Math.max(
      0,
      games.findIndex((g) => g.id === screen.gameId),
    ),
  )
  const [confirming, setConfirming] = useState(false)
  const game: GameModule | undefined = games[tab]
  const difficulties = game?.difficulties ?? []
  const count = difficulties.length + 2 // + 초기화, 뒤로

  const openConfirm = useCallback(() => {
    audio.play('confirm')
    setConfirming(true)
    input.setScope('overlay')
  }, [])
  const closeConfirm = useCallback(() => {
    setConfirming(false)
    input.setScope('ui')
  }, [])

  const { index, setIndex } = useKeyNav({
    count,
    columns: 1,
    onConfirm: (i) => {
      if (i === difficulties.length) openConfirm()
      else if (i === difficulties.length + 1) back()
    },
    onCancel: back,
  })

  const switchTab = useCallback(
    (dir: -1 | 1) => {
      if (games.length < 2) return
      audio.play('select')
      setTab((t) => (t + dir + games.length) % games.length)
      setIndex(0)
    },
    [games.length, setIndex],
  )
  useEffect(() => {
    const offs = [
      input.on('left', () => (switchTab(-1), true), { scope: 'ui' }),
      input.on('right', () => (switchTab(1), true), { scope: 'ui' }),
    ]
    return () => offs.forEach((off) => off())
  }, [switchTab])
  useEffect(() => () => input.setScope('ui'), [])

  const diffIndex = Math.min(index, Math.max(0, difficulties.length - 1))
  const difficulty = difficulties[diffIndex]
  const entry: RecordEntry | undefined =
    game && difficulty ? records[game.id]?.[difficulty.id] : undefined
  const winRate = entry && entry.plays > 0 ? Math.round((entry.wins / entry.plays) * 100) : 0

  return (
    <main className={styles.screen}>
      <header className={styles.header}>
        <PixelButton
          size="small"
          tabIndex={-1}
          sfx={false}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => (audio.play('back'), back())}
        >
          ◀ 뒤로
        </PixelButton>
        <h1 className="t-h1">기록</h1>
        <span />
      </header>

      <nav className={styles.tabs} aria-label="게임">
        {games.map((g, i) => (
          <button
            key={g.id}
            type="button"
            tabIndex={-1}
            className={i === tab ? `t-h2 ${styles.tab} ${styles.tabActive}` : `t-h2 ${styles.tab}`}
            aria-pressed={i === tab}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              if (i !== tab) {
                audio.play('select')
                setTab(i)
                setIndex(0)
              }
            }}
          >
            {g.title}
          </button>
        ))}
        {games.length > 1 && <span className={`t-small ${styles.tabHint}`}>←→ 게임</span>}
      </nav>

      {game && difficulty ? (
        <section className={`panel ${styles.body}`}>
          <ul className={styles.diffs} role="listbox" aria-label="난이도">
            {difficulties.map((d, i) => (
              <li
                key={d.id}
                role="option"
                aria-selected={i === index}
                className={i === index ? `${styles.diff} ${styles.focused}` : styles.diff}
                onMouseEnter={() => setIndex(i)}
                onClick={() => setIndex(i)}
              >
                <span className="t-body">{d.label}</span>
                <span className={`t-caption ${styles.diffBest}`}>
                  {records[game.id]?.[d.id]?.best
                    ? game.scoring.format(records[game.id]![d.id]!.best!.value)
                    : '—'}
                </span>
              </li>
            ))}
          </ul>

          <div className={styles.detail}>
            <div className={styles.best}>
              <span className={`t-small ${styles.muted}`}>BEST · {difficulty.label}</span>
              {entry?.best ? (
                <>
                  <span className="t-num-l">{game.scoring.format(entry.best.value)}</span>
                  <span className={`t-small ${styles.bestMeta}`}>
                    <CharacterChip id={entry.best.characterId} />
                    <span className={styles.muted}>{formatDate(Date.parse(entry.best.date))}</span>
                  </span>
                </>
              ) : (
                <span className={`t-body ${styles.muted}`}>아직 기록이 없어요</span>
              )}
            </div>
            <div className={`t-small ${styles.stats}`}>
              플레이 {entry?.plays ?? 0} · 클리어 {entry?.wins ?? 0} ({winRate}%)
            </div>
            <ol className={styles.history} aria-label="최근 플레이">
              {(entry?.history ?? []).map((h) => (
                <li key={h.at} className={`t-small ${styles.row}`}>
                  <CharacterChip id={h.characterId} />
                  <span className={`t-num ${styles.score}`}>{game.scoring.format(h.score)}</span>
                  <span className={h.outcome === 'win' ? styles.win : styles.lose}>
                    {h.outcome === 'win' ? '클리어' : h.outcome === 'lose' ? '실패' : '중단'}
                  </span>
                  <span className={styles.muted}>{formatDate(h.at)}</span>
                </li>
              ))}
              {(entry?.history.length ?? 0) === 0 && (
                <li className={`t-small ${styles.muted}`}>최근 플레이 없음</li>
              )}
            </ol>
          </div>
        </section>
      ) : (
        <p className={`t-body ${styles.muted}`}>기록할 게임이 아직 없어요.</p>
      )}

      <div className={styles.actions}>
        <PixelButton
          tabIndex={-1}
          sfx={false}
          focused={index === difficulties.length}
          onMouseEnter={() => setIndex(difficulties.length)}
          onMouseDown={(e) => e.preventDefault()}
          onClick={openConfirm}
          disabled={!game}
        >
          기록 초기화
        </PixelButton>
        <PixelButton
          tabIndex={-1}
          sfx={false}
          focused={index === difficulties.length + 1}
          onMouseEnter={() => setIndex(difficulties.length + 1)}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => (audio.play('back'), back())}
        >
          뒤로<span className={`t-small ${styles.key}`}>Esc</span>
        </PixelButton>
      </div>
      <footer className={`t-small ${styles.hint}`}>
        ←→ 게임 · ↑↓ 난이도 · Enter 실행 · Esc 뒤로
      </footer>

      {confirming && game && (
        <ConfirmOverlay
          title={`${game.title} 기록 초기화`}
          message="이 게임의 모든 난이도 기록을 지웁니다. 되돌릴 수 없어요."
          confirmLabel="초기화"
          onConfirm={() => {
            resetRecords(game.id)
            closeConfirm()
          }}
          onCancel={closeConfirm}
        />
      )}
    </main>
  )
}
