import { useEffect } from 'react'
import { getDevPage } from '@/app/dev'
import { useStore } from '@/app/store'
import { ScreenRouter } from '@/ui/ScreenRouter'

export default function App() {
  const navigate = useStore((s) => s.navigate)

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

  return <ScreenRouter />
}
