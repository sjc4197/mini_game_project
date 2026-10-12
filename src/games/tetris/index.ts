import { createLoop, type Loop } from '@/app/loop'
import { createPixelCanvas, type PixelCanvas } from '@/lib/canvas'
import { formatClock, formatNumber } from '@/lib/format'
import { mulberry32, randomSeed } from '@/lib/rng'
import { TETRIS_ICON } from '../icons'
import type { GameHost, GameInstance, GameInstanceState, GameModule } from '../types'
import { createGame, start, step } from './logic'
import { PALETTE } from '@/pixel/palette'
import { LOGICAL, createTetrisRenderer, type TetrisRenderer, type TetrisView } from './render'
import {
  COLS,
  HIDDEN_ROWS,
  TETRIS_DIFFICULTIES,
  VISIBLE_ROWS,
  type StepInput,
  type TetrisDifficulty,
  type TetrisEvent,
  type TetrisState,
} from './types'

/** 게임오버 회색 덮임 시간 → 그 뒤 결과창 */
const OVER_MS = 800
/** 스택 높이 비율: 이 이상이면 '조심…', 이 이하로 내려오면 '휴…' */
const RISKY_RATIO = 0.7
const SAFE_RATIO = 0.4
/** 무입력 '음…' */
const THINK_IDLE_MS = 10_000
const FLASH_MS = 400
const ROWS_TOTAL = HIDDEN_ROWS + VISIBLE_ROWS

class TetrisInstance implements GameInstance {
  state: GameInstanceState = 'created'
  game: TetrisState
  readonly view: TetrisView = { overT: -1, now: 0, flashUntil: 0, flashColor: PALETTE.yellow }
  private readonly host: GameHost
  private readonly difficulty: TetrisDifficulty
  private readonly loop: Loop
  private canvas: PixelCanvas | null = null
  private renderer: TetrisRenderer | null = null
  private overTimer = -1
  private lastSecond = -1
  private clock = 0
  private idleMs = 0
  private risky = false
  private recordFired = false

  constructor(host: GameHost, difficulty: TetrisDifficulty) {
    this.host = host
    this.difficulty = difficulty
    this.game = this.newGame()
    this.loop = createLoop({ update: (dt) => this.update(dt), render: () => this.render() })
  }

  private newGame(): TetrisState {
    return createGame({
      startLevel: this.difficulty.startLevel,
      rng: mulberry32(randomSeed()),
      das: { ...this.host.settings.tetris },
    })
  }

  mount(el: HTMLElement): void {
    if (this.state !== 'created') return
    this.canvas = createPixelCanvas(LOGICAL.w, LOGICAL.h)
    this.canvas.mount(el)
    this.renderer = createTetrisRenderer()
    this.state = 'mounted'
    this.render()
  }

  start(): void {
    if (this.state !== 'mounted') return
    this.state = 'running'
    this.apply(start(this.game))
    this.host.mascot.react('game.start')
    this.pushHud()
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
    this.canvas?.destroy()
    this.canvas = null
    this.state = 'destroyed'
  }

  // ---- 입력 ----

  private readInput(): StepInput {
    const { input } = this.host
    const left = input.isDown('left')
    const right = input.isDown('right')
    let prefer: -1 | 0 | 1 = 0
    if (left && right) prefer = input.lastPressed('left', 'right') === 'right' ? 1 : -1
    return {
      left,
      right,
      soft: input.isDown('down'),
      prefer,
      rotateCw: input.takePress('rotateCw'),
      rotateCcw: input.takePress('rotateCcw'),
      hardDrop: input.takePress('hardDrop'),
      hold: input.takePress('hold'),
    }
  }

  // ---- 이벤트 → 호스트 ----

  private apply(events: TetrisEvent[]): void {
    const { audio, mascot } = this.host
    let hud = false
    for (const e of events) {
      switch (e.type) {
        case 'move':
          audio.play('move')
          break
        case 'rotate':
          audio.play('rotate')
          break
        case 'softdrop':
          hud = true
          break
        case 'harddrop':
          audio.play('drop')
          hud = true
          break
        case 'lock':
          audio.play('lock')
          this.checkStack()
          break
        case 'hold':
          audio.play('select')
          break
        case 'holdDenied':
          audio.play('deny')
          break
        case 'clear':
          audio.play(e.tetris ? 'tetris' : 'clear')
          if (e.tetris) this.flash(PALETTE.yellow)
          if (e.tetris) mascot.react('game.great', { line: e.b2b ? '연속 테트리스!' : '테트리스!' })
          else if (e.lines === 3) mascot.react('game.great')
          else if (e.combo >= 3) mascot.react('game.good', { line: `${e.combo} 콤보!` })
          else mascot.react('game.good')
          hud = true
          break
        case 'levelup':
          audio.play('levelup')
          this.flash(PALETTE.lime)
          mascot.react('game.good', { line: `레벨 ${e.level}!`, priority: 2 })
          hud = true
          break
        case 'over':
          audio.play('gameover')
          mascot.react('game.fail')
          this.overTimer = OVER_MS
          this.view.overT = 0
          break
        default:
          break
      }
    }
    if (hud) this.pushHud()
    this.checkRecord()
  }

