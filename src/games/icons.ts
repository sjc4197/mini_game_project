import type { SpriteDef } from '@/pixel/types'

/** 로비 카드 아이콘 16×16 (게임 모듈이 icon 으로 가져다 쓴다) */

export const MINE_ICON: SpriteDef = {
  id: 'icon.mine',
  w: 16,
  h: 16,
  palette: { k: '$ink', g: '#7C88B8', w: '#F4F1E8' },
  rows: [
    '................',
    '................',
    '........k.......',
    '...k....k....k..',
    '....k.kkkkk.k...',
    '.....kgggggk....',
    '....kggwwgggk...',
    '....kgwgggggk...',
    '..kkkgggggggkkk.',
    '....kgggggggk...',
    '....kgggggggk...',
    '.....kgggggk....',
    '....k.kkkkk.k...',
    '...k....k....k..',
    '........k.......',
    '................',
  ],
}

export const TETRIS_ICON: SpriteDef = {
  id: 'icon.tetris',
  w: 16,
  h: 16,
  palette: { k: '$ink', l: '#E6C6FA', p: '#C792EA', d: '#8A5BBF' },
  rows: [
    '................',
    '................',
    '................',
    '.kkkkkkkkkkkkk..',
    '.klllklllklllk..',
    '.klpdklpdklpdk..',
    '.klddklddklddk..',
    '.kkkkkkkkkkkkk..',
    '.....klllk......',
    '.....klpdk......',
    '.....klddk......',
    '.....kkkkk......',
    '................',
    '................',
    '................',
    '................',
  ],
}
