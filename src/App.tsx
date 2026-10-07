import { lazy, Suspense, useCallback, useEffect } from 'react'
import { getDevPage } from '@/app/dev'
import { useStore } from '@/app/store'
import { BootScreen } from '@/ui/screens/BootScreen'
import { TitlePlaceholder } from '@/ui/screens/TitlePlaceholder'

// DEV 전용 화면은 프로덕션 번들에서 제거된다 (import.meta.env.DEV 가 상수로 치환됨)
const DevTokensScreen = import.meta.env.DEV
  ? lazy(() => import('@/ui/screens/DevTokensScreen'))
  : null

export default function App() {
  const screen = useStore((s) => s.screen)
  const navigate = useStore((s) => s.navigate)

  const onBootReady = useCallback(() => {
    const dev = getDevPage()
    navigate(dev ? { kind: 'dev', page: dev } : { kind: 'title' })
  }, [navigate])

  // DEV: #dev/<page> 해시로 개발 화면 진입/이탈
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const onHash = () => {
      const dev = getDevPage()
      const current = useStore.getState().screen
      if (dev) navigate({ kind: 'dev', page: dev })
      else if (current.kind === 'dev') navigate({ kind: 'title' })
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [navigate])

  switch (screen.kind) {
    case 'boot':
      return <BootScreen onReady={onBootReady} />
    case 'dev':
      return DevTokensScreen ? (
        <Suspense fallback={null}>
          <DevTokensScreen />
        </Suspense>
      ) : (
        <TitlePlaceholder />
      )
    default:
      return <TitlePlaceholder />
  }
}
