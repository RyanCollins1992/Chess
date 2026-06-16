import { useState, useRef } from 'react'
import { Chess } from 'chess.js'

/**
 * useChessBoard
 * 
 * Correct pattern for react-chessboard:
 * - Chess instance lives in a REF (mutations don't trigger renders)
 * - FEN lives in STATE (updating it triggers re-renders)
 * - moveIdx lives in BOTH a ref (for handlers) and state (for UI)
 * 
 * This eliminates all stale closure bugs.
 */
export function useChessBoard(initialFen) {
  const chessRef = useRef(new Chess(initialFen || undefined))
  const [fen, setFen] = useState(() => chessRef.current.fen())

  const move = (input) => {
    try {
      const result = chessRef.current.move(input)
      if (result) setFen(chessRef.current.fen())
      return result
    } catch { return null }
  }

  const undo = () => {
    const result = chessRef.current.undo()
    if (result) setFen(chessRef.current.fen())
    return result
  }

  const reset = (newFen) => {
    if (newFen) chessRef.current.load(newFen)
    else chessRef.current.reset()
    setFen(chessRef.current.fen())
  }

  const loadPgn = (pgn) => {
    chessRef.current.loadPgn(pgn)
    setFen(chessRef.current.fen())
  }

  return {
    fen,
    chess: chessRef.current,
    move,
    undo,
    reset,
    loadPgn,
    get turn()       { return chessRef.current.turn() },
    get isWhiteTurn(){ return chessRef.current.turn() === 'w' },
    get isCheckmate(){ return chessRef.current.isCheckmate() },
    get isStalemate(){ return chessRef.current.isStalemate() },
    get isDraw()     { return chessRef.current.isDraw() },
    get isGameOver() { return chessRef.current.isGameOver() },
    get isCheck()    { return chessRef.current.inCheck() },
    get history()    { return chessRef.current.history() },
    legalMoves: (sq) => chessRef.current.moves({ square: sq, verbose: true }),
  }
}
