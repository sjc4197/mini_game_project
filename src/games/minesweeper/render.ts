import { PALETTE } from '@/pixel/palette'
import { BORDER, CELL_SIZE, type CellSprites } from './sprites'
import { CELL, type MsBoard } from './types'

/** 보드 위에 겹치는 일시 상태 (로직과 분리) */
export interface ViewState {
  /** 마우스 hover 셀, 없으면 -1 */
  hover: number
  /** 키보드 커서 셀 (visible 일 때만 그림) */
  cursor: number
  cursorVisible: boolean
  /** 누르는 중인 셀들 (코드면 3×3) */
  pressed: ReadonlySet<number>
}

export const logicalSize = (cols: number, rows: number) => ({
  w: cols * CELL_SIZE + BORDER * 2,
  h: rows * CELL_SIZE + BORDER * 2,
})

/**
 * 전체 다시 그리기 (dirty 일 때만 호출). 480칸 × 사각형 몇 개라 충분히 싸다.
 * 안 열린 셀: --bg-3 볼록 베벨 / 열린 셀: --bg-1 평면 / 숫자: 5×7 스프라이트 / 지뢰·깃발·X 스프라이트.
 */
export function drawBoard(
  ctx: CanvasRenderingContext2D,
  b: MsBoard,
  v: ViewState,
  s: CellSprites,
): void {
  const { w, h } = logicalSize(b.cols, b.rows)
  ctx.fillStyle = PALETTE['line-0']
  ctx.fillRect(0, 0, w, h)

  for (let y = 0; y < b.rows; y++) {
    for (let x = 0; x < b.cols; x++) {
      const i = y * b.cols + x
      const px = BORDER + x * CELL_SIZE
      const py = BORDER + y * CELL_SIZE
      const st = b.state[i]
      const isMine = b.mines[i] === 1
      const pressed = v.pressed.has(i) && st === CELL.Hidden

      if (st === CELL.Hidden && !pressed) {
        drawRaised(ctx, px, py, i === v.hover)
      } else if (st === CELL.Flagged) {
        drawRaised(ctx, px, py, i === v.hover)
        ctx.drawImage(s.flag, px + 4, py + 3)
      } else {
        // 열린 칸 / 눌린 칸 / 틀린 깃발
        const exploded = i === b.exploded
        drawFlat(ctx, px, py, exploded)
        if (st === CELL.WrongFlag) {
          ctx.drawImage(s.mine, px + 4, py + 4)
          ctx.drawImage(s.cross, px + 4, py + 4)
        } else if (st === CELL.Revealed && isMine) {
          ctx.drawImage(exploded ? s.mineExploded : s.mine, px + 4, py + 4)
        } else if (st === CELL.Revealed) {
          const n = b.counts[i]!
          if (n > 0) ctx.drawImage(s.digits[n - 1]!, px + 6, py + 5)
        }
      }

      if (v.cursorVisible && i === v.cursor) {
        ctx.fillStyle = PALETTE.yellow
        ctx.fillRect(px, py, CELL_SIZE, 2)
        ctx.fillRect(px, py + CELL_SIZE - 2, CELL_SIZE, 2)
        ctx.fillRect(px, py, 2, CELL_SIZE)
        ctx.fillRect(px + CELL_SIZE - 2, py, 2, CELL_SIZE)
      }
    }
  }
}

function drawRaised(ctx: CanvasRenderingContext2D, px: number, py: number, hover: boolean): void {
  ctx.fillStyle = hover ? PALETTE['line-0'] : PALETTE['bg-3']
  ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE)
  ctx.fillStyle = PALETTE['line-1']
  ctx.fillRect(px, py, CELL_SIZE, 1)
  ctx.fillRect(px, py, 1, CELL_SIZE)
  ctx.fillStyle = PALETTE.ink
  ctx.fillRect(px, py + CELL_SIZE - 1, CELL_SIZE, 1)
  ctx.fillRect(px + CELL_SIZE - 1, py, 1, CELL_SIZE)
}

function drawFlat(ctx: CanvasRenderingContext2D, px: number, py: number, exploded: boolean): void {
  ctx.fillStyle = exploded ? PALETTE.red : PALETTE['bg-1']
  ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE)
  ctx.fillStyle = PALETTE['bg-0']
  ctx.fillRect(px, py + CELL_SIZE - 1, CELL_SIZE, 1)
  ctx.fillRect(px + CELL_SIZE - 1, py, 1, CELL_SIZE)
}
