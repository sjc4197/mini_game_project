import { lazy, Suspense, useCallback, useEffect, useReducer } from 'react'
import { getDevPage, getGoScreen } from '@/app/dev'
import { screenKey, type Screen } from '@/app/screen'
import { useStore } from '@/app/store'
import { routerReducer } from './router'
import { Curtain } from './ScreenTransition'
import { BootScreen } from './screens/BootScreen'
import { PlaceholderScreen } from './screens/PlaceholderScreen'
import { TitleScreen } from './screens/TitleScreen'

// DEV 전용 화면은 프로덕션 번들에서 제거된다 (import.meta.env.DEV 가 상수로 치환됨)
const DevTokensScreen = import.meta.env.DEV ? lazy(() => import('./screens/DevTokensScreen')) : null
const DevGalleryScreen = import.meta.env.DEV
  ? lazy(() => import('./screens/DevGalleryScreen'))
  : null

function ScreenView({ screen }: { screen: Screen }) {
  const navigate = useStore((s) => s.navigate)
  const onBootReady = useCallback(() => {
    const dev = getDevPage()
    navigate(dev ? { kind: 'dev', page: dev } : (getGoScreen() ?? { kind: 'title' }))
  }, [navigate])

  switch (screen.kind) {
    case 'boot':
      return <BootScreen onReady={onBootReady} />
    case 'title':
      return <TitleScreen />
    case 'select':
      return <PlaceholderScreen title="캐릭터 선택" note="5단계에서 구현" />
    case 'lobby':
      return <PlaceholderScreen title="로비" note="6단계에서 구현" />
    case 'game':
      return <PlaceholderScreen title={`게임: ${screen.gameId}`} note="6단계에서 구현" />
    case 'records':
      return <PlaceholderScreen title="기록" note="11단계에서 구현" />
    case 'settings':
      return <PlaceholderScreen title="설정" note="7단계에서 구현" />
    case 'dev': {
      const Dev = screen.page === 'gallery' ? DevGalleryScreen : DevTokensScreen
      return Dev ? (
        <Suspense fallback={null}>
          <Dev />
        </Suspense>
      ) : (
        <TitleScreen />
      )
    }
  }
}

/**
 * store.screen → 화면. 전환은 커튼 방식: 커튼이 덮은 순간 화면을 교체하므로 화면 컴포넌트는 전환을 몰라도 되고,
 * 게임 화면의 destroy() 도 가려진 채 일어난다.
 */
export function ScreenRouter() {
  const target = useStore((s) => s.screen)
  const fx = useStore((s) => s.screenFx)
  const [state, dispatch] = useReducer(routerReducer, { shown: target, phase: 'idle', fx: 'fade' })
  const targetKey = screenKey(target)

  useEffect(() => {
    dispatch({ type: 'sync', target: useStore.getState().screen, fx })
  }, [targetKey, fx, state.phase])

  const onEnd = useCallback(() => {
    dispatch({ type: 'end', target: useStore.getState().screen })
  }, [])

  return (
    <>
      <ScreenView key={screenKey(state.shown)} screen={state.shown} />
      <Curtain phase={state.phase} fx={state.fx} onEnd={onEnd} />
    </>
  )
}
