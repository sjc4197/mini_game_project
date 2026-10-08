import type { CharacterDef } from '@/characters/types'
import { NEUTRAL_ACCENT, type Accent } from '@/pixel/palette'
import type { Settings } from './store'

/**
 * accent 전파: html 루트의 CSS 변수를 덮어쓴다. 포털 없이 .app 안에 렌더링되므로 전부 상속된다.
 */
export function applyAccent(accent: Accent | null): void {
  const style = document.documentElement.style
  if (!accent) {
    style.removeProperty('--accent')
    style.removeProperty('--accent-dark')
    style.removeProperty('--accent-light')
    return
  }
  style.setProperty('--accent', accent.base)
  style.setProperty('--accent-dark', accent.dark)
  style.setProperty('--accent-light', accent.light)
}

/** 선택 캐릭터의 상징색을 테마로. null 이면 중립색. (캐릭터 선택 화면의 미리보기도 이 함수로) */
export function applyCharacterTheme(character: CharacterDef | null | undefined): void {
  const root = document.documentElement
  if (character) {
    root.dataset.char = character.id
    applyAccent(character.accent)
  } else {
    delete root.dataset.char
    applyAccent(NEUTRAL_ACCENT)
  }
}

const motionQuery = (): MediaQueryList | null =>
  typeof window === 'undefined' || !window.matchMedia
    ? null
    : window.matchMedia('(prefers-reduced-motion: reduce)')

/** CRT / 움직임 줄이기 → html data-* (CSS 가 단일 출처로 사용) */
export function applyDocumentSettings(settings: Settings): void {
  const root = document.documentElement
  root.dataset.crt = settings.crt ? 'on' : 'off'
  const systemReduce = motionQuery()?.matches ?? false
  const reduce =
    settings.reducedMotion === 'on' || (settings.reducedMotion === 'system' && systemReduce)
  root.dataset.motion = reduce ? 'reduce' : 'full'
}

/** 시스템의 움직임 줄이기 설정이 바뀌면 다시 적용 */
export function watchSystemMotion(getSettings: () => Settings): () => void {
  const mql = motionQuery()
  if (!mql) return () => {}
  const handler = (): void => applyDocumentSettings(getSettings())
  mql.addEventListener('change', handler)
  return () => mql.removeEventListener('change', handler)
}
