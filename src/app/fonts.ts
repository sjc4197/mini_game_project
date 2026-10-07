/**
 * 폰트 등록/로딩. galmuri 패키지 CSS 를 통째로 import 하면 9패밀리 × (woff2+ttf) ≈ 60MB 가 빌드에 복사되므로,
 * 실제로 쓰는 6개 woff2 만 FontFace API 로 등록한다 (≈2.5MB, 이후 캐시).
 * 2차 최적화: pyftsubset 서브셋 + 대사표 글자 포함 테스트 (docs/02-design-system.md A2)
 */
import galmuri14 from 'galmuri/dist/Galmuri14.woff2?url'
import galmuri11 from 'galmuri/dist/Galmuri11.woff2?url'
import galmuri11Bold from 'galmuri/dist/Galmuri11-Bold.woff2?url'
import galmuri9 from 'galmuri/dist/Galmuri9.woff2?url'
import galmuri7 from 'galmuri/dist/Galmuri7.woff2?url'
import galmuriMono11 from 'galmuri/dist/GalmuriMono11.woff2?url'

export interface FontSpec {
  family: string
  weight: '400' | '700'
  url: string
  /** document.fonts.check()/load() 용 — 네이티브 em 크기(14→15px, 11→12px, 9→10px, 7→8px) */
  probe: string
}

export const FONTS: readonly FontSpec[] = [
  { family: 'Galmuri14', weight: '400', url: galmuri14, probe: '15px Galmuri14' },
  { family: 'Galmuri11', weight: '400', url: galmuri11, probe: '12px Galmuri11' },
  { family: 'Galmuri11', weight: '700', url: galmuri11Bold, probe: 'bold 12px Galmuri11' },
  { family: 'Galmuri9', weight: '400', url: galmuri9, probe: '10px Galmuri9' },
  { family: 'Galmuri7', weight: '400', url: galmuri7, probe: '8px Galmuri7' },
  { family: 'GalmuriMono11', weight: '400', url: galmuriMono11, probe: '12px GalmuriMono11' },
]

export type FontLoadStatus = 'loaded' | 'timeout' | 'unsupported'

let faces: FontFace[] | null = null

const fontsSupported = (): boolean =>
  typeof document !== 'undefined' && 'fonts' in document && typeof FontFace !== 'undefined'

/** 1회만 등록. display: 'block' — 부트 화면에서 기다리므로 swap 플래시가 없다 */
export function registerFonts(): FontFace[] {
  if (faces) return faces
  if (!fontsSupported()) return (faces = [])
  faces = FONTS.map((f) => {
    const face = new FontFace(f.family, `url(${f.url}) format('woff2')`, {
      weight: f.weight,
      style: 'normal',
      display: 'block',
    })
    document.fonts.add(face)
    return face
  })
  return faces
}

export function loadFonts(timeoutMs = 2000): Promise<FontLoadStatus> {
  if (!fontsSupported()) return Promise.resolve('unsupported')
  const all = Promise.all(registerFonts().map((face) => face.load())).then(
    () => 'loaded' as const,
    () => 'loaded' as const, // 일부 실패해도 폴백 폰트로 진행
  )
  const timeout = new Promise<FontLoadStatus>((resolve) => {
    setTimeout(() => resolve('timeout'), timeoutMs)
  })
  return Promise.race([all, timeout])
}

/** 디버그용: 아직 안 올라온 폰트 probe 목록 */
export function missingFonts(): string[] {
  if (!fontsSupported()) return FONTS.map((f) => f.probe)
  return FONTS.filter((f) => !document.fonts.check(f.probe)).map((f) => f.probe)
}
