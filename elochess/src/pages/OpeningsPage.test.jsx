import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { Chess } from 'chess.js'
import OpeningsPage from './OpeningsPage'
import { useOpeningsStore } from '../store/useOpeningsStore'
import { useAppStore } from '../store/useAppStore'
import { srsEngine } from '../core/SpacedRepetitionEngine'
import { TRAPS } from '../data/traps'

const click = (container, id) => fireEvent.click(container.querySelector(`[data-square="${id}"]`))

// Fried Liver Attack (color: 'white') — the "hero" side is White, so only
// White's own plies (even indices) ever need dragging; Black's replies
// auto-play via the component's own 500ms timeout. Clicking Black's squares
// too (relying on a fixed short delay to land before the auto-play does) was
// flaky under full-suite CPU contention, so this only clicks White's moves
// and waits out the full auto-play delay between each one.
function solveFriedLiverWhiteMoves() {
  const trap = TRAPS.find(t => t.id === 'fried-liver')
  const chess = new Chess(trap.fen)
  const plies = trap.moves.map(san => {
    const move = chess.move(san)
    return { from: move.from, to: move.to }
  })
  return plies.filter((_, i) => i % 2 === 0)
}

describe('OpeningsPage', () => {
  beforeEach(() => {
    useOpeningsStore.setState({ activeColor: 'white', searchQuery: '', selectedTrap: null })
    srsEngine._cards = {}
  })

  it('defaults to the White tab showing both openings and traps', () => {
    render(<OpeningsPage />)
    expect(screen.getByText('Italian Game: Giuoco Piano')).toBeInTheDocument()
    expect(screen.getByText('Fried Liver Attack')).toBeInTheDocument()
    expect(screen.getByText('Select a trap to study')).toBeInTheDocument()
  })

  it('switching to the Black tab shows black-side content only', () => {
    render(<OpeningsPage />)
    fireEvent.click(screen.getByText('Black'))
    expect(screen.queryByText('Fried Liver Attack')).not.toBeInTheDocument()
    expect(screen.queryByText('Italian Game: Giuoco Piano')).not.toBeInTheDocument()
  })

  it('switching to the Mates tab shows only the Traps section', () => {
    render(<OpeningsPage />)
    fireEvent.click(screen.getByText('Mates'))
    expect(screen.getByText("Scholar's Mate")).toBeInTheDocument()
    expect(screen.queryByText('Openings')).not.toBeInTheDocument()
  })

  it('search narrows both the openings and traps lists', () => {
    render(<OpeningsPage />)
    fireEvent.change(screen.getByPlaceholderText('Search traps, openings…'), { target: { value: 'fried liver' } })
    expect(screen.getByText('Fried Liver Attack')).toBeInTheDocument()
    expect(screen.queryByText('Italian Game: Giuoco Piano')).not.toBeInTheDocument()
  })

  it('an unmatched search shows the empty state', () => {
    render(<OpeningsPage />)
    fireEvent.change(screen.getByPlaceholderText('Search traps, openings…'), { target: { value: 'zzznotreal' } })
    expect(screen.getByText('No results found')).toBeInTheDocument()
  })

  it('selecting a repertoire line shows it fully browsed by default', () => {
    render(<OpeningsPage />)
    fireEvent.click(screen.getByText('Italian Game: Giuoco Piano'))
    expect(screen.getByText('📖 Opening Theory')).toBeInTheDocument()
    expect(screen.getByText('Move 8 of 8')).toBeInTheDocument() // 15 half-moves -> ceil(15/2)=8, full line
  })

  it('Prev in the repertoire browser steps back one ply', () => {
    render(<OpeningsPage />)
    fireEvent.click(screen.getByText('Italian Game: Giuoco Piano'))
    fireEvent.click(screen.getByText('◀ Prev'))
    expect(screen.getByText('Move 7 of 8')).toBeInTheDocument()
  })

  it('selecting a trap shows Drill mode with the trap name and key concept', () => {
    render(<OpeningsPage />)
    fireEvent.click(screen.getByText('Fried Liver Attack'))
    expect(screen.getByText('🎯 Drill Mode')).toBeInTheDocument()
    expect(screen.getByText('Nxf7!! sacrifice — aggressive knight sacrifice for a devastating attack')).toBeInTheDocument()
  })

  it('selecting a trap after a line clears the repertoire view', () => {
    render(<OpeningsPage />)
    fireEvent.click(screen.getByText('Italian Game: Giuoco Piano'))
    fireEvent.click(screen.getByText('Fried Liver Attack'))
    expect(screen.queryByText('📖 Opening Theory')).not.toBeInTheDocument()
    expect(screen.getByText('🎯 Drill Mode')).toBeInTheDocument()
  })

  it('a wrong move flashes an error and does not advance', async () => {
    const { container } = render(<OpeningsPage />)
    fireEvent.click(screen.getByText('Fried Liver Attack'))

    // e2-e3 is legal but not the trap's scripted first move (e4).
    click(container, 'e2')
    click(container, 'e3')

    // Toast UI isn't rendered inside OpeningsPage's own tree, so the toast
    // is verified via the store showToast() actually wrote to.
    expect(useAppStore.getState().toast?.message).toBe('Not the right move — try again!')
    expect(await screen.findByText('(1 mistake)', { exact: false })).toBeInTheDocument()
  })

  // Fake timers make the auto-played opponent reply (a real setTimeout
  // inside the component) deterministic and instant instead of racing
  // against a fixed real-clock delay, which was flaky under full-suite CPU
  // contention (and slow: 7 real 600ms waits pushed this well past
  // vitest's default 5000ms test timeout under load).
  describe('with the auto-played opponent reply', () => {
    beforeEach(() => { vi.useFakeTimers() })
    afterEach(() => { vi.useRealTimers() })

    it('playing the correct line completes the drill and auto-enrolls in SRS', () => {
      const { container } = render(<OpeningsPage />)
      fireEvent.click(screen.getByText('Fried Liver Attack'))

      const whiteMoves = solveFriedLiverWhiteMoves()
      whiteMoves.forEach(({ from, to }, i) => {
        click(container, from)
        click(container, to)
        if (i < whiteMoves.length - 1) {
          act(() => { vi.advanceTimersByTime(600) }) // let Black's auto-played reply land
        }
      })

      expect(screen.getByText('✅ Complete!')).toBeInTheDocument()
      expect(screen.getByText('🔁 In Spaced Review ✓')).toBeInTheDocument()
      expect(srsEngine.isEnrolled('fried-liver')).toBe(true)
    })

    it('Switch to Browse resets the board to the start of the line, not wherever the drill left off', () => {
      const { container } = render(<OpeningsPage />)
      fireEvent.click(screen.getByText('Fried Liver Attack'))

      click(container, 'e2') // e4, the trap's actual first move
      click(container, 'e4')
      act(() => { vi.advanceTimersByTime(600) }) // let the auto-played Black reply land

      fireEvent.click(screen.getByText('Switch to Browse'))
      expect(screen.getByText('📖 Browse Mode')).toBeInTheDocument()
      expect(screen.getByText('Start')).toBeInTheDocument()
    })
  })

  it('Restart resets a partially-played drill', () => {
    const { container } = render(<OpeningsPage />)
    fireEvent.click(screen.getByText('Fried Liver Attack'))

    click(container, 'e2')
    click(container, 'e4')

    fireEvent.click(screen.getByText('↺ Restart'))
    expect(screen.getByText('Start')).toBeInTheDocument()
  })

  it('manually toggling Spaced Review enrolls and unenrolls without completing the drill', () => {
    render(<OpeningsPage />)
    fireEvent.click(screen.getByText('Fried Liver Attack'))

    fireEvent.click(screen.getByText('+ Add to Spaced Review'))
    expect(srsEngine.isEnrolled('fried-liver')).toBe(true)
    expect(screen.getByText('🔁 In Spaced Review ✓')).toBeInTheDocument()

    fireEvent.click(screen.getByText('🔁 In Spaced Review ✓'))
    expect(srsEngine.isEnrolled('fried-liver')).toBe(false)
    expect(screen.getByText('+ Add to Spaced Review')).toBeInTheDocument()
  })
})
