import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/ui/styles/tokens.css'
import '@/ui/styles/fonts.css'
import '@/ui/styles/base.css'
import '@/ui/styles/layout.css'
import '@/ui/styles/ui.css'
import '@/ui/styles/effects.css'
import { registerFonts } from '@/app/fonts'
import { input } from '@/app/input/input'
import { metrics } from '@/app/metrics'
import { useStore } from '@/app/store'
import { applyCharacterTheme, applyDocumentSettings, watchSystemMotion } from '@/app/theme'
import { findCharacter } from '@/characters'
import App from './App'

// 첫 페인트 전에 --u(DPR 보정)·테마·문서 설정을 적용해 플래시를 막는다
registerFonts()
metrics.install(useStore.getState().settings.uiScale)
input.install()
useStore.subscribe(
  (s) => s.settings,
  (settings) => {
    metrics.setUiScale(settings.uiScale)
    applyDocumentSettings(settings)
  },
  { fireImmediately: true },
)
useStore.subscribe(
  (s) => s.selectedCharacterId,
  (id) => applyCharacterTheme(findCharacter(id)),
  { fireImmediately: true },
)
watchSystemMotion(() => useStore.getState().settings)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
