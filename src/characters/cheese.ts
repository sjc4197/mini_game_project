import { ACCENTS } from '@/pixel/palette'
import { CHEST, TABBY_STRIPES, catBody, paint } from './template'
import type { CharacterDef } from './types'

/** 치즈 — 주황 치즈태비. 이마·옆구리·꼬리 줄무늬, 흰 가슴 */
export const cheese: CharacterDef = {
  id: 'cheese',
  name: '치즈',
  bio: '간식 앞에서만 빨라지는 느긋한 치즈태비',
  personality: '먹보, 느긋함',
  specialty: '낮잠과 간식',
  accent: ACCENTS.cheese,
  body: catBody(
    'cheese.body',
    {
      k: '$ink',
      r: '#FFB454',
      t: '#FFB454',
      f: '#FFF4E0',
      d: '#E08A2E',
      w: '#FFF4E0',
      p: '#FF9DA6',
    },
    (rows) => paint(paint(rows, TABBY_STRIPES), CHEST),
  ),
  idle: { kind: 'squash', row: 24 },
  lines: {
    'ui.idle': ['냠… 간식 시간 아직이야?', '햇볕 좋다… 식빵 굽는 중.', '배 만지면 안 돼.'],
    'ui.lobby.hover': ['뭐든 좋아. 간식 걸고 하자.', '빨리 고르면 간식 줄게.'],
    'ui.locked': ['거긴 아직 간식이 없대.', '준비 중이래. 기다려.'],
    'lobby:locked': ['거긴 아직 간식이 없대.'],
    'lobby:minesweeper': ['지뢰보다 츄르 찾는 게 빠른데.', '조심조심… 밟으면 아야.'],
    'lobby:tetris': ['블록 쌓기? 간식 쌓기면 좋을 텐데.', '네모난 거 좋아. 상자 같아.'],
    'game.start': ['시작! 밥 먹기 전에 끝내자.', '좋아, 식빵 자세 준비.', '가자… 천천히.'],
    'game.good': ['오, 잘하네. 간식 하나 적립.', '냠냠, 이 맛이야.', '그렇지, 그렇지.'],
    'game.great': ['우와! 츄르 두 개 적립!', '이건 간식 파티감이야!'],
    'game.risky': ['잠깐… 거기 좀 불안한데.', '꼬리가 부풀어…', '으으, 조심해…'],
    'game.safe': ['휴, 살았다. 간식 먹자.', '됐다 됐다.'],
    'game.mistake': ['앗… 괜찮아, 간식은 안 뺏어.', '에구, 그럴 수 있지.'],
    'game.think': ['음… 자고 일어나서 생각할까.', '천천히 해. 난 졸려.', '어디가 좋을까~'],
    'game.fail': ['흑… 간식으로 위로하자.', '괜찮아, 다시 하면 돼.', '다음엔 꼭… 냠.'],
    'game.win': ['클리어! 간식 파티다!', '봤지? 이게 식빵의 힘이야.', '해냈다~ 냠냠!'],
    'game.record': ['신기록! 츄르 열 개 각!', '역대 최고! 기록 적어 둬.'],
  },
}
