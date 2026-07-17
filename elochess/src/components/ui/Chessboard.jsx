import { useMemo, useState } from 'react'
import { Chessboard as RawChessboard } from 'react-chessboard'
import { ChessEngine } from '../../core/ChessEngine'
import { useAppStore } from '../../store/useAppStore'
import { KNIGHTPATH_THEME } from '../../styles/knightpath'
import { DURATION } from '../../styles/motion'

// KnightPath's pieces are the plain Unicode chess glyphs (matching the
// source design's `GLYPHS` map exactly — no illustrated artwork, no special
// display font), white filled solid with a dark drop-shadow for contrast,
// black filled solid with a light drop-shadow.
//
// The wrapper uses position:absolute + inset:0 rather than width/height:100%
// — react-chessboard nests the piece inside several of its own wrapper divs
// before reaching this component's own root, and at least one of those
// doesn't propagate a definite height, so a plain height:100% here silently
// collapses to fit content instead of the square. Absolute positioning
// anchors directly to the nearest positioned ancestor instead.
//
// Font size is set via a two-element container-query split (outer div
// establishes container-type: inline-size, inner span sizes in cqw) rather
// than a plain "%" font-size, which resolves against the *inherited*
// font-size (cascaded from body) rather than this wrapper's actual pixel
// size. Making the same element both the query container and the thing
// sized in cqw is a real cyclic dependency in practice — Chromium falls
// back to resolving cqw against the viewport instead.
const GLYPHS = {
  wP: '♙', wR: '♖', wN: '♘', wB: '♗', wQ: '♕', wK: '♔',
  bP: '♟', bR: '♜', bN: '♞', bB: '♝', bQ: '♛', bK: '♚',
}
const KNIGHTPATH_PIECES = Object.fromEntries(
  Object.entries(GLYPHS).map(([code, glyph]) => {
    const isWhite = code[0] === 'w'
    return [code, () => (
      <div
        style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          containerType: 'inline-size', pointerEvents: 'none',
        }}
      >
        <span
          style={{
            fontFamily: "'Inter', -apple-system, sans-serif",
            fontSize: '76cqw', lineHeight: 1,
            color: isWhite ? '#fff' : '#111',
            textShadow: isWhite ? '0 1px 3px rgba(0,0,0,0.9)' : '0 1px 2px rgba(255,255,255,0.15)',
          }}
        >
          {glyph}
        </span>
      </div>
    )]
  })
)

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

  const animateMoves = useAppStore(s => s.settings.animateMoves) !== false
  const theme = KNIGHTPATH_THEME

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
      styles[selectedSquare] = {
        ...styles[selectedSquare],
        backgroundColor: 'rgba(255, 215, 0, 0.35)',
        transition: `background-color ${DURATION.quick}s ease`,
      }
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
    <div style={{ borderRadius: '3px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.18), 0 1px 4px rgba(0,0,0,0.1)' }}>
      <RawChessboard
        options={{
          ...props,
          ...options,
          position,
          pieces: options.pieces ?? KNIGHTPATH_PIECES,
          boardStyle: customBoardStyle ?? options.boardStyle,
          darkSquareStyle: customDarkSquareStyle ?? options.darkSquareStyle ?? { backgroundColor: theme.board.dark },
          lightSquareStyle: customLightSquareStyle ?? options.lightSquareStyle ?? { backgroundColor: theme.board.light },
          squareStyles: mergedSquareStyles,
          allowDragging: arePiecesDraggable ?? options.allowDragging,
          showAnimations: options.showAnimations ?? animateMoves,
          animationDurationInMs: options.animationDurationInMs ?? DURATION.quick * 1000,
          onPieceDrop,
          onSquareClick: handleSquareClick,
        }}
      />
    </div>
  )
}
