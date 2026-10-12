import type { PieceType, Rotation } from './types'

export type Kick = readonly [dx: number, dy: number]

/**
 * SRS 월킥 (화면 좌표: y 아래 +). Tetris Wiki 표에서 y 부호만 반전한 값.
 * 키 = `${from}${to}`. 5개를 순서대로 시도, 첫 성공 적용.
 */
export const KICKS_JLSTZ: Readonly<Record<string, readonly Kick[]>> = {
  '01': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '10': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  '12': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  '21': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '23': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '32': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '30': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '03': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
}

export const KICKS_I: Readonly<Record<string, readonly Kick[]>> = {
  '01': [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
  '10': [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
  '12': [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
  '21': [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
  '23': [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
  '32': [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
  '30': [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
  '03': [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
}

const NONE: readonly Kick[] = [[0, 0]]

export function kicksFor(type: PieceType, from: Rotation, to: Rotation): readonly Kick[] {
  if (type === 'O') return NONE
  const key = `${from}${to}`
  return (type === 'I' ? KICKS_I[key] : KICKS_JLSTZ[key]) ?? NONE
}
