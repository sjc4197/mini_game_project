import { screenKey, type Screen, type ScreenFx } from '@/app/screen'

/**
 * 커튼 전환 상태 머신 (순수). 커튼이 화면을 덮은 순간(closing 끝) 화면을 교체하고 다시 걷는다(opening).
 * 전환 중 목적지가 바뀌어도 closing 이 끝나는 시점의 최신 목적지로 1회만 교체한다.
 * shown 은 "지금 그려지는 화면 객체" — 커튼이 덮기 전에는 절대 바뀌지 않는다.
 */
export type CurtainPhase = 'idle' | 'closing' | 'opening'

export interface RouterState {
  shown: Screen
  phase: CurtainPhase
  fx: ScreenFx
}

export type RouterEvent =
  { type: 'sync'; target: Screen; fx: ScreenFx } | { type: 'end'; target: Screen }

export function routerReducer(state: RouterState, ev: RouterEvent): RouterState {
  switch (ev.type) {
    case 'sync':
      if (state.phase === 'idle' && screenKey(ev.target) !== screenKey(state.shown)) {
        return { ...state, phase: 'closing', fx: ev.fx }
      }
      return state
    case 'end':
      if (state.phase === 'closing') return { ...state, phase: 'opening', shown: ev.target }
      if (state.phase === 'opening') return { ...state, phase: 'idle' }
      return state
  }
}
