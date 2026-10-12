import { DEFAULT_GAIN, type SfxRecipe } from './sfx'

/** 재생 중인 보이스 핸들 */
export interface Voice {
  readonly endsAt: number
  stop(): void
}

const ATTACK = 0.003
const RELEASE = 0.012
const noiseBuffers = new WeakMap<AudioContext, AudioBuffer>()

function noiseBuffer(ctx: AudioContext): AudioBuffer {
  let buf = noiseBuffers.get(ctx)
  if (!buf) {
    buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    noiseBuffers.set(ctx, buf)
  }
  return buf
}

/**
 * 레시피 1개 재생: 소스(오실레이터 또는 노이즈+로우패스) → 게인 엔벨로프 → out.
 * 스텝은 시작 시각부터 순서대로 스케줄되므로 메인 스레드가 바빠도 타이밍이 흔들리지 않는다.
 */
export function playRecipe(
  ctx: AudioContext,
  out: AudioNode,
  recipe: SfxRecipe,
  at = ctx.currentTime,
): Voice {
  const total = recipe.steps.reduce((s, step) => s + step.ms, 0) / 1000
  const end = at + total
  const peak = recipe.gain ?? DEFAULT_GAIN

  const env = ctx.createGain()
  env.gain.setValueAtTime(0, at)
  env.gain.linearRampToValueAtTime(peak, at + ATTACK)
  env.gain.setValueAtTime(peak, Math.max(at + ATTACK, end - RELEASE))
  env.gain.linearRampToValueAtTime(0, end)
  env.connect(out)

  let source: AudioScheduledSourceNode
  if (recipe.wave === 'noise') {
    const src = ctx.createBufferSource()
    src.buffer = noiseBuffer(ctx)
    src.loop = true
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.Q.value = 0.7
    schedule(filter.frequency, recipe, at)
    src.connect(filter)
    filter.connect(env)
    source = src
  } else {
    const osc = ctx.createOscillator()
    osc.type = recipe.wave
    schedule(osc.frequency, recipe, at)
    osc.connect(env)
    source = osc
  }
  source.start(at)
  source.stop(end + 0.02)
  source.addEventListener('ended', () => {
    source.disconnect()
    env.disconnect()
  })

  return {
    endsAt: end,
    stop() {
      try {
        source.stop()
      } catch {
        /* 이미 멈춤 */
      }
    },
  }
}

function schedule(param: AudioParam, recipe: SfxRecipe, at: number): void {
  let t = at
  for (const step of recipe.steps) {
    const dur = step.ms / 1000
    param.setValueAtTime(step.freq, t)
    if (step.slide && step.slide > 0 && step.slide !== 1) {
      param.exponentialRampToValueAtTime(Math.max(1, step.freq * step.slide), t + dur)
    }
    t += dur
  }
}
