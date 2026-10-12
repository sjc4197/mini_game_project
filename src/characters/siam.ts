import { ACCENTS } from '@/pixel/palette'
import { recolorFaces, recolorLoafFaces } from './faces'
import { catBody, catLoaf, chinShadow, paintRect, replaceAll } from './template'
import type { CharacterDef } from './types'

/** 샴 — 크림색 몸에 초콜릿 포인트(귀·얼굴 마스크·꼬리·네 발), 파란 눈. 줄무늬 없음 */
const PALETTE = {
  k: '#3B2A22',
  r: '#F3E3C3',
  s: '#E6D3AE',
  b: '#DEC9A0',
  c: '#FBF0DD',
  p: '#D8938A',
  m: '#6B4A3A',
} as const

export const siam: CharacterDef = {
  id: 'siam',
  name: '샴',
  bio: '달빛 아래서만 깨어 있는 도도한 샴',
  personality: '도도한 츤데레, 늘 졸림',
  specialty: '낮잠',
  accent: ACCENTS.siam,
  body: catBody('siam.body', PALETTE, (rows) => {
    let r = chinShadow(replaceAll(rows, 'd', 'r'))
    r = paintRect(r, 17, 0, 24, 8, 'r', 'm') // 왼쪽 귀
    r = paintRect(r, 33, 0, 41, 8, 'r', 'm') // 오른쪽 귀
    r = paintRect(r, 17, 11, 41, 21, 'rc', 'm') // 얼굴 마스크 (입가까지)
    r = paintRect(r, 0, 6, 10, 23, 'rc', 'm') // 꼬리
    r = paintRect(r, 0, 32, 41, 38, 'rc', 'm') // 네 발
    return r
  }),
  loaf: catLoaf('siam.loaf', PALETTE, (rows) => {
    let r = replaceAll(rows, 'd', 'r')
    r = paintRect(r, 1, 3, 7, 9, 'r', 'm') // 왼쪽 귀
    r = paintRect(r, 16, 3, 23, 10, 'r', 'm') // 오른쪽 귀
    r = paintRect(r, 1, 13, 23, 23, 'rc', 'm') // 얼굴 마스크
    r = paintRect(r, 32, 15, 45, 27, 'rcb', 'm') // 꼬리
    r = paintRect(r, 3, 29, 17, 33, 'rc', 'm') // 앞발
    return r
  }),
  idle: { kind: 'squash', row: 27 },
  faces: recolorFaces('siam', { e: '#4F7BE8', k: '#F3E3C3', p: '#D8938A' }),
  loafFaces: recolorLoafFaces('siam', { e: '#4F7BE8', k: '#F3E3C3', p: '#D8938A' }),
  lines: {
    'ui.idle': ['…냐암. (하품)', '날 깨운 건 너냐옹?', '달이 뜨면 깨울 것.'],
    'ui.lobby.hover': ['빨리 고르라냥. 졸리다냥.', '아무거나 해라냥.'],
    'ui.locked': ['기다리는 건 질색이다냥.', '아직이냥. 가라냥.'],
    'lobby:locked': ['기다리는 건 질색이다냥.'],
    'lobby:minesweeper': ['지뢰는 밟지 마라냥. 발 아프다냥.', '조용히 집중하라냥.'],
    'lobby:tetris': ['고양이는 높은 곳을 좋아한다냥.', '쌓아 올려 보라냥.'],
    'lobby:omok': ['수 읽기는 자신 있다냥.', '다섯 줄… 우아하게 두라냥.'],
    'lobby:snake': ['뱀은 좀 싫다냥… 그래도 해봐.', '꼬리는 소중한 거다냥.'],
    'game.start': ['시작하라냥. 보고 있다냥.', '흠, 어디 한번 해보라냥.', '…졸리지만 봐주겠다냥.'],
    'game.good': ['흥, 제법이냐옹.', '…조금은 봐줄 만하다냥.', '나쁘지 않다냥.'],
    'game.great': ['오… 지금 건 멋졌다냥.', '인정한다냥. 이번만.'],
    'game.risky': ['야, 그거 아니지 않냐옹…?', '꼬리가 곤두선다냥.', '조심하라냥…'],
    'game.safe': ['…휴. 됐다냥.', '그래, 그거다냥.'],
    'game.mistake': ['…그래서 내가 말했잖냐옹.', '어휴, 집중하라냥.'],
    'game.think': ['달도 기다려 주지 않는다냥.', '…(꼬리를 흔든다)', '생각이 길다냥.'],
    'game.fail': [
      '…그래서 내가 말했잖냐옹.',
      '하아… 낮잠이나 자야겠다냥.',
      '다음엔 잘하라냥. 보고 있을 테니.',
    ],
    'game.win': ['뭐, 당연한 결과다냥.', '오늘만 칭찬해 준다냥. 잘했다냥.', '…나쁘지 않았다냥.'],
    'game.record': ['신기록이냥. 기억해 두겠다냥.', '…조금 놀랐다냥.'],
  },
}
