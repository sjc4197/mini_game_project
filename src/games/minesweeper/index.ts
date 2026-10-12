import { createLoop, type Loop } from '@/app/loop'
import { createPixelCanvas, type PixelCanvas } from '@/lib/canvas'
import { formatClockTenths } from '@/lib/format'
import { mulberry32, randomSeed } from '@/lib/rng'
import { MINE_ICON } from '../icons'
import type { GameHost, GameInstance, GameInstanceState, GameModule } from '../types'
import { attachPointer } from './input'
import {
  chord,
  createBoard,
  forEachNeighbor,
  indexOf,
  remainingMines,
  remainingSafe,
  reveal,
  tick,
  toggleFlag,
} from './logic'
import { FLASH_MS, drawBoard, logicalSize, type ViewState } from './render'
import { BORDER, CELL_SIZE, buildCellSprites, type CellSprites } from './sprites'
import { CELL, MS_DIFFICULTIES, type MsBoard, type MsDifficulty, type MsEvent } from './types'

/** 결과창을 띄우기 전 폭발/클리어를 보여주는 시간 */
const FINISH_DELAY_MS = { win: 600, lose: 900 }
/** 연쇄 열기 '잘했어' 기준 */
const CASCADE_GOOD = 8
/** 위험: 숫자 4 이상 + 숨은 이웃 4 이상 */
const RISKY_NUMBER = 4
const RISKY_HIDDEN = 4
/** 남은 안전 칸이 이 이하면 '음…' */
const THINK_REMAINING = 10
/** 무입력 '음…' */
const THINK_IDLE_MS = 30_000
const BOOM_BLINK_MS = 150

class MinesweeperInstance implements GameInstance {
  state: GameInstanceState = 'created'
  board: MsBoard
  readonly view: ViewState & { pressed: Set<number> }
  private readonly host: GameHost
  private readonly difficulty: MsDifficulty
  private readonly loop: Loop
  private canvas: PixelCanvas | null = null
  private sprites: CellSprites | null = null
  private detachPointer: (() => void) | null = null
  private dirty = true
  private lastSecond = -1
  private finishAfter = -1
  private clock = 0
  private animUntil = 0
  private idleMs = 0
  private riskyCell = -1
  private thoughtEndgame = false
  private prevState: Uint8Array

  constructor(host: GameHost, difficulty: MsDifficulty) {
    this.host = host
    this.difficulty = difficulty
    this.board = createBoard(difficulty, mulberry32(randomSeed()))
    this.prevState = new Uint8Array(this.board.state.length)
    this.view = {
      hover: -1,
      cursor: 0,
      cursorVisible: false,
      pressed: new Set<number>(),
      flashUntil: new Float64Array(this.board.state.length),
      now: 0,
      boomPhase: 0,
    }
    this.loop = createLoop({ update: (dt) => this.update(dt), render: () => this.render() })
  }

  mount(el: HTMLElement): void {
    if (this.state !== 'created') return
    const { w, h } = logicalSize(this.difficulty.cols, this.difficulty.rows)
    this.canvas = createPixelCanvas(w, h)
    this.canvas.mount(el)
    this.sprites = buildCellSprites()
    this.detachPointer = attachPointer(this.canvas.element, (cx, cy) => this.cellAt(cx, cy), {
      primary: (c) => this.primary(c),
      secondary: (c) => this.secondary(c),
      chord: (c) => this.chordAt(c),
      pressStart: (c, isChord) => this.pressStart(c, isChord),
      pressMove: (c) => this.pressMove(c),
      pressCancel: () => this.pressCancel(),
      hover: (c) => this.hover(c),
    })
    this.state = 'mounted'
    this.dirty = true
    this.render()
  }

  start(): void {
    if (this.state !== 'mounted') return
    this.state = 'running'
    this.pushHud()
    this.loop.start()
  }

  pause(): void {
    if (this.state !== 'running') return
    this.state = 'paused'
    this.pressCancel()
    this.loop.pause()
  }

  resume(): void {
    if (this.state !== 'paused') return
    this.state = 'running'
    this.loop.resume()
  }

  destroy(): void {
    if (this.state === 'destroyed') return
    this.loop.stop()
    this.detachPointer?.()
    this.detachPointer = null
    this.canvas?.destroy()
    this.canvas = null
    this.state = 'destroyed'
  }

  // ---- 입력 ----

  private cellAt(clientX: number, clientY: number): number {
    const p = this.canvas?.toLogical(clientX, clientY)
    if (!p) return -1
    const x = Math.floor((p.x - BORDER) / CELL_SIZE)
    const y = Math.floor((p.y - BORDER) / CELL_SIZE)
    if (x < 0 || y < 0 || x >= this.board.cols || y >= this.board.rows) return -1
    return indexOf(this.board, x, y)
  }

  private get playable(): boolean {
    return this.state === 'running' && this.finishAfter < 0
  }

