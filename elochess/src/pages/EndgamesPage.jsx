import { useState, useRef } from 'react'
import { Chessboard } from '../components/ui/Chessboard'
import { Chess } from 'chess.js'
import { progressManager } from '../core/ProgressManager'
import { useAppStore } from '../store/useAppStore'

const SCENARIOS = [
  { id:'kqk', icon:'♛', name:'K+Q vs K', level:'Beginner', desc:'The most basic checkmate.', fen:'8/8/8/4k3/8/8/8/3QK3 w - - 0 1', playerColor:'w', task:'Checkmate the black king', par:10, maxMoves:20, lesson:'Drive the enemy king to the edge using your queen, then checkmate with king support. Key idea: use your king actively!', hints:['Drive the king to the edge first','Use queen to cut off escape squares','Bring your king closer','Avoid stalemate — leave the king one square'] },
  { id:'krk', icon:'♜', name:'K+R vs K', level:'Beginner', desc:'Rook and king checkmate.', fen:'8/8/8/4k3/8/8/8/3RK3 w - - 0 1', playerColor:'w', task:'Checkmate the black king', par:15, maxMoves:25, lesson:'Use the rook to cut off the king rank by rank. The king must support the rook to avoid stalemate.', hints:['Cut off the king with the rook','Use your king to push black king to the edge','Rook on the edge file delivers checkmate','Watch out for stalemate!'] },
  { id:'kpk', icon:'♟', name:'K+P vs K', level:'Beginner', desc:'Pawn promotion endgame.', fen:'8/8/2k5/8/2K5/2P5/8/8 w - - 0 1', playerColor:'w', task:'Promote your pawn to a queen', par:10, maxMoves:20, lesson:'Your king must stay IN FRONT of the pawn. Use the opposition to push the black king aside and promote.', hints:['King must lead the pawn','Gain the opposition: Kc5 forces black aside','Never let black king blockade','Once clear, advance the pawn'] },
  { id:'opp', icon:'♔', name:'Opposition', level:'Intermediate', desc:'Master king opposition.', fen:'8/8/8/3k4/8/3K4/8/8 w - - 0 1', playerColor:'w', task:'Gain the opposition and advance your king', par:8, maxMoves:15, lesson:'Opposition means kings face each other with one square between them. The player who does NOT have to move has the opposition.', hints:['Mirror the black king\'s moves','Gain opposition by placing kings face to face','Use opposition to push black king back','Advance your king once you have opposition'] },
  { id:'rook_cut', icon:'♖', name:'Rook Cutoff', level:'Intermediate', desc:'Use the rook to cut off the enemy king.', fen:'8/3P4/8/8/8/3k4/8/3K3R w - - 0 1', playerColor:'w', task:'Promote the d7 pawn using your rook to cut off the black king', par:7, maxMoves:15, lesson:'A rook on the 3rd rank cuts the enemy king from reaching the pawn.', hints:['Rook to h3 cuts the black king','Push the pawn while king is cut off','Promote the pawn safely'] },
  { id:'lucena', icon:'♜', name:'Lucena Position', level:'Advanced', desc:'The most important rook endgame.', fen:'1K1k4/1P6/8/8/8/8/8/R3r3 w - - 0 1', playerColor:'w', task:'Win using the Lucena bridge-building technique', par:10, maxMoves:20, lesson:'Build a bridge! Use your rook to shield your king from checks, then promote.', hints:['Bring your rook to the 4th rank','Block enemy rook checks with your rook','March your king forward','Build the bridge: Ra4 shields the king'] },
]

