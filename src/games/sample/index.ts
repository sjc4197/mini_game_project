import { createLoop, type Loop } from '@/app/loop'
import { createPixelCanvas, type PixelCanvas } from '@/lib/canvas'
import { formatClock } from '@/lib/format'
import { clamp } from '@/lib/math'
import { PALETTE } from '@/pixel/palette'
import { STAR_ICON } from '../icons'
import type { GameHost, GameInstance, GameInstanceState, GameModule, Outcome } from '../types'

/**
 * 샘플 게임 — 호스트 계약 검증용 더미 (DEV 전용). 새 게임을 만들 때 이 폴더를 복사해서 시작한다.
 * 방향키로 점을 움직이고 Space 로 점수를 올린다. 목표 점수에 닿으면 클리어.
 */
const W = 160
const H = 120
const SPEED = 60 // dp/s

interface SampleSettings {
  target: number
}

const SETTINGS: Record<string, SampleSettings> = {
  easy: { target: 10 },
  hard: { target: 20 },
}

class SampleInstance implements GameInstance {
  state: GameInstanceState = 'created'
  private canvas: PixelCanvas | null = null
  private readonly loop: Loop
  private x = W / 2
  private y = H / 2
  private score = 0
  private elapsed = 0
  private lastSecond = -1

  private readonly host: GameHost
  private readonly target: number

  constructor(host: GameHost, target: number) {
    this.host = host
    this.target = target
    this.loop = createLoop({ update: (dt) => this.update(dt), render: () => this.render() })
  }

  mount(el: HTMLElement): void {
    if (this.state !== 'created') return
    this.canvas = createPixelCanvas(W, H)
    this.canvas.mount(el)
    this.state = 'mounted'
    this.render()
  }

  start(): void {
    if (this.state !== 'mounted') return
    this.state = 'running'
    this.host.setHUD({ score: 0, time: '00:00' })
    this.host.mascot.react('game.start')
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

  private update(dt: number): void {
    const { input } = this.host
    const d = (SPEED * dt) / 1000
    if (input.isDown('left')) this.x -= d
    if (input.isDown('right')) this.x += d
    if (input.isDown('up')) this.y -= d
    if (input.isDown('down')) this.y += d
    this.x = clamp(this.x, 4, W - 4)
    this.y = clamp(this.y, 4, H - 4)

    if (input.takePress('hardDrop')) {
      this.score++
      this.host.setHUD({ score: this.score })
      this.host.audio.play('confirm')
      if (this.score >= this.target) {
        this.finish('win')
        return
      }
      if (this.score % 3 === 0) this.host.mascot.react('game.good')
    }

    this.elapsed += dt
    const s = Math.floor(this.elapsed / 1000)
    if (s !== this.lastSecond) {
      this.lastSecond = s
      this.host.setHUD({ time: formatClock(this.elapsed) })
    }
  }

  private finish(outcome: Outcome): void {
    this.state = 'finished'
    this.loop.stop()
    this.render()
    this.host.mascot.react(outcome === 'win' ? 'game.win' : 'game.fail')
    this.host.finish({ outcome, score: this.score, durationMs: this.elapsed })
  }

  private render(): void {
    const c = this.canvas
    if (!c) return
    const { ctx } = c
    ctx.fillStyle = PALETTE['bg-0']
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = PALETTE['bg-1']
    for (let x = 0; x < W; x += 16) ctx.fillRect(x, 0, 1, H)
    for (let y = 0; y < H; y += 16) ctx.fillRect(0, y, W, 1)
    // 목표 진행 바
    ctx.fillStyle = PALETTE['bg-3']
    ctx.fillRect(4, H - 6, W - 8, 2)
    ctx.fillStyle = this.host.character.accent.base
    ctx.fillRect(4, H - 6, Math.round(((W - 8) * this.score) / this.target), 2)
    // 점 (캐릭터 accent 색 + 잉크 외곽선)
    const px = Math.round(this.x) - 4
    const py = Math.round(this.y) - 4
    ctx.fillStyle = PALETTE.ink
    ctx.fillRect(px - 1, py - 1, 10, 10)
    ctx.fillStyle = this.host.character.accent.base
    ctx.fillRect(px, py, 8, 8)
    ctx.fillStyle = this.host.character.accent.light
    ctx.fillRect(px + 1, py + 1, 3, 2)
    c.present()
  }
}

export const sampleGame: GameModule = {
  id: 'sample',
  title: '샘플',
  description: '호스트 연결 확인용 미니 데모',
  icon: STAR_ICON,
  difficulties: [
    { id: 'easy', label: '쉬움', description: '목표 10점' },
    { id: 'hard', label: '어려움', description: '목표 20점' },
  ],
  defaultDifficulty: 'easy',
  hud: [
    { key: 'score', label: '점수' },
    { key: 'time', label: '시간' },
  ],
  scoring: { betterIs: 'higher', countsWhen: 'any', format: (v) => String(v) },
  controls: { keyboard: ['←→↑↓ 이동', 'Space 점수 +1', 'Esc 일시정지'] },
  logical: { w: W, h: H },
  devOnly: true,
  create(host) {
    return new SampleInstance(host, (SETTINGS[host.difficulty] ?? SETTINGS.easy!).target)
  },
}
