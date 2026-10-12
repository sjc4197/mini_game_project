import { useCallback, useEffect, useRef, useState } from 'react'
import { input } from '@/app/input/input'
import type { Screen } from '@/app/screen'
import { useSession } from '@/app/session'
import { useStore } from '@/app/store'
import { getCharacter } from '@/characters'
import { createHost, type HostHandle } from '@/games/host'
import { getGame } from '@/games/registry'
import type { GameInstance } from '@/games/types'
import { Hud } from '@/ui/components/Hud'
import { MascotPanel } from '@/ui/components/MascotPanel'
import { MenuList } from '@/ui/components/MenuList'
import { PauseOverlay } from '@/ui/components/PauseOverlay'
import { ResultOverlay } from '@/ui/components/ResultOverlay'
import styles from './GameScreen.module.css'

type GameScreenState = Extract<Screen, { kind: 'game' }>

interface Running {
  instance: GameInstance
  handle: HostHandle
}

/**
 * 게임 공통 프레임: HUD · 보드(캔버스 컨테이너) · 마스코트 패널 · 조작 힌트 + 일시정지/결과 오버레이.
 * 게임 인스턴스의 수명은 useEffect 하나와 같다 — runId 가 바뀌면 파괴 후 새로 만든다 (다시 시작).
 */
export function GameScreen({ screen }: { screen: GameScreenState }) {
  const navigate = useStore((s) => s.navigate)
  const selectedId = useStore((s) => s.selectedCharacterId)
  const records = useStore((s) => s.records)
  const character = getCharacter(selectedId)
  const status = useSession((s) => s.status)
  const hud = useSession((s) => s.hud)
  const mood = useSession((s) => s.mood)
  const line = useSession((s) => s.line)
  const result = useSession((s) => s.result)
  const [runId, setRunId] = useState(0)
  const boardRef = useRef<HTMLDivElement>(null)
  const runningRef = useRef<Running | null>(null)

  const game = getGame(screen.gameId)
  const difficulty =
    game?.difficulties.find((d) => d.id === screen.difficulty) ?? game?.difficulties[0]

  const best = game && difficulty ? (records[game.id]?.[difficulty.id]?.best ?? null) : null
  const toLobby = useCallback(() => navigate({ kind: 'lobby' }), [navigate])
  const restart = useCallback(() => setRunId((r) => r + 1), [])

  const pause = useCallback(() => {
    const run = runningRef.current
    if (!run || useSession.getState().status !== 'running') return
    run.instance.pause()
    useSession.getState().setStatus('paused')
    input.setScope('overlay')
    run.handle.mascot.setMood('think')
  }, [])

  const resume = useCallback(() => {
    const run = runningRef.current
    if (!run || useSession.getState().status !== 'paused') return
    input.setScope('game')
    run.instance.resume()
    useSession.getState().setStatus('running')
    run.handle.mascot.setMood('idle')
  }, [])

  // 인스턴스 생성/파괴. StrictMode 이중 실행에서도 매번 새로 만들고 완전히 파괴한다
  useEffect(() => {
    const el = boardRef.current
    if (!game || !difficulty || !el) return
    useSession.getState().reset()
    const handle = createHost({
      module: game,
      difficulty: difficulty.id,
      character,
      onFinish: () => input.setScope('overlay'),
      onPause: pause,
    })
    const instance = game.create(handle.host)
    runningRef.current = { instance, handle }
    if (import.meta.env.DEV) (window as unknown as { __app?: { game?: unknown } }).__app!.game = instance
    instance.mount(el)
    input.setScope('game')
    useSession.getState().setStatus('running')
    instance.start()

    const offPause = input.on('pause', () => (pause(), true), { scope: 'game' })
    const onVisibility = (): void => {
      if (document.hidden) pause()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('blur', pause)
    return () => {
      offPause()
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('blur', pause)
      instance.destroy()
      handle.dispose()
      runningRef.current = null
      input.setScope('ui')
      useSession.getState().reset()
    }
  }, [game, difficulty, character, runId, pause])

  // 오버레이(일시정지/결과)에서 R = 다시 시작
  useEffect(() => input.on('restart', () => (restart(), true), { scope: 'overlay' }), [restart])

  if (!game || !difficulty) {
    return (
      <main className={styles.missing}>
        <p className="t-body">게임을 찾을 수 없어요: {screen.gameId}</p>
        <MenuList items={[{ id: 'lobby', label: '로비로', onSelect: toLobby }]} onCancel={toLobby} />
      </main>
    )
  }

  return (
    <main className={styles.screen}>
      <Hud
        module={game}
        difficultyLabel={difficulty.label}
        values={hud}
        paused={status === 'paused'}
        onPause={pause}
      />
      <div
        ref={boardRef}
        className={styles.board}
        data-hidden={status === 'paused'}
        tabIndex={0}
        aria-label={`${game.title} 보드`}
      />
      <MascotPanel character={character} mood={mood} line={line} className={styles.mascot}>
        <span className="t-small">BEST {best ? game.scoring.format(best.value) : '—'}</span>
        {result?.isRecord && (
          <span className={`t-small px-blink ${styles.record}`}>NEW RECORD!</span>
        )}
      </MascotPanel>
      <footer className={`t-small ${styles.foot}`}>
        {[...game.controls.keyboard, ...(game.controls.mouse ?? [])].join(' · ')}
      </footer>
      {status === 'paused' && (
        <PauseOverlay onResume={resume} onRestart={restart} onLobby={toLobby} />
      )}
      {status === 'finished' && result && (
        <ResultOverlay module={game} result={result} onRestart={restart} onLobby={toLobby} />
      )}
    </main>
  )
}
