import { describe, expect, it } from 'vitest'
import { validateSprite } from '@/pixel/compose'
import { MOODS } from '@/pixel/types'
import {
  CHARACTERS,
  DEFAULT_LINES,
  getCharacter,
  getLines,
  buildCharacterClips,
  faceOf,
  registerGameLines,
} from './index'
import { DOTS, SPARKLE_A, SPARKLE_B, SWEAT } from './extras'
import { FACES, FACE_KEYS } from './faces'
import { overlongLines } from './lines'

describe('스프라이트 정의 검증', () => {
  it('공용 얼굴 7종 + 부속 전부 행 길이/팔레트 OK', () => {
    for (const key of FACE_KEYS) expect(validateSprite(FACES[key]), key).toEqual([])
    for (const s of [SWEAT, SPARKLE_A, SPARKLE_B, ...DOTS])
      expect(validateSprite(s), s.id).toEqual([])
  })
  it.each(CHARACTERS.map((c) => [c.id, c] as const))(
    '%s: 몸통 24×24, 오버라이드 얼굴, 기준점',
    (_id, c) => {
      expect(c.body.w).toBe(32)
      expect(c.body.h).toBe(24)
      expect(validateSprite(c.body)).toEqual([])
      for (const [key, face] of Object.entries(c.faces ?? {})) {
        expect(validateSprite(face!), `${c.id} face ${key}`).toEqual([])
        expect([face!.w, face!.h]).toEqual([12, 4])
      }
      for (const p of ['face', 'side', 'head', 'think'] as const)
        expect(c.body.points[p]).toBeDefined()
      // 얼굴 타일이 몸통 안에 들어가야 한다
      const f = c.body.points.face
      expect(f.x).toBeGreaterThanOrEqual(0)
      expect(f.x + 12).toBeLessThanOrEqual(32)
      expect(f.y + 4).toBeLessThanOrEqual(24)
    },
  )
})

describe('클립 합성', () => {
  it.each(CHARACTERS.map((c) => [c.id, c] as const))(
    '%s: 무드 6종, 32×32, 프레임 수/fps',
    (_id, c) => {
      const clips = buildCharacterClips(c)
      for (const mood of MOODS) {
        const clip = clips[mood]
        expect(clip.frames.length, mood).toBeGreaterThanOrEqual(2)
        for (const f of clip.frames) {
          expect([f.w, f.h]).toEqual([32, 32])
          expect(f.colors.length).toBeGreaterThan(2)
        }
      }
      expect(clips.idle.frames).toHaveLength(8)
      expect(clips.think.frames).toHaveLength(3)
      expect(clips.idle.fps).toBe(2)
    },
  )
  it('idle 2번째 포즈(squash): 발(마지막 행)은 고정, 귀 끝은 1dp 내려온다', () => {
    const frames = buildCharacterClips(getCharacter('cheese')).idle.frames
    const row = (r: (typeof frames)[number], y: number) =>
      Array.from(r.data.subarray(y * 32, y * 32 + 32))
    expect(row(frames[1]!, 30)).toEqual(row(frames[0]!, 30))
    expect(row(frames[1]!, 12)).toEqual(row(frames[0]!, 11))
  })
  it('털색은 캐릭터마다 다르고 외곽선(잉크)은 공통', () => {
    const fills = new Set<string>()
    for (const c of CHARACTERS) {
      const f = buildCharacterClips(c).idle.frames[0]!
      expect(f.colors).toContain('#0D1020')
      fills.add(c.body.palette.r as string)
    }
    expect(fills.size).toBe(CHARACTERS.length)
  })
  it('faceOf: 오버라이드가 있으면 그것, 없으면 공용', () => {
    expect(faceOf(getCharacter('siam'), 'idle').id).toBe('siam.face.idle')
    expect(faceOf(getCharacter('cheese'), 'sad').id).toBe('face.sad')
    expect(faceOf(getCharacter('milk'), 'win').id).toBe('face.win')
  })
})

describe('대사', () => {
  it('모든 대사는 24자 이하 (말풍선 2줄)', () => {
    for (const c of CHARACTERS) expect(overlongLines(c.lines), c.id).toEqual([])
    expect(overlongLines(DEFAULT_LINES)).toEqual([])
  })
  it('캐릭터마다 게임 이벤트 대사가 전부 있다', () => {
    const keys = [
      'game.start',
      'game.good',
      'game.great',
      'game.risky',
      'game.safe',
      'game.mistake',
      'game.think',
      'game.fail',
      'game.win',
      'game.record',
      'ui.idle',
      'ui.locked',
    ] as const
    for (const c of CHARACTERS)
      for (const k of keys) expect(c.lines[k]?.length, `${c.id} ${k}`).toBeGreaterThan(0)
  })
  it('getLines: 게임 전용 → 캐릭터 → 기본 순서', () => {
    const cheese = getCharacter('cheese')
    expect(getLines(cheese, 'game.win')).toBe(cheese.lines['game.win'])
    expect(getLines(cheese, 'lobby:unknown')).toEqual([])
    expect(getLines(cheese, 'lobby:locked')).toEqual(cheese.lines['lobby:locked'])
    registerGameLines('tetris', { cheese: { 'game.great': ['테트리스!'] } })
    expect(getLines(cheese, 'game.great', 'tetris')).toEqual(['테트리스!'])
    expect(getLines(cheese, 'game.great')).toBe(cheese.lines['game.great'])
  })
  it('getCharacter: 모르는 id 는 기본 캐릭터', () => {
    expect(getCharacter(null).id).toBe('cheese')
    expect(getCharacter('nope').id).toBe('cheese')
    expect(getCharacter('siam').id).toBe('siam')
  })
})
