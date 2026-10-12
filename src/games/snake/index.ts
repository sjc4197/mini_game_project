import { createLoop, type Loop } from '@/app/loop'
import { createPixelCanvas, type PixelCanvas } from '@/lib/canvas'
import { formatClock, formatNumber } from '@/lib/format'
import { mulberry32, randomSeed, type Rng } from '@/lib/rng'
import { SNAKE_ICON } from '../icons'
import type { GameHost, GameInstance, GameInstanceState, GameModule } from '../types'
import { attachSwipe, type SwipeHandle } from './input'
import { createGame, indexOf, tick, turn, xyOf } from './logic'
import { LOGICAL, drawGame, type SnakeView } from './render'
import { buildSnakeSprites, type SnakeSprites } from './sprites'
import {
  DIR_VECTORS,
  SNAKE_SPEEDS,
  type Dir,
  type SnakeEvent,
  type SnakeSpeed,
  type SnakeState,
} from './types'

/** 죽음 연출(회색 몸 + 빨간 머리) 시간 → 그 뒤 결과창 */
const DEATH_MS = 700
/** 먹을 때 머리 플래시 */
const FLASH_MS = 120
/** 무입력 '음…' (ready 포함) */
const THINK_IDLE_MS = 8_000
/** 먹이 n개마다 good / great */
const GOOD_EVERY = 5
const GREAT_EVERY = 10
/** 진행 방향 앞 이 칸 안에 벽·몸이 있으면 '조심…' */
const RISKY_AHEAD = 2

const DIRS: readonly Dir[] = ['left', 'right', 'up', 'down']

class SnakeInstance implements GameInstance {
  state: GameInstanceState = 'created'
  game: SnakeState
  readonly view: SnakeView
  private readonly host: GameHost
  private readonly speed: SnakeSpeed
  private readonly loop: Loop
  private rng: Rng
  private canvas: PixelCanvas | null = null
  private sprites: SnakeSprites | null = null
  private swipe: SwipeHandle | null = null
  private clock = 0
  private lastSecond = -1
  private deathTimer = -1
  private idleMs = 0
  private risky = false
  private recordFired = false

  constructor(host: GameHost, speed: SnakeSpeed) {
    this.host = host
    this.speed = speed
    this.rng = mulberry32(randomSeed())
    this.game = createGame({ speed, rng: this.rng })
    this.view = { now: 0, flashUntil: 0, deadT: -1, accent: host.character.accent }
    this.loop = createLoop({ update: (dt) => this.update(dt), render: () => this.render() })
  }

  mount(el: HTMLElement): void {
    if (this.state !== 'created') return
    this.canvas = createPixelCanvas(LOGICAL.w, LOGICAL.h)
    this.canvas.mount(el)
    this.sprites = buildSnakeSprites()
    this.swipe = attachSwipe(this.canvas.element, (dir) => this.steer(dir))
    this.state = 'mounted'
    this.render()
  }

  start(): void {
    if (this.state !== 'mounted') return
    this.state = 'running'
    this.pushHud()
    this.host.mascot.react('game.start', { line: '방향키를 누르면 출발!' })
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
    this.swipe?.detach()
    this.swipe = null
    this.canvas?.destroy()
    this.canvas = null
    this.state = 'destroyed'
  }

  // ---- 입력 ----

  /** 스와이프/드래그 방향 (키 입력과 같은 경로) */
  private steer(dir: Dir): void {
    if (this.state !== 'running' || this.deathTimer >= 0) return
    this.idleMs = 0
    this.apply(turn(this.game, dir))
  }

  private pollKeys(): SnakeEvent[] {
    const { input } = this.host
    const ev: SnakeEvent[] = []
    for (const d of DIRS) {
      if (input.takePress(d)) {
        this.idleMs = 0
        ev.push(...turn(this.game, d))
      }
    }
    return ev
  }

  // ---- 이벤트 → 호스트 ----

