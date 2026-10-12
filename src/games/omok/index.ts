import { createLoop, type Loop } from '@/app/loop'
import { createPixelCanvas, type PixelCanvas } from '@/lib/canvas'
import { formatClock } from '@/lib/format'
import { mulberry32, randomSeed, type Rng } from '@/lib/rng'
import { OMOK_ICON } from '../icons'
import type { GameHost, GameInstance, GameInstanceState, GameModule, GameResult } from '../types'
import { analyze, chooseMove, type Analysis } from './ai'
import { attachTap, type TapHandle } from './input'
import { createBoard, indexOf, other, place } from './logic'
import { LOGICAL, cellAt, drawBoard, type OmokView } from './render'
import { buildStoneSprites, type StoneSprites } from './sprites'
import {
  OMOK_MODES,
  SIZE,
  STONE,
  type OmokBoard,
  type OmokEvent,
  type OmokMode,
  type Player,
  type Stone,
} from './types'

/** 승리 줄을 깜빡여 보여준 뒤 결과창 */
const FINISH_MS = 1400
const BLINK_MS = 250
/** 컴퓨터가 "생각하는" 시간 (실제 탐색은 수십 ms) */
const AI_DELAY_MIN_MS = 450
const AI_DELAY_VAR_MS = 400
/** 사람 차례에 무입력 '음…' */
const THINK_IDLE_MS = 20_000
/** 한 수로 창 점수가 이만큼 오르면 열린 3 급 */
const GOOD_GAIN = 250

const NAME: Readonly<Record<Player, string>> = { 1: '흑', 2: '백' }
const MARK: Readonly<Record<Player, string>> = { 1: '●', 2: '○' }

class OmokInstance implements GameInstance {
  state: GameInstanceState = 'created'
  board: OmokBoard
  readonly view: OmokView
  private readonly host: GameHost
  private readonly mode: OmokMode
  private readonly loop: Loop
  private readonly rng: Rng
  private canvas: PixelCanvas | null = null
  private sprites: StoneSprites | null = null
  private pointer: TapHandle | null = null
  private dirty = true
  private elapsed = 0
  private lastSecond = -1
  private aiTimer = -1
  private finishAfter = -1
  private blinkPhase = 0
  private idleMs = 0
  /** 완성점(4)을 가진 쪽 — 막히면 '휴…' */
  private pendingFour: Stone = STONE.Empty

  constructor(host: GameHost, mode: OmokMode) {
    this.host = host
    this.mode = mode
    this.rng = mulberry32(randomSeed())
    this.board = createBoard()
    this.view = {
      hover: -1,
      cursor: indexOf(this.board, Math.floor(SIZE / 2), Math.floor(SIZE / 2)),
      cursorVisible: false,
      showGhost: false,
      ghost: STONE.Black,
      winOn: true,
      accent: host.character.accent.base,
    }
    this.loop = createLoop({ update: (dt) => this.update(dt), render: () => this.render() })
  }