  private flash(color: string): void {
    this.view.flashColor = color
    this.view.flashUntil = this.clock + FLASH_MS
  }

  /** 플레이 중 최고점을 넘는 순간 한 번 */
  private checkRecord(): void {
    if (this.recordFired) return
    const best = this.host.best
    if (best !== null && this.game.score > best) {
      this.recordFired = true
      this.host.mascot.react('game.record')
    }
  }

  /** 스택 높이(보이는 행 기준) 로 risky/safe */
  private checkStack(): void {
    const b = this.game.board
    let top = ROWS_TOTAL
    for (let y = HIDDEN_ROWS; y < ROWS_TOTAL && top === ROWS_TOTAL; y++) {
      for (let x = 0; x < COLS; x++) {
        if (b[y * COLS + x]) {
          top = y
          break
        }
      }
    }
    const height = ROWS_TOTAL - top
    const ratio = height / VISIBLE_ROWS
    if (!this.risky && ratio >= RISKY_RATIO) {
      this.risky = true
      this.host.mascot.react('game.risky')
    } else if (this.risky && ratio <= SAFE_RATIO) {
      this.risky = false
      this.host.mascot.react('game.safe')
    }
  }

  private pushHud(): void {
    const g = this.game
    this.lastSecond = Math.floor(g.elapsedMs / 1000)
    this.host.setHUD({
      score: formatNumber(g.score),
      level: g.level,
      lines: g.lines,
      time: formatClock(g.elapsedMs),
    })
  }

  private restart(): void {
    this.game = this.newGame()
    this.overTimer = -1
    this.view.overT = -1
    this.view.flashUntil = 0
    this.idleMs = 0
    this.risky = false
    this.recordFired = false
    this.host.mascot.clear()
    this.host.audio.play('back')
    this.apply(start(this.game))
    this.host.mascot.react('game.start')
    this.pushHud()
  }

  private update(dt: number): void {
    if (this.state !== 'running') return
    if (this.host.input.takePress('restart')) {
      this.restart()
      return
    }
    this.clock += dt
    this.view.now = this.clock
    const g = this.game
    if (g.phase === 'over') {
      if (this.overTimer >= 0) {
        this.overTimer -= dt
        this.view.overT = Math.min(1, 1 - this.overTimer / OVER_MS)
        if (this.overTimer < 0) {
          this.overTimer = -1
          this.state = 'finished'
          this.loop.stop()
          this.render()
          this.host.finish({
            outcome: 'lose',
            score: g.score,
            durationMs: g.elapsedMs,
            stats: {
              lines: g.lines,
              level: g.level,
              tetrises: g.stats.tetrises,
              maxCombo: Math.max(0, g.stats.maxCombo),
              pieces: g.stats.pieces,
            },
          })
        }
      }
      return
    }
    const inp = this.readInput()
    const active = inp.left || inp.right || inp.soft || inp.rotateCw || inp.rotateCcw || inp.hardDrop || inp.hold
    this.idleMs = active ? 0 : this.idleMs + dt
    if (this.idleMs >= THINK_IDLE_MS) {
      this.idleMs = 0
      this.host.mascot.react('game.think')
    }
    this.apply(step(g, dt, inp))
    if (Math.floor(g.elapsedMs / 1000) !== this.lastSecond) this.pushHud()
  }

  private render(): void {
    if (!this.canvas || !this.renderer) return
    this.renderer.draw(this.canvas.ctx, this.game, this.view)
    this.canvas.present()
  }
}

export const tetrisGame: GameModule = {
  id: 'tetris',
  title: '테트리스',
  description: '떨어지는 블록을 쌓아 줄을 지우는 게임',
  icon: TETRIS_ICON,
  difficulties: TETRIS_DIFFICULTIES.map((d) => ({ id: d.id, label: d.label, description: d.description })),
  defaultDifficulty: 'lv1',
  hud: [
    { key: 'score', label: '점수' },
    { key: 'level', label: '레벨' },
    { key: 'lines', label: '라인' },
    { key: 'time', label: '시간' },
  ],
  scoring: { betterIs: 'higher', countsWhen: 'any', format: (v) => formatNumber(v) },
  controls: {
    keyboard: ['←→ 이동', '↓ 소프트', '↑/X 시계', 'Z 반시계', 'Space 하드', 'C/Shift 홀드', 'R 다시', 'Esc 일시정지'],
  },
  logical: LOGICAL,
  create(host) {
    const d = TETRIS_DIFFICULTIES.find((x) => x.id === host.difficulty) ?? TETRIS_DIFFICULTIES[0]!
    return new TetrisInstance(host, d)
  },
}
