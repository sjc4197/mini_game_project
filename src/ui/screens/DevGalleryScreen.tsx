import { useMemo, useState } from 'react'
import { useStore } from '@/app/store'
import { rasterOf, rasterToRows } from '@/pixel/compose'
import { ACCENTS, NEUTRAL_ACCENT, type Accent, type AccentId } from '@/pixel/palette'
import {
  SAMPLE_BODY,
  SAMPLE_FACE_IDLE,
  SAMPLE_FACE_WORRIED,
  SAMPLE_SWEAT,
  buildSampleClips,
  sampleCharFor,
  type SampleMood,
} from '@/pixel/samples'
import type { Clip, SpriteDef } from '@/pixel/types'
import { PixelSprite } from '@/ui/components/PixelSprite'
import { useMetrics } from '@/ui/hooks/useMetrics'
import styles from './DevGalleryScreen.module.css'

const SCALES = [1, 2, 3, 6] as const
const MOODS: SampleMood[] = ['idle', 'worried']
const ACCENT_IDS = Object.keys(ACCENTS) as AccentId[]
const ACCENT_LABEL: Record<AccentId, string> = {
  peong: '펑이',
  cubo: '큐보',
  mallang: '말랑이',
  dalnyang: '달냥',
}

const singleClip = (def: SpriteDef, accent: Accent): Clip => ({
  id: `single:${def.id}`,
  frames: [rasterOf(def, accent)],
  fps: 1,
  loop: false,
})

/** DEV 전용 스프라이트 갤러리. 2단계: 엔진 검증(배율·애니·squash·레이어). 3단계: 4캐릭터 × 6무드 */
export default function DevGalleryScreen() {
  const m = useMetrics()
  const selected = useStore((s) => s.selectedCharacterId)
  const navigate = useStore((s) => s.navigate)
  const [accentId, setAccentId] = useState<AccentId | 'theme'>('theme')
  const [mood, setMood] = useState<SampleMood>('idle')
  const [animate, setAnimate] = useState(true)

  const accent: Accent =
    accentId === 'theme'
      ? selected && selected in ACCENTS
        ? ACCENTS[selected as AccentId]
        : NEUTRAL_ACCENT
      : ACCENTS[accentId]

  const clips = useMemo(() => buildSampleClips(accent), [accent])
  const clip = clips[mood]
  const layers = useMemo(
    () =>
      [
        ['몸통 24×24', singleClip(SAMPLE_BODY, accent)],
        ['얼굴 idle 12×8', singleClip(SAMPLE_FACE_IDLE, accent)],
        ['얼굴 worried', singleClip(SAMPLE_FACE_WORRIED, accent)],
        ['땀 4×6', singleClip(SAMPLE_SWEAT, accent)],
      ] as const,
    [accent],
  )
  const dump = useMemo(
    () => clip.frames.map((f) => rasterToRows(f, sampleCharFor(accent)).join('\n')),
    [clip, accent],
  )

  const goTitle = () => {
    location.hash = ''
    navigate({ kind: 'title' })
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className="t-h1">스프라이트 갤러리</h1>
        <button type="button" className="btn t-body" onClick={goTitle}>
          ◀ 타이틀로
        </button>
      </header>

      <section className={styles.section}>
        <div className={`t-small ${styles.muted}`}>
          --u {m.u}px · DPR {m.dpr} · 1dp = {m.uDevice} device px · 샘플 = 펑이 초안 (3단계에서
          캐릭터 4종으로 교체)
        </div>
        <div className={styles.row}>
          <span className="t-small">무드</span>
          {MOODS.map((mo) => (
            <button
              key={mo}
              type="button"
              className="btn t-body"
              aria-pressed={mood === mo}
              onClick={() => setMood(mo)}
            >
              {mo}
            </button>
          ))}
          <button
            type="button"
            className="btn t-body"
            aria-pressed={animate}
            onClick={() => setAnimate((v) => !v)}
          >
            애니 {animate ? '켬' : '끔'}
          </button>
        </div>
        <div className={styles.row}>
          <span className="t-small">accent</span>
          <button
            type="button"
            className="btn t-body"
            aria-pressed={accentId === 'theme'}
            onClick={() => setAccentId('theme')}
          >
            현재 테마
          </button>
          {ACCENT_IDS.map((id) => (
            <button
              key={id}
              type="button"
              className="btn t-body"
              aria-pressed={accentId === id}
              onClick={() => setAccentId(id)}
            >
              {ACCENT_LABEL[id]}
            </button>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={`t-h2 ${styles.sectionTitle}`}>배율 (32×32 스테이지)</h2>
        <div className={styles.row}>
          {SCALES.map((s, i) => (
            <div key={s} className={styles.cell}>
              <div className={styles.stage}>
                <PixelSprite clip={clip} scaleU={s} animate={animate} phaseMs={i * 120} />
              </div>
              <span className={`t-caption ${styles.muted}`}>{s}u</span>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={`t-h2 ${styles.sectionTitle}`}>프레임 (정지)</h2>
        <div className={styles.row}>
          {clip.frames.map((_, i) => (
            <div key={i} className={styles.cell}>
              <div className={styles.stage}>
                <PixelSprite clip={clip} scaleU={4} frame={i} />
              </div>
              <span className={`t-caption ${styles.muted}`}>
                frame {i}
                {i === 1 ? ' (squash)' : ''}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={`t-h2 ${styles.sectionTitle}`}>레이어 분해</h2>
        <div className={styles.row}>
          {layers.map(([label, c]) => (
            <div key={c.id} className={styles.cell}>
              <div className={styles.stage}>
                <PixelSprite clip={c} scaleU={6} />
              </div>
              <span className={`t-caption ${styles.muted}`}>{label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={`t-h2 ${styles.sectionTitle}`}>텍스트 덤프 (frame 0 / frame 1)</h2>
        <div className={styles.row}>
          {dump.map((text, i) => (
            <pre key={i} className={styles.pre}>
              {text}
            </pre>
          ))}
        </div>
      </section>
    </main>
  )
}
