/**
 * 논리 캔버스(w×h dp)를 가용 영역(CSS px)에 넣는 정수 배율(디바이스 px 기준).
 * 소수 DPR 에서도 1 논리 픽셀 = 정수 디바이스 픽셀이라 도트가 안 번진다. 최소 1.
 */
export function fitScale(availW: number, availH: number, w: number, h: number, dpr = 1): number {
  if (w <= 0 || h <= 0) return 1
  const k = Math.floor(Math.min((availW * dpr) / w, (availH * dpr) / h))
  return Math.max(1, Number.isFinite(k) ? k : 1)
}
