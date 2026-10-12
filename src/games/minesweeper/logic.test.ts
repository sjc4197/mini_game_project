import { describe, expect, it } from 'vitest'
import { mulberry32 } from '@/lib/rng'
import {
  chord,
  computeCounts,
  createBoard,
  forEachNeighbor,
  indexOf,
  neighborCount,
  placeMines,
  remainingMines,
  reveal,
  tick,
  toggleFlag,
} from './logic'
import { CELL, MS_DIFFICULTIES, type MsBoard } from './types'

/** '*' 지뢰, '.' 안전. 배치를 건너뛰고 playing 상태로 */
function boardFromRows(rows: readonly string[]): MsBoard {
  const cols = rows[0]!.length
  let mines = 0
  for (const r of rows) for (const ch of r) if (ch === '*') mines++
  const b = createBoard({ cols, rows: rows.length, mines }, mulberry32(1))
  rows.forEach((r, y) => [...r].forEach((ch, x) => (b.mines[indexOf(b, x, y)] = ch === '*' ? 1 : 0)))
  computeCounts(b)
  b.status = 'playing'
  return b
}

const revealedSet = (b: MsBoard): number[] => {
  const out: number[] = []
  for (let i = 0; i < b.state.length; i++) if (b.state[i] === CELL.Revealed) out.push(i)
  return out
}

/** 세로 지뢰 벽: 0열·1열은 왼쪽 영역, 3열은 오른쪽 영역 */
const WALL = ['..*.', '..*.', '..*.', '..*.']

describe('① 난이도', () => {
  it('초급 9×9/10, 중급 16×16/40, 고급 30×16/99', () => {
    expect(MS_DIFFICULTIES.map((d) => [d.cols, d.rows, d.mines])).toEqual([
      [9, 9, 10],
      [16, 16, 40],
      [30, 16, 99],
    ])
    const b = createBoard(MS_DIFFICULTIES[2]!, mulberry32(1))
    expect(b.state.length).toBe(480)
    expect(b.status).toBe('ready')
  })
})

describe('② 지뢰 배치', () => {
  it.each([
    ['내부', 4, 4],
    ['가장자리', 0, 4],
    ['모서리', 8, 8],
  ])('%s 클릭: 지뢰 수 정확, 3×3 안전, 시드 결정성', (_n, x, y) => {
    const d = MS_DIFFICULTIES[0]!
    const a = createBoard(d, mulberry32(123))
    const safe = indexOf(a, x, y)
    placeMines(a, safe)
    let n = 0
    for (const m of a.mines) n += m
    expect(n).toBe(10)
    expect(a.mines[safe]).toBe(0)
    forEachNeighbor(a, safe, (j) => expect(a.mines[j]).toBe(0))
    const b = createBoard(d, mulberry32(123))
    placeMines(b, safe)
    expect(Array.from(b.mines)).toEqual(Array.from(a.mines))
    const c = createBoard(d, mulberry32(124))
    placeMines(c, safe)
    expect(Array.from(c.mines)).not.toEqual(Array.from(a.mines))
  })
})

describe('③ 숫자 계산', () => {
  it('무작위 보드 100개의 counts 가 brute-force 와 같다', () => {
    const rng = mulberry32(7)
    for (let t = 0; t < 100; t++) {
      const d = MS_DIFFICULTIES[t % 3]!
      const b = createBoard(d, rng)
      placeMines(b, Math.floor(rng() * b.state.length))
      for (let i = 0; i < b.state.length; i++) {
        const [x, y] = [i % b.cols, Math.floor(i / b.cols)]
        let n = 0
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue
            const xx = x + dx
            const yy = y + dy
            if (xx < 0 || yy < 0 || xx >= b.cols || yy >= b.rows) continue
            n += b.mines[yy * b.cols + xx]!
          }
        expect(b.counts[i]).toBe(n)
      }
    }
  })
})

describe('④ 후보 부족 폴백', () => {
  it('3×3 제외로 모자라면 클릭 칸만 제외하고, 그래도 모자라면 가능한 만큼만', () => {
    const b = createBoard({ cols: 4, rows: 4, mines: 10 }, mulberry32(3))
    const safe = indexOf(b, 1, 1)
    placeMines(b, safe)
    let n = 0
    for (const m of b.mines) n += m
    expect(n).toBe(10)
    expect(b.mines[safe]).toBe(0)

    const tiny = createBoard({ cols: 3, rows: 3, mines: 9 }, mulberry32(3))
    placeMines(tiny, 4)
    expect(tiny.mineCount).toBe(8)
    expect(tiny.mines[4]).toBe(0)
  })
})

