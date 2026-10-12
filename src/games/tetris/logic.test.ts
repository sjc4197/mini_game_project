import { describe, expect, it } from 'vitest'
import { mulberry32 } from '@/lib/rng'
import {
  cellAt,
  createGame,
  ghostY,
  hardDrop,
  holdPiece,
  refillQueue,
  snapshot,
  start,
  step,
  tryMove,
} from './logic'
import { cellsOf } from './pieces'
import { CLEAR_TOTAL_MS, LOCK_RESET_MAX } from './scoring'
import {
  COLS,
  HIDDEN_ROWS,
  NEXT_COUNT,
  NO_INPUT,
  PIECE_TYPES,
  ROWS,
  SPAWN_X,
  SPAWN_Y,
  type PieceType,
  type StepInput,
  type TetrisEvent,
  type TetrisState,
} from './types'

const DAS = { das: 167, arr: 33 }
const make = (seq?: PieceType[], startLevel = 1, seed = 1): TetrisState => {
  const s = createGame({ startLevel, rng: mulberry32(seed), das: DAS, sequence: seq })
  start(s)
  return s
}
const inp = (patch: Partial<StepInput>): StepInput => ({ ...NO_INPUT, ...patch })
/** 바닥 쪽 행 채우기: rows[0] 이 맨 아랫줄. '#' 블록 */
function fillBottom(s: TetrisState, rows: string[]): void {
  rows.forEach((r, i) => {
    const y = ROWS - 1 - i
    for (let x = 0; x < COLS; x++) s.board[y * COLS + x] = r[x] === '#' ? 1 : 0
  })
}
const types = (ev: TetrisEvent[]) => ev.map((e) => e.type)
/** 중력이 거의 없는 레벨 1에서 작은 dt 로 n 프레임 */
const frames = (s: TetrisState, n: number, input = NO_INPUT, dt = 16): TetrisEvent[] =>
  Array.from({ length: n }, () => step(s, dt, input)).flat()

describe('⑤ 7-bag', () => {
  it('70개 뽑으면 종류별 10개, 같은 시드 → 같은 순서', () => {
    const pull = (seed: number) => {
      const s = createGame({ startLevel: 1, rng: mulberry32(seed), das: DAS })
      const out: PieceType[] = []
      while (out.length < 70) {
        out.push(s.queue.shift()!)
        refillQueue(s)
      }
      return out
    }
    const a = pull(7)
    for (const t of PIECE_TYPES) expect(a.filter((x) => x === t)).toHaveLength(10)
    // 7개 단위 구간마다 전 종류가 한 번씩
    for (let i = 0; i < 70; i += 7) expect(new Set(a.slice(i, i + 7)).size).toBe(7)
    expect(pull(7)).toEqual(a)
    expect(pull(8)).not.toEqual(a)
  })
})

describe('⑥ 다음 큐', () => {
  it('스폰할 때마다 5개 이상 유지', () => {
    const s = make()
    for (let i = 0; i < 20; i++) {
      expect(s.queue.length).toBeGreaterThanOrEqual(NEXT_COUNT)
      hardDrop(s)
      if (s.phase === 'clearing') step(s, CLEAR_TOTAL_MS)
    }
  })
})

describe('⑦ 스폰', () => {
  it('(3,2) 에 놓고 한 칸 떨어진다 → y=3', () => {
    const s = make(['T'])
    expect(s.active).toMatchObject({ type: 'T', rot: 0, x: SPAWN_X, y: SPAWN_Y + 1 })
    expect(s.stats.pieces).toBe(1)
  })
  it('스폰 자리가 막히면 block out', () => {
    const s = createGame({ startLevel: 1, rng: mulberry32(1), das: DAS, sequence: ['O'] })
    for (const [dx, dy] of cellsOf('O', 0)) s.board[(SPAWN_Y + dy) * COLS + SPAWN_X + dx] = 1
    const ev = start(s)
    expect(types(ev)).toEqual(['over'])
    expect(s.phase).toBe('over')
    expect(s.overReason).toBe('blockout')
  })
})

