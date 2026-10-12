import { useCallback, useEffect, useMemo, useState } from 'react'
import { audio } from '@/app/audio/audio'
import { input } from '@/app/input/input'
import { useStore, type Chatter, type Settings, type UiScale } from '@/app/store'
import { ConfirmOverlay } from '@/ui/components/ConfirmOverlay'
import { ControlsOverlay } from '@/ui/components/ControlsOverlay'
import { PixelButton } from '@/ui/components/PixelButton'
import { useKeyNav } from '@/ui/hooks/useKeyNav'
import styles from './SettingsScreen.module.css'

interface Row {
  id: string
  label: string
  /** 값 표시 (없으면 실행 항목) */
  value?: string
  hint?: string
  /** ←→ */
  step?: (dir: -1 | 1) => void
  /** Enter / 클릭 */
  activate?: () => void
}

const UI_SCALES: readonly UiScale[] = ['auto', 2, 3]
const UI_SCALE_LABEL: Record<string, string> = { auto: '자동', '2': '2×', '3': '3×' }
const CHATTERS: readonly Chatter[] = ['quiet', 'normal', 'chatty']
const CHATTER_LABEL: Record<Chatter, string> = { quiet: '조용', normal: '보통', chatty: '수다쟁이' }
const DAS_STEPS = [100, 133, 167, 200, 250, 300]
const ARR_STEPS = [0, 17, 33, 50, 67, 83, 100]

function cycle<T>(list: readonly T[], current: T, dir: -1 | 1): T {
  const i = Math.max(0, list.indexOf(current))
  return list[(i + dir + list.length) % list.length] ?? current
}
const nearest = (list: readonly number[], v: number): number =>
  list.reduce((best, x) => (Math.abs(x - v) < Math.abs(best - v) ? x : best), list[0] ?? v)

