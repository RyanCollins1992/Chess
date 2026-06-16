import { useState, useRef } from 'react'
import { Chessboard } from '../components/ui/Chessboard'
import { Chess } from 'chess.js'
import { TRAPS } from '../data/traps'
import { progressManager } from '../core/ProgressManager'
import { useAppStore } from '../store/useAppStore'

const DRILL_SIZES = [5, 10, 20, 'All']

export default function MemoryDrillPage() {
  const [phase, setPhase]       = useState('setup')
  const [drillSize, setDrillSize] = useState(10)
  const [colorFilter, setColorFilter] = useState('all')
  const [session, setSession]   = useState([])
  const [index, setIndex]       = useState(0)
  const [results, setResults]   = useState([])
  const [key, setKey]           = useState(0)

  const startDrill = () => {
    const pool = TRAPS.filter(t => colorFilter === 'all' ? true : colorFilter === 'mates' ? t.isMate : t.color === colorFilter)
    const size = drillSize === 'All' ? pool.length : Math.min(drillSize, pool.length)
    const picked = [...pool].sort(() => Math.random() - 0.5).slice(0, size)
    setSession(picked); setIndex(0); setResults([]); setPhase('drill'); setKey(k => k + 1)
  }

  const handleResult = (trap, passed) => {
    const next = [...results, { trap, passed }]
    setResults(next)
    if (index + 1 >= session.length) {
      const correct = next.filter(r => r.passed).length
      if (correct > 0) progressManager.awardXP('TRAP_DRILL_COMPLETE', Math.ceil(correct / 2))
      useAppStore.getState().refreshProgress()
      setPhase('results')
    } else { setIndex(i => i + 1); setKey(k => k + 1) }
  }

  if (phase === 'setup') return <SetupScreen drillSize={drillSize} setDrillSize={setDrillSize} colorFilter={colorFilter} setColorFilter={setColorFilter} onStart={startDrill} />
  if (phase === 'results') return <ResultsScreen results={results} onRestart={() => setPhase('setup')} onRetry={startDrill} />
  return <DrillCard key={key} trap={session[index]} index={index} total={session.length} onResult={handleResult} />
}

