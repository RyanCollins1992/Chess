import { useMemo, useState } from 'react'
import { Chessboard as RawChessboard } from 'react-chessboard'
import { ChessEngine } from '../../core/ChessEngine'
import { useAppStore } from '../../store/useAppStore'
import { getTheme, DEFAULT_THEME_ID } from '../../styles/themes'
import { TEMPO_THEME } from '../../styles/tempo'
import { DEFAULT_PIECE_STYLE_ID } from '../../styles/pieceStyles'

// "Fantasy" piece set by Maurizio Monge (github.com/maurimo/chess-art),
// MIT licensed — see the About & Licenses section in SettingsPage.jsx.
// Ornate ivory/ebony-style artwork (crowned king/queen, castle-turret rook,
// crosier-topped bishop) replacing the previous flat recolored Staunton
// silhouettes. Served as static files (public/pieces/fantasy/) rather than
// the library's function-based defaultPieces, because these SVGs mix flat
// fill classes and gradients inconsistently across files — too fragile to
// safely re-target to each theme's exact hex by string substitution. Instead
// a single CSS filter warms/darkens the two sides uniformly across every
// theme (not an exact per-theme color match, but robust), plus a drop-shadow
// pair for a carved, candlelit-relief look instead of a flat sticker fill.
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
// castle-turret rook, a horse-head knight) extracted directly from the
// user's own reference image (Chess related images/more.png in the Ryan's
// Brain vault) — cropped tightly per-piece and background-removed (the
// source had a near-solid dark backdrop, thresholded to alpha) rather than
// sourced from a third-party licensed set.
//
// Each cropped PNG is tightly bound to that piece's own artwork (no shared
// row-level canvas), so a single size per type — relative to the tallest
// piece (king) — preserves the set's natural size hierarchy instead of
// every piece independently maxing out to the same rendered size. Sized by
// WIDTH percentage (not height): height:X% on the image computed against the
// image's own unscaled intrinsic height instead of the square, overflowing
// past it. Width against the slot's (always definite) width is reliable;
// height is left to 'auto' and follows the image's own aspect ratio.
//
// The wrapper below uses position:absolute + inset:0 rather than
// width/height:100% — react-chessboard nests the piece inside several of
// its own wrapper divs before reaching this component's own root, and at
// least one of those doesn't propagate a definite height, so a plain
// height:100% here silently collapsed to fit content instead of the square.
// Absolute positioning anchors directly to the nearest positioned ancestor
// (react-chessboard's own square slot), skipping the broken chain.
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
// beveled coin badge (gold for white, pewter for black) via CSS gradients —
// matching the same reference's "chess board and piece 2.jpg", which shows
// this exact art already framed as coins.
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

// "Tempo" piece style: the six Unicode chess glyphs set in IBM Plex Mono
// instead of illustrated/photoreal artwork — pieces *are* typography, per
// the Tempo design brief (2026-07-07). No per-theme recoloring needed since
// Tempo's board squares are fixed (Paper/Graphite) regardless of app mode.
const TEMPO_GLYPHS = {
  wP: '♙', wR: '♖', wN: '♘', wB: '♗', wQ: '♕', wK: '♔',
  bP: '♟', bR: '♜', bN: '♞', bB: '♝', bQ: '♛', bK: '♚',
}
const TEMPO_PIECES = Object.fromEntries(
  Object.entries(TEMPO_GLYPHS).map(([code, glyph]) => {
    const isWhite = code[0] === 'w'
    return [code, () => (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
          fontSize: '76%', lineHeight: 1, pointerEvents: 'none',
          color: isWhite ? '#F4F1E8' : '#17161A',
          // White pieces need a dark outline to stay legible on the light
          // (Paper-colored) squares — its own fill is too close to Paper's
          // hex to read by color contrast alone, same reason every digital
          // chess set outlines its white pieces regardless of square color.
          WebkitTextStroke: isWhite ? '1.25px #17161A' : 'none',
          textShadow: isWhite ? '0 1px 1.5px rgba(0,0,0,0.5)' : 'none',
        }}
      >
        {glyph}
      </div>
    )]
  })
)

const PIECE_SETS = { fantasy: FANTASY_PIECES, heraldic: HERALDIC_PIECES, medallion: MEDALLION_PIECES, tempo: TEMPO_PIECES }

