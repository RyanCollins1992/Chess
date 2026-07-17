import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import FreePlayPage from './FreePlayPage'

const click = (container, id) => fireEvent.click(container.querySelector(`[data-square="${id}"]`))

describe('FreePlayPage', () => {
  it('mounts with an empty move list and "White to move"', () => {
    render(<FreePlayPage />)
    expect(screen.getByText('No moves yet')).toBeInTheDocument()
    expect(screen.getByText('White to move')).toBeInTheDocument()
    expect(screen.getByText('← Undo')).toBeDisabled()
  })

  // Regression test for a real bug found 2026-07-15: this page never passed
  // `arePiecesDraggable` to <Chessboard>, and Chessboard's click handler
  // silently no-ops when that prop is falsy — so click-to-move was
  // completely dead here (only drag-and-drop worked, which is why it went
  // unnoticed). Drives the real Chessboard component, not a mock, so it
  // would have caught the missing prop directly.
  it('click-to-move: clicking e2 then e4 registers the move', () => {
    const { container } = render(<FreePlayPage />)
    click(container, 'e2')
    click(container, 'e4')

    expect(screen.getByText('e4')).toBeInTheDocument()
    expect(screen.queryByText('No moves yet')).not.toBeInTheDocument()
    expect(screen.getByText('← Undo')).not.toBeDisabled()
  })

  it('Undo removes the last move', () => {
    const { container } = render(<FreePlayPage />)
    click(container, 'e2')
    click(container, 'e4')
    expect(screen.getByText('e4')).toBeInTheDocument()

    fireEvent.click(screen.getByText('← Undo'))

    expect(screen.getByText('No moves yet')).toBeInTheDocument()
    expect(screen.getByText('← Undo')).toBeDisabled()
  })

  it('New Game resets the board after a move has been made', () => {
    const { container } = render(<FreePlayPage />)
    click(container, 'e2')
    click(container, 'e4')
    expect(screen.getByText('e4')).toBeInTheDocument()

    fireEvent.click(screen.getByText('↺ New Game'))

    expect(screen.getByText('No moves yet')).toBeInTheDocument()
    expect(screen.getByText('White to move')).toBeInTheDocument()
  })

  it('an illegal click-to-move (wrong piece color) does not register', () => {
    const { container } = render(<FreePlayPage />)
    // It's White's turn; e7 is a Black pawn.
    click(container, 'e7')
    click(container, 'e5')

    expect(screen.getByText('No moves yet')).toBeInTheDocument()
  })
})
