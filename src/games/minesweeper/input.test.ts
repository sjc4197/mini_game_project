import { describe, expect, it, vi } from 'vitest'
import { createPointerMachine, type PointerActions } from './input'

function harness() {
  const log: string[] = []
  const a: PointerActions = {
    primary: (c) => log.push(`primary:${c}`),
    secondary: (c) => log.push(`secondary:${c}`),
    chord: (c) => log.push(`chord:${c}`),
    pressStart: (c, chord) => log.push(`press:${c}:${chord ? 'chord' : 'single'}`),
    pressMove: (c) => log.push(`move:${c}`),
    pressCancel: () => log.push('cancel'),
    hover: (c) => log.push(`hover:${c}`),
  }
  return { m: createPointerMachine(a), log, spy: vi.fn() }
}

describe('포인터 상태기계', () => {
  it('좌클릭: 누름 표시 → 떼면 primary', () => {
    const { m, log } = harness()
    m.handle('down', 1, 5)
    m.handle('up', 0, 5)
    expect(log).toEqual(['press:5:single', 'cancel', 'primary:5'])
  })
  it('누른 채 움직이면 pressMove, 안 누르면 hover', () => {
    const { m, log } = harness()
    m.handle('move', 0, 3)
    m.handle('down', 1, 3)
    m.handle('move', 1, 4)
    m.handle('up', 0, 4)
    expect(log).toEqual(['hover:3', 'press:3:single', 'move:4', 'cancel', 'primary:4'])
  })
  it('우클릭 단독: 누르는 즉시 secondary, 떼도 primary 없음', () => {
    const { m, log } = harness()
    m.handle('down', 2, 7)
    m.handle('up', 0, 7)
    expect(log).toEqual(['secondary:7'])
  })
  it('좌+우 동시: 코드 1회, 둘 중 먼저 떼는 순간 실행, 나중 release 는 무시', () => {
    const { m, log } = harness()
    m.handle('down', 1, 9)
    m.handle('move', 3, 9) // 우 추가 (pointermove 로 buttons 만 변함)
    m.handle('move', 1, 9) // 우 release
    m.handle('up', 0, 9)
    expect(log).toEqual(['press:9:single', 'press:9:chord', 'cancel', 'chord:9'])
  })
  it('우를 먼저 누르고 좌를 추가해도 코드 (깃발은 우 단독 press 때 1회)', () => {
    const { m, log } = harness()
    m.handle('down', 2, 9)
    m.handle('move', 3, 9)
    m.handle('up', 2, 9) // 좌 release
    m.handle('up', 0, 9)
    expect(log).toEqual(['secondary:9', 'press:9:chord', 'cancel', 'chord:9'])
  })
  it('가운데 버튼: 코드', () => {
    const { m, log } = harness()
    m.handle('down', 4, 2)
    m.handle('up', 0, 2)
    expect(log).toEqual(['press:2:chord', 'cancel', 'chord:2'])
  })
  it('창 blur(reset) 는 누름을 취소하고 아무 동작도 실행하지 않는다', () => {
    const { m, log } = harness()
    m.handle('down', 1, 1)
    m.reset()
    m.handle('up', 0, 1)
    expect(log).toEqual(['press:1:single', 'cancel'])
  })
  it('보드 밖(-1)에서 떼면 primary(-1) — 호출 측이 무시', () => {
    const { m, log } = harness()
    m.handle('down', 1, 1)
    m.handle('move', 1, -1)
    m.handle('up', 0, -1)
    expect(log).toEqual(['press:1:single', 'move:-1', 'cancel', 'primary:-1'])
  })
})
