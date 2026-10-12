import type { SfxName } from '@/games/types'

/** 효과음 레시피 (docs/02 부록 C). 파형 1개 + 주파수 스텝 열. noise 는 freq 가 로우패스 컷오프 */
export type Wave = 'square' | 'triangle' | 'noise'

export interface SfxStep {
  freq: number
  ms: number
  /** 스텝 끝 주파수 비율 (0.5 = 한 옥타브 하강). 없으면 유지 */
  slide?: number
}

export interface SfxRecipe {
  wave: Wave
  steps: readonly SfxStep[]
  /** 피크 게인 (기본 DEFAULT_GAIN) */
  gain?: number
}

export const DEFAULT_GAIN = 0.15
export const MAX_VOICES = 8

export const SFX: Readonly<Record<SfxName, SfxRecipe>> = {
  select: { wave: 'square', steps: [{ freq: 880, ms: 25 }], gain: 0.08 },
  confirm: { wave: 'square', steps: [{ freq: 660, ms: 60 }, { freq: 990, ms: 90 }] },
  back: { wave: 'square', steps: [{ freq: 440, ms: 60 }, { freq: 330, ms: 90 }] },
  deny: { wave: 'square', steps: [{ freq: 200, ms: 60 }] },
  reveal: { wave: 'triangle', steps: [{ freq: 880, ms: 25 }], gain: 0.1 },
  flood: {
    wave: 'triangle',
    steps: [
      { freq: 660, ms: 30 },
      { freq: 880, ms: 30 },
      { freq: 1100, ms: 40 },
    ],
  },
  flag: { wave: 'square', steps: [{ freq: 523, ms: 40 }, { freq: 784, ms: 40 }] },
  boom: { wave: 'noise', steps: [{ freq: 800, ms: 350, slide: 0.1 }], gain: 0.5 },
  win: {
    wave: 'square',
    steps: [
      { freq: 523, ms: 90 },
      { freq: 659, ms: 90 },
      { freq: 784, ms: 90 },
      { freq: 1047, ms: 240 },
    ],
  },
  move: { wave: 'square', steps: [{ freq: 2000, ms: 15 }], gain: 0.05 },
  rotate: { wave: 'triangle', steps: [{ freq: 900, ms: 20 }, { freq: 1200, ms: 25 }] },
  drop: { wave: 'square', steps: [{ freq: 300, ms: 40, slide: 0.5 }] },
  lock: { wave: 'noise', steps: [{ freq: 2000, ms: 40 }], gain: 0.2 },
  clear: { wave: 'square', steps: [{ freq: 784, ms: 60 }, { freq: 1047, ms: 100 }] },
  tetris: {
    wave: 'square',
    steps: [
      { freq: 659, ms: 70 },
      { freq: 784, ms: 70 },
      { freq: 988, ms: 70 },
      { freq: 1319, ms: 220 },
    ],
  },
  levelup: {
    wave: 'triangle',
    steps: [
      { freq: 523, ms: 60 },
      { freq: 659, ms: 60 },
      { freq: 784, ms: 60 },
      { freq: 1047, ms: 60 },
      { freq: 1319, ms: 150 },
    ],
  },
  gameover: {
    wave: 'triangle',
    steps: [
      { freq: 440, ms: 150 },
      { freq: 349, ms: 150 },
      { freq: 262, ms: 400 },
    ],
  },
}

export const SFX_NAMES = Object.keys(SFX) as SfxName[]

export function recipeDuration(recipe: SfxRecipe): number {
  return recipe.steps.reduce((sum, s) => sum + s.ms, 0)
}