  /** 좌클릭/Enter: 숨은 칸은 열기, 열린 숫자 칸은 코드 */
  private primary(cell: number): void {
    if (!this.playable || cell < 0) return
    const b = this.board
    if (b.state[cell] === CELL.Revealed && b.counts[cell]! > 0) this.apply(chord(b, cell), cell)
    else this.apply(reveal(b, cell), cell)
  }

  private secondary(cell: number): void {
    if (!this.playable || cell < 0) return
    this.apply(toggleFlag(this.board, cell), cell)
  }

  private chordAt(cell: number): void {
    if (!this.playable || cell < 0) return
    this.apply(chord(this.board, cell), cell)
  }

  private pressStart(cell: number, isChord: boolean): void {
    this.view.pressed.clear()
    this.view.cursorVisible = false
    this.idleMs = 0
    if (!this.playable || cell < 0) {
      this.dirty = true
      return
    }
    this.view.pressed.add(cell)
    if (isChord) forEachNeighbor(this.board, cell, (j) => this.view.pressed.add(j))
    this.host.mascot.setMood('worried')
    this.dirty = true
  }

  private pressMove(cell: number): void {
    const wasChord = this.view.pressed.size > 1
    this.view.pressed.clear()
    if (cell >= 0 && this.playable) {
      this.view.pressed.add(cell)
      if (wasChord) forEachNeighbor(this.board, cell, (j) => this.view.pressed.add(j))
    }
    this.dirty = true
  }

  private pressCancel(): void {
    if (this.view.pressed.size === 0) return
    this.view.pressed.clear()
    if (this.playable) this.host.mascot.setMood('idle')
    this.dirty = true
  }

  private hover(cell: number): void {
    if (cell === this.view.hover) return
    this.view.hover = cell
    if (cell >= 0) this.view.cursorVisible = false
    this.dirty = true
  }

  private moveCursor(dx: number, dy: number): void {
    const b = this.board
    const x = Math.min(b.cols - 1, Math.max(0, (this.view.cursor % b.cols) + dx))
    const y = Math.min(b.rows - 1, Math.max(0, Math.floor(this.view.cursor / b.cols) + dy))
    this.view.cursor = indexOf(b, x, y)
    this.view.cursorVisible = true
    this.view.hover = -1
    this.idleMs = 0
    this.dirty = true
  }

  private pollKeys(): void {
    const { input } = this.host
    if (input.takePress('restart')) {
      this.restart()
      return
    }
    if (!this.playable) return
    if (input.takePress('left')) this.moveCursor(-1, 0)
    if (input.takePress('right')) this.moveCursor(1, 0)
    if (input.takePress('up')) this.moveCursor(0, -1)
    if (input.takePress('down')) this.moveCursor(0, 1)
    // Space 는 confirm 과 chord 둘 다 누른 것으로 집계된다 → chord 를 먼저 보고 confirm 을 소비
    if (input.takePress('chord')) {
      input.takePress('confirm')
      this.view.cursorVisible = true
      this.chordAt(this.view.cursor)
    } else if (input.takePress('confirm')) {
      this.view.cursorVisible = true
      this.primary(this.view.cursor)
    }
    if (input.takePress('flag')) {
      this.view.cursorVisible = true
      this.secondary(this.view.cursor)
    }
  }

  // ---- 로직 이벤트 → 호스트 ----

  private apply(events: MsEvent[], cell: number): void {
    this.idleMs = 0
    if (events.length === 0) return
    this.dirty = true
    const b = this.board
    for (const e of events) {
      switch (e.type) {
        case 'start':
          this.host.mascot.react('game.start')
          break
        case 'reveal':
          this.host.audio.play(e.count >= CASCADE_GOOD ? 'flood' : 'reveal')
          this.flashNewlyRevealed()
          if (e.count >= CASCADE_GOOD) this.host.mascot.react('game.good')
          else this.checkRisky(cell)
          break
        case 'flag':
          this.host.audio.play('flag')
          break
        case 'invalid':
          this.host.audio.play('deny')
          break
        case 'lost':
          this.host.audio.play('boom')
          this.host.mascot.react('game.fail')
          this.finishAfter = FINISH_DELAY_MS.lose
          this.animUntil = this.clock + FINISH_DELAY_MS.lose
          break
        case 'won':
          this.host.audio.play('win')
          this.host.mascot.react('game.win')
          this.finishAfter = FINISH_DELAY_MS.win
          break
      }
    }
    this.checkSafe()
    if (b.status === 'playing' && !this.thoughtEndgame && remainingSafe(b) <= THINK_REMAINING) {
      this.thoughtEndgame = true
      this.host.mascot.react('game.think')
    }
    this.pushHud()
  }

  /** 직전 상태와 비교해 방금 열린 칸에 플래시 */
  private flashNewlyRevealed(): void {
    const b = this.board
    const until = this.clock + FLASH_MS
    for (let i = 0; i < b.state.length; i++) {
      if (b.state[i] === CELL.Revealed && this.prevState[i] !== CELL.Revealed) {
        this.view.flashUntil[i] = until
      }
    }
    this.animUntil = Math.max(this.animUntil, until)
  }

