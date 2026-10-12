/** 가이드라인 수치 (docs/02 §4.2, 부록 B) */
export const LOCK_DELAY_MS = 500
export const LOCK_RESET_MAX = 15
export const SOFT_DROP_MULT = 20
export const SOFT_DROP_POINTS = 1
export const HARD_DROP_POINTS = 2
export const CLEAR_FLASH_MS = 160
export const CLEAR_WIPE_MS = 150
export const CLEAR_TOTAL_MS = CLEAR_FLASH_MS + CLEAR_WIPE_MS
export const GRAVITY_LEVEL_CAP = 20
export const LINES_PER_LEVEL = 10

const LINE_BASE = [0, 100, 300, 500, 800] as const

/** 레벨당 한 행 떨어지는 데 걸리는 초. (0.8 − (L−1)·0.007)^(L−1), L 은 20 에서 고정 */
export function gravitySecPerRow(level: number): number {
  const l = Math.min(GRAVITY_LEVEL_CAP, Math.max(1, level))
  return Math.pow(0.8 - (l - 1) * 0.007, l - 1)
}

export const levelFor = (startLevel: number, lines: number): number =>
  startLevel + Math.floor(lines / LINES_PER_LEVEL)

/** 줄 클리어 기본 점수. difficult(테트리스) 가 B2B 면 ×1.5 */
export function linePoints(lines: number, level: number, b2bActive: boolean): number {
  const base = (LINE_BASE[lines] ?? 0) * level
  return lines === 4 && b2bActive ? Math.floor(base * 1.5) : base
}

/** 콤보 보너스: combo ≥ 1 이면 50 × combo × level */
export const comboPoints = (combo: number, level: number): number =>
  combo >= 1 ? 50 * combo * level : 0

export const isDifficult = (lines: number): boolean => lines === 4
