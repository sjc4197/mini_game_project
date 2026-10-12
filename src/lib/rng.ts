/** [0, 1) 난수 생성기. 게임 로직은 전부 주입받아 테스트에서 결정적으로 돌린다 */
export type Rng = () => number

/** mulberry32 — 32비트 시드, 빠르고 품질 충분 */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function randomSeed(): number {
  return (Math.random() * 4294967296) >>> 0
}

/** 0..n-1 정수 */
export const randInt = (rng: Rng, n: number): number => Math.floor(rng() * n)
