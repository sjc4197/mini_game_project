import { useMemo } from 'react'
import { rasterOf } from '@/pixel/compose'
import { NEUTRAL_ACCENT, type Accent } from '@/pixel/palette'
import { rasterDataUrl } from '@/pixel/raster'
import type { SpriteDef } from '@/pixel/types'
import { useMetrics } from '@/ui/hooks/useMetrics'

interface Props {
  sprite: SpriteDef
  scaleU?: number
  accent?: Accent
  /** 접근성 라벨. 없으면 장식 */
  label?: string
  className?: string
}

/** 정적 아이콘: SpriteDef → 데이터 URL <img>. 애니메이션이 필요하면 PixelSprite */
export function PixelIcon({ sprite, scaleU = 2, accent = NEUTRAL_ACCENT, label, className }: Props) {
  const { u, uDevice } = useMetrics()
  const raster = useMemo(
    () => rasterOf(sprite, accent, `icon:${sprite.id}:${accent.base}`),
    [sprite, accent],
  )
  const src = useMemo(() => rasterDataUrl(raster, uDevice), [raster, uDevice])
  return (
    <img
      src={src}
      className={className ? `sprite ${className}` : 'sprite'}
      style={{ width: sprite.w * scaleU * u, height: sprite.h * scaleU * u }}
      alt={label ?? ''}
      aria-hidden={label ? undefined : true}
      draggable={false}
    />
  )
}
