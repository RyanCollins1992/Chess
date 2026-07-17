import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import GameReviewPage from './GameReviewPage'
import { useAppStore } from '../store/useAppStore'

// With no global Worker, ReviewEngine.init()'s `new Worker(...)` throws
// synchronously and its catch block resolves the pool-init promise
// immediately — but that resolution still lands as a microtask after
// mount, so setSfReady(false) can land mid-test and trip React's act()
// warning unless it's flushed right after render.
async function renderPage() {
  const utils = render(<GameReviewPage />)
  await act(async () => { await Promise.resolve() })
  return utils
}

// The Stockfish worker pool (ReviewEngine) construction is wrapped in its
// own try/catch and resolves `false` on failure, so with no global `Worker`
// at all these tests exercise the real "engine unavailable" path rather
// than needing a fake — sfReady simply stays false, which is itself a
// legitimate state to verify (Analyse Game stays disabled). The actual
// move-classification math (classifyMove, moveAccuracy, isBrilliantMove
// etc.) already has 55 dedicated tests in GameAnalysis.test.js; this file
// covers the page's own import/nav/tab behavior instead of re-driving a
// full Stockfish handshake here.
const samplePgn = `[Event "Live Chess"]
[Date "2026.07.01"]
[White "hikaru"]
[Black "opponent1"]
[Result "1-0"]
[WhiteElo "2800"]
[BlackElo "2200"]

1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. O-O Nf6 1-0`

describe('GameReviewPage', () => {
  beforeEach(() => {
    useAppStore.setState({ reviewGame: null })
  })

  it('shows the Import panel when no game is loaded', async () => {
    await renderPage()
    expect(screen.getByText('Load a Game')).toBeInTheDocument()
  })

  it('requires a PGN before loading', async () => {
    await renderPage()
    fireEvent.click(screen.getByText('Load Game →'))
    expect(screen.getByText('Paste a PGN to continue')).toBeInTheDocument()
  })

  it('rejects invalid PGN', async () => {
    await renderPage()
    fireEvent.change(screen.getByPlaceholderText(/White "Player"/), { target: { value: 'not a real pgn at all' } })
    fireEvent.click(screen.getByText('Load Game →'))
    expect(screen.getByText('Invalid PGN — check the format and try again')).toBeInTheDocument()
  })

  it('loading a valid PGN shows the game panel', async () => {
    await renderPage()
    fireEvent.change(screen.getByPlaceholderText(/White "Player"/), { target: { value: samplePgn } })
    fireEvent.click(screen.getByText('Load Game →'))

    expect(screen.getByText('vs opponent1 (2200)', { exact: false })).toBeInTheDocument()
    expect(useAppStore.getState().reviewGame).toMatchObject({ opponent: 'opponent1', result: 'Win' })
  })

  it('Analyse Game stays disabled while the Stockfish pool is unavailable', async () => {
    await renderPage()
    fireEvent.change(screen.getByPlaceholderText(/White "Player"/), { target: { value: samplePgn } })
    fireEvent.click(screen.getByText('Load Game →'))

    const btn = screen.getByText('⏳ Loading…')
    expect(btn).toBeDisabled()
  })

  it('Next/Previous move navigation updates the move label', async () => {
    await renderPage()
    fireEvent.change(screen.getByPlaceholderText(/White "Player"/), { target: { value: samplePgn } })
    fireEvent.click(screen.getByText('Load Game →'))

    expect(screen.getByText('Start')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Next move'))
    expect(screen.getByText('Move 1')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Previous move'))
    expect(screen.getByText('Start')).toBeInTheDocument()
  })

  it('Last/First move jump to the ends of the game', async () => {
    await renderPage()
    fireEvent.change(screen.getByPlaceholderText(/White "Player"/), { target: { value: samplePgn } })
    fireEvent.click(screen.getByText('Load Game →'))

    fireEvent.click(screen.getByLabelText('Last move'))
    expect(screen.getByLabelText('Next move')).toBeDisabled()
    fireEvent.click(screen.getByLabelText('First move'))
    expect(screen.getByLabelText('Previous move')).toBeDisabled()
  })

  it('Load New returns to the Import panel and clears the store', async () => {
    await renderPage()
    fireEvent.change(screen.getByPlaceholderText(/White "Player"/), { target: { value: samplePgn } })
    fireEvent.click(screen.getByText('Load Game →'))

    fireEvent.click(screen.getByText('← Load New'))
    expect(screen.getByText('Load a Game')).toBeInTheDocument()
    expect(useAppStore.getState().reviewGame).toBeNull()
  })

  it('Report and Key moments tabs show placeholders before analysis has run', async () => {
    await renderPage()
    fireEvent.change(screen.getByPlaceholderText(/White "Player"/), { target: { value: samplePgn } })
    fireEvent.click(screen.getByText('Load Game →'))

    fireEvent.click(screen.getByText('Report'))
    expect(screen.getByText('Run analysis to see your report.')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Key moments'))
    expect(screen.getByText('Run analysis to see key moments.')).toBeInTheDocument()
  })

  it('switching to the URL tab and typing a Chess.com link shows the manual-PGN instructions', async () => {
    await renderPage()
    fireEvent.click(screen.getByText('URL'))
    fireEvent.change(screen.getByPlaceholderText('https://lichess.org/AbCd1234'), { target: { value: 'https://www.chess.com/game/live/12345' } })

    expect(screen.getByText("Chess.com doesn't allow direct URL import")).toBeInTheDocument()
    expect(screen.getByText('Chess.com — use PGN tab ↑')).toBeDisabled()
  })

  it('an unrecognised URL shows an error on Enter', async () => {
    await renderPage()
    fireEvent.click(screen.getByText('URL'))
    const input = screen.getByPlaceholderText('https://lichess.org/AbCd1234')
    fireEvent.change(input, { target: { value: 'not a url' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(screen.getByText('Unrecognised URL — paste a Lichess game link (e.g. lichess.org/AbCd1234)')).toBeInTheDocument()
  })

  it('fetching a valid Lichess URL loads the game', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => samplePgn }))
    await renderPage()
    fireEvent.click(screen.getByText('URL'))
    fireEvent.change(screen.getByPlaceholderText('https://lichess.org/AbCd1234'), { target: { value: 'https://lichess.org/AbCd1234' } })
    fireEvent.click(screen.getByText('Fetch from Lichess →'))

    expect(await screen.findByText('vs opponent1 (2200)', { exact: false })).toBeInTheDocument()
  })

  it('a 404 from Lichess shows a "not found" error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404, text: async () => '' }))
    await renderPage()
    fireEvent.click(screen.getByText('URL'))
    fireEvent.change(screen.getByPlaceholderText('https://lichess.org/AbCd1234'), { target: { value: 'https://lichess.org/AbCd1234' } })
    fireEvent.click(screen.getByText('Fetch from Lichess →'))

    expect(await screen.findByText('Game "AbCd1234" not found on Lichess')).toBeInTheDocument()
  })
})
