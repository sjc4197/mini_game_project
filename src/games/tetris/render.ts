import { PALETTE } from '@/pixel/palette'
import { ghostY } from './logic'
import { cellsOf } from './pieces'
import { CLEAR_FLASH_MS, CLEAR_WIPE_MS } from './scoring'
import {
  COLS,
  HIDDEN_ROWS,
  NEXT_COUNT,
  PIECE_TYPES,
  VISIBLE_ROWS,
  type PieceType,
  type TetrisState,
} from './types'

/**
 * 논리 캔버스 260×260: 좌 HOLD · 중앙 보드 120×240(셀 12dp) · 우 NEXT ×5.
 * 셀 12dp 인 이유: 800px 높이 창에서도 정수 2배(520px)가 들어가고, 1080p/125% 노트북에선 3배가 된다.
 */
export const CELL = 12
export const LOGICAL = { w: 260, h: 260 }
const BOARD_X = 70
const BOARD_Y = 10
const PANEL_W = 56
const HOLD_X = 7
const NEXT_X = LOGICAL.w - PANEL_W - 7
const PANEL_Y = BOARD_Y
/** 패널 라벨 높이 / 미리보기 상자 높이·간격 */
const LABEL_H = 14
const BOX_H = 24
const NEXT_STEP = 28

interface Tone {
  base: string
  light: string
  dark: string
}

/** 테트로미노 7색 (docs/02 부록 B) */
export const PIECE_TONES: Readonly<Record<PieceType, Tone>> = {
  I: { base: '#4FD6E8', light: '#A8EEF7', dark: '#2A93B0' },
  O: { base: '#FFD166', light: '#FFE9A8', dark: '#B8912E' },
  T: { base: '#C792EA', light: '#E6C6FA', dark: '#8A5BBF' },
  S: { base: '#9BE564', light: '#D2F7A6', dark: '#5EA83E' },
  Z: { base: '#FF5E5B', light: '#FF9E8A', dark: '#C13B49' },
  J: { base: '#6E9BFF', light: '#B5CBFF', dark: '#3F63C2' },
  L: { base: '#FFA94D', light: '#FFD2A0', dark: '#C2742A' },
}
const GRAY: Tone = { base: PALETTE['line-0'], light: PALETTE['line-1'], dark: PALETTE['bg-2'] }

/** 캔버스용 3×5 대문자 (HOLD / NEXT) */
const GLYPHS: Record<string, readonly string[]> = {
  H: ['x.x', 'x.x', 'xxx', 'x.x', 'x.x'],
  O: ['xxx', 'x.x', 'x.x', 'x.x', 'xxx'],
  L: ['x..', 'x..', 'x..', 'x..', 'xxx'],
  D: ['xx.', 'x.x', 'x.x', 'x.x', 'xx.'],
  N: ['x.x', 'xxx', 'xxx', 'x.x', 'x.x'],
  E: ['xxx', 'x..', 'xxx', 'x..', 'xxx'],
  X: ['x.x', 'x.x', '.x.', 'x.x', 'x.x'],
  T: ['xxx', '.x.', '.x.', '.x.', '.x.'],
}

function makeTile(t: Tone): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = CELL
  c.height = CELL
  const ctx = c.getContext('2d')!
  ctx.fillStyle = t.base
  ctx.fillRect(0, 0, CELL, CELL)
  ctx.fillStyle = t.dark
  ctx.fillRect(0, CELL - 2, CELL, 2)
  ctx.fillRect(CELL - 2, 0, 2, CELL)
  ctx.fillStyle = t.light
  ctx.fillRect(0, 0, CELL, 2)
  ctx.fillRect(0, 0, 2, CELL)
  ctx.fillStyle = PALETTE.ink
  ctx.fillRect(0, CELL - 1, CELL, 1)
  ctx.fillRect(CELL - 1, 0, 1, CELL)
  return c
}

