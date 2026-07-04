import '@testing-library/jest-dom'
import { beforeEach } from 'vitest'

// Note: modules that import useAppStore.js (directly or transitively) instantiate
// singleton managers (ProgressManager, SpacedRepetitionEngine) at *module load time*,
// which read localStorage and award daily-login XP before this file ever runs.
// Clearing here only guarantees a clean slate for each test going forward, not for
// that first import.
beforeEach(() => {
  localStorage.clear()
})
