import { useEffect, useRef } from 'react'
import { rasterize } from '@/pixel/raster'
import { ticker } from '@/pixel/ticker'
import type { Clip } from '@/pixel/types'
import { useMetrics } from '@/ui/hooks/useMetrics'

export interface PixelSpriteProps {
  clip: Clip
  /** 1dp 당 몇 u 로 확대할지 (1u = --u CSS px). 기록 아이콘 1, 마스코트 2, 선택 프리뷰 3 */
  scaleU?: number
  animate?: boolean
  /** animate=false 일 때 보여줄 프레임 */
  frame?: number
  /** 애니메이션 시작 위상(ms) — 여러 캐릭터가 동시에 들썩이지 않게 */
  phaseMs?: number
  className?: string
  /** 접근성 라벨. 없으면 장식(aria-hidden) */
  label?: string
}

/**
 * canvas 1개를 수명 내내 유지하고, 프레임 인덱스가 바뀔 때만 캐시된 캔버스를 drawImage 한다.
 * 백킹 크기는 디바이스 픽셀(정수), CSS 크기는 dp × scaleU × --u → 소수 DPR 에서도 1 도트 = 정수 디바이스 픽셀.
 */
export function PixelSprite({
  clip,
  scaleU = 2,
  animate = false,
  frame = 0,
  phaseMs = 0,
  className,
  label,
}: PixelSpriteProps) {
  const ref = useRef<HTMLCanvasElement>(null)
  const { u, uDevice } = useMetrics()
  const first = clip.frames[0]
  const w = first?.w ?? 0
  const h = first?.h ?? 0
  const scale = scaleU * uDevice

  useEffect(() => {
    const canvas = ref.current
    if (!canvas || clip.frames.length === 0) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    canvas.width = w * scale
    canvas.height = h * scale
    let i = ((frame % clip.frames.length) + clip.frames.length) % clip.frames.length
    const draw = () => {
      const raster = clip.frames[i]
      if (!raster) return
      ctx.imageSmoothingEnabled = false
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(rasterize(raster, scale), 0, 0)
    }
    draw()
    if (!animate || clip.frames.length < 2) return
    return ticker.subscribe(
      clip.fps,
      () => {
        i = (i + 1) % clip.frames.length
        draw()
      },
      phaseMs,
    )
  }, [clip, scale, animate, frame, phaseMs, w, h])

  return (
    <canvas
      ref={ref}
      className={className ? `sprite ${className}` : 'sprite'}
      style={{ width: w * scaleU * u, height: h * scaleU * u }}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  )
}
