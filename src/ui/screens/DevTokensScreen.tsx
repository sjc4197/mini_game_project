import { useEffect, useState } from 'react'
import { FONTS, missingFonts } from '@/app/fonts'
import { DEFAULT_SETTINGS, PERSIST_KEY } from '@/app/persist'
import { useStore, type UiScale } from '@/app/store'
import { ACCENTS, CHROMA_KEYS, NEUTRAL_KEYS, PALETTE, type AccentId } from '@/pixel/palette'
import { useMetrics } from '@/ui/hooks/useMetrics'
import styles from './DevTokensScreen.module.css'

const TYPE_ROLES: [className: string, label: string][] = [
  ['t-display', 'Display · Galmuri14 · 30u'],
  ['t-h1', 'H1 · Galmuri14 · 15u'],
  ['t-h2', 'H2 · Galmuri11 Bold · 12u'],
  ['t-body', 'Body · Galmuri11 · 12u'],
  ['t-small', 'Small · Galmuri9 · 10u'],
  ['t-caption', 'Caption · Galmuri7 · 8u'],
  ['t-num', 'Number · GalmuriMono11 · 12u'],
  ['t-num-l', 'Number-L · GalmuriMono11 · 24u'],
]

const SAMPLE = '도트 아케이드 · 지뢰찾기 · 테트리스 0123456789 Aa'
const UI_SCALES: UiScale[] = ['auto', 2, 3]
const ACCENT_IDS = Object.keys(ACCENTS) as AccentId[]
const ACCENT_LABEL: Record<AccentId, string> = {
  peong: '펑이',
  cubo: '큐보',
  mallang: '말랑이',
  dalnyang: '달냥',
}

function readStored(): string {
  try {
    return localStorage.getItem(PERSIST_KEY) ?? '(없음)'
  } catch {
    return '(localStorage 접근 불가)'
  }
}