function DrillCard({ trap, index, total, onResult }) {
  const chessRef   = useRef(new Chess(trap.fen))
  const moveIdxRef = useRef(0)
  const [fen, setFen]           = useState(trap.fen)
  const [moveIdx, setMoveIdx]   = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [flash, setFlash]       = useState(null)
  const [done, setDone]         = useState(false)

  const handleDrop = ({ sourceSquare: from, targetSquare: to }) => {
    if (done) return false
    let result
    try { result = chessRef.current.move({ from, to, promotion: 'q' }) } catch { return false }
    if (!result) return false

    const normalize = s => s.replace(/[+#!?]/g, '')
    if (normalize(result.san) === normalize(trap.moves[moveIdxRef.current])) {
      setFlash('correct')
      setFen(chessRef.current.fen())
      const next = moveIdxRef.current + 1
      moveIdxRef.current = next
      setMoveIdx(next)
      if (next >= trap.moves.length) {
        setDone(true)
        setTimeout(() => onResult(trap, mistakes === 0), 700)
      } else {
        setTimeout(() => {
          setFlash(null)
          try {
            chessRef.current.move(trap.moves[next])
            moveIdxRef.current = next + 1
            setMoveIdx(next + 1)
            setFen(chessRef.current.fen())
          } catch {}
        }, 400)
      }
    } else {
      chessRef.current.undo()
      setFlash('wrong')
      setMistakes(m => m + 1)
      setTimeout(() => setFlash(null), 700)
    }
    return true
  }

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-[440px]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted">{index + 1} / {total}</span>
            <div className="flex-1 mx-3 h-1.5 bg-bg3 rounded-full overflow-hidden">
              <div className="h-full bg-gold rounded-full" style={{ width: `${(index / total) * 100}%` }} />
            </div>
            <span className="text-sm font-bold text-white truncate max-w-32">{trap.name}</span>
          </div>
          <div className={`rounded-xl overflow-hidden transition-all duration-200 ${flash === 'correct' ? 'ring-2 ring-accent2' : flash === 'wrong' ? 'ring-2 ring-danger' : done ? 'ring-2 ring-gold' : ''}`}>
            <Chessboard position={fen} onPieceDrop={handleDrop}
              boardOrientation={trap.color === 'black' ? 'black' : 'white'}
              arePiecesDraggable={!done}
              customDarkSquareStyle={{ backgroundColor: '#b58863' }}
              customLightSquareStyle={{ backgroundColor: '#f0d9b5' }} />
          </div>
          <div className="mt-3 flex gap-1 justify-center">
            {trap.moves.map((_, i) => (
              <div key={i} className={`w-2 h-2 rounded-full ${i < moveIdx ? 'bg-accent2' : i === moveIdx ? 'bg-gold' : 'bg-bg3'}`} />
            ))}
          </div>
        </div>
      </div>
      <div className="w-56 shrink-0 border-l border-border bg-[#111827] p-4 flex flex-col gap-4">
        <div><div className="font-bold text-white">{trap.name}</div><div className="text-xs text-muted mt-0.5">{trap.opening}</div></div>
        <div className="text-sm text-[#9CA3AF]">🧠 Play all {trap.moves.length} moves from memory</div>
        {mistakes > 0 && <div className="text-xs text-danger">⚠️ {mistakes} mistake{mistakes !== 1 ? 's' : ''}</div>}
        {done && <div className="bg-accent2/15 border border-accent2/30 rounded-xl p-3 text-center"><div className="text-accent2 font-bold">{mistakes === 0 ? '⭐ Perfect!' : '✅ Done'}</div></div>}
        <button onClick={() => onResult(trap, false)} className="mt-auto btn-ghost text-sm">Skip →</button>
      </div>
    </div>
  )
}

function SetupScreen({ drillSize, setDrillSize, colorFilter, setColorFilter, onStart }) {
  return (
    <div className="flex items-center justify-center h-full p-6">
      <div className="card max-w-md w-full space-y-6">
        <div className="text-center"><div className="text-4xl mb-2">🧠</div><h2 className="text-xl font-extrabold text-white">Memory Drill</h2><p className="text-muted text-sm mt-1">Play opening moves from memory — no hints</p></div>
        <div>
          <div className="text-xs font-bold text-muted uppercase tracking-wide mb-2">Trap colour</div>
          <div className="flex gap-2">
            {[{ v: 'all', label: '⬛ All' }, { v: 'white', label: '♔ White' }, { v: 'black', label: '♚ Black' }, { v: 'mates', label: '💀 Mates' }].map(o => (
              <button key={o.v} onClick={() => setColorFilter(o.v)} className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-colors ${colorFilter === o.v ? 'bg-gold text-bg border-gold' : 'bg-bg3 text-muted border-border hover:text-white'}`}>{o.label}</button>
            ))}
          </div>
        </div>
        <div>
          <div className="text-xs font-bold text-muted uppercase tracking-wide mb-2">Number of traps</div>
          <div className="flex gap-2">
            {DRILL_SIZES.map(s => (
              <button key={s} onClick={() => setDrillSize(s)} className={`flex-1 py-2 text-sm font-bold rounded-lg border transition-colors ${drillSize === s ? 'bg-gold text-bg border-gold' : 'bg-bg3 text-muted border-border hover:text-white'}`}>{s}</button>
            ))}
          </div>
        </div>
        <button onClick={onStart} className="w-full btn-gold text-base py-3">Start Drill</button>
      </div>
    </div>
  )
}

function ResultsScreen({ results, onRestart, onRetry }) {
  const passed = results.filter(r => r.passed).length
  const pct = Math.round((passed / results.length) * 100)
  return (
    <div className="flex items-center justify-center h-full p-6">
      <div className="card max-w-md w-full space-y-6 text-center">
        <div><div className="text-5xl mb-3">{pct >= 80 ? '🏆' : pct >= 50 ? '👍' : '💪'}</div><div className="text-2xl font-extrabold text-white">{passed} / {results.length}</div><div className="text-muted text-sm mt-1">{pct}% correct</div></div>
        <div className="space-y-2 text-left max-h-48 overflow-y-auto">
          {results.map(({ trap, passed }, i) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              <span className={passed ? 'text-accent2' : 'text-danger'}>{passed ? '✓' : '✗'}</span>
              <span className="text-white flex-1">{trap.name}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-3"><button onClick={onRestart} className="flex-1 btn-ghost text-sm">New Setup</button><button onClick={onRetry} className="flex-1 btn-gold text-sm">Retry Same</button></div>
      </div>
    </div>
  )
}
