import { describe, expect, it } from 'vitest'
import { mulberry32 } from '@/lib/rng'
import { createGame, emptyCells, indexOf, pickFood, step, tick, turn, xyOf } from './logic'
import {
  COLS,
  FOOD_SCORE,
  MIN_TICK_MS,
  QUEUE_MAX,
  ROWS,
  SNAKE_SPEEDS,
  SPEEDUP_EVERY,
  SPEEDUP_MS,
  START_LENGTH,
  type SnakeState,
} from './types'

const rng0 = () => 0 // 항상 첫 빈 칸
const cells = (s: SnakeState) => s.body.map((i) => xyOf(s, i))
/** 몸을 직접 배치 (머리부터) */
function setBody(s: SnakeState, xy: [number, number][]): void {
  s.body = xy.map(([x, y]) => indexOf(s, x, y))
}
function started(speedId = 'normal', seed = 1): { s: SnakeState; rng: () => number } {
  const rng = mulberry32(seed)
  const s = createGame({ speed: SNAKE_SPEEDS.find((x) => x.id === speedId), rng })
  turn(s, 'up') // 시작
  s.queue = []
  s.dir = 'right'
  return { s, rng }
}

describe('생성', () => {
  it('가운데에서 오른쪽을 보고 길이 3, ready, 먹이는 몸 밖 빈 칸', () => {
    const s = createGame({ rng: mulberry32(1) })
    expect(s.cols).toBe(COLS)
    expect(s.rows).toBe(ROWS)
    expect(s.body).toHaveLength(START_LENGTH)
    expect(cells(s)).toEqual([
      [10, 7],
      [9, 7],
      [8, 7],
    ])
    expect(s.dir).toBe('right')
    expect(s.status).toBe('ready')
    expect(s.food).toBeGreaterThanOrEqual(0)
    expect(s.body).not.toContain(s.food)
    expect(s.score).toBe(0)
  })
  it('속도 단계별 틱 간격과 점수 배수', () => {
    for (const sp of SNAKE_SPEEDS) {
      const s = createGame({ speed: sp, rng: rng0 })
      expect(s.tickMs).toBe(sp.tickMs)
      expect(s.mult).toBe(sp.mult)
    }
    expect(createGame({ rng: rng0 }).tickMs).toBe(SNAKE_SPEEDS[1]!.tickMs)
  })
  it('빈 칸 목록과 먹이 뽑기는 몸을 피하고, 빈 칸이 없으면 -1', () => {
    const s = createGame({ cols: 3, rows: 1, rng: rng0 })
    expect(cells(s)).toEqual([
      [1, 0],
      [0, 0],
    ])
    expect(emptyCells(s)).toEqual([2])
    expect(pickFood(s, rng0)).toBe(2)
    setBody(s, [
      [0, 0],
      [1, 0],
      [2, 0],
    ])
    expect(pickFood(s, rng0)).toBe(-1)
  })
})

describe('시작과 입력 버퍼', () => {
  it('ready 에서는 tick 해도 움직이지 않고 시간도 안 간다', () => {
    const s = createGame({ rng: rng0 })
    const before = [...s.body]
    expect(tick(s, 10_000, rng0)).toEqual([])
    expect(s.body).toEqual(before)
    expect(s.elapsedMs).toBe(0)
  })
  it('첫 유효 입력이 게임을 시작한다. 뒤로(180°)·같은 방향은 시작도 못 시킨다', () => {
    const s = createGame({ rng: rng0 })
    expect(turn(s, 'left')).toEqual([])
    expect(turn(s, 'right')).toEqual([])
    expect(s.status).toBe('ready')
    expect(turn(s, 'up')).toEqual([{ type: 'turn', dir: 'up' }, { type: 'start' }])
    expect(s.status).toBe('playing')
  })
  it('버퍼는 2개까지, 마지막 예약 기준으로 반대 방향은 무시, 한 틱에 하나씩 소비', () => {
    const { s, rng } = started()
    expect(turn(s, 'up')).toHaveLength(1)
    expect(turn(s, 'down')).toEqual([]) // up 의 반대
    expect(turn(s, 'left')).toHaveLength(1) // up 기준 왼쪽은 OK
    expect(turn(s, 'right')).toEqual([]) // 버퍼 가득
    expect(s.queue).toEqual(['up', 'left'])
    expect(s.queue.length).toBeLessThanOrEqual(QUEUE_MAX)
    step(s, rng)
    expect(s.dir).toBe('up')
    step(s, rng)
    expect(s.dir).toBe('left')
    expect(s.queue).toEqual([])
  })
  it('죽은 뒤 입력은 무시', () => {
    const { s } = started()
    s.status = 'dead'
    expect(turn(s, 'up')).toEqual([])
  })
})