export default function EndgamesPage() {
  const [selected, setSelected] = useState(null)
  return (
    <div className="flex h-full overflow-hidden">
      <div className="w-64 shrink-0 border-r border-border bg-[#111827] flex flex-col overflow-y-auto">
        <div className="p-4 border-b border-border shrink-0"><h2 className="font-bold text-white">Endgame Trainer</h2><p className="text-xs text-muted mt-1">Master the essential endings</p></div>
        {SCENARIOS.map(s => (
          <button key={s.id} onClick={() => setSelected(s)} className={`w-full text-left px-4 py-3 border-b border-border/50 hover:bg-bg3 transition-colors ${selected?.id === s.id ? 'bg-gold/10 border-l-2 border-gold pl-3' : ''}`}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{s.icon}</span>
              <div>
                <div className={`text-sm font-semibold ${selected?.id === s.id ? 'text-gold' : 'text-white'}`}>{s.name}</div>
                <div className={`text-[10px] font-bold uppercase mt-0.5 ${s.level === 'Beginner' ? 'text-green-400' : s.level === 'Intermediate' ? 'text-yellow-400' : 'text-red-400'}`}>{s.level}</div>
              </div>
            </div>
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-hidden">
        {selected ? <EndgameBoard key={selected.id} scenario={selected} /> :
          <div className="flex items-center justify-center h-full"><div className="text-center"><div className="text-5xl mb-3 opacity-20">♔</div><div className="font-semibold text-white">Select an endgame</div></div></div>}
      </div>
    </div>
  )
}

function EndgameBoard({ scenario }) {
  const chessRef = useRef(new Chess(scenario.fen))
  const movesRef = useRef(0)
  const [fen, setFen]           = useState(scenario.fen)
  const [moves, setMoves]       = useState(0)
  const [complete, setComplete] = useState(false)
  const [flash, setFlash]       = useState(null)
  const [showHint, setShowHint] = useState(false)
  const [hintIdx, setHintIdx]   = useState(0)
  const showToast       = useAppStore(s => s.showToast)
  const refreshProgress = useAppStore(s => s.refreshProgress)

  const handleDrop = ({ sourceSquare: from, targetSquare: to }) => {
    if (complete) return false
    let result
    try { result = chessRef.current.move({ from, to, promotion: 'q' }) } catch { return false }
    if (!result) return false

    movesRef.current += 1
    const newMoves = movesRef.current
    setMoves(newMoves)
    setFen(chessRef.current.fen())

    if (chessRef.current.isCheckmate()) {
      setComplete(true); setFlash('correct')
      progressManager.awardXP('ENDGAME_COMPLETE')
      refreshProgress()
      showToast(newMoves <= scenario.par ? '🏆 Par or better!' : '✅ Endgame complete!', 'success')
    } else if (chessRef.current.isStalemate() || chessRef.current.isDraw()) {
      setFlash('wrong')
      showToast('⚠️ Stalemate! Reset and try again.', 'error')
      setTimeout(() => setFlash(null), 1000)
    } else if (newMoves >= scenario.maxMoves) {
      showToast('Too many moves — try restarting with a better plan', 'error')
    } else {
      setFlash('correct')
      setTimeout(() => setFlash(null), 400)
      setTimeout(() => {
        const legal = chessRef.current.moves({ verbose: true })
        if (legal.length > 0 && !chessRef.current.isGameOver()) {
          const pick = legal[Math.floor(Math.random() * legal.length)]
          try { chessRef.current.move({ from: pick.from, to: pick.to, promotion: 'q' }) } catch {}
          movesRef.current += 1
          setMoves(m => m + 1)
          setFen(chessRef.current.fen())
        }
      }, 500)
    }
    return true
  }

  const reset = () => {
    chessRef.current = new Chess(scenario.fen)
    movesRef.current = 0
    setFen(scenario.fen); setMoves(0); setComplete(false); setFlash(null); setHintIdx(0)
  }

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[420px]">
          <div className={`rounded-xl overflow-hidden transition-all duration-200 ${flash === 'correct' ? 'ring-2 ring-accent2' : flash === 'wrong' ? 'ring-2 ring-danger' : complete ? 'ring-2 ring-gold' : ''}`}>
            <Chessboard position={fen} onPieceDrop={handleDrop}
              boardOrientation={scenario.playerColor === 'b' ? 'black' : 'white'}
              arePiecesDraggable={!complete}
              customDarkSquareStyle={{ backgroundColor: '#b58863' }} customLightSquareStyle={{ backgroundColor: '#f0d9b5' }} />
          </div>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-muted">Moves: <span className={moves > scenario.par ? 'text-danger' : 'text-white'}>{moves}</span></span>
            <span className="text-muted">Par: <span className="text-gold">{scenario.par}</span></span>
            <span className="text-muted">Max: {scenario.maxMoves}</span>
          </div>
        </div>
      </div>
      <div className="w-72 shrink-0 border-l border-border bg-[#111827] flex flex-col p-4 gap-4 overflow-y-auto">
        <div><div className="font-bold text-white text-lg">{scenario.name}</div><div className="text-sm text-muted mt-1">{scenario.task}</div></div>
        {complete ? <div className="bg-gold/10 border border-gold/30 rounded-xl p-4 text-center"><div className="text-gold font-bold text-lg">🏆 Complete!</div><div className="text-muted text-sm mt-1">{moves <= scenario.par ? `Par! ${moves} moves` : `${moves} moves (par: ${scenario.par})`}</div></div> :
          <div className="bg-bg3 border border-border rounded-xl p-3 text-sm text-[#9CA3AF]">🎯 {scenario.task}</div>}
        <div className="space-y-2">
          <button onClick={() => { setShowHint(!showHint); setHintIdx(i => Math.min(i+1, scenario.hints.length-1)) }} className="w-full btn-ghost text-sm">💡 Hint {hintIdx > 0 ? `(${hintIdx}/${scenario.hints.length})` : ''}</button>
          {showHint && <div className="bg-gold/10 border border-gold/30 rounded-lg p-3 text-sm text-[#9CA3AF]">{scenario.hints[hintIdx] || scenario.hints[0]}</div>}
          <button onClick={reset} className="w-full btn-ghost text-sm">↺ Restart</button>
        </div>
        <div className="border-t border-border pt-3"><div className="text-xs font-bold text-muted uppercase tracking-wide mb-2">💡 Key Concept</div><p className="text-sm text-[#9CA3AF] leading-relaxed">{scenario.lesson}</p></div>
      </div>
    </div>
  )
}
