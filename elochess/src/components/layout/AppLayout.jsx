import { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import AICoachPanel from '../ui/AICoachPanel'
import Toast from '../ui/Toast'
import CommandPalette from '../ui/CommandPalette'
import { useAppStore } from '../../store/useAppStore'
import { getActiveTheme, DEFAULT_THEME_ID } from '../../styles/themes'

// Tailwind's opacity modifiers (bg-gold/10, text-danger/30, ...) need the
// underlying CSS variable to be an "R G B" triplet it can drop into
// rgb(var(--x) / <alpha-value>) — a plain hex string can't be alpha-blended
// by Tailwind since it can't introspect an opaque var() at build time (see
// project memory: this silently produced NO css rule at all for every
// opacity-modified theme-color utility in the app). Kept as a separate
// `-rgb` companion property rather than reformatting --color-* itself,
// since the hex vars are also read directly as raw color values elsewhere
// (globals.css gradients, color-mix() calls, inline JS styles).
const hexToRgbTriplet = hex => {
  const n = parseInt(hex.replace('#', ''), 16)
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`
}

export default function AppLayout({ children }) {
  const [coachOpen, setCoachOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const toast = useAppStore(s => s.toast)
  const themeId = useAppStore(s => s.settings.theme) || DEFAULT_THEME_ID
  const visualMode = useAppStore(s => s.settings.visualMode) || 'tempo'

  // Applies the active theme's CSS variables to the document root. Runs on
  // every theme (or visual-mode) change, not just mount, so switching in
  // Settings retints the whole app immediately — no rebuild, no reload.
  // Tempo/Ply aren't among the 8 medieval THEMES entries — separate modes
  // that reuse the same --color-*/--font-heading application mechanism,
  // plus their own --font-body override (see styles/tempo.js, styles/ply.js).
  useEffect(() => {
    const theme = getActiveTheme(visualMode, themeId)
    const root = document.documentElement
    for (const [key, value] of Object.entries(theme.colors)) {
      root.style.setProperty(`--color-${key}`, value)
      root.style.setProperty(`--color-${key}-rgb`, hexToRgbTriplet(value))
    }
    root.style.setProperty('--font-heading', theme.headingFont)
    root.style.setProperty('--font-body', theme.bodyFont || "'EB Garamond', Georgia, serif")
    root.dataset.theme = theme.id
    root.dataset.visualMode = visualMode
  }, [themeId, visualMode])

  // Global Cmd/Ctrl+K to open the command palette from anywhere in the app.
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen(o => !o)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div className="flex h-full bg-bg overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar onCoachClick={() => setCoachOpen(true)} onPaletteClick={() => setPaletteOpen(true)} />

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* AI Coach Panel */}
      <AICoachPanel open={coachOpen} onClose={() => setCoachOpen(false)} onOpen={() => setCoachOpen(true)} />

      {/* Toast notifications */}
      {toast && <Toast key={toast.id} message={toast.message} type={toast.type} />}

      {/* Command palette (Cmd/Ctrl+K) */}
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  )
}
