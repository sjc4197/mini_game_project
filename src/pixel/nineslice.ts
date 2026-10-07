import { rasterDataUrl } from './raster'
import type { Raster } from './types'

/**
 * border-image 9-slice 스타일. 프레임 스프라이트(모서리 cornerDp)를 현재 배율로 미리 확대해 데이터 URL 로 넘긴다.
 * scaleDevice = 디바이스 px 배율(정수), uCss = 1dp 의 CSS px. 말풍선·결과창·로고 프레임에서 사용 (4단계~).
 */
export function nineSliceStyle(
  raster: Raster,
  cornerDp: number,
  scaleDevice: number,
  uCss: number,
  fill = true,
): Record<string, string> {
  const slice = cornerDp * scaleDevice
  const width = `${cornerDp * uCss}px`
  return {
    borderStyle: 'solid',
    borderWidth: width,
    borderImageSource: `url(${rasterDataUrl(raster, scaleDevice)})`,
    borderImageSlice: fill ? `${slice} fill` : String(slice),
    borderImageWidth: width,
    borderImageRepeat: 'repeat',
  }
}
