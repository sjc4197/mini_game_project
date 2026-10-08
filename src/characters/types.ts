import type { MascotEvent } from '@/games/types'
import type { Accent, AccentId } from '@/pixel/palette'
import type { Mood, Point, SpriteDef } from '@/pixel/types'

export type CharacterId = AccentId

/** 표정 타일 키: 무드 6종 + 눈 깜빡임 */
export type FaceKey = Mood | 'blink'

export type LineKey = MascotEvent | 'lobby:locked' | `lobby:${string}`
export type LineTable = Partial<Record<LineKey, readonly string[]>>

export interface CharacterDef {
  id: CharacterId
  name: string
  /** 한 줄 소개 */
  bio: string
  personality: string
  /** 전문 게임 (로비/선택 화면 표시용) */
  specialty: string
  accent: Accent
  /** 몸통 24×24 (얼굴 없음). points: face / side / head / think 필수 */
  body: SpriteDef & { points: Readonly<Record<'face' | 'side' | 'head' | 'think', Point>> }
  /** idle 2번째 프레임 생성 규칙 (재작화 없음) */
  idle: { kind: 'squash'; row: number } | { kind: 'bob' }
  /** 공용 얼굴 타일을 캐릭터별로 덮어쓸 때 (예: 큐보 LED 눈, 달냥 반쯤 감은 눈) */
  faces?: Partial<Record<FaceKey, SpriteDef>>
  lines: LineTable
}
