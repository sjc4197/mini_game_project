import { ACCENTS } from '@/pixel/palette'
import { CHEST, TABBY_STRIPES, catBody, paint } from './template'
import type { CharacterDef } from './types'

/** 고등어 — 회청색 고등어태비. 짙은 줄무늬, 흰 가슴 */
export const mackerel: CharacterDef = {
  id: 'mackerel',
  name: '고등어',
  bio: '가만히 있는 법을 모르는 장난꾸러기 고등어태비',
  personality: '활발함, 장난꾸러기',
  specialty: '우다다',
  accent: ACCENTS.mackerel,
  body: catBody(
    'mackerel.body',
    {
      k: '$ink',
      r: '#A9BBD3',
      t: '#A9BBD3',
      f: '#F2F5FA',
      d: '#5F7294',
      w: '#F2F5FA',
      p: '#FF9DA6',
    },
    (rows) => paint(paint(rows, TABBY_STRIPES), CHEST),
  ),
  idle: { kind: 'squash', row: 24 },
  lines: {
    'ui.idle': ['놀자! 뭐든 좋아!', '꼬리 잡기 할 사람!', '후다닥! …아무것도 아냐.'],
    'ui.lobby.hover': ['빨리빨리! 뭐 할 거야?', '다 재밌어 보여!'],
    'ui.locked': ['아직 문이 안 열렸어. 긁어볼까?', '준비 중이래!'],
    'lobby:locked': ['아직 문이 안 열렸어. 긁어볼까?'],
    'lobby:minesweeper': ['보물찾기 같은 거지? 좋아!', '전부 다 뒤집어 보자!'],
    'lobby:tetris': ['블록 떨어지는 거 잡을래!', '쌓고 무너뜨리고! 최고!'],
    'game.start': ['출발! 후다닥!', '준비, 땅!', '가자가자!'],
    'game.good': ['오오! 잘한다!', '그거야 그거!', '신난다!'],
    'game.great': ['우와아! 대박!', '방금 거 뭐야! 멋져!'],
    'game.risky': ['어, 어, 어… 위험해!', '털이 곤두서…', '조심조심!'],
    'game.safe': ['휴~ 살았다!', '됐어! 계속!'],
    'game.mistake': ['앗! 괜찮아 괜찮아!', '에이, 다시!'],
    'game.think': ['음… 음…', '어디로 가지?', '생각 중! 방해 금지!'],
    'game.fail': ['으아… 아쉽다!', '다시! 한 번 더!', '다음엔 이긴다!'],
    'game.win': ['이겼다! 야호!', '봤지? 봤지?', '클리어! 뛰자!'],
    'game.record': ['신기록! 최고 최고!', '역대 최고야!'],
  },
}