describe('⑧ 홀드', () => {
  it('첫 홀드는 다음 조각을 꺼내고, 교환, 같은 조각에서 2회는 거부, 락 뒤 해제', () => {
    const s = make(['T', 'I', 'O', 'S', 'Z', 'J', 'L', 'T'])
    expect(types(holdPiece(s))).toEqual(['hold', 'spawn'])
    expect(s.hold).toBe('T')
    expect(s.active?.type).toBe('I')
    expect(types(holdPiece(s))).toEqual(['holdDenied'])
    hardDrop(s) // I 락 → O 스폰
    expect(s.active?.type).toBe('O')
    expect(types(holdPiece(s))).toEqual(['hold', 'spawn'])
    expect(s.hold).toBe('O')
    expect(s.active?.type).toBe('T') // 교환
    expect(s.holdUsed).toBe(true)
  })
})

describe('⑨ 고스트', () => {
  it('빈 보드에선 바닥, 블록 위에선 그 위', () => {
    const s = make(['O'])
    expect(ghostY(s)).toBe(ROWS - 2) // O 셀 y = p.y + 0..1
    fillBottom(s, ['##########', '##########', '.......###'])
    s.active!.x = 0
    expect(ghostY(s)).toBe(ROWS - 4)
    s.active!.x = 7
    expect(ghostY(s)).toBe(ROWS - 5)
  })
})

describe('⑩ 중력', () => {
  it('레벨 1: 1000ms 에 한 행', () => {
    const s = make(['I'])
    const y0 = s.active!.y
    frames(s, 62, NO_INPUT, 16) // 992ms
    expect(s.active!.y).toBe(y0)
    step(s, 8)
    expect(s.active!.y).toBe(y0 + 1)
  })
  it('레벨 10 은 레벨 1 보다 15배 이상 빠르다', () => {
    const a = make(['I'], 1)
    const b = make(['I'], 10)
    frames(a, 10, NO_INPUT, 100)
    frames(b, 10, NO_INPUT, 100)
    expect(b.active ? b.active.y : ROWS).toBeGreaterThan(a.active!.y + 10)
  })
})

describe('⑪ 소프트/하드 드롭', () => {
  it('소프트 드롭은 20배 속도 + 행당 1점', () => {
    const s = make(['I'])
    const y0 = s.active!.y
    step(s, 50, inp({ soft: true })) // 50ms × 20 = 1행
    expect(s.active!.y).toBe(y0 + 1)
    expect(s.score).toBe(1)
    step(s, 250, inp({ soft: true })) // 5행
    expect(s.active!.y).toBe(y0 + 6)
    expect(s.score).toBe(6)
  })
  it('하드 드롭은 즉시 락 + 행당 2점, 다음 조각 스폰', () => {
    const s = make(['O', 'T'])
    const rows = ghostY(s) - s.active!.y
    const ev = hardDrop(s)
    expect(types(ev)).toEqual(['harddrop', 'lock', 'spawn'])
    expect(s.score).toBe(rows * 2)
    expect(s.active?.type).toBe('T')
    expect(cellAt(s, SPAWN_X + 1, ROWS - 1)).toBe(2)
  })
})

describe('⑫ 락 딜레이', () => {
  it('착지 후 500ms 에 락, 이동하면 리셋(최대 15회), 새 최저 행이면 카운터 0, 턱에서 떨어지면 타이머 0', () => {
    const s = make(['O', 'O'])
    const p = s.active!
    while (tryMove(s, -1, 0)) {
      /* 왼쪽 끝 (x=-1, 셀 0~1) — 두 번째 O 가 평평한 바닥에서 움직이도록 */
    }
    p.y = ghostY(s)
    frames(s, 30) // 480ms 착지
    expect(s.active).toBe(p)
    expect(s.lockTimer).toBeGreaterThan(400)
    step(s, 20)
    expect(s.active).not.toBe(p) // 락 → 다음 O
    // 리셋
    const q = s.active!
    q.y = ghostY(s)
    step(s, 16)
    expect(s.grounded).toBe(true)
    for (let i = 0; i < LOCK_RESET_MAX; i++) {
      frames(s, 20) // 320ms
      step(s, 16, inp(i % 2 === 0 ? { right: true, prefer: 1 } : { left: true, prefer: -1 }))
      expect(s.lockTimer).toBeLessThan(100)
    }
    expect(s.lockResets).toBe(LOCK_RESET_MAX)
    frames(s, 20)
    step(s, 16, inp({ right: true, prefer: 1 })) // 16번째 리셋은 없음
    expect(s.lockTimer).toBeGreaterThan(300)
    // 새 최저 행 → 카운터 0
    const t = make(['I'])
    t.active!.y = ghostY(t) - 3
    step(t, 16)
    t.lockResets = 7
    t.active!.y = ghostY(t)
    step(t, 16)
    expect(t.lockResets).toBe(0)
    // 턱: 착지 후 옆으로 빠져 공중이면 타이머 0
    const u = make(['O'])
    fillBottom(u, ['#####.....'])
    u.active!.x = 3 // O 셀 x=4,5 → 4 는 블록 위
    u.active!.y = ghostY(u)
    frames(u, 10)
    expect(u.lockTimer).toBeGreaterThan(100)
    step(u, 16, inp({ right: true, prefer: 1 })) // x=4 → 셀 5,6 → 공중
    step(u, 16)
    expect(u.grounded).toBe(false)
    expect(u.lockTimer).toBe(0)
  })
})