describe('⑤ 0칸 열기', () => {
  it('연쇄 집합이 정확하고 지뢰는 절대 안 열린다', () => {
    const b = boardFromRows(WALL)
    const ev = reveal(b, indexOf(b, 0, 0))
    expect(ev).toEqual([{ type: 'reveal', count: 8 }])
    const expected = [0, 1, 2, 3].flatMap((y) => [indexOf(b, 0, y), indexOf(b, 1, y)]).sort((a, c) => a - c)
    expect(revealedSet(b)).toEqual(expected)
    for (let i = 0; i < b.state.length; i++) if (b.mines[i]) expect(b.state[i]).toBe(CELL.Hidden)
    expect(b.revealed).toBe(8)
  })
  it('깃발은 연쇄를 막는다', () => {
    const b = boardFromRows(WALL)
    toggleFlag(b, indexOf(b, 1, 1))
    reveal(b, indexOf(b, 0, 0))
    expect(b.state[indexOf(b, 1, 1)]).toBe(CELL.Flagged)
    expect(b.revealed).toBe(7)
  })
})

describe('⑥ 숫자 칸 열기', () => {
  it('자기 자신만 열린다', () => {
    const b = boardFromRows(WALL)
    const i = indexOf(b, 1, 0)
    expect(b.counts[i]).toBe(2)
    expect(reveal(b, i)).toEqual([{ type: 'reveal', count: 1 }])
    expect(revealedSet(b)).toEqual([i])
    expect(reveal(b, i)).toEqual([]) // 이미 열린 칸은 noop
  })
})

describe('⑦ 지뢰 밟기', () => {
  it('lost · exploded · 지뢰 전부 표시 · 틀린 깃발 X · 맞는 깃발 유지', () => {
    const b = boardFromRows(WALL)
    toggleFlag(b, indexOf(b, 3, 0)) // 틀린 깃발
    toggleFlag(b, indexOf(b, 2, 3)) // 맞는 깃발
    const mine = indexOf(b, 2, 1)
    expect(reveal(b, mine)).toEqual([{ type: 'lost', index: mine }])
    expect(b.status).toBe('lost')
    expect(b.exploded).toBe(mine)
    expect(b.state[indexOf(b, 2, 0)]).toBe(CELL.Revealed)
    expect(b.state[indexOf(b, 2, 2)]).toBe(CELL.Revealed)
    expect(b.state[indexOf(b, 2, 3)]).toBe(CELL.Flagged)
    expect(b.state[indexOf(b, 3, 0)]).toBe(CELL.WrongFlag)
    expect(reveal(b, indexOf(b, 0, 0))).toEqual([])
  })
})

describe('⑧ 깃발', () => {
  it('왕복 / 열린 칸 noop / 종료 뒤 noop / 음수 카운터', () => {
    const b = boardFromRows(WALL)
    const i = indexOf(b, 3, 3)
    expect(toggleFlag(b, i)).toEqual([{ type: 'flag', on: true }])
    expect(b.flags).toBe(1)
    expect(toggleFlag(b, i)).toEqual([{ type: 'flag', on: false }])
    expect(b.flags).toBe(0)
    reveal(b, indexOf(b, 0, 0))
    expect(toggleFlag(b, indexOf(b, 0, 0))).toEqual([])
    for (const j of [indexOf(b, 3, 0), indexOf(b, 3, 1), indexOf(b, 3, 2), indexOf(b, 3, 3), indexOf(b, 2, 0)])
      toggleFlag(b, j)
    expect(remainingMines(b)).toBe(4 - 5)
    reveal(b, indexOf(b, 2, 1))
    expect(b.status).toBe('lost')
    expect(toggleFlag(b, indexOf(b, 2, 2))).toEqual([])
  })
})

describe('⑨ 코드', () => {
  it('깃발 수 일치 → 나머지 열기, 불일치 → invalid, 틀린 깃발 → lost, 0칸/숨은 칸 → 없음', () => {
    const b = boardFromRows(WALL)
    const num = indexOf(b, 1, 0) // 2
    reveal(b, num)
    expect(chord(b, indexOf(b, 3, 3))).toEqual([]) // 숨은 칸
    toggleFlag(b, indexOf(b, 2, 0))
    expect(chord(b, num)).toEqual([{ type: 'invalid' }]) // 깃발 1 ≠ 2
    expect(b.revealed).toBe(1)
    toggleFlag(b, indexOf(b, 2, 1))
    const ev = chord(b, num)
    expect(ev[0]?.type).toBe('reveal')
    expect(b.state[indexOf(b, 1, 1)]).toBe(CELL.Revealed)
    expect(b.state[indexOf(b, 0, 0)]).toBe(CELL.Revealed)
    expect(b.status).toBe('playing')
    expect(chord(b, indexOf(b, 0, 0))).toEqual([]) // 0칸

    const c = boardFromRows(WALL)
    const n2 = indexOf(c, 1, 0)
    reveal(c, n2)
    toggleFlag(c, indexOf(c, 0, 0)) // 틀린 깃발 두 개
    toggleFlag(c, indexOf(c, 0, 1))
    const lost = chord(c, n2)
    expect(lost[0]?.type).toBe('lost')
    expect(c.status).toBe('lost')
  })
})

