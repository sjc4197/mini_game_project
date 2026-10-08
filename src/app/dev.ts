import type { DevPage, Screen } from './screen'

const DEV_PAGES: readonly DevPage[] = ['tokens', 'gallery']

/** DEV 전용: location.hash 가 '#dev', '#dev/<page>' 또는 '#dev/<page>/<arg>' 이면 해당 개발 화면 */
export function getDevPage(): DevPage | null {
  if (!import.meta.env.DEV || typeof location === 'undefined') return null
  const m = /^#dev(?:\/([a-z]+))?(?:\/[\w-]+)?$/.exec(location.hash)
  if (!m) return null
  const page = (m[1] ?? 'gallery') as DevPage
  return DEV_PAGES.includes(page) ? page : null
}

/** DEV 전용: '#go/select' 처럼 특정 화면에서 바로 시작 (스크린샷·수동 테스트용) */
export function getGoScreen(): Screen | null {
  if (!import.meta.env.DEV || typeof location === 'undefined') return null
  const m = /^#go\/([a-z]+)$/.exec(location.hash)
  switch (m?.[1]) {
    case 'title':
      return { kind: 'title' }
    case 'select':
      return { kind: 'select' }
    case 'lobby':
      return { kind: 'lobby' }
    case 'records':
      return { kind: 'records' }
    case 'settings':
      return { kind: 'settings', from: 'title' }
    default:
      return null
  }
}
