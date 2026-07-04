import { Chess } from 'chess.js'
import { ChessEngine } from './ChessEngine'

// Pure game-analysis helpers extracted from GameReviewPage.jsx so they can be
// unit-tested: move classification, eval↔display conversion (including the
// mate-score encoding), Lichess accuracy math, and PGN parsing.

// ── Move classification thresholds (centipawns) ───────────────────
// Based on Lichess/Chess.com classification standards
export const CLASSIFICATIONS = {
  BRILLIANT:   { label: 'Brilliant',  symbol: '!!', color: '#1baca6', minDelta: null,  maxDelta: null  }, // special
  GREAT:       { label: 'Great',      symbol: '!',  color: '#5c8bb0', minDelta: null,  maxDelta: null  }, // special
  BEST:        { label: 'Best',       symbol: '✓',  color: '#5c8bb0', minDelta: -10,   maxDelta: 0     },
  EXCELLENT:   { label: 'Excellent',  symbol: '✓',  color: '#96bc4b', minDelta: -25,   maxDelta: -10   },
  GOOD:        { label: 'Good',       symbol: '✓',  color: '#96bc4b', minDelta: -50,   maxDelta: -25   },
  INACCURACY:  { label: 'Inaccuracy', symbol: '?!', color: '#f0c15b', minDelta: -100,  maxDelta: -50   },
  MISTAKE:     { label: 'Mistake',    symbol: '?',  color: '#e87b1e', minDelta: -200,  maxDelta: -100  },
  BLUNDER:     { label: 'Blunder',    symbol: '??', color: '#ca3431', minDelta: -Infinity, maxDelta: -200 },
  BOOK:        { label: 'Book',       symbol: '📖', color: '#a88764', minDelta: null,  maxDelta: null  }, // opening
  MISS:        { label: 'Miss',       symbol: '✗',  color: '#e87b1e', minDelta: null,  maxDelta: null  }, // missed forced win
}

export function classifyMove(prevEval, newEval, isWhite) {
  // Convert to always-white-perspective delta
  const prevScore = isWhite ? prevEval : -prevEval
  const newScore  = isWhite ? newEval  : -newEval
  const delta     = newScore - prevScore // negative = got worse

  if (delta >= -10)  return 'BEST'
  if (delta >= -25)  return 'EXCELLENT'
  if (delta >= -50)  return 'GOOD'
  if (delta >= -100) return 'INACCURACY'
  if (delta >= -200) return 'MISTAKE'
  return 'BLUNDER'
}

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

const PIECE_VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }

// ── Eval encoding ─────────────────────────────────────────────────
// Regular centipawn evals are clamped to ±2000; mate scores are encoded as
// sign * (10000 - distance) so closer mates score more extreme, and any
// |cp| >= 9000 decodes back to "mate in (10000 - |cp|)". The ranges can
// never collide.

export function clampEval(cp) { return Math.max(-2000, Math.min(2000, cp)) }

// UCI "score mate m" -> encoded eval (m > 0: mate for side to move)
export function encodeMateScore(m) { return m > 0 ? 10000 - m : -10000 - m }

export function isMateScore(cp) { return Math.abs(cp) >= 9000 }

// Moves-to-mate from an encoded mate score (sign carried by the score itself)
export function mateDistance(cp) { return 10000 - Math.abs(cp) }

// Win% from a centipawn eval (white's perspective) — Lichess's own sigmoid.
export function winPercent(cpWhite) {
  return 100 / (1 + Math.exp(-0.00368208 * Math.max(-3000, Math.min(3000, cpWhite))))
}

// Lichess's per-move accuracy formula: how much of the mover's win% was
// retained by this move, expressed 0-100.
export function moveAccuracy(evalBeforeWhite, evalAfterWhite, isWhite) {
  const winBefore = isWhite ? winPercent(evalBeforeWhite) : 100 - winPercent(evalBeforeWhite)
  const winAfter  = isWhite ? winPercent(evalAfterWhite)  : 100 - winPercent(evalAfterWhite)
  const raw = 103.1668 * Math.exp(-0.04354 * (winBefore - winAfter)) - 3.1669
  return Math.max(0, Math.min(100, raw))
}

