import '@testing-library/jest-dom'
import { beforeEach } from 'vitest'

// jsdom never computes real layout, so every element's getBoundingClientRect()
// returns all-zero dimensions. react-chessboard's move-slide animation reads a
// square's width to compute the slide distance and throws ("Square width not
// found") if it's 0 — harmless in a real browser, fatal here. A fixed non-zero
// size is enough to let that code path run without needing real layout.
Element.prototype.getBoundingClientRect = () => ({
  width: 64, height: 64, top: 0, left: 0, right: 64, bottom: 64, x: 0, y: 0, toJSON() {},
})

// Note: modules that import useAppStore.js (directly or transitively) instantiate
// singleton managers (ProgressManager, SpacedRepetitionEngine) at *module load time*,
// which read localStorage and award daily-login XP before this file ever runs.
// Clearing here only guarantees a clean slate for each test going forward, not for
// that first import.
beforeEach(() => {
  localStorage.clear()
})
