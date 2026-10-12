import type { DasSettings, DasState } from './types'

export const createDas = (): DasState => ({ dir: 0, timer: 0, charged: false, arrAcc: 0 })

export interface DasResult {
  /** 이번 프레임에 적용할 이동 수 (dir 방향) */
  moves: number
  dir: -1 | 0 | 1
  /** ARR 0: 벽까지 */
  toWall: boolean
}

/**
 * DAS/ARR 컨트롤러 (순수). 방향 전환/첫 입력은 즉시 1회 이동 + 타이머 재시작,
 * DAS 충전 순간 1회 이동, 그 뒤 ARR 마다 1회. 양쪽 동시 → prefer(최근 키). 떼면 남은 키로 재시작.
 * 상태는 스폰/클리어를 가로질러 유지된다 (호출 측이 리셋하지 않는다).
 */
export function dasStep(
  s: DasState,
  dt: number,
  left: boolean,
  right: boolean,
  prefer: -1 | 0 | 1,
  settings: DasSettings,
): DasResult {
  const dir: -1 | 0 | 1 = left && right ? (prefer === 0 ? s.dir || -1 : prefer) : left ? -1 : right ? 1 : 0
  if (dir !== s.dir) {
    s.dir = dir
    s.timer = 0
    s.charged = false
    s.arrAcc = 0
    return { moves: dir === 0 ? 0 : 1, dir, toWall: false }
  }
  if (dir === 0) return { moves: 0, dir, toWall: false }

  s.timer += dt
  let moves = 0
  if (!s.charged) {
    if (s.timer >= settings.das) {
      s.charged = true
      moves = 1
      s.arrAcc = s.timer - settings.das
    } else {
      return { moves: 0, dir, toWall: false }
    }
  } else {
    s.arrAcc += dt
  }
  if (settings.arr <= 0) {
    s.arrAcc = 0
    return { moves, dir, toWall: true }
  }
  const extra = Math.floor(s.arrAcc / settings.arr)
  s.arrAcc -= extra * settings.arr
  return { moves: moves + extra, dir, toWall: false }
}