  mount(el: HTMLElement): void {
    if (this.state !== 'created') return
    this.canvas = createPixelCanvas(LOGICAL.w, LOGICAL.h)
    this.canvas.mount(el)
    this.sprites = buildStoneSprites()
    this.pointer = attachTap(this.canvas.element, (cx, cy) => this.cellAtClient(cx, cy), {
      tap: (c, touch) => this.tap(c, touch),
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
    this.host.mascot.react('game.start')
    this.dirty = true
    this.loop.start()
  }

  pause(): void {
    if (this.state !== 'running') return
    this.state = 'paused'
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
    this.pointer?.detach()
    this.pointer = null
    this.canvas?.destroy()
    this.canvas = null
    this.state = 'destroyed'
  }

  // ---- 상태 ----

  private get vsAi(): boolean {
    return this.mode.ai !== null
  }

  /** 진행 중이고 결과 대기 중이 아님 */
  private get playable(): boolean {
    return this.state === 'running' && this.board.status === 'playing' && this.finishAfter < 0
  }

  private get humanTurn(): boolean {
    return !this.vsAi || this.board.turn === STONE.Black
  }

  private sideName(p: Player): string {
    if (!this.vsAi) return NAME[p]
    return p === STONE.Black ? '나' : '컴퓨터'
  }

  // ---- 입력 ----

  private cellAtClient(clientX: number, clientY: number): number {
    const p = this.canvas?.toLogical(clientX, clientY)
    return p ? cellAt(p.x, p.y) : -1
  }

  private hover(cell: number): void {
    if (cell === this.view.hover) return
    this.view.hover = cell
    if (cell >= 0) this.view.cursorVisible = false
    this.dirty = true
  }

  /** 마우스 클릭 = 착수. 터치 = 첫 탭은 커서, 같은 곳 두 번째 탭이 착수 */
  private tap(cell: number, touch: boolean): void {
    if (cell < 0) return
    if (!this.playable || !this.humanTurn) {
      this.host.audio.play('deny')
      return
    }
    if (touch && !(this.view.cursorVisible && this.view.cursor === cell)) {
      this.view.cursor = cell
      this.view.cursorVisible = true
      this.view.hover = -1
      this.idleMs = 0
      this.host.audio.play('select')
      this.dirty = true
      return
    }
    this.commit(cell)
  }

  private moveCursor(dx: number, dy: number): void {
    const b = this.board
    const x = Math.min(b.size - 1, Math.max(0, (this.view.cursor % b.size) + dx))
    const y = Math.min(b.size - 1, Math.max(0, Math.floor(this.view.cursor / b.size) + dy))
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
    if (input.takePress('left')) this.moveCursor(-1, 0)
    if (input.takePress('right')) this.moveCursor(1, 0)
    if (input.takePress('up')) this.moveCursor(0, -1)
    if (input.takePress('down')) this.moveCursor(0, 1)
    if (input.takePress('confirm')) {
      if (!this.view.cursorVisible) {
        // 첫 Enter 는 커서만 보여준다 (엉뚱한 곳에 두는 사고 방지)
        this.view.cursorVisible = true
        this.view.hover = -1
        this.dirty = true
      } else if (this.playable && this.humanTurn) {
        this.commit(this.view.cursor)
      } else {
        this.host.audio.play('deny')
      }
    }
  }

  // ---- 착수 → 호스트 ----

  private commit(cell: number): void {
    const before = analyze(this.board)
    this.apply(place(this.board, cell), before)
  }

  private apply(events: OmokEvent[], before: Analysis): void {
    for (const e of events) {
      switch (e.type) {
        case 'invalid':
          this.host.audio.play('deny')
          break
        case 'place':
          this.host.audio.play('drop')
          this.idleMs = 0
          this.dirty = true
          this.afterPlace(e.stone, before)
          break
        case 'win':
          this.onWin(e.stone)
          break
        case 'draw':
          this.onDraw()
          break
      }
    }
    this.pushHud()
  }

  /** 수가 놓인 뒤: 컴퓨터 예약 + 마스코트(위협/방어/좋은 수) */
  private afterPlace(stone: Player, before: Analysis): void {
    const b = this.board
    if (this.vsAi && b.status === 'playing' && b.turn === STONE.White) {
      this.aiTimer = AI_DELAY_MIN_MS + this.rng() * AI_DELAY_VAR_MS
    }
    const after = analyze(b)
    const opp = other(stone)
    const fours = after.fours[stone].length
    const gain = after.score[stone] - before.score[stone]
    const blocked =
      this.pendingFour === opp && before.fours[opp].length > 0 && after.fours[opp].length === 0
    this.pendingFour = fours > 0 ? stone : after.fours[opp].length > 0 ? opp : STONE.Empty
    if (b.status !== 'playing') return

    const m = this.host.mascot
    if (!this.vsAi) {
      const me = NAME[stone]
      const you = NAME[opp]
      if (fours >= 2) m.react('game.great', { line: `${me} 4! 막을 수 없어!` })
      else if (fours === 1) m.react('game.risky', { line: `${you}, 막아야 해!` })
      else if (blocked) m.react('game.safe', { line: '잘 막았어!' })
      else if (gain >= GOOD_GAIN) m.react('game.good', { line: `${me}, 좋은 수!` })
      return
    }
    if (stone === STONE.Black) {
      if (fours >= 2) m.react('game.great')
      else if (blocked) m.react('game.safe')
      else if (fours === 1 || gain >= GOOD_GAIN) m.react('game.good')
    } else {
      if (fours >= 2) m.react('game.risky', { line: '4가 두 개… 못 막겠어!' })
      else if (fours === 1 || gain >= GOOD_GAIN) m.react('game.risky')
    }
  }

  private onWin(stone: Player): void {
    const playerWon = this.vsAi ? stone === STONE.Black : true
    this.host.audio.play(playerWon ? 'win' : 'gameover')
    if (this.vsAi) this.host.mascot.react(playerWon ? 'game.win' : 'game.fail')
    else this.host.mascot.react('game.win', { line: `${NAME[stone]} 승리!` })
    this.beginFinish()
  }

  private onDraw(): void {
    this.host.audio.play('back')
    this.host.mascot.react('game.fail', { line: this.vsAi ? '무승부… 아깝다.' : '무승부!' })
    this.beginFinish()
  }

  private beginFinish(): void {
    this.aiTimer = -1
    this.finishAfter = FINISH_MS
    this.blinkPhase = 0
    this.view.winOn = true
    this.view.showGhost = false
    this.view.cursorVisible = false
    this.dirty = true
  }

  private finish(): void {
    const b = this.board
    this.state = 'finished'
    this.loop.stop()
    this.view.winOn = true
    this.dirty = true
    this.render()
    const result: GameResult = {
      outcome: 'lose',
      score: b.moves,
      durationMs: this.elapsed,
      stats: { moves: b.moves },
    }
    if (b.status === 'won') {
      if (this.vsAi) result.outcome = b.winner === STONE.Black ? 'win' : 'lose'
      else {
        result.outcome = 'win'
        result.title = `${NAME[b.winner as Player]} 승리!`
      }
    } else {
      result.title = '무승부'
      result.tone = 'neutral'
    }
    if (result.outcome !== 'win') result.scoreLabel = '총 착수'
    this.host.finish(result)
  }

  private aiMove(): void {
    if (!this.mode.ai || !this.playable || this.board.turn !== STONE.White) return
    const m = chooseMove(this.board, STONE.White, this.mode.ai, this.rng)
    if (m >= 0) this.commit(m)
  }

  private pushHud(): void {
    const b = this.board
    let turn: string
    if (b.status === 'won') turn = `${this.sideName(b.winner as Player)} 승`
    else if (b.status === 'draw') turn = '무승부'
    else if (this.vsAi && b.turn === STONE.White) turn = this.aiTimer >= 0 ? '컴퓨터…' : '컴퓨터 ○'
    else turn = `${this.sideName(b.turn)} ${MARK[b.turn]}`
    this.lastSecond = Math.floor(this.elapsed / 1000)
    this.host.setHUD({ turn, moves: b.moves, time: formatClock(this.elapsed) })
  }

  private restart(): void {
    this.board = createBoard()
    this.elapsed = 0
    this.aiTimer = -1
    this.finishAfter = -1
    this.blinkPhase = 0
    this.idleMs = 0
    this.pendingFour = STONE.Empty
    this.view.hover = -1
    this.view.cursor = indexOf(this.board, Math.floor(SIZE / 2), Math.floor(SIZE / 2))
    this.view.cursorVisible = false
    this.view.winOn = true
    this.host.mascot.clear()
    this.host.audio.play('back')
    this.host.mascot.react('game.start')
    this.pushHud()
    this.dirty = true
  }

  private update(dt: number): void {
    if (this.state !== 'running') return
    this.pollKeys()
    const b = this.board

    if (this.finishAfter >= 0) {
      this.finishAfter -= dt
      const phase = Math.floor((FINISH_MS - Math.max(0, this.finishAfter)) / BLINK_MS)
      if (phase !== this.blinkPhase) {
        this.blinkPhase = phase
        this.view.winOn = phase % 2 === 0
        this.dirty = true
      }
      if (this.finishAfter < 0) {
        this.finishAfter = -1
        this.finish()
      }
      return
    }

    if (b.status === 'playing') {
      this.elapsed += dt
      if (Math.floor(this.elapsed / 1000) !== this.lastSecond) this.pushHud()
      if (this.aiTimer >= 0) {
        this.aiTimer -= dt
        if (this.aiTimer < 0) {
          this.aiTimer = -1
          this.aiMove()
        }
      } else if (this.humanTurn) {
        this.idleMs += dt
        if (this.idleMs >= THINK_IDLE_MS) {
          this.idleMs = 0
          this.host.mascot.react('game.think')
        }
      }
    }

    const showGhost = this.playable && this.humanTurn
    if (showGhost !== this.view.showGhost || this.view.ghost !== b.turn) {
      this.view.showGhost = showGhost
      this.view.ghost = b.turn
      this.dirty = true
    }
  }

  private render(): void {
    if (!this.dirty || !this.canvas || !this.sprites) return
    this.dirty = false
    drawBoard(this.canvas.ctx, this.board, this.view, this.sprites)
    this.canvas.present()
  }
}

export const omokGame: GameModule = {
  id: 'omok',
  title: '오목',
  description: '같은 돌 다섯 개를 먼저 잇는 게임',
  icon: OMOK_ICON,
  difficulties: OMOK_MODES.map((m) => ({ id: m.id, label: m.label, description: m.description })),
  defaultDifficulty: 'easy',
  hud: [
    { key: 'turn', label: '차례' },
    { key: 'moves', label: '수' },
    { key: 'time', label: '시간' },
  ],
  scoring: { betterIs: 'lower', countsWhen: 'win', format: (v) => `${v}수` },
  controls: {
    keyboard: ['←→↑↓ 커서', 'Enter/Z 착수', 'R 다시', 'Esc 일시정지'],
    mouse: ['클릭 착수', '터치는 두 번 탭'],
  },
  logical: LOGICAL,
  create(host) {
    const mode = OMOK_MODES.find((m) => m.id === host.difficulty) ?? OMOK_MODES[1]!
    return new OmokInstance(host, mode)
  },
}
