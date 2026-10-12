import type { SpriteDef } from '@/pixel/types'
import { MINE_ICON, OMOK_ICON, SNAKE_ICON, TETRIS_ICON } from './icons'
import { minesweeperGame } from './minesweeper'
import { omokGame } from './omok'
import { sampleGame } from './sample'
import { snakeGame } from './snake'
import { tetrisGame } from './tetris'
import type { GameModule } from './types'

/** 등록된 게임 모듈. 새 게임 = 폴더 추가 + 여기 1줄 */
export const GAMES: readonly GameModule[] = [
  minesweeperGame,
  tetrisGame,
  omokGame,
  snakeGame,
  sampleGame,
]

export function getGame(id: string): GameModule | undefined {
  return GAMES.find((g) => g.id === id)
}

/** 로비·기록에 보일 게임. devOnly 모듈(샘플)은 개발자 모드 설정이 켜졌을 때만 */
export function listGames(includeDev = false): GameModule[] {
  return GAMES.filter((g) => includeDev || !g.devOnly)
}

/** 아직 모듈이 없는 예정 게임 — 로비에 잠긴 카드로 보인다. 같은 id 의 모듈이 등록되면 그 자리가 열린다 */
export interface UpcomingGame {
  id: string
  title: string
  description: string
  icon: SpriteDef
}

export const UPCOMING: readonly UpcomingGame[] = [
  {
    id: 'minesweeper',
    title: '지뢰찾기',
    description: '숫자 힌트로 지뢰를 피해 칸을 여는 게임',
    icon: MINE_ICON,
  },
  {
    id: 'tetris',
    title: '테트리스',
    description: '떨어지는 블록을 쌓아 줄을 지우는 게임',
    icon: TETRIS_ICON,
  },
  {
    id: 'omok',
    title: '오목',
    description: '같은 돌 다섯 개를 먼저 잇는 게임',
    icon: OMOK_ICON,
  },
  {
    id: 'snake',
    title: '스네이크',
    description: '츄르를 먹고 길어지는 뱀 고양이',
    icon: SNAKE_ICON,
  },
]

export const LOBBY_SLOTS = 4

export interface LobbyEntry {
  id: string
  title: string
  description: string
  icon?: SpriteDef
  /** null = 잠김 (COMING SOON) */
  module: GameModule | null
}

const toEntry = (m: GameModule): LobbyEntry => ({
  id: m.id,
  title: m.title,
  description: m.description,
  icon: m.icon,
  module: m,
})

/** 로비 카드 목록: 예정 순서 → 그 외 등록 모듈 → 빈 슬롯으로 LOBBY_SLOTS 까지 채움 */
export function lobbyEntries(
  games: readonly GameModule[] = listGames(),
  upcoming: readonly UpcomingGame[] = UPCOMING,
): LobbyEntry[] {
  const entries: LobbyEntry[] = upcoming.map((u) => {
    const m = games.find((g) => g.id === u.id)
    return m ? toEntry(m) : { ...u, module: null }
  })
  for (const g of games) {
    if (!entries.some((e) => e.id === g.id)) entries.push(toEntry(g))
  }
  for (let i = entries.length; i < LOBBY_SLOTS; i++) {
    entries.push({ id: `soon-${i}`, title: '???', description: '새 게임 준비 중', module: null })
  }
  return entries
}
