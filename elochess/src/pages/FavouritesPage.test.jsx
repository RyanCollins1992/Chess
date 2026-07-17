import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import FavouritesPage from './FavouritesPage'
import { useAppStore } from '../store/useAppStore'

describe('FavouritesPage', () => {
  beforeEach(() => {
    useAppStore.setState({ favourites: [] })
  })

  it('shows the empty state when there are no favourites', () => {
    render(<FavouritesPage />)
    expect(screen.getByText('No favourites yet')).toBeInTheDocument()
    expect(screen.getByText('0 traps saved')).toBeInTheDocument()
  })

  it('lists all traps to browse when none are favourited yet', () => {
    render(<FavouritesPage />)
    expect(screen.getByText('All Traps')).toBeInTheDocument()
    expect(screen.getByText('Fried Liver Attack')).toBeInTheDocument()
  })

  it('starring a trap moves it into "Your Favourites" and updates the store', () => {
    render(<FavouritesPage />)
    const trapRow = screen.getByText('Fried Liver Attack').closest('div[class*="cursor-pointer"]')
    fireEvent.click(trapRow.querySelector('button'))

    expect(useAppStore.getState().favourites).toContain('fried-liver')
    expect(screen.getByText('⭐ Your Favourites')).toBeInTheDocument()
    expect(screen.getByText('Add More')).toBeInTheDocument()
  })

  it('un-starring a favourited trap removes it from the favourites list', () => {
    useAppStore.setState({ favourites: ['fried-liver'] })
    render(<FavouritesPage />)
    expect(screen.getByText('1 trap saved')).toBeInTheDocument()

    const trapRow = screen.getByText('Fried Liver Attack').closest('div[class*="cursor-pointer"]')
    fireEvent.click(trapRow.querySelector('button'))

    expect(useAppStore.getState().favourites).not.toContain('fried-liver')
  })

  it('search filters both the favourites and the browse-all list by name', () => {
    useAppStore.setState({ favourites: ['fried-liver'] })
    render(<FavouritesPage />)
    fireEvent.change(screen.getByPlaceholderText('Search traps…'), { target: { value: 'scholar' } })

    expect(screen.queryByText('Fried Liver Attack')).not.toBeInTheDocument()
    expect(screen.getByText("Scholar's Mate")).toBeInTheDocument()
  })

  it('search also matches by opening name, not just trap name', () => {
    render(<FavouritesPage />)
    fireEvent.change(screen.getByPlaceholderText('Search traps…'), { target: { value: 'ruy lopez' } })
    expect(screen.getByText('Fishing Pole Trap')).toBeInTheDocument()
  })

  it('clicking a trap row navigates to Openings', () => {
    render(<FavouritesPage />)
    fireEvent.click(screen.getByText('Fried Liver Attack'))
    expect(useAppStore.getState().currentPage).toBe('openings')
  })
})
