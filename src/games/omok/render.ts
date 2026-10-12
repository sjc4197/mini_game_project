import { PALETTE } from '@/pixel/palette'
import { xyOf } from './logic'
import { STONE_SIZE, type StoneSprites } from './sprites'
import { SIZE, STONE, type OmokBoard, type Player } from './types'

/** 교차점 간격 (dp) */
export const CELL = 16
export const BORDER = 1
/** 논리 캔버스: 15칸 × 16 + 테두리 → 242×242 */
export const LOGICAL = { w: SIZE * CELL + BORDER * 2, h: SIZE * CELL + BORDER * 2 }

/** 화점 (15줄 기준) */
const STAR_POINTS: readonly (readonly [number, number])[] = [
  [3, 3],
  [11, 3],
  [3, 11],
  [11, 11],
  [7, 7],
]

/** 보드 위에 겹치는 일시 상태 (로직과 분리) */
export interface OmokView {
  /** 마우스 hover 교차점, 없으면 -1 */
  hover: number
  /** 키보드/터치 커서 교차점 */
  cursor: number
  cursorVisible: boolean
  /** 미리보기 돌을 보일지 (사람 차례 + 진행 중) */
  showGhost: boolean
  /** 미리보기 돌 색 */
  ghost: Player
  /** 승리 줄 강조 켜짐 (깜빡임) */
  winOn: boolean
  /** 캐릭터 accent — 마지막 수 표시, 승리 줄 */
  accent: string
}

/** 교차점 i 의 중심 좌표 (dp) */
export const center = (i: number): number => BORDER + i * CELL + CELL / 2

/** 논리 좌표 → 교차점 인덱스 (보드 밖이면 -1) */
export function cellAt(lx: number, ly: number): number {
  const x = Math.floor((lx - BORDER) / CELL)
  const y = Math.floor((ly - BORDER) / CELL)
  if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return -1
  return y * SIZE + x
}

export function drawBoard(
  ctx: CanvasRenderingContext2D,
  b: OmokBoard,
  v: OmokView,
  s: StoneSprites,
): void {
  const { w, h } = LOGICAL
  ctx.fillStyle = PALETTE['bg-2']
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = PALETTE['line-0']
  ctx.fillRect(0, 0, w, BORDER)
  ctx.fillRect(0, h - BORDER, w, BORDER)
  ctx.fillRect(0, 0, BORDER, h)
  ctx.fillRect(w - BORDER, 0, BORDER, h)

  // 선
  const first = center(0)
  const span = center(b.size - 1) - first + 1
  for (let i = 0; i < b.size; i++) {
    const c = center(i)
    ctx.fillRect(first, c, span, 1)
    ctx.fillRect(c, first, 1, span)
  }
  // 화점
  ctx.fillStyle = PALETTE['line-1']
  for (const [sx, sy] of STAR_POINTS) ctx.fillRect(center(sx) - 1, center(sy) - 1, 3, 3)

  // 돌
  const half = STONE_SIZE / 2
  for (let i = 0; i < b.cells.length; i++) {
    const st = b.cells[i]
    if (!st) continue
    const [x, y] = xyOf(b, i)
    ctx.drawImage(st === STONE.Black ? s.black : s.white, center(x) - half, center(y) - half)
  }

  // 승리 줄 강조 (accent 테두리)
  if (b.status === 'won' && v.winOn) {
    ctx.fillStyle = v.accent
    for (const i of b.winLine) frame(ctx, b, i)
  }

  // 마지막 수 표시 (accent 점)
  if (b.lastMove >= 0) {
    const [x, y] = xyOf(b, b.lastMove)
    ctx.fillStyle = v.accent
    ctx.fillRect(center(x) - 1, center(y) - 1, 2, 2)
  }

  // 미리보기 돌 (커서가 보이면 커서, 아니면 hover)
  if (v.showGhost) {
    const g = v.cursorVisible ? v.cursor : v.hover
    if (g >= 0 && b.cells[g] === STONE.Empty) {
      const [x, y] = xyOf(b, g)
      ctx.globalAlpha = 0.45
      ctx.drawImage(v.ghost === STONE.Black ? s.black : s.white, center(x) - half, center(y) - half)
      ctx.globalAlpha = 1
    }
  }

  // 키보드/터치 커서 (노란 꺾쇠)
  if (v.cursorVisible && v.cursor >= 0) corners(ctx, b, v.cursor)
}

/** 교차점 칸(16×16) 둘레 1dp 틀 */
function frame(ctx: CanvasRenderingContext2D, b: OmokBoard, i: number): void {
  const [x, y] = xyOf(b, i)
  const px = center(x) - CELL / 2
  const py = center(y) - CELL / 2
  ctx.fillRect(px, py, CELL, 1)
  ctx.fillRect(px, py + CELL - 1, CELL, 1)
  ctx.fillRect(px, py, 1, CELL)
  ctx.fillRect(px + CELL - 1, py, 1, CELL)
}

/** 2dp 두께, 5dp 길이 꺾쇠 네 모서리 */
function corners(ctx: CanvasRenderingContext2D, b: OmokBoard, i: number): void {
  const [x, y] = xyOf(b, i)
  const px = center(x) - CELL / 2
  const py = center(y) - CELL / 2
  const L = 5
  const T = 2
  ctx.fillStyle = PALETTE.yellow
  for (const [cx, cy, dx, dy] of [
    [px, py, 1, 1],
    [px + CELL - 1, py, -1, 1],
    [px, py + CELL - 1, 1, -1],
    [px + CELL - 1, py + CELL - 1, -1, -1],
  ] as const) {
    // 가로 팔
    ctx.fillRect(dx > 0 ? cx : cx - L + 1, dy > 0 ? cy : cy - T + 1, L, T)
    // 세로 팔
    ctx.fillRect(dx > 0 ? cx : cx - T + 1, dy > 0 ? cy : cy - L + 1, T, L)
  }
}