describe('⑬ 줄 클리어', () => {
  it('1~4줄, 비연속 행도 지우고 위 행이 내려온다', () => {
    const s = make(['I', 'O'])
    fillBottom(s, ['#########.', '#.........', '#########.', '#.........'])
    const p = s.active!
    p.rot = 1
    p.x = 7 // 세로 I 셀 x = 9
    p.y = ghostY(s)
    const ev = hardDrop(s)
    const clear = ev.find((e) => e.type === 'clear')
    expect(clear).toMatchObject({ lines: 2, rows: [ROWS - 3, ROWS - 1] })
    expect(s.phase).toBe('clearing')
    step(s, CLEAR_TOTAL_MS)
    expect(s.phase).toBe('falling')
    const rows = snapshot(s).split('\n')
    expect(rows[ROWS - 1]).toBe('#........#')
    expect(rows[ROWS - 2]).toBe('#........#')
    expect(rows[ROWS - 3]).toBe('..........')
  })
  it('테트리스(4줄)', () => {
    const s = make(['I', 'O'])
    fillBottom(s, ['#########.', '#########.', '#########.', '#########.'])
    const p = s.active!
    p.rot = 1
    p.x = 7
    const ev = hardDrop(s)
    expect(ev.find((e) => e.type === 'clear')).toMatchObject({ lines: 4, tetris: true })
    step(s, CLEAR_TOTAL_MS)
    expect(snapshot(s).split('\n')[ROWS - 1]).toBe('..........')
    expect(s.stats.tetrises).toBe(1)
  })
})

describe('⑭ 점수', () => {
  const clearWithI = (s: TetrisState) => {
    const p = s.active!
    p.rot = 1
    p.x = 7
    const ev = hardDrop(s)
    const before = ev.find((e) => e.type === 'clear')
    if (s.phase === 'clearing') step(s, CLEAR_TOTAL_MS)
    return before
  }
  it('싱글 lv1 100, 테트리스 lv2 1600, B2B 1200, 끊김, 콤보 +50/+100, 리셋', () => {
    const s = make(['I', 'I', 'I', 'I', 'I', 'I'], 1)
    fillBottom(s, ['#########.'])
    const single = clearWithI(s)
    expect(single).toMatchObject({ lines: 1, points: 100 + 0, combo: 0 })
    expect(s.score).toBeGreaterThanOrEqual(100) // + 하드 드롭 행당 2점

    const t = make(['I', 'I', 'I', 'I', 'I', 'I'], 2)
    fillBottom(t, ['#########.', '#########.', '#########.', '#########.'])
    expect(clearWithI(t)).toMatchObject({ lines: 4, points: 1600, b2b: false })
    fillBottom(t, ['#########.', '#########.', '#########.', '#########.'])
    expect(clearWithI(t)).toMatchObject({ lines: 4, b2b: true, combo: 1, points: 1200 * 2 + 50 * 1 * 2 })

    const u = make(['I', 'I', 'I', 'I', 'I', 'I'], 1)
    fillBottom(u, ['#########.', '#########.', '#########.', '#########.'])
    clearWithI(u)
    expect(u.b2b).toBe(true)
    fillBottom(u, ['#########.'])
    clearWithI(u) // 싱글이 B2B 를 끊는다
    expect(u.b2b).toBe(false)
    fillBottom(u, ['#########.', '#########.', '#########.', '#########.'])
    expect(clearWithI(u)).toMatchObject({ b2b: false, combo: 2, points: 800 + 100 })

    // 콤보 리셋: 클리어 없는 락
    const v = make(['I', 'O', 'I', 'I'], 1)
    fillBottom(v, ['#########.'])
    expect(clearWithI(v)).toMatchObject({ combo: 0 })
    hardDrop(v) // O, 클리어 없음
    expect(v.combo).toBe(-1)
    fillBottom(v, ['#########.', '..........', '..........', '..........']) // 남은 I 조각 제거
    v.active!.rot = 1
    expect(clearWithI(v)).toMatchObject({ combo: 0, points: 100 })
  })
})

