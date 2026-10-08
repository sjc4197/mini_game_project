import { bob, compose, squash } from '@/pixel/compose'
import type { Clip, Layer, Mood, Point, Raster, SpriteDef } from '@/pixel/types'
import { DOTS, SPARKLE_A, SPARKLE_B, SWEAT } from './extras'
import { FACES } from './faces'
import type { CharacterDef, FaceKey } from './types'

/** 앉은 고양이 32×32 가 놓이는 32×36 스테이지 — 위 4dp 가 반짝이/생각 점 공간 */
export const STAGE = { w: 32, h: 36, bodyAt: { x: 0, y: 4 } as Point } as const

export function faceOf(c: CharacterDef, key: FaceKey): SpriteDef {
  return c.faces?.[key] ?? FACES[key]
}

const onStage = (p: Point): Point => ({ x: STAGE.bodyAt.x + p.x, y: STAGE.bodyAt.y + p.y })

interface FrameSpec {
  face: FaceKey
  extras?: readonly { sprite: SpriteDef; point: 'side' | 'head' | 'think' }[]
}

function frame(c: CharacterDef, key: string, spec: FrameSpec): Raster {
  const layers: Layer[] = [
    { sprite: c.body, at: STAGE.bodyAt },
    { sprite: faceOf(c, spec.face), at: onStage(c.body.points.face) },
    ...(spec.extras ?? []).map((e) => ({ sprite: e.sprite, at: onStage(c.body.points[e.point]) })),
  ]
  return compose({ key, w: STAGE.w, h: STAGE.h, layers, accent: c.accent })
}

/** 2번째 포즈: squash(지정 행 위쪽이 1dp 하강 = 숨쉬기) 또는 bob(전체 1dp 상승 = 호버) */
function pose2(c: CharacterDef, a: Raster, key: string): Raster {
  return c.idle.kind === 'bob' ? bob(a, key) : squash(a, STAGE.bodyAt.y + c.idle.row, key)
}

/**
 * 무드별 클립. idle 은 2fps × 8프레임(= 4초)에 마지막 프레임만 눈 깜빡임.
 * 프레임 키는 `${id}:${mood}:${n}` — 래스터 캐시/디버그용.
 */
export function buildCharacterClips(c: CharacterDef): Record<Mood, Clip> {
  const k = (mood: Mood, n: number) => `${c.id}:${mood}:${n}`
  const clip = (mood: Mood, frames: Raster[], fps: number): Clip => ({
    id: `${c.id}:${mood}`,
    frames,
    fps,
    loop: true,
  })

  const idleA = frame(c, k('idle', 0), { face: 'idle' })
  const idleB = pose2(c, idleA, k('idle', 1))
  const blinkB = pose2(c, frame(c, `${c.id}:blink:0`, { face: 'blink' }), k('idle', 7))

  const happyA = frame(c, k('happy', 0), { face: 'happy' })
  const worriedA = frame(c, k('worried', 0), {
    face: 'worried',
    extras: [{ sprite: SWEAT, point: 'side' }],
  })
  const sadA = frame(c, k('sad', 0), { face: 'sad' })
  const winA = frame(c, k('win', 0), {
    face: 'win',
    extras: [{ sprite: SPARKLE_A, point: 'head' }],
  })
  const winB = pose2(
    c,
    frame(c, `${c.id}:win:b`, { face: 'win', extras: [{ sprite: SPARKLE_B, point: 'head' }] }),
    k('win', 1),
  )
  const think = DOTS.map((dots, i) =>
    frame(c, `${c.id}:think:src${i}`, {
      face: 'think',
      extras: [{ sprite: dots, point: 'think' }],
    }),
  )

  return {
    idle: clip('idle', [idleA, idleB, idleA, idleB, idleA, idleB, idleA, blinkB], 2),
    happy: clip('happy', [happyA, pose2(c, happyA, k('happy', 1))], 4),
    worried: clip('worried', [worriedA, pose2(c, worriedA, k('worried', 1))], 3),
    sad: clip('sad', [sadA, pose2(c, sadA, k('sad', 1))], 1),
    win: clip('win', [winA, winB], 4),
    think: clip('think', [think[0]!, pose2(c, think[1]!, k('think', 1)), think[2]!], 2),
  }
}

const cache = new Map<string, Record<Mood, Clip>>()

/** 캐릭터당 1회만 합성 (래스터 48개 미만, 각 1KB) */
export function getCharacterClips(c: CharacterDef): Record<Mood, Clip> {
  let clips = cache.get(c.id)
  if (!clips) {
    clips = buildCharacterClips(c)
    cache.set(c.id, clips)
  }
  return clips
}
