/** ms → 'mm:ss' (999분 캡) */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const m = Math.min(999, Math.floor(total / 60))
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** ms → 'mm:ss.t' (지뢰찾기 기록용, 1/10초) */
export function formatClockTenths(ms: number): string {
  const tenths = Math.floor((Math.max(0, ms) % 1000) / 100)
  return `${formatClock(ms)}.${tenths}`
}

/** 1234567 → '1,234,567' */
export function formatNumber(n: number): string {
  return Math.round(n).toLocaleString('en-US')
}
