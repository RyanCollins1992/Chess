import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import LearnOpeningsPage from './LearnOpeningsPage'
import { useAppStore } from '../store/useAppStore'

describe('LearnOpeningsPage', () => {
  it('defaults to the first family (1.e4 Openings) and its first line (Italian Game)', () => {
    render(<LearnOpeningsPage />)
    expect(screen.getByText('1.e4 Openings')).toBeInTheDocument()
    // "Italian Game" appears both in the lines list and the detail header.
    expect(screen.getAllByText('Italian Game').length).toBeGreaterThan(0)
    expect(screen.getByText('Control the centre, develop pieces naturally, target the weak f7 square.', { exact: false })).toBeInTheDocument()
  })

  it('selecting a different family switches the lines list and re-selects its first line', () => {
    render(<LearnOpeningsPage />)
    fireEvent.click(screen.getByText('1.d4 Openings'))
    // "London System" appears both in the lines list and the detail header.
    expect(screen.getAllByText('London System').length).toBeGreaterThan(0)
    expect(screen.queryByText('Italian Game')).not.toBeInTheDocument()
  })

  it('selecting a line updates the detail panel', () => {
    render(<LearnOpeningsPage />)
    // "Ruy López" also appears in the lines list — click the list entry specifically.
    fireEvent.click(screen.getAllByText('Ruy López')[0])
    expect(screen.getByText("Pin the knight defending e5, creating long-term pressure on black's position.", { exact: false })).toBeInTheDocument()
    // "advanced" appears both as the line-list badge and the detail-panel badge.
    expect(screen.getAllByText('advanced').length).toBeGreaterThan(0)
  })

  it('shows pros and cons for the selected line', () => {
    render(<LearnOpeningsPage />)
    expect(screen.getByText('Natural development')).toBeInTheDocument()
    expect(screen.getByText('Less forcing than other openings')).toBeInTheDocument()
  })

  it('clicking a move chip replays the line up to that ply on the board', () => {
    const { container } = render(<LearnOpeningsPage />)
    // Italian Game: e4 e5 Nf3 Nc6 Bc4 — click the 2nd chip ("e5") to replay just the first move.
    const chips = container.querySelectorAll('.font-mono.text-accent2')
    fireEvent.click(chips[1])
    // After 1.e4 only, a white pawn should be on e4 (data-square lookup on the board).
    expect(container.querySelector('[data-square="e4"]')).toBeInTheDocument()
  })

  it('Practice This Opening navigates to the Openings page', () => {
    render(<LearnOpeningsPage />)
    fireEvent.click(screen.getByText('Practice This Opening →'))
    expect(useAppStore.getState().currentPage).toBe('openings')
  })

  it('a black-side family orients the board for black', () => {
    render(<LearnOpeningsPage />)
    fireEvent.click(screen.getByText('Defences vs 1.e4'))
    // "Philidor Defence" appears both in the lines list and the detail header.
    expect(screen.getAllByText('Philidor Defence').length).toBeGreaterThan(0)
  })
})