describe('전진 · 먹이 · 성장', () => {
  it('한 칸 전진하면 머리가 앞으로, 꼬리가 따라오고 길이는 그대로', () => {
    const { s, rng } = started()
    s.food = indexOf(s, 0, 0)
    expect(step(s, rng)).toEqual([{ type: 'move', head: indexOf(s, 11, 7) }])
    expect(cells(s)).toEqual([
      [11, 7],
      [10, 7],
      [9, 7],
    ])
  })
  it('먹이를 먹으면 +1 성장(꼬리 유지), 점수 +10×배수, 먹이 재배치', () => {
    const { s, rng } = started('fast')
    s.food = indexOf(s, 11, 7)
    const ev = step(s, rng)
    expect(ev.map((e) => e.type)).toEqual(['move', 'eat'])
    expect(ev[1]).toEqual({
      type: 'eat',
      food: indexOf(s, 11, 7),
      score: FOOD_SCORE * 3,
      length: 4,
    })
    expect(s.score).toBe(FOOD_SCORE * 3)
    expect(s.eaten).toBe(1)
    // 먹은 틱에는 길이가 그대로이고 grow 가 예약된다 → 다음 틱에 꼬리가 남아 길어진다
    expect(s.body).toHaveLength(3)
    expect(s.grow).toBe(1)
    expect(s.food).toBeGreaterThanOrEqual(0)
    expect(s.body).not.toContain(s.food)
    step(s, rng)
    expect(s.body).toHaveLength(4)
    expect(s.grow).toBe(0)
    expect(cells(s)).toEqual([
      [12, 7],
      [11, 7],
      [10, 7],
      [9, 7],
    ])
  })
  it('먹이 5개마다 틱 간격이 줄고 최소값에서 멈춘다', () => {
    const { s, rng } = started('slow')
    const t0 = s.tickMs
    const feed = () => {
      const [hx, hy] = xyOf(s, s.body[0]!)
      // 항상 앞 칸에 먹이를 두고 오른쪽으로 전진 (보드 폭을 넘지 않게 왕복)
      if (hx + 1 >= s.cols) {
        setBody(s, [[0, hy]])
      }
      const [x, y] = xyOf(s, s.body[0]!)
      s.food = indexOf(s, x + 1, y)
      return step(s, rng)
    }
    const events: string[] = []
    for (let i = 0; i < SPEEDUP_EVERY; i++) events.push(...feed().map((e) => e.type))
    expect(events.filter((t) => t === 'speedup')).toHaveLength(1)
    expect(s.tickMs).toBe(t0 - SPEEDUP_MS)
    s.tickMs = MIN_TICK_MS + 2
    for (let i = 0; i < SPEEDUP_EVERY; i++) feed()
    expect(s.tickMs).toBe(MIN_TICK_MS)
    for (let i = 0; i < SPEEDUP_EVERY; i++) feed()
    expect(s.tickMs).toBe(MIN_TICK_MS)
  })
})

