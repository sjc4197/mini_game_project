import { describe, expect, it } from 'vitest'
import { createTapMachine, type TapActions } from './input'

function harness() {
  const log: string[] = []
  const a: TapActions = {
    tap: (c, touch) => log.push(`tap:${c}${touch ? ':touch' : ''}`),
    hover: (c) => log.push(`hover:${c}`),
  }
  return { m: createTapMachine(a), log }
}

describe('오목 탭 상태기계', () => {
  it('클릭: 같은 교차점에서 떼면 tap', () => {
    const { m, log } = harness()
    m.handle('down', 1, 5)
    m.handle('up', 0, 5)
    expect(log).toEqual(['hover:5', 'tap:5', 'hover:5'])
  })
  it('누른 채 다른 교차점으로 옮겨 떼면 착수 없음', () => {
    const { m, log } = harness()
    m.handle('down', 1, 5)
    m.handle('move', 1, 6)
    m.handle('up', 0, 6)
    expect(log).toEqual(['hover:5', 'hover:6'])
  })
  it('안 누르고 움직이면 hover, 보드 밖으로 나가면 hover(-1)', () => {
    const { m, log } = harness()
    m.handle('move', 0, 3)
    m.handle('move', 0, 4)
    m.handle('leave', 0, -1)
    expect(log).toEqual(['hover:3', 'hover:4', 'hover:-1'])
  })
  it('우클릭은 착수하지 않는다', () => {
    const { m, log } = harness()
    m.handle('down', 2, 7)
    m.handle('up', 0, 7)
    expect(log).toEqual(['hover:7', 'hover:7'])
  })
  it('보드 밖에서 떼면 착수 없음', () => {
    const { m, log } = harness()
    m.handle('down', 1, -1)
    m.handle('up', 0, -1)
    expect(log).toEqual(['hover:-1', 'hover:-1'])
  })
  it('터치: hover 없이 tap(touch), 떼면 hover(-1)', () => {
    const { m, log } = harness()
    m.handle('down', 1, 9, true)
    m.handle('move', 1, 9, true)
    m.handle('up', 0, 9, true)
    expect(log).toEqual(['tap:9:touch', 'hover:-1'])
  })
  it('cancel/reset 뒤의 up 은 무시', () => {
    const { m, log } = harness()
    m.handle('down', 1, 2)
    m.handle('cancel', 0, 2)
    m.handle('up', 0, 2)
    expect(log).toEqual(['hover:2', 'hover:2'])
    m.handle('down', 1, 3)
    m.reset()
    m.handle('up', 0, 3)
    expect(log).toEqual(['hover:2', 'hover:2', 'hover:3', 'hover:3'])
  })
})
