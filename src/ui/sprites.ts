import type { SpriteDef } from '@/pixel/types'

/** UI 전용 소형 스프라이트 */

export const LOCK_ICON: SpriteDef = {
  id: 'ui.lock',
  w: 8,
  h: 10,
  palette: { k: '$ink', g: '#B4BDDC' },
  rows: [
    '..kkkk..',
    '.kk..kk.',
    '.k....k.',
    '.k....k.',
    'kkkkkkkk',
    'kggggggk',
    'kggkkggk',
    'kggkkggk',
    'kggggggk',
    'kkkkkkkk',
  ],
}