/** 설정: ↑↓ 항목, ←→ 값, Enter 토글/실행, Esc 닫기. 값은 바꾸는 즉시 저장·반영된다 */
export function SettingsScreen() {
  const settings = useStore((s) => s.settings)
  const update = useStore((s) => s.updateSettings)
  const resetRecords = useStore((s) => s.resetRecords)
  const back = useStore((s) => s.back)
  const [overlay, setOverlay] = useState<'controls' | 'reset' | null>(null)

  const set = useCallback(
    (patch: Partial<Settings>) => {
      update(patch)
      audio.play('select')
    },
    [update],
  )

  const rows = useMemo<Row[]>(() => {
    const toggle = (key: 'sound' | 'crt') => () => set({ [key]: !settings[key] })
    const onOff = (v: boolean) => (v ? 'ON' : 'OFF')
    return [
      {
        id: 'sound',
        label: '사운드',
        value: onOff(settings.sound),
        step: toggle('sound'),
        activate: toggle('sound'),
      },
      {
        id: 'volume',
        label: '볼륨',
        value: `${Math.round(settings.volume * 100)}%`,
        step: (d) => set({ volume: Math.min(1, Math.max(0, Math.round(settings.volume * 10 + d) / 10)) }),
        activate: () => set({ volume: settings.volume >= 1 ? 0.1 : Math.min(1, Math.round(settings.volume * 10 + 1) / 10) }),
      },
      {
        id: 'crt',
        label: 'CRT 스캔라인',
        value: onOff(settings.crt),
        step: toggle('crt'),
        activate: toggle('crt'),
      },
      {
        id: 'uiScale',
        label: 'UI 크기',
        value: UI_SCALE_LABEL[String(settings.uiScale)] ?? String(settings.uiScale),
        step: (d) => set({ uiScale: cycle(UI_SCALES, settings.uiScale, d) }),
        activate: () => set({ uiScale: cycle(UI_SCALES, settings.uiScale, 1) }),
      },
      {
        id: 'chatter',
        label: '마스코트 수다',
        value: CHATTER_LABEL[settings.chatter],
        step: (d) => set({ chatter: cycle(CHATTERS, settings.chatter, d) }),
        activate: () => set({ chatter: cycle(CHATTERS, settings.chatter, 1) }),
      },
      {
        id: 'motion',
        label: '움직임 줄이기',
        value: settings.reducedMotion === 'on' ? '켜기' : '시스템 설정',
        step: () => set({ reducedMotion: settings.reducedMotion === 'on' ? 'system' : 'on' }),
        activate: () => set({ reducedMotion: settings.reducedMotion === 'on' ? 'system' : 'on' }),
      },
      {
        id: 'das',
        label: '테트리스 DAS',
        value: `${settings.tetris.das}ms`,
        hint: '좌우 이동 시작 지연',
        step: (d) => set({ tetris: { ...settings.tetris, das: cycle(DAS_STEPS, nearest(DAS_STEPS, settings.tetris.das), d) } }),
        activate: () => set({ tetris: { ...settings.tetris, das: cycle(DAS_STEPS, nearest(DAS_STEPS, settings.tetris.das), 1) } }),
      },
      {
        id: 'arr',
        label: '테트리스 ARR',
        value: settings.tetris.arr === 0 ? '0ms (즉시)' : `${settings.tetris.arr}ms`,
        hint: '좌우 연속 이동 간격',
        step: (d) => set({ tetris: { ...settings.tetris, arr: cycle(ARR_STEPS, nearest(ARR_STEPS, settings.tetris.arr), d) } }),
        activate: () => set({ tetris: { ...settings.tetris, arr: cycle(ARR_STEPS, nearest(ARR_STEPS, settings.tetris.arr), 1) } }),
      },
      { id: 'controls', label: '조작키 보기', activate: () => openOverlay('controls') },
      { id: 'reset', label: '기록 초기화', activate: () => openOverlay('reset') },
      { id: 'back', label: '뒤로', hint: 'Esc', activate: back },
    ]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, set, back])

  function openOverlay(kind: 'controls' | 'reset'): void {
    audio.play('confirm')
    setOverlay(kind)
    input.setScope('overlay')
  }
  const closeOverlay = useCallback(() => {
    setOverlay(null)
    input.setScope('ui')
  }, [])

  const { index, setIndex } = useKeyNav({
    count: rows.length,
    columns: 1,
    onConfirm: (i) => rows[i]?.activate?.(),
    onCancel: back,
  })

  useEffect(() => {
    const offs = [
      input.on('left', () => (rows[index]?.step?.(-1), true), { scope: 'ui' }),
      input.on('right', () => (rows[index]?.step?.(1), true), { scope: 'ui' }),
    ]
    return () => offs.forEach((off) => off())
  }, [rows, index])

  useEffect(() => () => input.setScope('ui'), [])

  return (
    <main className={styles.screen}>
      <header className={styles.header}>
        <PixelButton size="small" tabIndex={-1} sfx={false} onMouseDown={(e) => e.preventDefault()} onClick={() => (audio.play('back'), back())}>
          ◀ 뒤로
        </PixelButton>
        <h1 className="t-h1">설정</h1>
        <span />
      </header>

      <ul className={styles.list} role="listbox" aria-label="설정 항목">
        {rows.map((row, i) => (
          <li
            key={row.id}
            role="option"
            aria-selected={i === index}
            className={i === index ? `${styles.row} ${styles.focused}` : styles.row}
            onMouseEnter={() => setIndex(i)}
            onClick={() => (setIndex(i), row.activate?.())}
          >
            <span className={`t-body ${styles.label}`}>
              {row.label}
              {row.hint && row.value !== undefined && (
                <span className={`t-caption ${styles.hint}`}> {row.hint}</span>
              )}
            </span>
            {row.value !== undefined ? (
              <span className={`t-body ${styles.value}`}>
                <button
                  type="button"
                  tabIndex={-1}
                  className={styles.arrow}
                  aria-label="이전 값"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => (e.stopPropagation(), setIndex(i), row.step?.(-1))}
                >
                  ◀
                </button>
                <span className={styles.valueText}>{row.value}</span>
                <button
                  type="button"
                  tabIndex={-1}
                  className={styles.arrow}
                  aria-label="다음 값"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => (e.stopPropagation(), setIndex(i), row.step?.(1))}
                >
                  ▶
                </button>
              </span>
            ) : (
              <span className={`t-small ${styles.action}`}>{row.hint ?? '▶'}</span>
            )}
          </li>
        ))}
      </ul>

      <footer className={`t-small ${styles.foot}`}>↑↓ 항목 · ←→ 값 · Enter 토글/실행 · Esc 뒤로 · 바꾸는 즉시 저장</footer>

      {overlay === 'controls' && <ControlsOverlay onClose={closeOverlay} />}
      {overlay === 'reset' && (
        <ConfirmOverlay
          title="기록 초기화"
          message="모든 게임의 기록을 지웁니다. 되돌릴 수 없어요."
          confirmLabel="초기화"
          onConfirm={() => {
            resetRecords()
            closeOverlay()
          }}
          onCancel={closeOverlay}
        />
      )}
    </main>
  )
}