describe('⑮ 레벨업', () => {
  it('10줄마다 +1, 시작 레벨 반영, levelup 이벤트', () => {
    const s = make(Array<PieceType>(20).fill('I'), 5)
    let levelups = 0
    for (let i = 0; i < 3; i++) {
      fillBottom(s, ['#########.', '#########.', '#########.', '#########.'])
      const p = s.active!
      p.rot = 1
      p.x = 7
      const ev = hardDrop(s)
      levelups += ev.filter((e) => e.type === 'levelup').length
      step(s, CLEAR_TOTAL_MS)
    }
    expect(s.lines).toBe(12)
    expect(s.level).toBe(6)
    expect(levelups).toBe(1)
  })
})

describe('⑯ 락 아웃', () => {
  it('조각이 전부 숨김 행에서 락되면 게임 오버', () => {
    const s = createGame({ startLevel: 1, rng: mulberry32(1), das: DAS, sequence: ['O'] })
    // 숨김 행 바로 아래(y=HIDDEN_ROWS)부터 꽉 채워 O 가 y=2..3 에 멈추게 (스폰 전에 채운다)
    for (let y = HIDDEN_ROWS; y < ROWS; y++) for (let x = 0; x < COLS; x++) s.board[y * COLS + x] = 1
    start(s)
    expect(s.active?.y).toBe(2)
    const ev = hardDrop(s)
    expect(types(ev)).toEqual(['harddrop', 'lock', 'over'])
    expect(s.overReason).toBe('lockout')
  })
})

describe('⑰ 클리어 중 입력 무시', () => {
  it('310ms 동안 입력이 무시되고, 끝나면 다음 조각이 스폰된다', () => {
    const s = make(['I', 'T'])
    fillBottom(s, ['#########.'])
    const p = s.active!
    p.rot = 1
    p.x = 7
    hardDrop(s)
    expect(s.phase).toBe('clearing')
    expect(s.active).toBeNull()
    const ev1 = step(s, 100, inp({ hardDrop: true, left: true, prefer: -1, rotateCw: true, hold: true }))
    expect(ev1).toEqual([])
    const ev2 = step(s, CLEAR_TOTAL_MS - 100)
    expect(types(ev2)).toEqual(['collapse', 'spawn'])
    expect(s.active?.type).toBe('T')
  })
})

describe('⑱ 결정성', () => {
  it('같은 시드 + 같은 입력 열 → 같은 스냅샷/점수', () => {
    const run = () => {
      const s = make(undefined, 3, 2024)
      const seq: StepInput[] = [
        inp({ left: true, prefer: -1 }),
        inp({ rotateCw: true }),
        inp({ soft: true }),
        inp({ hardDrop: true }),
        inp({ hold: true }),
        inp({ right: true, prefer: 1 }),
        inp({ hardDrop: true }),
      ]
      for (let i = 0; i < 400; i++) step(s, 16, seq[i % seq.length]!)
      return { snap: snapshot(s), score: s.score, lines: s.lines, phase: s.phase, pieces: s.stats.pieces }
    }
    expect(run()).toEqual(run())
  })
})

describe('이동 기본', () => {
  it('벽/블록에 막히면 false', () => {
    const s = make(['O'])
    while (tryMove(s, -1, 0)) {
      /* 왼쪽 끝까지 */
    }
    expect(s.active!.x).toBe(-1) // O 셀 x = p.x + 1 = 0
    expect(tryMove(s, -1, 0)).toBe(false)
  })
})
