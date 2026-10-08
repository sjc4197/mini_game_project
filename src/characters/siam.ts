import { ACCENTS } from '@/pixel/palette'
import { recolorFaces } from './faces'
import { loafBody, paintRect } from './loaf'
import type { CharacterDef } from './types'

/** 샴 — 크림색 몸에 초콜릿 포인트(귀·얼굴 마스크·꼬리·발은 팔레트로), 파란 눈 */
export const siam: CharacterDef = {
  id: 'siam',
  name: '샴',
  bio: '달빛 아래서만 깨어 있는 도도한 샴, 칭찬은 하루 한 번',
  personality: '도도한 츤데레, 늘 졸림',
  specialty: '낮잠',
  accent: ACCENTS.siam,
  body: loafBody('siam.body', { k: '$ink', r: '#F3E3C3', d: '#8C6A52', m: '#6B4A3A' }, (rows) => {
    let r = paintRect(rows, 5, 1, 15, 4, 'r', 'm') // 귀
    r = paintRect(r, 6, 6, 15, 9, 'r', 'm') // 얼굴 마스크
    r = paintRect(r, 24, 4, 27, 11, 'r', 'm') // 꼬리
    r = paintRect(r, 5, 20, 22, 20, 'r', 'm') // 발
    return r
  }),
  idle: { kind: 'squash', row: 13 },
  faces: recolorFaces('siam', { e: '#6E9BFF', k: '#F3E3C3' }),
  lines: {
    'ui.idle': ['…냐암. (하품)', '날 깨운 건 너냐옹?', '달이 뜨면 깨울 것.'],
    'ui.lobby.hover': ['빨리 고르라냥. 졸리다냥.', '아무거나 해라냥.'],
    'ui.locked': ['기다리는 건 질색이다냥.', '아직이냥. 가라냥.'],
    'lobby:locked': ['기다리는 건 질색이다냥.'],
    'lobby:minesweeper': ['지뢰는 밟지 마라냥. 발 아프다냥.', '조용히 집중하라냥.'],
    'lobby:tetris': ['고양이는 높은 곳을 좋아한다냥.', '쌓아 올려 보라냥.'],
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
