import { bob, compose, squash } from '@/pixel/compose'
import type { Clip, Layer, Mood, Point, Raster, SpriteDef } from '@/pixel/types'
import { DOTS, SPARKLE_A, SPARKLE_B, STEAM_A, STEAM_B, SWEAT } from './extras'
import { FACES } from './faces'
import type { CharacterDef, FaceKey } from './types'

/**
 * 공용 스테이지 46×43. 걷는 고양이 42×39 는 (2,4), 식빵 46×34 는 (0,9) — 둘 다 발이 맨 아랫줄에 닿아
 * 무드가 바뀌어도 캔버스 크기와 바닥선이 그대로다. 위 여백은 반짝이/생각 점/김 공간.
 */
export const STAGE = {
  w: 46,
  h: 43,
  bodyAt: { x: 2, y: 4 } as Point,
  loafAt: { x: 0, y: 9 } as Point,
} as const

/** 식빵 숨쉬기: 이 행(몸통 좌표)을 지워 위쪽이 1dp 내려온다 (앞발은 고정) */
const LOAF_SQUASH_ROW = 28

export function faceOf(c: CharacterDef, key: FaceKey): SpriteDef {
  return c.faces?.[key] ?? FACES[key]
}

const onStage = (p: Point): Point => ({ x: STAGE.bodyAt.x + p.x, y: STAGE.bodyAt.y + p.y })
const onLoaf = (p: Point): Point => ({ x: STAGE.loafAt.x + p.x, y: STAGE.loafAt.y + p.y })

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

function loafFrame(c: CharacterDef, key: string, face: FaceKey, steam: SpriteDef): Raster {
  const layers: Layer[] = [
    { sprite: c.loaf, at: STAGE.loafAt },
    { sprite: faceOf(c, face), at: onLoaf(c.loaf.points.face) },
    { sprite: steam, at: onLoaf(c.loaf.points.steam) },
  ]
  return compose({ key, w: STAGE.w, h: STAGE.h, layers, accent: c.accent })
}

/** 2번째 포즈: squash(지정 행 위쪽이 1dp 하강 = 숨쉬기) 또는 bob(전체 1dp 상승 = 호버) */
function pose2(c: CharacterDef, a: Raster, key: string): Raster {
  return c.idle.kind === 'bob' ? bob(a, key) : squash(a, STAGE.bodyAt.y + c.idle.row, key)
}

/**
 * 무드별 클립. idle 은 2fps × 8프레임(= 4초)에 마지막 프레임만 눈 깜빡임.
 * loaf(식빵) 는 김이 A/B 로 흔들리며 숨쉬기, 4번째 프레임에 깜빡임.
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

  const loafRow = STAGE.loafAt.y + LOAF_SQUASH_ROW
  const loafA = loafFrame(c, k('loaf', 0), 'idle', STEAM_A)
  const loafB = squash(loafFrame(c, `${c.id}:loaf:srcB`, 'idle', STEAM_B), loafRow, k('loaf', 1))
  const loafBlink = squash(
    loafFrame(c, `${c.id}:loaf:srcBlink`, 'blink', STEAM_B),
    loafRow,
    k('loaf', 3),
  )

  return {
    idle: clip('idle', [idleA, idleB, idleA, idleB, idleA, idleB, idleA, blinkB], 2),
    happy: clip('happy', [happyA, pose2(c, happyA, k('happy', 1))], 4),
    worried: clip('worried', [worriedA, pose2(c, worriedA, k('worried', 1))], 3),
    sad: clip('sad', [sadA, pose2(c, sadA, k('sad', 1))], 1),
    win: clip('win', [winA, winB], 4),
    think: clip('think', [think[0]!, pose2(c, think[1]!, k('think', 1)), think[2]!], 2),
    loaf: clip('loaf', [loafA, loafB, loafA, loafBlink], 2),
  }
}

const cache = new Map<string, Record<Mood, Clip>>()

/** 캐릭터당 1회만 합성 (래스터 50개 미만, 각 2KB) */
export function getCharacterClips(c: CharacterDef): Record<Mood, Clip> {
  let clips = cache.get(c.id)
  if (!clips) {
    clips = buildCharacterClips(c)
    cache.set(c.id, clips)
  }
  return clips
}
