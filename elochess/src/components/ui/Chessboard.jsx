import { useMemo, useState } from 'react'
import { Chessboard as RawChessboard } from 'react-chessboard'
import { ChessEngine } from '../../core/ChessEngine'
import { useAppStore } from '../../store/useAppStore'
import { KNIGHTPATH_THEME } from '../../styles/knightpath'
import { DEFAULT_PIECE_STYLE_ID } from '../../styles/pieceStyles'
import { DURATION } from '../../styles/motion'

// "Classic" — the plain Unicode chess glyphs (matching KnightPath's own
// source design's `GLYPHS` map exactly — no illustrated artwork, no special
// display font), white filled solid with a dark drop-shadow for contrast,
// black filled solid with a light drop-shadow. This is the app's default
// piece style.
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
const CLASSIC_PIECES = Object.fromEntries(
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

// "Fantasy" piece set by Maurizio Monge (github.com/maurimo/chess-art),
// MIT licensed — see the About & Licenses section in SettingsPage.jsx.
// Ornate ivory/ebony-style artwork (crowned king/queen, castle-turret rook,
// crosier-topped bishop). Served as static files (public/pieces/fantasy/)
// rather than the library's function-based defaultPieces, because these
// SVGs mix flat fill classes and gradients inconsistently across files —
// too fragile to safely re-target by string substitution. Instead a single
// CSS filter warms/darkens the two sides uniformly, plus a drop-shadow for
// a carved, relief look instead of a flat sticker fill.
const PIECE_FILTERS = {
  w: 'sepia(0.35) saturate(1.3) brightness(0.97) drop-shadow(0 1px 1.5px rgba(0,0,0,0.55))',
  b: 'brightness(0.55) sepia(0.25) saturate(1.2) drop-shadow(0 1px 1.5px rgba(0,0,0,0.6))',
}
const FANTASY_PIECES = Object.fromEntries(
  ['P', 'R', 'N', 'B', 'Q', 'K'].flatMap(type => ['w', 'b'].map(color => {
    const code = color + type
    return [code, () => (
      <img
        src={`/pieces/fantasy/${code}.svg`}
        alt=""
        draggable={false}
        style={{ width: '100%', height: '100%', filter: PIECE_FILTERS[color], pointerEvents: 'none' }}
      />
    )]
  }))
)

// "Heraldic" piece set: illustrated crests (crowned king/queen faces, a
// castle-turret rook, a horse-head knight) extracted directly from a user
// reference image (not a third-party licensed set).
//
// Each cropped PNG is tightly bound to that piece's own artwork (no shared
// row-level canvas), so a single size per type — relative to the tallest
// piece (king) — preserves the set's natural size hierarchy instead of
// every piece independently maxing out to the same rendered size. Sized by
// WIDTH percentage (not height): height:X% would compute against the
// image's own unscaled intrinsic height instead of the square, overflowing
// past it. Width against the slot's (always definite) width is reliable;
// height is left to 'auto' and follows the image's own aspect ratio.
const HERALDIC_WIDTH_PCT = { P: 52, R: 57, N: 60, B: 54, Q: 55, K: 59 }
const HERALDIC_PIECES = Object.fromEntries(
  ['P', 'R', 'N', 'B', 'Q', 'K'].flatMap(type => ['w', 'b'].map(color => {
    const code = color + type
    return [code, () => (
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        <img
          src={`/pieces/heraldic/${code}.png`}
          alt=""
          draggable={false}
          style={{ width: `${HERALDIC_WIDTH_PCT[type]}%`, height: 'auto', filter: 'drop-shadow(0 1px 1.5px rgba(0,0,0,0.5))', pointerEvents: 'none' }}
        />
      </div>
    )]
  }))
)

// "Medallion" piece style: the Heraldic artwork above, wrapped in a circular
// beveled coin badge (gold for white, pewter for black) via CSS gradients.
const MEDALLION_COIN_STYLE = {
  w: {
    background: 'radial-gradient(circle at 35% 30%, #f0dba0, #c9a227 55%, #8a6d1f 100%)',
    border: '2px solid #6b5220',
  },
  b: {
    background: 'radial-gradient(circle at 35% 30%, #9aa0aa, #5c6167 55%, #2a2d31 100%)',
    border: '2px solid #1a1c1e',
  },
}
const MEDALLION_PIECES = Object.fromEntries(
  ['P', 'R', 'N', 'B', 'Q', 'K'].flatMap(type => ['w', 'b'].map(color => {
    const code = color + type
    return [code, () => (
      <div
        style={{
          position: 'absolute', inset: '4%', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.35), inset 0 -2px 3px rgba(0,0,0,0.45), 0 1px 2px rgba(0,0,0,0.5)',
          pointerEvents: 'none',
          ...MEDALLION_COIN_STYLE[color],
        }}
      >
        <img
          src={`/pieces/heraldic/${code}.png`}
          alt=""
          draggable={false}
          style={{ maxWidth: '74%', maxHeight: '74%', objectFit: 'contain', pointerEvents: 'none' }}
        />
      </div>
    )]
  }))
)

const PIECE_SETS = {
  classic: CLASSIC_PIECES,
  fantasy: FANTASY_PIECES,
  heraldic: HERALDIC_PIECES,
  medallion: MEDALLION_PIECES,
}

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
  const showCoords = useAppStore(s => s.settings.showCoords) !== false
  const pieceStyle = useAppStore(s => s.settings.pieceStyle) || DEFAULT_PIECE_STYLE_ID
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
          pieces: options.pieces ?? PIECE_SETS[pieceStyle] ?? CLASSIC_PIECES,
          boardStyle: customBoardStyle ?? options.boardStyle,
          darkSquareStyle: customDarkSquareStyle ?? options.darkSquareStyle ?? { backgroundColor: theme.board.dark },
          lightSquareStyle: customLightSquareStyle ?? options.lightSquareStyle ?? { backgroundColor: theme.board.light },
          squareStyles: mergedSquareStyles,
          allowDragging: arePiecesDraggable ?? options.allowDragging,
          showAnimations: options.showAnimations ?? animateMoves,
          showNotation: options.showNotation ?? showCoords,
          animationDurationInMs: options.animationDurationInMs ?? DURATION.quick * 1000,
          onPieceDrop,
          onSquareClick: handleSquareClick,
        }}
      />
    </div>
  )
}
