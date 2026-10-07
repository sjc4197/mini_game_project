export const clamp = (v: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, v))

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

/** 음수에도 항상 0..m-1 을 돌려주는 나머지 */
export const mod = (n: number, m: number): number => ((n % m) + m) % m
