import type { DevPage } from './screen'

const DEV_PAGES: readonly DevPage[] = ['tokens', 'gallery']

/** DEV 전용: location.hash 가 '#dev', '#dev/<page>' 또는 '#dev/<page>/<arg>' 이면 해당 개발 화면 */
export function getDevPage(): DevPage | null {
  if (!import.meta.env.DEV || typeof location === 'undefined') return null
  const m = /^#dev(?:\/([a-z]+))?(?:\/[\w-]+)?$/.exec(location.hash)
  if (!m) return null
  const page = (m[1] ?? 'gallery') as DevPage
  return DEV_PAGES.includes(page) ? page : null
}