describe('⑩ 승리', () => {
  it('마지막 안전 칸 → won + 남은 지뢰 자동 깃발', () => {
    const b = boardFromRows(['.....', '.....', '..*..', '.....', '.....'])
    const ev = reveal(b, indexOf(b, 0, 0))
    expect(ev.map((e) => e.type)).toEqual(['reveal', 'won'])
    expect(b.status).toBe('won')
    expect(b.revealed).toBe(24)
    expect(b.state[indexOf(b, 2, 2)]).toBe(CELL.Flagged)
    expect(b.flags).toBe(1)
    expect(remainingMines(b)).toBe(0)
  })
  it('코드로도 승리한다', () => {
    const b = boardFromRows(['*.', '..'])
    reveal(b, indexOf(b, 1, 1))
    toggleFlag(b, indexOf(b, 0, 0))
    const ev = chord(b, indexOf(b, 1, 1))
    expect(ev.map((e) => e.type)).toEqual(['reveal', 'won'])
    expect(b.status).toBe('won')
  })
})

describe('⑪ 첫 클릭 안전', () => {
  it('1000 시드 × 임의 첫 클릭 → 지뢰도 숫자도 아닌 0칸', () => {
    for (let seed = 1; seed <= 1000; seed++) {
      const rng = mulberry32(seed)
      const d = MS_DIFFICULTIES[seed % 3]!
      const b = createBoard(d, rng)
      const i = Math.floor(rng() * b.state.length)
      const ev = reveal(b, i)
      expect(ev[0]).toEqual({ type: 'start' })
      expect(b.status === 'playing' || b.status === 'won').toBe(true)
      expect(b.counts[i]).toBe(0)
      expect(b.state[i]).toBe(CELL.Revealed)
    }
  })
})

describe('⑫ 타이머', () => {
  it('ready 미누적 / playing 누적 / 종료 후 정지', () => {
    const b = createBoard(MS_DIFFICULTIES[0]!, mulberry32(5))
    tick(b, 1000)
    expect(b.elapsedMs).toBe(0)
    reveal(b, 40)
    tick(b, 500)
    tick(b, 250)
    expect(b.elapsedMs).toBe(750)
    const w = boardFromRows(['*.', '..'])
    reveal(w, 3)
    tick(w, 100)
    toggleFlag(w, 0)
    chord(w, 3)
    expect(w.status).toBe('won')
    tick(w, 1000)
    expect(w.elapsedMs).toBe(100)
  })
})

describe('⑬ 이웃', () => {
  it('모서리 3, 가장자리 5, 내부 8', () => {
    const b = createBoard(MS_DIFFICULTIES[0]!, mulberry32(1))
    expect(neighborCount(b, indexOf(b, 0, 0))).toBe(3)
    expect(neighborCount(b, indexOf(b, 8, 8))).toBe(3)
    expect(neighborCount(b, indexOf(b, 4, 0))).toBe(5)
    expect(neighborCount(b, indexOf(b, 0, 4))).toBe(5)
    expect(neighborCount(b, indexOf(b, 4, 4))).toBe(8)
  })
})

describe('⑭ 결정성', () => {
  it('같은 시드 + 같은 동작 스크립트 → 같은 최종 상태', () => {
    const run = () => {
      const b = createBoard(MS_DIFFICULTIES[1]!, mulberry32(2024))
      reveal(b, indexOf(b, 8, 8))
      tick(b, 1234)
      toggleFlag(b, 0)
      toggleFlag(b, 1)
      reveal(b, indexOf(b, 3, 12))
      for (let i = 0; i < b.state.length; i++) if (b.state[i] === CELL.Revealed && b.counts[i]! > 0) chord(b, i)
      reveal(b, indexOf(b, 15, 0))
      return b
    }
    const a = run()
    const c = run()
    expect(Array.from(a.mines)).toEqual(Array.from(c.mines))
    expect(Array.from(a.state)).toEqual(Array.from(c.state))
    expect([a.status, a.revealed, a.flags, a.elapsedMs, a.exploded]).toEqual([
      c.status,
      c.revealed,
      c.flags,
      c.elapsedMs,
      c.exploded,
    ])
  })
})
