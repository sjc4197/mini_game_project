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

/** 캐릭터 accent 3단 (UI 테마색 — 고양이 털색과는 별개로, 각 고양이의 상징색) */
export const ACCENTS = {
  cheese: { base: '#FFA94D', dark: '#C2742A', light: '#FFD2A0' },
  mackerel: { base: '#4FD6E8', dark: '#2A93B0', light: '#A8EEF7' },
  milk: { base: '#FF8FB1', dark: '#C25A80', light: '#FFC4D6' },
  siam: { base: '#6E9BFF', dark: '#3F63C2', light: '#B5CBFF' },
} as const satisfies Record<string, Accent>

export type AccentId = keyof typeof ACCENTS

/** 저장된 캐릭터가 없을 때의 중립 accent (= cyan) */
export const NEUTRAL_ACCENT: Accent = { base: '#4FD6E8', dark: '#2A93B0', light: '#A8EEF7' }
