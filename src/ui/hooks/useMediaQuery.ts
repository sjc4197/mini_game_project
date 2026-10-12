import { useSyncExternalStore } from 'react'

const lists = new Map<string, MediaQueryList>()
const getList = (query: string): MediaQueryList | null => {
  if (typeof window === 'undefined' || !window.matchMedia) return null
  let l = lists.get(query)
  if (!l) {
    l = window.matchMedia(query)
    lists.set(query, l)
  }
  return l
}

/** CSS 미디어 쿼리를 React 상태로 (레이아웃 분기: 좁은 화면 스트립, 터치 조작) */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const l = getList(query)
      if (!l) return () => {}
      l.addEventListener('change', cb)
      return () => l.removeEventListener('change', cb)
    },
    () => getList(query)?.matches ?? false,
    () => false,
  )
}

export const NARROW_QUERY = '(max-width: 959px)'
export const COARSE_QUERY = '(pointer: coarse)'

/** DEV: ?touch=1 로 데스크톱에서 터치 조작 UI 를 강제 표시 */
export const touchForced = (): boolean =>
  import.meta.env.DEV && typeof location !== 'undefined' && /[?&]touch=1/.test(location.search)
