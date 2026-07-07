import { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import AICoachPanel from '../ui/AICoachPanel'
import Toast from '../ui/Toast'
import { useAppStore } from '../../store/useAppStore'
import { getTheme, DEFAULT_THEME_ID } from '../../styles/themes'
import { TEMPO_THEME } from '../../styles/tempo'

export default function AppLayout({ children }) {
  const [coachOpen, setCoachOpen] = useState(false)
  const toast = useAppStore(s => s.toast)
  const themeId = useAppStore(s => s.settings.theme) || DEFAULT_THEME_ID
  const visualMode = useAppStore(s => s.settings.visualMode) || 'medieval'

  // Applies the active theme's CSS variables to the document root. Runs on
  // every theme (or visual-mode) change, not just mount, so switching in
  // Settings retints the whole app immediately — no rebuild, no reload.
  // Tempo isn't one of the 8 medieval THEMES entries — it's a separate mode
  // that happens to reuse the same --color-*/--font-heading application
  // mechanism, plus its own --font-body override (see src/styles/tempo.js).
  useEffect(() => {
    const theme = visualMode === 'tempo' ? TEMPO_THEME : getTheme(themeId)
    const root = document.documentElement
    for (const [key, value] of Object.entries(theme.colors)) {
      root.style.setProperty(`--color-${key}`, value)
    }
    root.style.setProperty('--font-heading', theme.headingFont)
    root.style.setProperty('--font-body', theme.bodyFont || "'EB Garamond', Georgia, serif")
    root.dataset.theme = theme.id
    root.dataset.visualMode = visualMode
  }, [themeId, visualMode])

  return (
    <div className="flex h-full bg-bg overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar onCoachClick={() => setCoachOpen(true)} />

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* AI Coach Panel */}
      <AICoachPanel open={coachOpen} onClose={() => setCoachOpen(false)} onOpen={() => setCoachOpen(true)} />

      {/* Toast notifications */}
      {toast && <Toast key={toast.id} message={toast.message} type={toast.type} />}
    </div>
  )
}
