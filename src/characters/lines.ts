import type { CharacterDef, CharacterId, LineKey, LineTable } from './types'

/** 말풍선 2줄 한계 */
export const MAX_LINE_LENGTH = 24

/** 캐릭터 테이블에 없을 때의 공용 대사 */
export const DEFAULT_LINES: LineTable = {
  'game.start': ['시작!'],
  'game.good': ['좋아!'],
  'game.great': ['대단해!'],
  'game.risky': ['조심…'],
  'game.safe': ['휴…'],
  'game.mistake': ['앗…'],
  'game.think': ['음…'],
  'game.fail': ['아쉽다…'],
  'game.win': ['클리어!'],
  'game.record': ['신기록!'],
  'ui.lobby.hover': ['어떤 게임 할래?'],
  'ui.locked': ['아직 준비 중이야.'],
  'ui.idle': ['…'],
  'lobby:locked': ['아직 준비 중이야.'],
}

const gameLines = new Map<string, Partial<Record<CharacterId, LineTable>>>()

/** 게임 모듈이 캐릭터별 전용 대사를 등록 (예: 테트리스 '테트리스!' 변형). 조회 시 최우선 */
export function registerGameLines(
  gameId: string,
  table: Partial<Record<CharacterId, LineTable>>,
): void {
  gameLines.set(gameId, table)
}

/** 조회 순서: 게임 전용 → 캐릭터 → DEFAULT → [] */
export function getLines(
  character: CharacterDef,
  key: LineKey,
  gameId?: string,
): readonly string[] {
  const fromGame = gameId ? gameLines.get(gameId)?.[character.id]?.[key] : undefined
  if (fromGame && fromGame.length > 0) return fromGame
  const own = character.lines[key]
  if (own && own.length > 0) return own
  return DEFAULT_LINES[key] ?? []
}

/** 테스트/검수용: 길이 초과 대사 목록 */
export function overlongLines(table: LineTable): string[] {
  return Object.values(table)
    .flat()
    .filter((line): line is string => typeof line === 'string' && line.length > MAX_LINE_LENGTH)
}