// UCI long algebraic ("e7e8q") -> SAN ("e8=Q+") for a given position
export function uciToSan(fen, uci) {
  if (!uci) return null
  try {
    const chess = new Chess(fen)
    const move = chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4) || 'q' })
    return move?.san || null
  } catch { return null }
}

// Heuristic approximations of Lichess/Chess.com's Brilliant/Great detection —
// not identical to their algorithms, but real signal rather than guesswork.
// GREAT: this was clearly the one move that mattered (the next-best
// alternative, from MultiPV 2, was meaningfully worse).
export function isGreatMove({ playedIsBest, eval1, eval2 }) {
  if (!playedIsBest || eval2 == null) return false
  return Math.abs(eval1 - eval2) >= 70
}

// BRILLIANT: the best move also offers material — the piece that just moved
// can be captured by an opponent piece worth the same or less — yet the
// engine still rates it best, i.e. a justified sacrifice.
export function isBrilliantMove({ playedIsBest, fenAfter, toSquare, movedPiece }) {
  if (!playedIsBest || !toSquare || !movedPiece) return false
  let chess
  try { chess = new Chess(fenAfter) } catch { return false }
  const movedValue = PIECE_VALUE[movedPiece] || 0
  const replies = chess.moves({ verbose: true })
  return replies.some(m => m.to === toSquare && m.captured && (PIECE_VALUE[m.piece] || 0) <= movedValue)
}

// ── PGN → game metadata ───────────────────────────────────────────
export function parsePgnToGame(pgn, myColor = 'White') {
  const header = (tag) => {
    const m = pgn.match(new RegExp(`\\[${tag} "([^"]+)"\\]`))
    return m ? m[1] : ''
  }
  const resultStr = header('Result') || '*'
  let result = 'Draw'
  if (resultStr === '1-0') result = myColor === 'White' ? 'Win' : 'Loss'
  else if (resultStr === '0-1') result = myColor === 'Black' ? 'Win' : 'Loss'

  const opponent   = myColor === 'White' ? (header('Black') || 'Black') : (header('White') || 'White')
  const oppRating  = myColor === 'White' ? (header('BlackElo') || '?') : (header('WhiteElo') || '?')
  const myRating   = myColor === 'White' ? (header('WhiteElo') || '?') : (header('BlackElo') || '?')
  const date       = (header('Date') || header('UTCDate') || '').replace(/\./g, '-')

  const movesOnly = pgn
    .replace(/\[[^\]]+\]/g, '').replace(/\{[^}]+\}/g, '')
    .replace(/\([^)]+\)/g, '').replace(/\$\d+/g, '')
    .replace(/\d+\./g, ' ').replace(/(1-0|0-1|1\/2-1\/2|\*)/g, '').trim()
  const moveCount = Math.ceil(movesOnly.split(/\s+/).filter(Boolean).length / 2)

  return {
    pgn,
    color:          myColor,
    result,
    opponent,
    opponentRating: oppRating,
    myRating,
    opening:        header('Opening') || header('ECO') || 'Unknown',
    timeControl:    header('TimeControl') || 'Unknown',
    date:           date || 'Unknown',
    moves:          moveCount,
    termination:    header('Termination') || '',
    accuracy:       null,
  }
}

// ── PGN move parser ───────────────────────────────────────────────
export function parsePGN(pgn) {
  try {
    const engine = new ChessEngine()
    // Strip headers and comments
    const movesText = pgn
      .replace(/\[[^\]]+\]/g, '')
      .replace(/\{[^}]+\}/g, '')
      .replace(/\([^)]+\)/g, '')
      .replace(/\$\d+/g, '')
      .replace(/\d+\./g, ' ')
      .replace(/(1-0|0-1|1\/2-1\/2|\*)/g, '')
      .trim()

    const tokens = movesText.split(/\s+/).filter(Boolean)
    const result = []
    let moveNum  = 1

    for (const token of tokens) {
      const color = engine.turn
      const move  = engine.move(token)
      if (!move) continue
      result.push({
        san:       move.san,
        fenAfter:  engine.fen,
        color,
        from:      move.from,
        to:        move.to,
        piece:     move.piece,
        promotion: move.promotion || '',
        moveNum:   color === 'w' ? `${moveNum}.` : `${moveNum}…`,
      })
      if (color === 'b') moveNum++
    }

    return result
  } catch {
    return []
  }
}
