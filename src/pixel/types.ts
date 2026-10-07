/** 마스코트 표정. 캐릭터 스프라이트·세션 스토어·게임 호스트가 공유하는 단일 출처 */
export const MOODS = ['idle', 'happy', 'worried', 'sad', 'win', 'think'] as const
export type Mood = (typeof MOODS)[number]