function makeGhost(t: Tone): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = CELL
  c.height = CELL
  const ctx = c.getContext('2d')!
  ctx.globalAlpha = 0.6
  ctx.fillStyle = t.base
  ctx.fillRect(0, 0, CELL, 1)
  ctx.fillRect(0, CELL - 1, CELL, 1)
  ctx.fillRect(0, 0, 1, CELL)
  ctx.fillRect(CELL - 1, 0, 1, CELL)
  return c
}

export interface TetrisView {
  /** 게임오버 회색 덮임 진행 0..1, 음수면 없음 */
  overT: number
  /** 현재 시각(ms) */
  now: number
  /** 보드 테두리 플래시 종료 시각 (테트리스/레벨업) */
  flashUntil: number
  flashColor: string
}

export interface TetrisRenderer {
  draw(ctx: CanvasRenderingContext2D, s: TetrisState, view: TetrisView): void
}

export function createTetrisRenderer(): TetrisRenderer {
  const tiles = new Map<PieceType, HTMLCanvasElement>()
  const ghosts = new Map<PieceType, HTMLCanvasElement>()
  for (const t of PIECE_TYPES) {
    tiles.set(t, makeTile(PIECE_TONES[t]))
    ghosts.set(t, makeGhost(PIECE_TONES[t]))
  }
  const gray = makeTile(GRAY)
  const typeAt = (v: number): PieceType => PIECE_TYPES[v - 1] ?? 'I'

  const label = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number): void => {
    ctx.fillStyle = PALETTE['text-1']
    let cx = x
    for (const ch of text) {
      const g = GLYPHS[ch]
      if (g) {
        g.forEach((row, gy) =>
          [...row].forEach((px, gx) => {
            if (px === 'x') ctx.fillRect(cx + gx, y + gy, 1, 1)
          }),
        )
      }
      cx += 4
    }
  }

  const panel = (ctx: CanvasRenderingContext2D, x: number, y: number, h: number, text: string): void => {
    ctx.fillStyle = PALETTE['bg-2']
    ctx.fillRect(x, y, PANEL_W, h)
    ctx.fillStyle = PALETTE['line-0']
    ctx.fillRect(x, y, PANEL_W, 1)
    ctx.fillRect(x, y + h - 1, PANEL_W, 1)
    ctx.fillRect(x, y, 1, h)
    ctx.fillRect(x + PANEL_W - 1, y, 1, h)
    label(ctx, text, x + 4, y + 4)
  }

  const preview = (
    ctx: CanvasRenderingContext2D,
    type: PieceType,
    x: number,
    boxY: number,
    dim: boolean,
  ): void => {
    const cells = cellsOf(type, 0)
    let minX = 4
    let maxX = 0
    let minY = 4
    let maxY = 0
    for (const [cx, cy] of cells) {
      minX = Math.min(minX, cx)
      maxX = Math.max(maxX, cx)
      minY = Math.min(minY, cy)
      maxY = Math.max(maxY, cy)
    }
    const w = (maxX - minX + 1) * CELL
    const h = (maxY - minY + 1) * CELL
    const ox = x + Math.floor((PANEL_W - w) / 2)
    const oy = boxY + Math.floor((BOX_H - h) / 2)
    const tile = tiles.get(type)!
    if (dim) ctx.globalAlpha = 0.4
    for (const [cx, cy] of cells) ctx.drawImage(tile, ox + (cx - minX) * CELL, oy + (cy - minY) * CELL)
    ctx.globalAlpha = 1
  }

  return {
    draw(ctx, s, view) {
      ctx.fillStyle = PALETTE['bg-1']
      ctx.fillRect(0, 0, LOGICAL.w, LOGICAL.h)

      // 보드 바탕 + 격자
      ctx.fillStyle = PALETTE['bg-0']
      ctx.fillRect(BOARD_X, BOARD_Y, COLS * CELL, VISIBLE_ROWS * CELL)
      ctx.fillStyle = PALETTE['bg-1']
      for (let x = 1; x < COLS; x++) ctx.fillRect(BOARD_X + x * CELL - 1, BOARD_Y, 1, VISIBLE_ROWS * CELL)
      for (let y = 1; y < VISIBLE_ROWS; y++) ctx.fillRect(BOARD_X, BOARD_Y + y * CELL - 1, COLS * CELL, 1)
      const flashing = view.flashUntil > view.now && Math.floor((view.flashUntil - view.now) / 50) % 2 === 0
      const border = flashing ? 2 : 1
      ctx.fillStyle = flashing ? view.flashColor : PALETTE['line-0']
      ctx.fillRect(BOARD_X - border, BOARD_Y - border, COLS * CELL + border * 2, border)
      ctx.fillRect(BOARD_X - border, BOARD_Y + VISIBLE_ROWS * CELL, COLS * CELL + border * 2, border)
      ctx.fillRect(BOARD_X - border, BOARD_Y - border, border, VISIBLE_ROWS * CELL + border * 2)
      ctx.fillRect(BOARD_X + COLS * CELL, BOARD_Y - border, border, VISIBLE_ROWS * CELL + border * 2)

      // 클리어 연출 상태
      const clearing = s.clearing
      const clearRows = new Set(clearing?.rows ?? [])
      const t = clearing?.t ?? 0
      const flashOn = clearing !== null && t < CLEAR_FLASH_MS && Math.floor(t / 40) % 2 === 1
      const wipe = clearing !== null && t >= CLEAR_FLASH_MS ? (t - CLEAR_FLASH_MS) / CLEAR_WIPE_MS : -1
      const overRows = view.overT >= 0 ? Math.ceil(view.overT * VISIBLE_ROWS) : 0

      // 쌓인 블록 (숨김 행 제외)
      for (let y = HIDDEN_ROWS; y < HIDDEN_ROWS + VISIBLE_ROWS; y++) {
        const vy = y - HIDDEN_ROWS
        const py = BOARD_Y + vy * CELL
        const inClear = clearRows.has(y)
        for (let x = 0; x < COLS; x++) {
          const v = s.board[y * COLS + x] ?? 0
          const px = BOARD_X + x * CELL
          if (inClear && wipe >= 0 && Math.abs(x - 4.5) < wipe * 5.5) continue // 중앙부터 바깥으로 지워짐
          if (v) {
            const grayed = overRows > 0 && vy >= VISIBLE_ROWS - overRows
            ctx.drawImage(grayed ? gray : tiles.get(typeAt(v))!, px, py)
          }
          if (inClear && flashOn) {
            ctx.fillStyle = 'rgba(244, 241, 232, 0.85)'
            ctx.fillRect(px, py, CELL, CELL)
          }
        }
      }

      // 고스트 + 활성 조각
      const p = s.active
      if (p && s.phase === 'falling') {
        const gy = ghostY(s)
        const ghost = ghosts.get(p.type)!
        const tile = tiles.get(p.type)!
        for (const [dx, dy] of cellsOf(p.type, p.rot)) {
          const cy = gy + dy - HIDDEN_ROWS
          if (cy >= 0 && gy !== p.y) ctx.drawImage(ghost, BOARD_X + (p.x + dx) * CELL, BOARD_Y + cy * CELL)
        }
        for (const [dx, dy] of cellsOf(p.type, p.rot)) {
          const cy = p.y + dy - HIDDEN_ROWS
          if (cy >= 0) ctx.drawImage(tile, BOARD_X + (p.x + dx) * CELL, BOARD_Y + cy * CELL)
        }
      }

      // HOLD / NEXT 패널
      panel(ctx, HOLD_X, PANEL_Y, LABEL_H + BOX_H + 6, 'HOLD')
      if (s.hold) preview(ctx, s.hold, HOLD_X, PANEL_Y + LABEL_H, s.holdUsed)
      panel(ctx, NEXT_X, PANEL_Y, LABEL_H + NEXT_COUNT * NEXT_STEP + 2, 'NEXT')
      s.queue
        .slice(0, NEXT_COUNT)
        .forEach((type, i) => preview(ctx, type, NEXT_X, PANEL_Y + LABEL_H + i * NEXT_STEP, false))
    },
  }
}
