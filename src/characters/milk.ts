import { ACCENTS } from '@/pixel/palette'
import { loafBody } from './loaf'
import type { CharacterDef } from './types'

/** 우유 — 흰 고양이. 무늬 없이 새하얗고 귀 속과 볼이 분홍 */
export const milk: CharacterDef = {
  id: 'milk',
  name: '우유',
  bio: '수줍지만 늘 옆에서 응원해 주는 흰 고양이',
  personality: '수줍음, 다정함',
  specialty: '응원',
  accent: ACCENTS.milk,
  body: loafBody('milk.body', { k: '$ink', r: '#FBF6EC', d: '#E6DECD' }),
  idle: { kind: 'squash', row: 13 },
  lines: {
    'ui.idle': ['…안녕. 여기 있을게.', '(살짝 손 흔듦)', '오늘도 같이 놀자.'],
    'ui.lobby.hover': ['뭐든 좋아… 네가 고른 거면.', '천천히 골라도 돼.'],
    'ui.locked': ['아직은… 들어갈 수 없나 봐.', '조금만 기다려 줘.'],
    'lobby:locked': ['아직은… 들어갈 수 없나 봐.'],
    'lobby:minesweeper': ['무섭지만… 같이 하면 괜찮아.', '조심히 하자.'],
    'lobby:tetris': ['블록 쌓는 거 좋아해.', '차곡차곡… 예쁘게.'],
    'game.start': ['응원할게. 힘내.', '같이 하자.', '천천히… 시작.'],
    'game.good': ['잘했어… 정말.', '우와, 대단해.', '멋져.'],
    'game.great': ['와… 정말 멋져!', '감동이야.'],
    'game.risky': ['조, 조심해…', '괜찮은 거지…?', '무서워…'],
    'game.safe': ['휴… 다행이야.', '괜찮아졌어.'],
    'game.mistake': ['괜찮아… 누구나 그래.', '다음엔 잘될 거야.'],
    'game.think': ['음… 같이 생각해 볼까.', '천천히 해도 돼.', '어디가 좋을까…'],
    'game.fail': ['괜찮아… 옆에 있을게.', '울지 마… 다시 하자.', '다음엔 꼭.'],
    'game.win': ['해냈다! 네가 자랑스러워.', '우와… 클리어!', '정말 잘했어.'],
    'game.record': ['신기록… 정말 대단해!', '최고야. 진심으로.'],
  },
}
