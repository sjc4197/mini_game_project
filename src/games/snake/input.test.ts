import { describe, expect, it } from 'vitest'
import { SWIPE_MIN_PX, swipeDir } from './input'

describe('swipeDir', () => {
  it('짧은 드래그는 무시', () => {
    expect(swipeDir(0, 0)).toBeNull()
    expect(swipeDir(SWIPE_MIN_PX - 1, SWIPE_MIN_PX - 1)).toBeNull()
  })
  it('더 긴 축을 따라 방향을 정한다', () => {
    expect(swipeDir(40, 5)).toBe('right')
    expect(swipeDir(-40, 5)).toBe('left')
    expect(swipeDir(3, 30)).toBe('down')
    expect(swipeDir(3, -30)).toBe('up')
    expect(swipeDir(20, 20)).toBe('right') // 같으면 가로
  })
  it('최소 거리는 인자로 바꿀 수 있다', () => {
    expect(swipeDir(8, 0, 5)).toBe('right')
    expect(swipeDir(8, 0, 10)).toBeNull()
  })
})