/** DEV 전용 토큰 견본. 팔레트·타이포·간격·픽셀 테두리·스토어 영속성을 한 화면에서 검수한다 */
export default function DevTokensScreen() {
  const m = useMetrics()
  const settings = useStore((s) => s.settings)
  const selected = useStore((s) => s.selectedCharacterId)
  const updateSettings = useStore((s) => s.updateSettings)
  const selectCharacter = useStore((s) => s.selectCharacter)
  const resetRecords = useStore((s) => s.resetRecords)
  const navigate = useStore((s) => s.navigate)
  // 마운트 시점 1회 계산 (부트 화면이 이미 폰트를 기다렸으므로 렌더 중 읽어도 안전)
  const [fontStatus] = useState<string>(() => {
    const missing = missingFonts()
    return missing.length === 0
      ? `전부 로드됨 (${FONTS.length}개)`
      : `미로드: ${missing.join(', ')}`
  })
  // 스토어가 바뀔 때마다 localStorage 의 실제 저장값을 다시 읽는다 (persist 는 set 과 동기적으로 setItem)
  const [stored, setStored] = useState<string>(readStored)
  useEffect(() => useStore.subscribe(() => setStored(readStored())), [])

  const goTitle = () => {
    location.hash = ''
    navigate({ kind: 'title' })
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className="t-h1">토큰 견본</h1>
        <button type="button" className={`t-body ${styles.btn}`} onClick={goTitle}>
          ◀ 타이틀로
        </button>
      </header>

      <section className={styles.section}>
        <h2 className={`t-h2 ${styles.sectionTitle}`}>디스플레이 메트릭</h2>
        <div className={`t-num ${styles.readout}`}>
          <div>
            --u = {m.u}px · base {m.base} · DPR {m.dpr} · 1dp = {m.uDevice} device px
          </div>
          <div>
            viewport {m.viewportW} × {m.viewportH}
          </div>
          <div className="t-small">폰트: {fontStatus}</div>
        </div>
        <div className={styles.row}>
          <span className="t-small">UI 크기</span>
          {UI_SCALES.map((scale) => (
            <button
              key={String(scale)}
              type="button"
              className={`t-body ${styles.btn}`}
              aria-pressed={settings.uiScale === scale}
              onClick={() => updateSettings({ uiScale: scale })}
            >
              {scale === 'auto' ? '자동' : `${scale}×`}
            </button>
          ))}
          <button
            type="button"
            className={`t-body ${styles.btn}`}
            aria-pressed={settings.crt}
            onClick={() => updateSettings({ crt: !settings.crt })}
          >
            CRT {settings.crt ? '켬' : '끔'}
          </button>
          <button
            type="button"
            className={`t-body ${styles.btn}`}
            aria-pressed={settings.reducedMotion === 'on'}
            onClick={() =>
              updateSettings({ reducedMotion: settings.reducedMotion === 'on' ? 'system' : 'on' })
            }
          >
            움직임 줄이기 {settings.reducedMotion === 'on' ? '켬' : '시스템'}
          </button>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={`t-h2 ${styles.sectionTitle}`}>
          accent (캐릭터 테마 미리보기 · 새로고침해도 유지)
        </h2>
        <div className={styles.row}>
          {ACCENT_IDS.map((id) => (
            <button
              key={id}
              type="button"
              className={`t-body ${styles.btn}`}
              aria-pressed={selected === id}
              onClick={() => selectCharacter(id)}
            >
              {ACCENT_LABEL[id]}
            </button>
          ))}
          <button
            type="button"
            className={`t-body ${styles.btn}`}
            aria-pressed={selected === null}
            onClick={() => selectCharacter(null)}
          >
            중립
          </button>
        </div>
        <div className={styles.accentChips}>
          <div className={styles.chip} style={{ background: 'var(--accent-dark)' }} />
          <div className={styles.chip} style={{ background: 'var(--accent)' }} />
          <div className={styles.chip} style={{ background: 'var(--accent-light)' }} />
        </div>
        <div className={styles.row}>
          <button type="button" className={`t-body ${styles.btn} ${styles.btnPrimary}`}>
            primary 버튼 (글자는 --ink)
          </button>
          <span className="t-body px-blink" style={{ color: 'var(--accent)' }}>
            ▶ PRESS START ◀
          </span>
          <span className="t-small" style={{ color: 'var(--accent-text)' }}>
            작은 accent 글자는 light
          </span>
        </div>
        <div className={`t-body ${styles.tint}`}>--accent-tint 면 (accent 18% + bg-1)</div>
      </section>

      <section className={styles.section}>
        <h2 className={`t-h2 ${styles.sectionTitle}`}>중성색 램프</h2>
        <div className={styles.swatches}>
          {NEUTRAL_KEYS.map((key) => (
            <div key={key} className={styles.swatch}>
              <div className={styles.chip} style={{ background: `var(--${key})` }} />
              <div className="t-small">--{key}</div>
              <div className={`t-caption ${styles.muted}`}>{PALETTE[key]}</div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={`t-h2 ${styles.sectionTitle}`}>유채색</h2>
        <div className={styles.swatches}>
          {CHROMA_KEYS.map((key) => (
            <div key={key} className={styles.swatch}>
              <div className={styles.chip} style={{ background: `var(--${key})` }} />
              <div className="t-small">--{key}</div>
              <div className={`t-caption ${styles.muted}`}>{PALETTE[key]}</div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={`t-h2 ${styles.sectionTitle}`}>타이포그래피</h2>
        {TYPE_ROLES.map(([cls, label]) => (
          <div key={cls} className={styles.typeRow}>
            <div className={`t-caption ${styles.muted}`}>{label}</div>
            <div className={`${cls} ${styles.sample}`}>{SAMPLE}</div>
          </div>
        ))}
      </section>

      <section className={styles.section}>
        <h2 className={`t-h2 ${styles.sectionTitle}`}>픽셀 테스트</h2>
        <div className="t-small">2dp 체커보드 — 번짐 없이 각져 보여야 함</div>
        <div className={styles.checker} />
        <div className={`t-body ${styles.box}`}>
          box-shadow 적층 테두리 + 베벨 + 2dp 하드 섀도 (패널/버튼 공통 레시피)
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={`t-h2 ${styles.sectionTitle}`}>저장소 (localStorage['{PERSIST_KEY}'])</h2>
        <div className={`t-small ${styles.code}`}>{stored}</div>
        <div className={styles.row}>
          <button
            type="button"
            className={`t-body ${styles.btn}`}
            onClick={() => {
              selectCharacter(null)
              updateSettings(DEFAULT_SETTINGS)
              resetRecords()
            }}
          >
            저장 데이터 초기화
          </button>
        </div>
      </section>
    </main>
  )
}
