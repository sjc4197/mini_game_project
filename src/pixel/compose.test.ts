import { describe, expect, it } from 'vitest'
import {
  blit,
  bob,
  compose,
  createRaster,
  rasterOf,
  rasterToRows,
  resolveColor,
  shift,
  squash,
  validateSprite,
} from './compose'
import { PALETTE } from './palette'
import type { SpriteDef } from './types'

const accent = { base: '#FF5E5B', dark: '#C13B49', light: '#FF9E8A' }

const DOT: SpriteDef = {
  id: 'dot',
  w: 3,
  h: 2,
  palette: { a: '#FF0000', b: '$base' },
  rows: ['a.b', '.a.'],
}

const charFor = (hex: string): string =>
  ({ '#FF0000': 'a', [accent.base]: 'b', '#00FF00': 'g' })[hex] ?? '?'

describe('validateSprite', () => {
  it('정상 스프라이트는 빈 배열', () => {
    expect(validateSprite(DOT)).toEqual([])
  })
  it('행 수/행 길이/모르는 키를 잡아낸다', () => {
    expect(validateSprite({ ...DOT, rows: ['a.b'] })).toHaveLength(1)
    expect(validateSprite({ ...DOT, rows: ['a.bb', '.a.'] })[0]).toMatch(/row 0 length 4/)
    expect(validateSprite({ ...DOT, rows: ['a.z', '.a.'] })[0]).toMatch(/unknown palette key 'z'/)
  })
})

describe('resolveColor', () => {
  it('$참조는 accent/공용색으로, hex 는 대문자로', () => {
    expect(resolveColor('$base', accent)).toBe('#FF5E5B')
    expect(resolveColor('$dark', accent)).toBe('#C13B49')
    expect(resolveColor('$light', accent)).toBe('#FF9E8A')
    expect(resolveColor('$ink', accent)).toBe(PALETTE.ink)
    expect(resolveColor('$white', accent)).toBe(PALETTE.white)
    expect(resolveColor('#abcdef', accent)).toBe('#ABCDEF')
  })
})

describe('compose / blit', () => {
  it('단일 레이어: 투명은 0, 색은 등록 순서대로 인덱스', () => {
    const r = compose({
      key: 't',
      w: 3,
      h: 2,
      layers: [{ sprite: DOT, at: { x: 0, y: 0 } }],
      accent,
    })
    expect(r.colors).toEqual(['#FF0000', '#FF5E5B'])
    expect(Array.from(r.data)).toEqual([1, 0, 2, 0, 1, 0])
    expect(rasterToRows(r, charFor)).toEqual(['a.b', '.a.'])
  })
  it('오프셋과 클리핑: 음수/밖으로 나가는 부분은 버린다', () => {
    const r = compose({
      key: 't',
      w: 3,
      h: 2,
      layers: [{ sprite: DOT, at: { x: -1, y: 1 } }],
      accent,
    })
    expect(rasterToRows(r, charFor)).toEqual(['...', '.b.'])
  })
  it('레이어 순서: 나중 레이어가 위, 투명 칸은 아래를 보존', () => {
    const over: SpriteDef = { id: 'over', w: 1, h: 1, palette: { g: '#00FF00' }, rows: ['g'] }
    const r = compose({
      key: 't',
      w: 3,
      h: 2,
      layers: [
        { sprite: DOT, at: { x: 0, y: 0 } },
        { sprite: over, at: { x: 0, y: 0 } },
      ],
      accent,
    })
    expect(rasterToRows(r, charFor)).toEqual(['g.b', '.a.'])
  })
  it('clear 레이어는 투명 칸도 지운다', () => {
    const r = createRaster('t', 3, 2)
    blit(r, DOT, { x: 0, y: 0 }, accent)
    const hole: SpriteDef = { id: 'hole', w: 3, h: 1, palette: {}, rows: ['...'] }
    blit(r, hole, { x: 0, y: 0 }, accent, true)
    expect(rasterToRows(r, charFor)).toEqual(['...', '.a.'])
  })
  it('같은 색은 레이어가 달라도 한 번만 등록된다', () => {
    const r = compose({
      key: 't',
      w: 2,
      h: 1,
      layers: [
        {
          sprite: { id: 'x', w: 1, h: 1, palette: { q: '#ff0000' }, rows: ['q'] },
          at: { x: 0, y: 0 },
        },
        {
          sprite: { id: 'y', w: 1, h: 1, palette: { z: '#FF0000' }, rows: ['z'] },
          at: { x: 1, y: 0 },
        },
      ],
    })
    expect(r.colors).toEqual(['#FF0000'])
    expect(Array.from(r.data)).toEqual([1, 1])
  })
})

describe('squash / shift / bob', () => {
  const tall: SpriteDef = {
    id: 'tall',
    w: 1,
    h: 4,
    palette: { a: '#FF0000' },
    rows: ['a', '.', 'a', 'a'],
  }
  const base = () => rasterOf(tall, accent)

  it('squash: 지정 행이 사라지고 위쪽이 한 칸 내려온다, 아래쪽은 그대로', () => {
    expect(rasterToRows(squash(base(), 2), charFor)).toEqual(['.', 'a', '.', 'a'])
    expect(squash(base(), 2).key).toBe('sprite:tall~squash')
  })
  it('shift/bob: 밖으로 나가면 버린다', () => {
    expect(rasterToRows(shift(base(), 0, 1), charFor)).toEqual(['.', 'a', '.', 'a'])
    expect(rasterToRows(bob(base()), charFor)).toEqual(['.', 'a', 'a', '.'])
  })
})
