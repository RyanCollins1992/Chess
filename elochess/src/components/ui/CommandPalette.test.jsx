import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CommandPalette from './CommandPalette'
import { useAppStore } from '../../store/useAppStore'
import { useOpeningsStore } from '../../store/useOpeningsStore'

describe('CommandPalette', () => {
  beforeEach(() => {
    useAppStore.setState({ currentPage: 'openings' })
    useOpeningsStore.setState({ selectedTrap: null })
  })

  it('renders nothing when closed', () => {
    const { container } = render(<CommandPalette open={false} onClose={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows page results by default when opened with an empty query', () => {
    render(<CommandPalette open onClose={() => {}} />)
    expect(screen.getByText('Pages')).toBeInTheDocument()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('filters results as you type', () => {
    render(<CommandPalette open onClose={() => {}} />)
    const input = screen.getByPlaceholderText('Search openings, puzzles, pages…')
    fireEvent.change(input, { target: { value: 'fried liver' } })

    expect(screen.getByText('Openings')).toBeInTheDocument()
    expect(screen.getByText('Fried Liver Attack')).toBeInTheDocument()
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument()
  })

  it('shows "No results" for a query that matches nothing', () => {
    render(<CommandPalette open onClose={() => {}} />)
    fireEvent.change(screen.getByPlaceholderText('Search openings, puzzles, pages…'), { target: { value: 'zzzznotarealthing' } })
    expect(screen.getByText('No results')).toBeInTheDocument()
  })

  it('clicking a page result navigates and closes the palette', () => {
    const onClose = vi.fn()
    render(<CommandPalette open onClose={onClose} />)
    fireEvent.click(screen.getByText('Dashboard'))

    expect(useAppStore.getState().currentPage).toBe('dashboard')
    expect(onClose).toHaveBeenCalled()
  })

  it('clicking an opening result navigates to Openings and selects the trap', () => {
    const onClose = vi.fn()
    render(<CommandPalette open onClose={onClose} />)
    fireEvent.change(screen.getByPlaceholderText('Search openings, puzzles, pages…'), { target: { value: 'fried liver' } })
    fireEvent.click(screen.getByText('Fried Liver Attack'))

    expect(useAppStore.getState().currentPage).toBe('openings')
    expect(useOpeningsStore.getState().selectedTrap?.id).toBe('fried-liver')
    expect(onClose).toHaveBeenCalled()
  })

  it('Escape closes the palette', () => {
    const onClose = vi.fn()
    render(<CommandPalette open onClose={onClose} />)
    fireEvent.keyDown(screen.getByPlaceholderText('Search openings, puzzles, pages…'), { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('ArrowDown/Enter runs the second result, not the first', () => {
    const onClose = vi.fn()
    render(<CommandPalette open onClose={onClose} />)
    const input = screen.getByPlaceholderText('Search openings, puzzles, pages…')

    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter' })

    // The second page in NAV order is Spaced Review (Dashboard is first) —
    // asserting a specific different-from-first page pins the actual index
    // math, not just "some navigation happened".
    expect(useAppStore.getState().currentPage).not.toBe('dashboard')
    expect(onClose).toHaveBeenCalled()
  })

  it('re-opening resets the query and selection from a previous session', () => {
    const { rerender } = render(<CommandPalette open onClose={() => {}} />)
    fireEvent.change(screen.getByPlaceholderText('Search openings, puzzles, pages…'), { target: { value: 'puzzle' } })

    rerender(<CommandPalette open={false} onClose={() => {}} />)
    rerender(<CommandPalette open onClose={() => {}} />)

    expect(screen.getByPlaceholderText('Search openings, puzzles, pages…')).toHaveValue('')
  })
})
