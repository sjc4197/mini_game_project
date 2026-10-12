import { PALETTE, type Accent } from '@/pixel/palette'
import { xyOf } from './logic'
import type { SnakeSprites } from './sprites'
import { COLS, DIR_VECTORS, ROWS, type Dir, type SnakeState } from './types'

/** 셀 한 변 (dp) */
export const CELL = 12
export const BORDER = 1
/** 논리 캔버스 20×14 칸 → 242×170 */
export const LOGICAL = { w: COLS * CELL + BORDER * 2, h: ROWS * CELL + BORDER * 2 }

/** 보드 위에 겹치는 일시 상태 */
export interface SnakeView {
  /** 현재 시각(ms) — 먹이 까딱임, 출발 힌트 깜빡임 */
  now: number
  /** 머리 흰색 플래시 종료 시각 */
  flashUntil: number
  /** 죽음 연출 진행도 0~1 (−1 = 없음) */
  deadT: number
  /** 캐릭터 accent — 몸통 색 */
  accent: Accent
}

const px = (x: number): number => BORDER + x * CELL
const py = (y: number): number => BORDER + y * CELL

/** 머리 방향별 눈 위치 (10×10 머리 안 좌표) */
const EYES: Readonly<Record<Dir, readonly (readonly [number, number])[]>> = {
  right: [
    [6, 2],
    [6, 6],
  ],
  left: [
    [2, 2],
    [2, 6],
  ],
  up: [
    [2, 2],
    [6, 2],
  ],
  down: [
    [2, 6],
    [6, 6],
  ],
}

export function drawGame(
  ctx: CanvasRenderingContext2D,
  s: SnakeState,
  v: SnakeView,
  sp: SnakeSprites,
): void {
  const { w, h } = LOGICAL
  ctx.fillStyle = PALETTE['bg-0']
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = PALETTE['bg-1']
  for (let y = 0; y < s.rows; y++)
    for (let x = 0; x < s.cols; x++) ctx.fillRect(px(x), py(y), CELL - 1, CELL - 1)

  // 먹이 (500ms 마다 1dp 까딱)
  if (s.food >= 0) {
    const [fx, fy] = xyOf(s, s.food)
    const bob = Math.floor(v.now / 500) % 2
    ctx.drawImage(sp.food, px(fx) + 2, py(fy) + 1 + bob)
  }

  const dead = v.deadT >= 0
  const blink = Math.floor(v.now / 120) % 2 === 0
  // 몸통: 꼬리 → 머리 순으로 그려 머리가 위에 오게. 마디 색을 번갈아 줄무늬
  for (let i = s.body.length - 1; i >= 0; i--) {
    const [x, y] = xyOf(s, s.body[i]!)
    const isHead = i === 0
    const isTail = i === s.body.length - 1 && s.body.length > 1
    let color: string
    if (dead)
      color = isHead
        ? blink
          ? PALETTE.red
          : PALETTE['text-1']
        : i % 2
          ? PALETTE['line-0']
          : PALETTE['line-1']
    else if (isHead) color = v.now < v.flashUntil ? PALETTE.white : v.accent.light
    else color = i % 2 ? v.accent.dark : v.accent.base
    ctx.fillStyle = color
    if (isTail) ctx.fillRect(px(x) + 2, py(y) + 2, CELL - 4, CELL - 4)
    else ctx.fillRect(px(x) + 1, py(y) + 1, CELL - 2, CELL - 2)
    // 앞 마디와 잇는 다리 (2dp 틈 메우기)
    if (i > 0) {
      const [nx, ny] = xyOf(s, s.body[i - 1]!)
      const dx = nx - x
      const dy = ny - y
      if (dx === 1) ctx.fillRect(px(x) + CELL - 1, py(y) + 2, 2, CELL - 4)
      else if (dx === -1) ctx.fillRect(px(x) - 1, py(y) + 2, 2, CELL - 4)
      else if (dy === 1) ctx.fillRect(px(x) + 2, py(y) + CELL - 1, CELL - 4, 2)
      else if (dy === -1) ctx.fillRect(px(x) + 2, py(y) - 1, CELL - 4, 2)
    }
    if (isHead) {
      ctx.fillStyle = PALETTE.ink
      for (const [ex, ey] of EYES[s.dir]) ctx.fillRect(px(x) + 1 + ex, py(y) + 1 + ey, 2, 2)
    }
  }

  // 출발 힌트: 머리 앞 칸에 깜빡이는 화살표 (accent)
  if (s.status === 'ready' && Math.floor(v.now / 500) % 2 === 0) {
    const [hx, hy] = xyOf(s, s.body[0]!)
    const [dx, dy] = DIR_VECTORS[s.dir]
    const ax = hx + dx
    const ay = hy + dy
    if (ax >= 0 && ay >= 0 && ax < s.cols && ay < s.rows) {
      ctx.fillStyle = v.accent.base
      const ox = px(ax) + 4
      const oy = py(ay) + 2
      // ▶ 5×7
      for (let r = 0; r < 7; r++) {
        const len = r < 4 ? r + 1 : 7 - r
        ctx.fillRect(ox, oy + r, len, 1)
      }
    }
  }
}