describe('충돌', () => {
  it('벽에 닿으면 dead(wall), 몸은 그대로', () => {
    const { s, rng } = started()
    setBody(s, [
      [19, 7],
      [18, 7],
      [17, 7],
    ])
    const before = [...s.body]
    expect(step(s, rng)).toEqual([{ type: 'die', cause: 'wall' }])
    expect(s.status).toBe('dead')
    expect(s.cause).toBe('wall')
    expect(s.body).toEqual(before)
    expect(step(s, rng)).toEqual([])
  })
  it('자기 몸에 닿으면 dead(self)', () => {
    const { s, rng } = started()
    setBody(s, [
      [5, 5],
      [4, 5],
      [3, 5],
      [3, 6],
      [4, 6],
      [5, 6],
      [6, 6],
    ])
    s.dir = 'down'
    expect(step(s, rng)).toEqual([{ type: 'die', cause: 'self' }])
    expect(s.cause).toBe('self')
  })
  it('꼬리 칸으로는 들어갈 수 있다 (꼬리가 비켜남) — 성장 중이면 죽는다', () => {
    const { s, rng } = started()
    setBody(s, [
      [5, 5],
      [4, 5],
      [4, 6],
      [5, 6],
    ])
    s.dir = 'down'
    s.food = indexOf(s, 0, 0)
    expect(step(s, rng)).toEqual([{ type: 'move', head: indexOf(s, 5, 6) }])
    expect(cells(s)).toEqual([
      [5, 6],
      [5, 5],
      [4, 5],
      [4, 6],
    ])
    const { s: g, rng: r2 } = started()
    setBody(g, [
      [5, 5],
      [4, 5],
      [4, 6],
      [5, 6],
    ])
    g.dir = 'down'
    g.grow = 1
    expect(step(g, r2)).toEqual([{ type: 'die', cause: 'self' }])
  })
  it('보드를 다 채우면 won', () => {
    const s = createGame({ cols: 2, rows: 2, rng: rng0 })
    setBody(s, [
      [1, 0],
      [0, 0],
      [0, 1],
    ])
    s.status = 'playing'
    s.dir = 'down'
    s.food = indexOf(s, 1, 1)
    const ev = step(s, rng0)
    expect(ev.map((e) => e.type)).toEqual(['move', 'eat', 'win'])
    expect(s.status).toBe('won')
    expect(s.food).toBe(-1)
  })
})

describe('시간 누적', () => {
  it('틱 간격 미만이면 안 움직이고, 넘치면 그만큼 여러 번', () => {
    const { s, rng } = started('normal')
    s.food = indexOf(s, 0, 0)
    expect(tick(s, s.tickMs - 1, rng)).toEqual([])
    expect(tick(s, 1, rng)).toHaveLength(1)
    expect(s.acc).toBe(0)
    expect(tick(s, s.tickMs * 3 + 5, rng).filter((e) => e.type === 'move')).toHaveLength(3)
    expect(s.acc).toBe(5)
    expect(s.elapsedMs).toBe(s.tickMs * 4 + 5)
  })
  it('죽으면 시간이 멈춘다', () => {
    const { s, rng } = started()
    setBody(s, [
      [19, 7],
      [18, 7],
    ])
    tick(s, s.tickMs, rng)
    expect(s.status).toBe('dead')
    const t = s.elapsedMs
    tick(s, 1000, rng)
    expect(s.elapsedMs).toBe(t)
  })
  it('같은 시드 + 같은 입력 스크립트 → 같은 결과', () => {
    const run = (seed: number) => {
      const rng = mulberry32(seed)
      const s = createGame({ rng })
      const script: [number, 'up' | 'down' | 'left' | 'right'][] = [
        [0, 'up'],
        [3, 'left'],
        [6, 'down'],
        [9, 'right'],
        [12, 'up'],
        [15, 'left'],
      ]
      let i = 0
      for (let frame = 0; frame < 400 && s.status !== 'dead'; frame++) {
        for (const [at, d] of script) if (at === i) turn(s, d)
        const ev = tick(s, 50, rng)
        if (ev.some((e) => e.type === 'move')) i++
      }
      return {
        body: [...s.body],
        food: s.food,
        score: s.score,
        status: s.status,
        elapsed: s.elapsedMs,
      }
    }
    expect(run(7)).toEqual(run(7))
    expect(run(7)).not.toEqual(run(8))
  })
})