// Subtle grain/vein overlays layered on top of the flat square color so the
// board reads as carved stone / worn wood / aged parchment rather than a
// flat digital fill. Colors are black/white-based (not theme-specific) so
// the same overlay works over any base square color.
const BOARD_TEXTURES = {
  wood: `repeating-linear-gradient(3deg, rgba(0,0,0,0.10) 0px, rgba(0,0,0,0.10) 1px, transparent 1px, transparent 5px),
         repeating-linear-gradient(-2deg, rgba(0,0,0,0.06) 0px, rgba(0,0,0,0.06) 1px, transparent 1px, transparent 11px)`,
  stone: `radial-gradient(circle at 22% 28%, rgba(0,0,0,0.16) 0%, transparent 42%),
          radial-gradient(circle at 72% 62%, rgba(0,0,0,0.12) 0%, transparent 38%),
          radial-gradient(circle at 45% 85%, rgba(0,0,0,0.09) 0%, transparent 32%),
          radial-gradient(circle at 85% 18%, rgba(255,255,255,0.06) 0%, transparent 30%)`,
  parchment: `radial-gradient(ellipse at 25% 22%, rgba(90,65,35,0.14) 0%, transparent 45%),
              radial-gradient(ellipse at 78% 70%, rgba(90,65,35,0.10) 0%, transparent 40%),
              radial-gradient(ellipse at 50% 50%, rgba(90,65,35,0.06) 0%, transparent 60%)`,
}
function squareStyleFor(color, theme) {
  const texture = BOARD_TEXTURES[theme.boardTexture]
  return texture
    ? { backgroundColor: color, backgroundImage: texture }
    : { backgroundColor: color }
}

// A carved-frame border around the board itself, using the active theme's
// own border/gold/dim tokens so it varies per theme with no extra config.
// Uses only inset shadows (not an outer drop-shadow) since several pages
// wrap <Chessboard> in an overflow-hidden container that would clip
// anything extending past the frame's own edges.
function frameStyleFor(theme) {
  // Tempo explicitly rejects the carved-frame look — a flat, matte, barely-
  // there panel instead, per the "restraint reads as premium" design brief.
  if (theme.id === 'tempo') {
    return {
      padding: '10px',
      background: theme.colors.bg2,
      border: `1px solid ${theme.colors.border}`,
      borderRadius: '3px',
      boxShadow: '0 1px 2px rgba(0,0,0,0.4)',
    }
  }
  return {
    padding: '10px',
    background: `linear-gradient(155deg, ${theme.colors.dim}, ${theme.colors.border})`,
    border: `3px solid ${theme.colors.gold}`,
    borderRadius: '6px',
    boxShadow: `inset 0 0 0 2px ${theme.colors.bg2}, inset 0 2px 4px rgba(0,0,0,0.45)`,
  }
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

  const themeId = useAppStore(s => s.settings.theme) || DEFAULT_THEME_ID
  const visualMode = useAppStore(s => s.settings.visualMode) || 'medieval'
  const theme = useMemo(
    () => (visualMode === 'tempo' ? TEMPO_THEME : getTheme(themeId)),
    [themeId, visualMode]
  )
  const pieceStyleId = useAppStore(s => s.settings.pieceStyle) || DEFAULT_PIECE_STYLE_ID
  // Tempo always uses its own typographic piece set — piece style is a
  // medieval-mode-only preference (Fantasy/Heraldic/Medallion artwork).
  const pieceSet = visualMode === 'tempo'
    ? PIECE_SETS.tempo
    : (PIECE_SETS[pieceStyleId] || PIECE_SETS[DEFAULT_PIECE_STYLE_ID])

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
    <div style={frameStyleFor(theme)}>
      <RawChessboard
        options={{
          ...props,
          ...options,
          position,
          pieces: options.pieces ?? pieceSet,
          boardStyle: customBoardStyle ?? options.boardStyle,
          darkSquareStyle: customDarkSquareStyle ?? options.darkSquareStyle ?? squareStyleFor(theme.board.dark, theme),
          lightSquareStyle: customLightSquareStyle ?? options.lightSquareStyle ?? squareStyleFor(theme.board.light, theme),
          squareStyles: mergedSquareStyles,
          allowDragging: arePiecesDraggable ?? options.allowDragging,
          onPieceDrop,
          onSquareClick: handleSquareClick,
        }}
      />
    </div>
  )
}
