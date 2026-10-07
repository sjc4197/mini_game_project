import type { Accent } from './palette'

/** 마스코트 표정. 캐릭터 스프라이트·세션 스토어·게임 호스트가 공유하는 단일 출처 */
export const MOODS = ['idle', 'happy', 'worried', 'sad', 'win', 'think'] as const
export type Mood = (typeof MOODS)[number]

export type Hex = `#${string}`
/** 캐릭터 accent / 공용색 참조. compose 시 실제 hex 로 치환 */
export type PaletteRef = '$base' | '$dark' | '$light' | '$ink' | '$white'

export interface Point {
  x: number
  y: number
}

/** 코드로 정의하는 도트 스프라이트 한 장 */
export interface SpriteDef {
  id: string
  w: number
  h: number
  /** 길이 h, 각 행 길이 w, '.' = 투명 */
  rows: readonly string[]
  /** 한 글자 키 → hex 또는 $참조 */
  palette: Readonly<Record<string, Hex | PaletteRef>>
  /** 오버레이 기준점 (face / side / head / think …). 음수 허용 */
  points?: Readonly<Record<string, Point>>
}

export interface Layer {
  sprite: SpriteDef
  at: Point
  /** true 면 스프라이트의 투명 칸도 지운다 (영역 덮어쓰기) */
  clear?: boolean
}

/** compose 결과. 문자열이 아닌 인덱스 버퍼라 레이어 간 팔레트 키 충돌이 없다 */
export interface Raster {
  /** 캐시 키 (예: 'peong:idle:0') */
  key: string
  w: number
  h: number
  /** 0 = 투명, n = colors[n-1] */
  data: Uint8Array
  colors: string[]
}

/** 애니메이션 클립 — 프레임은 모두 같은 크기 */
export interface Clip {
  id: string
  frames: readonly Raster[]
  fps: number
  loop: boolean
}

export type { Accent }