  private apply(events: SnakeEvent[]): void {
    const { audio, mascot } = this.host
    let hud = false
    for (const e of events) {
      switch (e.type) {
        case 'start':
          audio.play('confirm')
          break
        case 'move':
          this.checkAhead()
          break
        case 'eat':
          audio.play('flag')
          this.view.flashUntil = this.clock + FLASH_MS
          hud = true
          if (this.game.eaten % GREAT_EVERY === 0)
            mascot.react('game.great', { line: `${this.game.eaten}개째! 대단해!` })
          else if (this.game.eaten % GOOD_EVERY === 0) mascot.react('game.good')
          this.checkRecord()
          break
        case 'speedup':
          audio.play('clear')
          mascot.react('game.good', { line: '더 빨라졌어!', priority: 2 })
          break
        case 'die':
          audio.play('boom')
          mascot.react('game.fail')
          this.deathTimer = DEATH_MS
          this.view.deadT = 0
          hud = true
          break
        case 'win':
          audio.play('win')
          mascot.react('game.win')
          this.deathTimer = DEATH_MS
          hud = true
          break
        default:
          break
      }
    }
    if (hud) this.pushHud()
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

  /** 앞 RISKY_AHEAD 칸에 벽·몸이 있으면 '조심…', 벗어나면 '휴…' */
  private checkAhead(): void {
    const g = this.game
    const [dx, dy] = DIR_VECTORS[g.dir]
    const [hx, hy] = xyOf(g, g.body[0]!)
    let blocked = false
    for (let k = 1; k <= RISKY_AHEAD && !blocked; k++) {
      const x = hx + dx * k
      const y = hy + dy * k
      if (x < 0 || y < 0 || x >= g.cols || y >= g.rows) blocked = true
      else {
        const cell = indexOf(g, x, y)
        for (let i = 0; i < g.body.length - 1; i++) {
          if (g.body[i] === cell) {
            blocked = true
            break
          }
        }
      }
    }
    if (blocked && !this.risky) {
      this.risky = true
      this.host.mascot.react('game.risky')
    } else if (!blocked && this.risky) {
      this.risky = false
      this.host.mascot.react('game.safe')
    }
  }

  private pushHud(): void {
    const g = this.game
    this.lastSecond = Math.floor(g.elapsedMs / 1000)
    this.host.setHUD({
      score: formatNumber(g.score),
      length: g.body.length + g.grow,
      time: formatClock(g.elapsedMs),
    })
  }

  private restart(): void {
    this.rng = mulberry32(randomSeed())
    this.game = createGame({ speed: this.speed, rng: this.rng })
    this.deathTimer = -1
    this.view.deadT = -1
    this.view.flashUntil = 0
    this.idleMs = 0
    this.risky = false
    this.recordFired = false
    this.host.mascot.clear()
    this.host.audio.play('back')
    this.host.mascot.react('game.start', { line: '방향키를 누르면 출발!' })
    this.pushHud()
  }

  private finish(): void {
    const g = this.game
    this.state = 'finished'
    this.loop.stop()
    this.render()
    this.host.finish({
      outcome: g.status === 'won' ? 'win' : 'lose',
      score: g.score,
      durationMs: g.elapsedMs,
      stats: { length: g.body.length + g.grow, eaten: g.eaten },
    })
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

    if (this.deathTimer >= 0) {
      this.deathTimer -= dt
      if (g.status === 'dead') this.view.deadT = Math.min(1, 1 - this.deathTimer / DEATH_MS)
      if (this.deathTimer < 0) {
        this.deathTimer = -1
        this.finish()
      }
      return
    }

    const events = this.pollKeys()
    events.push(...tick(g, dt, this.rng))
    this.apply(events)
    if (this.deathTimer >= 0) return

    this.idleMs += dt
    if (this.idleMs >= THINK_IDLE_MS) {
      this.idleMs = 0
      this.host.mascot.react('game.think', g.status === 'ready' ? { line: '출발 안 해…?' } : {})
    }
    if (Math.floor(g.elapsedMs / 1000) !== this.lastSecond) this.pushHud()
  }

  private render(): void {
    if (!this.canvas || !this.sprites) return
    drawGame(this.canvas.ctx, this.game, this.view, this.sprites)
    this.canvas.present()
  }
}

export const snakeGame: GameModule = {
  id: 'snake',
  title: '스네이크',
  description: '츄르를 먹고 길어지는 뱀 고양이',
  icon: SNAKE_ICON,
  difficulties: SNAKE_SPEEDS.map((d) => ({ id: d.id, label: d.label, description: d.description })),
  defaultDifficulty: 'normal',
  hud: [
    { key: 'score', label: '점수' },
    { key: 'length', label: '길이' },
    { key: 'time', label: '시간' },
  ],
  scoring: { betterIs: 'higher', countsWhen: 'any', format: (v) => formatNumber(v) },
  controls: {
    keyboard: ['←→↑↓ 방향 (첫 입력이 출발)', 'R 다시', 'Esc 일시정지'],
    mouse: ['드래그/스와이프 방향'],
  },
  touchControls: [
    { type: 'key', id: 'left', label: '◀', code: 'ArrowLeft' },
    { type: 'key', id: 'up', label: '▲', code: 'ArrowUp' },
    { type: 'key', id: 'down', label: '▼', code: 'ArrowDown' },
    { type: 'key', id: 'right', label: '▶', code: 'ArrowRight' },
  ],
  logical: LOGICAL,
  create(host) {
    const d = SNAKE_SPEEDS.find((x) => x.id === host.difficulty) ?? SNAKE_SPEEDS[1]!
    return new SnakeInstance(host, d)
  },
}
