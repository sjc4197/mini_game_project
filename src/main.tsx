import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/ui/styles/tokens.css'
import '@/ui/styles/fonts.css'
import '@/ui/styles/base.css'
import '@/ui/styles/effects.css'
import { registerFonts } from '@/app/fonts'
import { metrics } from '@/app/metrics'
import { useStore } from '@/app/store'
import { applyAccentForCharacter, applyDocumentSettings, watchSystemMotion } from '@/app/theme'
import App from './App'

// 첫 페인트 전에 --u(DPR 보정)·테마·문서 설정을 적용해 플래시를 막는다
registerFonts()
metrics.install(useStore.getState().settings.uiScale)
useStore.subscribe(
  (s) => s.settings,
  (settings) => {
    metrics.setUiScale(settings.uiScale)
    applyDocumentSettings(settings)
  },
  { fireImmediately: true },
)
useStore.subscribe((s) => s.selectedCharacterId, applyAccentForCharacter, { fireImmediately: true })
watchSystemMotion(() => useStore.getState().settings)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
