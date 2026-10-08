import { cheese } from './cheese'
import { mackerel } from './mackerel'
import { milk } from './milk'
import { siam } from './siam'
import type { CharacterDef, CharacterId } from './types'

export const CHARACTERS: readonly CharacterDef[] = [cheese, mackerel, milk, siam]
export const CHARACTER_IDS: readonly CharacterId[] = CHARACTERS.map((c) => c.id)
export const DEFAULT_CHARACTER_ID: CharacterId = 'cheese'

const byId = new Map<string, CharacterDef>(CHARACTERS.map((c) => [c.id, c]))

export function findCharacter(id: string | null | undefined): CharacterDef | undefined {
  return id ? byId.get(id) : undefined
}

/** 모르는 id / 미선택이면 기본 캐릭터 */
export function getCharacter(id: string | null | undefined): CharacterDef {
  return findCharacter(id) ?? cheese
}

export { getCharacterClips, buildCharacterClips, faceOf, STAGE } from './compose'
export { getLines, registerGameLines, DEFAULT_LINES, MAX_LINE_LENGTH } from './lines'
export type { CharacterDef, CharacterId, FaceKey, LineKey, LineTable } from './types'
