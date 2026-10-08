import { useMemo, useState } from 'react'
import { useStore } from '@/app/store'
import { CHARACTERS, faceOf, getCharacter, getCharacterClips, getLines } from '@/characters'
import { DOTS, SPARKLE_A, SPARKLE_B, SWEAT } from '@/characters/extras'
import { FACE_KEYS } from '@/characters/faces'
import type { CharacterId, LineKey } from '@/characters/types'
import { rasterOf, rasterToRows } from '@/pixel/compose'
import { MOODS, type Clip, type Mood, type SpriteDef } from '@/pixel/types'
import { PixelSprite } from '@/ui/components/PixelSprite'
import { useMetrics } from '@/ui/hooks/useMetrics'
import styles from './DevGalleryScreen.module.css'

const MOOD_LABEL: Record<Mood, string> = {
  idle: 'idle 기본',
  happy: 'happy 기쁨',
  worried: 'worried 긴장',
  sad: 'sad 슬픔',
  win: 'win 승리',
  think: 'think 생각',
}

const LINE_KEYS: LineKey[] = [
  'ui.idle',
  'ui.lobby.hover',
  'lobby:minesweeper',
  'lobby:tetris',
  'lobby:locked',
  'game.start',
  'game.good',
  'game.great',
  'game.risky',
  'game.safe',
  'game.mistake',
  'game.think',
  'game.fail',
  'game.win',
  'game.record',
]

const single = (def: SpriteDef, accent: { base: string; dark: string; light: string }): Clip => ({
  id: `single:${def.id}`,
  frames: [rasterOf(def, accent)],
  fps: 1,
  loop: false,
})

/** '#dev/gallery/<id>' 로 열면 해당 캐릭터가 확대 선택된 상태로 시작 */
const initialChar = (): CharacterId => {
  const id = /^#dev\/gallery\/([a-z]+)/.exec(location.hash)?.[1]
  return CHARACTERS.some((c) => c.id === id) ? (id as CharacterId) : 'cheese'
}

/** DEV 전용 스프라이트 갤러리 — 3단계: 캐릭터 4종 × 무드 6종 검수 */
export default function DevGalleryScreen() {
  const m = useMetrics()
  const navigate = useStore((s) => s.navigate)
  const selectCharacter = useStore((s) => s.selectCharacter)
  const themeId = useStore((s) => s.selectedCharacterId)
  const [charId, setCharId] = useState<CharacterId>(initialChar)
  const [mood, setMood] = useState<Mood>('idle')
  const [animate, setAnimate] = useState(true)

  const character = getCharacter(charId)
  const clips = getCharacterClips(character)
  const clip = clips[mood]

  const layers = useMemo(() => {
    const a = character.accent
    return [
      ['몸통', single(character.body, a)],
      ...FACE_KEYS.map((k) => [`얼굴 ${k}`, single(faceOf(character, k), a)] as const),
      ['땀', single(SWEAT, a)],
      ['반짝 A', single(SPARKLE_A, a)],
      ['반짝 B', single(SPARKLE_B, a)],
      ...DOTS.map((d, i) => [`점 ${i + 1}`, single(d, a)] as const),
    ] as const
  }, [character])

  const dump = useMemo(() => {
    const f = clip.frames[0]!
    const chars = 'kabcdefghijlmnopqrstuvwxyz'
    return rasterToRows(f, (hex) => chars[f.colors.indexOf(hex) % chars.length] ?? '?').join('\n')
  }, [clip])

  const goTitle = () => {
    location.hash = ''
    navigate({ kind: 'title' })
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className="t-h1">캐릭터 갤러리</h1>
        <button type="button" className="btn t-body" onClick={goTitle}>
          ◀ 타이틀로
        </button>
      </header>

      <section className={styles.section}>
        <h2 className={`t-h2 ${styles.sectionTitle}`}>전체 보기 — 4캐릭터 × 6무드 (2u, 애니)</h2>
        <div className={`t-small ${styles.muted}`}>
          --u {m.u}px · DPR {m.dpr} · 1dp = {m.uDevice} device px · 귀여움 기준(푸신풍): 통통한 한
          덩어리, 아주 작은 점 눈, 볼터치, 작은 입, 짧은 발·귀·꼬리, 숨쉬기/깜빡임
        </div>
        <div className={styles.charRow}>
          <div />
          {MOODS.map((mo) => (
            <div key={mo} className={`t-caption ${styles.muted} ${styles.moodLabel}`}>
              {MOOD_LABEL[mo]}
            </div>
          ))}
        </div>
        {CHARACTERS.map((c, ci) => {
          const cc = getCharacterClips(c)
          return (
            <div key={c.id} className={styles.charRow}>
              <div className={styles.charName}>
                <div className="t-h2">
                  <span className={styles.accentChip} style={{ background: c.accent.base }} />
                  {c.name}
                </div>
                <div className={`t-caption ${styles.muted}`}>{c.personality}</div>
                <button
                  type="button"
                  className="btn t-small"
                  aria-pressed={charId === c.id}
                  onClick={() => setCharId(c.id)}
                >
                  확대
                </button>
              </div>
              {MOODS.map((mo, mi) => (
                <div key={mo} className={styles.cell}>
                  <div className={styles.stage}>
                    <PixelSprite
                      clip={cc[mo]}
                      scaleU={2}
                      animate={animate}
                      phaseMs={(ci * 6 + mi) * 90}
                    />
                  </div>
                </div>
              ))}
            </div>
          )
        })}
      </section>

      <section className={styles.section}>
        <h2 className={`t-h2 ${styles.sectionTitle}`}>
          확대 — {character.name} · {character.bio}
        </h2>
        <div className={styles.row}>
          {CHARACTERS.map((c) => (
            <button
              key={c.id}
              type="button"
              className="btn t-body"
              aria-pressed={charId === c.id}
              onClick={() => setCharId(c.id)}
            >
              {c.name}
            </button>
          ))}
          <button
            type="button"
            className="btn t-body"
            aria-pressed={themeId === charId}
            onClick={() => selectCharacter(charId)}
          >
            이 캐릭터로 테마 적용
          </button>
        </div>
        <div className={styles.row}>
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
          {[1, 2, 3, 6].map((s, i) => (
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
        <h2 className={`t-h2 ${styles.sectionTitle}`}>프레임 (정지, 3u)</h2>
        <div className={styles.row}>
          {clip.frames.map((_, i) => (
            <div key={i} className={styles.cell}>
              <div className={styles.stage}>
                <PixelSprite clip={clip} scaleU={3} frame={i} />
              </div>
              <span className={`t-caption ${styles.muted}`}>{i}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={`t-h2 ${styles.sectionTitle}`}>레이어 분해 (4u)</h2>
        <div className={styles.row}>
          {layers.map(([label, c]) => (
            <div key={c.id} className={styles.cell}>
              <div className={styles.stage}>
                <PixelSprite clip={c} scaleU={4} />
              </div>
              <span className={`t-caption ${styles.muted}`}>{label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={`t-h2 ${styles.sectionTitle}`}>대사 — {character.name}</h2>
        <div className={styles.lines}>
          {LINE_KEYS.map((key) => (
            <div key={key} className={styles.contents}>
              <div className={`t-caption ${styles.muted}`}>{key}</div>
              <div className="t-small">{getLines(character, key).join('  /  ') || '(없음)'}</div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={`t-h2 ${styles.sectionTitle}`}>텍스트 덤프 (frame 0)</h2>
        <pre className={styles.pre}>{dump}</pre>
      </section>
    </main>
  )
}
