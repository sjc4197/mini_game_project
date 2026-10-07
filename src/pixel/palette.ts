/**
 * 팔레트의 TS 거울. 캔버스(게임 보드·스프라이트)는 CSS 변수를 못 읽으므로 hex 를 직접 쓴다.
 * 값을 바꾸면 src/ui/styles/tokens.css 도 같이 바꿀 것.
 */
export const PALETTE = {
  ink: '#0D1020',
  'bg-0': '#141A2E',
  'bg-1': '#1C2440',
  'bg-2': '#27305A',
  'bg-3': '#354074',
  'line-0': '#4C5A94',
  'line-1': '#7C88B8',
  'text-1': '#B4BDDC',
  'text-0': '#F4F1E8',
  white: '#FFFFFF',
  red: '#FF5E5B',
  orange: '#FFA94D',
  yellow: '#FFD166',
  lime: '#9BE564',
  teal: '#3FBFB2',
  cyan: '#4FD6E8',
  blue: '#6E9BFF',
  purple: '#C792EA',
  pink: '#FF8FB1',
} as const

export type PaletteKey = keyof typeof PALETTE

export const NEUTRAL_KEYS = [
  'ink',
  'bg-0',
  'bg-1',
  'bg-2',
  'bg-3',
  'line-0',
  'line-1',
  'text-1',
  'text-0',
  'white',
] as const satisfies readonly PaletteKey[]

export const CHROMA_KEYS = [
  'red',
  'orange',
  'yellow',
  'lime',
  'teal',
  'cyan',
  'blue',
  'purple',
  'pink',
] as const satisfies readonly PaletteKey[]

export interface Accent {
  base: string
  dark: string
  light: string
}

/** 캐릭터 accent 3단 (UI 테마 + 스프라이트 몸통 음영 겸용) */
export const ACCENTS = {
  peong: { base: '#FF5E5B', dark: '#C13B49', light: '#FF9E8A' },
  cubo: { base: '#4FD6E8', dark: '#2A93B0', light: '#A8EEF7' },
  mallang: { base: '#9BE564', dark: '#5EA83E', light: '#D2F7A6' },
  dalnyang: { base: '#C792EA', dark: '#8A5BBF', light: '#E6C6FA' },
} as const satisfies Record<string, Accent>

export type AccentId = keyof typeof ACCENTS

/** 저장된 캐릭터가 없을 때의 중립 accent (= cyan) */
export const NEUTRAL_ACCENT: Accent = { base: '#4FD6E8', dark: '#2A93B0', light: '#A8EEF7' }
