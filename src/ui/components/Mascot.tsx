import { getCharacterClips } from '@/characters'
import type { CharacterDef } from '@/characters/types'
import type { Mood } from '@/pixel/types'
import { PixelSprite, type PixelSpriteProps } from './PixelSprite'

interface Props extends Omit<PixelSpriteProps, 'clip' | 'label'> {
  character: CharacterDef
  mood?: Mood
}

/** 캐릭터 + 무드 → 해당 클립의 PixelSprite (mood 가 바뀌면 클립만 바뀌고 canvas 는 유지) */
export function Mascot({ character, mood = 'idle', ...rest }: Props) {
  return <PixelSprite clip={getCharacterClips(character)[mood]} label={character.name} {...rest} />
}
