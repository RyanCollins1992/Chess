import { useState } from 'react'
import { Chessboard } from '../components/ui/Chessboard'
import { useChessBoard } from '../hooks/useChessBoard'
import { useAppStore } from '../store/useAppStore'

export default function FreePlayPage() {
  const { fen, chessRef, tryMove, undo, reset } = useChessBoard()
  const [orientation, setOrientation] = useState('white')
  const [moveList, setMoveList]   = useState([])
  const [status, setStatus]       = useState('')
  const [gameOver, setGameOver]   = useState(false)
  const [customFen, setCustomFen] = useState('')
  const [fenError, setFenError]   = useState('')
  const [lastMove, setLastMove]   = useState(null)
  const showToast = useAppStore(s => s.showToast)

  const getStatus = () => {
    const c = chessRef.current
    if (c.isCheckmate())  return `${c.turn() === 'w' ? 'Black' : 'White'} wins by checkmate! 🎉`
    if (c.isStalemate())  return 'Draw by stalemate'
    if (c.isDraw())       return 'Draw'
    if (c.inCheck())      return `${c.turn() === 'w' ? 'White' : 'Black'} is in check!`
    return c.turn() === 'w' ? 'White to move' : 'Black to move'
  }

  const handleDrop = ({ sourceSquare: from, targetSquare: to }) => {
    if (gameOver) return false
    if (!tryMove(from, to)) return false
    setMoveList(chessRef.current.history())
    setLastMove({ from, to })
    setStatus(getStatus())
    if (chessRef.current.isGameOver()) setGameOver(true)
    return true
  }

  const handleUndo = () => {
    undo()
    setMoveList(chessRef.current.history())
    setGameOver(false)
    setStatus(getStatus())
    setLastMove(null)
  }

  const handleReset = () => {
    reset()
    setMoveList([]); setGameOver(false); setStatus(''); setLastMove(null); setCustomFen('')
  }

  const handleLoadFen = () => {
    try {
      reset(customFen.trim())
      setMoveList([]); setGameOver(false); setStatus(getStatus()); setFenError(''); setLastMove(null)
    } catch { setFenError('Invalid FEN string') }
  }

  const copyFen = () => { navigator.clipboard.writeText(chessRef.current.fen()); showToast('FEN copied!', 'success', 1500) }

  const customSquareStyles = lastMove ? {
    [lastMove.from]: { backgroundColor: 'rgba(245,183,49,0.3)' },
    [lastMove.to]:   { backgroundColor: 'rgba(245,183,49,0.5)' },
  } : {}

  const isCheck = chessRef.current.inCheck()

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-[500px]">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-bg3 border border-border flex items-center justify-center text-sm">{orientation === 'white' ? '♚' : '♔'}</div>
            <div className="text-sm text-[#9CA3AF]">{orientation === 'white' ? 'Black' : 'White'}</div>
          </div>
          <Chessboard position={fen} onPieceDrop={handleDrop} boardOrientation={orientation}
            customSquareStyles={customSquareStyles}
            customDarkSquareStyle={{ backgroundColor: '#b58863' }} customLightSquareStyle={{ backgroundColor: '#f0d9b5' }} />
          <div className="flex items-center gap-2 mt-2">
            <div className="w-7 h-7 rounded-full bg-gold/20 border border-gold/40 flex items-center justify-center text-sm">{orientation === 'white' ? '♔' : '♚'}</div>
            <div className="text-sm text-[#9CA3AF]">{orientation === 'white' ? 'White' : 'Black'}</div>
            <div className="ml-auto text-xs text-muted">Move {Math.ceil(moveList.length / 2)}</div>
          </div>
        </div>
      </div>

      <div className="w-64 shrink-0 border-l border-border bg-[#111827] flex flex-col p-4 gap-3 overflow-hidden">
        <div className={`rounded-xl px-3 py-2 text-sm font-medium text-center ${
          gameOver ? 'bg-gold/15 text-gold border border-gold/30' :
          isCheck  ? 'bg-danger/15 text-danger border border-danger/30' :
          'bg-bg3 text-[#9CA3AF] border border-border'}`}>
          {status || 'White to move'}
        </div>

        <div className="grid grid-cols-2 gap-2 shrink-0">
          <button onClick={handleUndo} disabled={moveList.length === 0} className="btn-ghost text-sm disabled:opacity-40">← Undo</button>
          <button onClick={() => setOrientation(o => o === 'white' ? 'black' : 'white')} className="btn-ghost text-sm">⇅ Flip</button>
          <button onClick={handleReset} className="btn-ghost text-sm col-span-2">↺ New Game</button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="text-xs text-muted uppercase tracking-wide font-bold mb-2">Moves</div>
          {moveList.length === 0 ? <div className="text-xs text-muted italic">No moves yet</div> : (
            <div className="space-y-0.5 font-mono text-xs">
              {Array.from({ length: Math.ceil(moveList.length / 2) }, (_, i) => (
                <div key={i} className="flex gap-2 text-[#9CA3AF]">
                  <span className="text-muted w-5">{i+1}.</span>
                  <span className="flex-1">{moveList[i*2] || ''}</span>
                  <span className="flex-1 text-muted">{moveList[i*2+1] || ''}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-border pt-3 space-y-2">
          <div className="text-xs text-muted uppercase tracking-wide font-bold">Load Position (FEN)</div>
          <textarea value={customFen} onChange={e => { setCustomFen(e.target.value); setFenError('') }}
            placeholder="Paste FEN string…" rows={2}
            className="w-full bg-bg3 border border-border rounded-lg px-2 py-1.5 text-xs text-white placeholder-muted outline-none focus:border-gold/50 resize-none font-mono" />
          {fenError && <div className="text-xs text-danger">{fenError}</div>}
          <div className="flex gap-2">
            <button onClick={handleLoadFen} disabled={!customFen.trim()} className="flex-1 btn-ghost text-xs py-1.5 disabled:opacity-40">Load</button>
            <button onClick={copyFen} className="flex-1 btn-ghost text-xs py-1.5">Copy FEN</button>
          </div>
        </div>
      </div>
    </div>
  )
}
