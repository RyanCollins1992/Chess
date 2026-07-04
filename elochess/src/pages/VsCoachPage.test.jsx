import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import VsCoachPage from './VsCoachPage'

// Minimal mock of the Stockfish Worker. Captures the latest instance and every message
// posted to it, so a test can drive its onmessage handler directly — simulating a UCI
// handshake/bestmove reply arriving asynchronously, including (deliberately) after the
// component has unmounted and called worker.terminate(). Real Worker.terminate() doesn't
// retroactively cancel a message that already arrived/queued, so this reproduces that
// race rather than the (already-handled-by-clearTimeout) handshake-timeout path.
//
// Note: React 19 no longer warns on setState-after-unmount (state updates on a detached
// fiber are simply no-ops), so a "did it throw/warn" assertion can't detect this bug.
// Instead we assert on an observable side effect of makeAiMove() actually running:
// whether it posts 'go depth ...' to the worker to request a move evaluation.
let lastWorkerInstance = null
class FakeWorker {
  constructor() {
    this.onmessage = null
    this.terminated = false
    this.postedMessages = []
    lastWorkerInstance = this
  }
  postMessage(msg) {
    this.postedMessages.push(msg)
  }
  terminate() {
    this.terminated = true
  }
}

describe('VsCoachPage', () => {
  let originalWorker

  beforeEach(() => {
    originalWorker = globalThis.Worker
    globalThis.Worker = FakeWorker
    lastWorkerInstance = null
  })

  afterEach(() => {
    cleanup()
    globalThis.Worker = originalWorker
    vi.useRealTimers()
  })

  it('mounts into the setup screen without throwing', () => {
    render(<VsCoachPage />)
    expect(screen.getByText('Start Game')).toBeInTheDocument()
  })

  it('does not throw or update state after unmount when the AI-moves-first path is pending', async () => {
    const user = userEvent.setup()
    render(<VsCoachPage />)

    // Play as Black so the AI (white) moves first via the worker handshake.
    await user.click(screen.getByText('♚ Black'))
    await user.click(screen.getByText('Start Game'))

    expect(screen.getByText(/Coach ·/)).toBeInTheDocument()

    // Unmount before the worker ever replies to the 'uci' handshake message.
    expect(() => cleanup()).not.toThrow()
  })

  it('does not run the AI-move pipeline (or touch game state) when a worker reply arrives after unmount', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<VsCoachPage />)

    await user.click(screen.getByText('♚ Black'))
    await user.click(screen.getByText('Start Game'))

    const worker = lastWorkerInstance
    expect(worker).not.toBeNull()

    unmount()
    worker.postedMessages.length = 0 // clear the initial handshake's 'uci' message

    // Simulate the worker's UCI handshake completing AFTER the component has
    // unmounted — a real race, since worker.terminate() does not retroactively cancel
    // an in-flight/queued message. The 'readyok' handler is what calls makeAiMove();
    // with the isMounted guard, makeAiMove() should bail out immediately and never
    // reach getBestMove(), so no 'go depth ...' message should ever be posted.
    expect(() => {
      worker.onmessage({ data: 'uciok' })
      worker.onmessage({ data: 'readyok' })
    }).not.toThrow()

    // Let the makeAiMove() promise chain settle before asserting.
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(worker.postedMessages.some(m => m.startsWith('go depth'))).toBe(false)
  })
})
