import { create } from 'zustand'
import { progressManager } from '../core/ProgressManager'
import { srsEngine } from '../core/SpacedRepetitionEngine'

export const useAppStore = create((set, get) => ({
  // ── Navigation ───────────────────────────────────────────────────
  currentPage:    'openings',
  sidebarOpen:    false,

  navigate: (page) => set({ currentPage: page, sidebarOpen: false }),
  toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),
  closeSidebar:  () => set({ sidebarOpen: false }),

  // ── Progress (synced from ProgressManager) ───────────────────────
  progress: progressManager.getSnapshot(),
  dueCount: srsEngine.getDueCount(),

  refreshProgress: () => set({
    progress: progressManager.getSnapshot(),
    dueCount: srsEngine.getDueCount(),
  }),

  // ── Settings ─────────────────────────────────────────────────────
  settings: (() => {
    try { return JSON.parse(localStorage.getItem('elochess-settings')) || {} } catch { return {} }
  })(),

  updateSettings: (patch) => {
    const next = { ...get().settings, ...patch }
    localStorage.setItem('elochess-settings', JSON.stringify(next))
    set({ settings: next })
  },

  // ── Global UI ────────────────────────────────────────────────────
  toast:    null,
  showToast: (message, type = 'info', duration = 3000) => {
    set({ toast: { message, type, id: Date.now() } })
    setTimeout(() => set({ toast: null }), duration)
  },
}))
