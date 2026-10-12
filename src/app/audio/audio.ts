import type { SfxName } from '@/games/types'

/**
 * 효과음 서비스 자리 표시. 7단계에서 WebAudio 칩튠(docs/02 부록 C 레시피)으로 채운다.
 * 게임/UI 는 지금부터 audio.play(name) 만 호출하면 된다.
 */
export interface AudioService {
  play(name: SfxName): void
}

export const audio: AudioService = {
  play(_name) {
    /* 7단계 */
  },
}