  /** 방금 연 칸이 큰 숫자인데 주변이 아직 많이 닫혀 있으면 '조심…' */
  private checkRisky(cell: number): void {
    const b = this.board
    if (cell < 0 || b.state[cell] !== CELL.Revealed || b.counts[cell]! < RISKY_NUMBER) return
    let hidden = 0
    forEachNeighbor(b, cell, (j) => {
      if (b.state[j] === CELL.Hidden) hidden++
    })
    if (hidden >= RISKY_HIDDEN) {
      this.riskyCell = cell
      this.host.mascot.react('game.risky')
    }
  }

  /** 위험 칸 주변이 전부 정리되면 '휴…' */
  private checkSafe(): void {
    const b = this.board
    if (this.riskyCell < 0 || b.status !== 'playing') return
    let hidden = 0
    forEachNeighbor(b, this.riskyCell, (j) => {
      if (b.state[j] === CELL.Hidden) hidden++
    })
    if (hidden === 0) {
      this.riskyCell = -1
      this.host.mascot.react('game.safe')
    }
  }

  private pushHud(): void {
    const b = this.board
    const sec = Math.min(999, Math.floor(b.elapsedMs / 1000))
    this.lastSecond = sec
    this.host.setHUD({ time: String(sec).padStart(3, '0'), mines: remainingMines(b) })
  }

  private restart(): void {
    this.board = createBoard(this.difficulty, mulberry32(randomSeed()))
    this.prevState.fill(0)
    this.view.flashUntil.fill(0)
    this.finishAfter = -1
    this.animUntil = 0
    this.idleMs = 0
    this.riskyCell = -1
    this.thoughtEndgame = false
    this.view.pressed.clear()
    this.view.hover = -1
    this.view.cursor = 0
    this.view.cursorVisible = false
    this.view.boomPhase = 0
    this.host.mascot.clear()
    this.host.audio.play('back')
    this.pushHud()
    this.dirty = true
  }

  private update(dt: number): void {
    if (this.state !== 'running') return
    this.clock += dt
    this.view.now = this.clock
    this.pollKeys()
    const b = this.board
    tick(b, dt)
    const sec = Math.min(999, Math.floor(b.elapsedMs / 1000))
    if (sec !== this.lastSecond) this.pushHud()

    if (b.status === 'playing') {
      this.idleMs += dt
      if (this.idleMs >= THINK_IDLE_MS) {
        this.idleMs = 0
        this.host.mascot.react('game.think')
      }
    }

    if (this.clock < this.animUntil) {
      if (b.status === 'lost') {
        const phase = Math.floor(this.clock / BOOM_BLINK_MS)
        if (phase !== this.view.boomPhase) {
          this.view.boomPhase = phase
          this.dirty = true
        }
      } else {
        this.dirty = true
      }
    }

    if (this.finishAfter >= 0) {
      this.finishAfter -= dt
      if (this.finishAfter < 0) {
        this.finishAfter = -1
        this.state = 'finished'
        this.loop.stop()
        this.view.boomPhase = 0
        this.dirty = true
        this.render()
        this.host.finish({
          outcome: b.status === 'won' ? 'win' : 'lose',
          score: Math.round(b.elapsedMs),
          durationMs: b.elapsedMs,
          stats: { revealed: b.revealed, flags: b.flags },
        })
      }
    }
  }

  private render(): void {
    if (!this.dirty || !this.canvas || !this.sprites) return
    this.dirty = false
    drawBoard(this.canvas.ctx, this.board, this.view, this.sprites)
    this.prevState.set(this.board.state)
    this.canvas.present()
  }
}

export const minesweeperGame: GameModule = {
  id: 'minesweeper',
  title: '지뢰찾기',
  description: '숫자 힌트로 지뢰를 피해 칸을 여는 게임',
  icon: MINE_ICON,
  difficulties: MS_DIFFICULTIES.map((d) => ({ id: d.id, label: d.label, description: d.description })),
  defaultDifficulty: 'easy',
  hud: [
    { key: 'time', label: '시간' },
    { key: 'mines', label: '남은 지뢰' },
  ],
  scoring: { betterIs: 'lower', countsWhen: 'win', format: (ms) => formatClockTenths(ms) },
  controls: {
    keyboard: ['←→↑↓ 커서', 'Enter/Z 열기', 'X 깃발', 'Space 코드', 'R 다시', 'Esc 일시정지'],
    mouse: ['좌클릭 열기', '우클릭 깃발', '양쪽/가운데 코드'],
  },
  logical: logicalSize(30, 16),
  create(host) {
    const d = MS_DIFFICULTIES.find((x) => x.id === host.difficulty) ?? MS_DIFFICULTIES[0]!
    return new MinesweeperInstance(host, d)
  },
}
