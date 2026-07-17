import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ScoutOpponentPage from './ScoutOpponentPage'
import { useAppStore } from '../store/useAppStore'
import { useOpeningsStore } from '../store/useOpeningsStore'
import * as ChessComImport from '../core/ChessComImport'

// The recommendation engine (OpponentScout.js) is unit-tested on its own —
// here it's exercised for real against fixture games so the page renders
// its actual output, only the network fetch is mocked.
function lossGame(opening) {
  return { color: 'Black', result: 'Loss', opening }
}

describe('ScoutOpponentPage', () => {
  beforeEach(() => {
    useAppStore.setState({ currentPage: 'scout-opponent' })
    vi.restoreAllMocks()
  })

  it('shows the empty placeholder before scouting', () => {
    render(<ScoutOpponentPage />)
    expect(screen.getByText('No opponent scouted yet')).toBeInTheDocument()
  })

  it('requires a username before scouting', () => {
    render(<ScoutOpponentPage />)
    fireEvent.click(screen.getByText('Scout'))
    expect(screen.getByText('Enter a Chess.com username')).toBeInTheDocument()
  })

  it('no public games found shows an error', async () => {
    vi.spyOn(ChessComImport, 'fetchRecentGames').mockResolvedValue([])
    render(<ScoutOpponentPage />)
    fireEvent.change(screen.getByLabelText("Their Chess.com username"), { target: { value: 'ghost' } })
    fireEvent.click(screen.getByText('Scout'))

    expect(await screen.findByText('No recent public games found for "ghost"')).toBeInTheDocument()
  })

  it('a weak spot that matches a trap shows a "Practice this trap" recommendation', async () => {
    // 3 losses as Black against Italian Game lines — enough to clear MIN_SAMPLE
    // and matches the "fried-liver" trap's opening ("Italian Game", White).
    const games = [lossGame('Italian Game'), lossGame('Italian Game'), lossGame('Italian Game')]
    vi.spyOn(ChessComImport, 'fetchRecentGames').mockResolvedValue(games)
    render(<ScoutOpponentPage />)
    fireEvent.change(screen.getByLabelText("Their Chess.com username"), { target: { value: 'weakling' } })
    fireEvent.click(screen.getByText('Scout'))

    expect(await screen.findByText('3 games analyzed · weakling', { exact: false })).toBeInTheDocument()
    expect(screen.getByText('Play as white')).toBeInTheDocument()
    expect(screen.getByText('Practice this trap')).toBeInTheDocument()
  })

  it('clicking "Practice this trap" sets up the drill and navigates to Openings', async () => {
    const games = [lossGame('Italian Game'), lossGame('Italian Game'), lossGame('Italian Game')]
    vi.spyOn(ChessComImport, 'fetchRecentGames').mockResolvedValue(games)
    render(<ScoutOpponentPage />)
    fireEvent.change(screen.getByLabelText("Their Chess.com username"), { target: { value: 'weakling' } })
    fireEvent.click(screen.getByText('Scout'))

    fireEvent.click(await screen.findByText('Practice this trap'))

    expect(useAppStore.getState().currentPage).toBe('openings')
    expect(useOpeningsStore.getState().drillMode).toBe(true)
    expect(useOpeningsStore.getState().activeColor).toBe('white')
    expect(useOpeningsStore.getState().selectedTrap?.id).toBe('fried-liver')
  })

  it('a weak spot with no matching trap falls back to a plain suggestion', async () => {
    const games = [lossGame('Some Obscure Line'), lossGame('Some Obscure Line'), lossGame('Some Obscure Line')]
    vi.spyOn(ChessComImport, 'fetchRecentGames').mockResolvedValue(games)
    render(<ScoutOpponentPage />)
    fireEvent.change(screen.getByLabelText("Their Chess.com username"), { target: { value: 'weakling' } })
    fireEvent.click(screen.getByText('Scout'))

    expect(await screen.findByText('Some Obscure Line')).toBeInTheDocument()
    expect(screen.queryByText('Practice this trap')).not.toBeInTheDocument()
    expect(screen.getByText('No matching trap in the library yet', { exact: false })).toBeInTheDocument()
  })
})
