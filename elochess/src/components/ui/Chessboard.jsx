import { useMemo, useState } from 'react'
import { Chessboard as RawChessboard } from 'react-chessboard'
import { ChessEngine } from '../../core/ChessEngine'

function findKingSquare(board, color) {
  for (const row of board) {
    for (const cell of row) {
      if (cell && cell.type === 'k' && cell.color === color) return cell.square
    }
  }
  return null
}

export function Chessboard({
  options = {},
  customBoardStyle,
  customDarkSquareStyle,
  customLightSquareStyle,
  customSquareStyles,
  arePiecesDraggable,
  position,
  onPieceDrop,
  ...props
}) {
  // Tracks the FEN the selection was made against, so a position change from
  // outside (a move was made, puzzle reset, etc.) implicitly drops it without
  // needing a synchronizing effect.
  const [selection, setSelection] = useState(null) // { square, atPosition } | null
  const selectedSquare = selection?.atPosition === position ? selection.square : null

  // Read-only parse of the FEN for legal-move highlighting and the check indicator.
  // Never mutates any page's own game state.
  const engine = useMemo(() => {
    if (!position || typeof position !== 'string') return null
    try { return new ChessEngine(position) } catch { return null }
  }, [position])

  const autoSquareStyles = useMemo(() => {
    const styles = {}
    if (!engine) return styles

    if (engine.isCheck) {
      const kingSquare = findKingSquare(engine.board, engine.turn)
      if (kingSquare) {
        styles[kingSquare] = { animation: 'check-blink 1s ease-in-out infinite' }
      }
    }

    if (arePiecesDraggable && selectedSquare) {
      styles[selectedSquare] = { ...styles[selectedSquare], backgroundColor: 'rgba(255, 215, 0, 0.35)' }
      for (const m of engine.legalMoves(selectedSquare)) {
        styles[m.to] = {
          ...styles[m.to],
          ...(m.captured
            ? { boxShadow: 'inset 0 0 0 3px rgba(0,0,0,0.35)' }
            : { backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.25) 19%, transparent 20%)' }),
        }
      }
    }

    return styles
  }, [engine, arePiecesDraggable, selectedSquare])

  const baseSquareStyles = customSquareStyles ?? options.squareStyles
  const mergedSquareStyles = useMemo(() => {
    if (!baseSquareStyles) return autoSquareStyles
    const merged = {}
    for (const sq of new Set([...Object.keys(autoSquareStyles), ...Object.keys(baseSquareStyles)])) {
      merged[sq] = { ...autoSquareStyles[sq], ...baseSquareStyles[sq] }
    }
    return merged
  }, [autoSquareStyles, baseSquareStyles])

  const handleSquareClick = ({ square, piece }) => {
    if (!arePiecesDraggable || !engine) return

    if (selectedSquare) {
      const target = engine.legalMoves(selectedSquare).find(m => m.to === square)
      if (target) {
        onPieceDrop?.({
          piece: { pieceType: target.color + target.piece.toUpperCase(), isSparePiece: false, position: '' },
          sourceSquare: selectedSquare,
          targetSquare: square,
        })
        setSelection(null)
        return
      }
    }

    const isOwnPiece = piece?.pieceType && piece.pieceType[0].toLowerCase() === engine.turn
    setSelection(isOwnPiece ? { square, atPosition: position } : null)
  }

  return (
    <RawChessboard
      options={{
        ...props,
        ...options,
        position,
        boardStyle: customBoardStyle ?? options.boardStyle,
        darkSquareStyle: customDarkSquareStyle ?? options.darkSquareStyle,
        lightSquareStyle: customLightSquareStyle ?? options.lightSquareStyle,
        squareStyles: mergedSquareStyles,
        allowDragging: arePiecesDraggable ?? options.allowDragging,
        onPieceDrop,
        onSquareClick: handleSquareClick,
      }}
    />
  )
}
