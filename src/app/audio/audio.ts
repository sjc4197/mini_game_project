import type { SfxName } from '@/games/types'
import { MAX_VOICES, SFX } from './sfx'
import { playRecipe, type Voice } from './synth'

/**
 * WebAudio 효과음 서비스. 브라우저 자동재생 정책 때문에 AudioContext 는 첫 사용자 제스처(pointerdown/keydown,
 * capture 단계) 안에서 동기로 만들고 resume 한다 — 그래서 그 제스처가 일으킨 첫 효과음부터 들린다.
 * master.gain = sound ? volume : 0. 동시 발음 MAX_VOICES, 넘치면 가장 오래된 보이스를 끊는다.
 */
export class AudioService {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private voices: Voice[] = []
  private sound = true
  private volume = 0.8
  private installed = false

  get ready(): boolean {
    return this.ctx !== null && this.ctx.state === 'running'
  }

  install(target: Window = window): void {
    if (this.installed) return
    this.installed = true
    const unlock = (): void => {
      this.unlock()
      if (this.ready) {
        target.removeEventListener('pointerdown', unlock, true)
        target.removeEventListener('keydown', unlock, true)
      }
    }
    target.addEventListener('pointerdown', unlock, true)
    target.addEventListener('keydown', unlock, true)
  }

  /** 제스처 핸들러 안에서 호출해야 한다 */
  unlock(): void {
    try {
      if (!this.ctx) {
        const Ctor =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        if (!Ctor) return
        this.ctx = new Ctor()
        this.master = this.ctx.createGain()
        this.master.connect(this.ctx.destination)
        this.applyGain(true)
      }
      if (this.ctx.state !== 'running') void this.ctx.resume()
    } catch {
      this.ctx = null
      this.master = null
    }
  }

  /** 설정 반영 (store 구독에서 호출). 컨텍스트가 아직 없으면 값만 기억 */
  apply(settings: { sound: boolean; volume: number }): void {
    this.sound = settings.sound
    this.volume = Math.min(1, Math.max(0, settings.volume))
    this.applyGain(false)
  }

  play(name: SfxName): void {
    const ctx = this.ctx
    const master = this.master
    if (!ctx || !master || !this.sound) return
    const recipe = SFX[name]
    if (!recipe) return
    try {
      const now = ctx.currentTime
      this.voices = this.voices.filter((v) => v.endsAt > now)
      while (this.voices.length >= MAX_VOICES) this.voices.shift()?.stop()
      this.voices.push(playRecipe(ctx, master, recipe, now))
    } catch {
      /* 오디오 실패는 게임을 멈추지 않는다 */
    }
  }

  private applyGain(immediate: boolean): void {
    const ctx = this.ctx
    const master = this.master
    if (!ctx || !master) return
    const target = this.sound ? this.volume : 0
    const now = ctx.currentTime
    master.gain.cancelScheduledValues(now)
    if (immediate) {
      master.gain.setValueAtTime(target, now)
    } else {
      // 클릭 노이즈 없이 20ms 램프. (sound=false 일 때는 play() 자체가 건너뛰므로 램프 지연과 무관하게 무음)
      master.gain.setValueAtTime(master.gain.value, now)
      master.gain.linearRampToValueAtTime(target, now + 0.02)
    }
  }
}

export const audio = new AudioService()
