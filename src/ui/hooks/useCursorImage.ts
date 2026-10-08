import { useMemo } from 'react'
import { useStore } from '@/app/store'
import { findCharacter } from '@/characters'
import { rasterOf } from '@/pixel/compose'
import { NEUTRAL_ACCENT } from '@/pixel/palette'
import { rasterDataUrl } from '@/pixel/raster'
import type { SpriteDef } from '@/pixel/types'
import { useMetrics } from './useMetrics'

/** 메뉴 커서 ▶ (8×8dp) — accent 색 */
export const CURSOR_SPRITE: SpriteDef = {
  id: 'ui.cursor',
  w: 8,
  h: 8,
  palette: { a: '$base', k: '$ink' },
  rows: [
    'k.......',
    'kk......',
    'kak.....',
    'kaak....',
    'kaaak...',
    'kaak....',
    'kak.....',
    'kk......',
  ],
}

/** 현재 테마 accent 로 그린 커서의 데이터 URL (CSS url() 에 바로 사용) */
export function useCursorImage(): string {
  const selected = useStore((s) => s.selectedCharacterId)
  const { uDevice } = useMetrics()
  const accent = findCharacter(selected)?.accent ?? NEUTRAL_ACCENT
  return useMemo(
    () => rasterDataUrl(rasterOf(CURSOR_SPRITE, accent, `cursor:${accent.base}`), uDevice),
    [accent, uDevice],
  )
}
