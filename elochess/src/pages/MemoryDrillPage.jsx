import { useState, useRef } from 'react'
import { Chessboard } from '../components/ui/Chessboard'
import { useChessBoard } from '../hooks/useChessBoard'
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

  const handleResult = (trap, passed, mistakes = 0) => {
    const next = [...results, { trap, passed, mistakes }]
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
  const { fen, tryMove, undo, move } = useChessBoard(trap.fen)
  const moveIdxRef = useRef(0)
  const [moveIdx, setMoveIdx]   = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [flash, setFlash]       = useState(null)
  const [done, setDone]         = useState(false)

  const handleDrop = ({ sourceSquare: from, targetSquare: to }) => {
    if (done) return false
    const result = tryMove(from, to)
    if (!result) return false

    const normalize = s => s.replace(/[+#!?]/g, '')
    if (normalize(result.san) === normalize(trap.moves[moveIdxRef.current])) {
      setFlash('correct')
      const next = moveIdxRef.current + 1
      moveIdxRef.current = next
      setMoveIdx(next)
      if (next >= trap.moves.length) {
        setDone(true)
        setTimeout(() => onResult(trap, mistakes === 0, mistakes), 700)
      } else {
        setTimeout(() => {
          setFlash(null)
          if (move(trap.moves[next])) {
            moveIdxRef.current = next + 1
            setMoveIdx(next + 1)
          }
        }, 400)
      }
    } else {
      undo()
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
          <div className="flex items-center justify-between mb-1">
            <span className="font-heading text-xs font-bold text-gold uppercase tracking-wide">Remember Moves</span>
            <span className="text-xs text-muted tabular-nums">{index + 1}/{total}</span>
          </div>
          <div className="flex gap-1 mb-3">
            {Array.from({ length: total }).map((_, i) => (
              <div key={i} className={`h-1.5 flex-1 rounded-full ${i < index ? 'bg-gold' : i === index ? 'bg-gold' : 'bg-bg3'}`} style={i === index ? { opacity: 0.5 } : undefined} />
            ))}
          </div>
          <div className={`rounded-xl overflow-hidden transition-all duration-200 ${flash === 'correct' ? 'ring-2 ring-accent2' : flash === 'wrong' ? 'ring-2 ring-danger' : done ? 'ring-2 ring-gold' : ''}`}>
            <Chessboard position={fen} onPieceDrop={handleDrop}
              boardOrientation={trap.color === 'black' ? 'black' : 'white'}
              arePiecesDraggable={!done} />
          </div>
          <div className="mt-3 flex gap-1.5 justify-center">
            {trap.moves.map((_, i) => (
              <div key={i} className={`rounded-full transition-all ${i < moveIdx ? 'w-2 h-2 bg-accent2' : i === moveIdx ? 'w-2.5 h-2.5 bg-gold' : 'w-2 h-2 bg-bg3'}`} />
            ))}
          </div>
        </div>
      </div>
      <div className="w-56 shrink-0 border-l border-border bg-bg2 p-4 flex flex-col gap-4">
        <div className="text-5xl leading-none text-gold font-heading select-none" style={{ opacity: 0.25 }}>{trap.color === 'black' ? '♞' : '♘'}</div>
        <div><div className="font-bold text-white">{trap.name}</div><div className="text-xs text-muted mt-0.5">{trap.opening}</div></div>
        <div className="text-sm text-muted">Play all {trap.moves.length} moves from memory</div>
        {mistakes > 0 && <div className="text-xs text-danger font-medium">{mistakes} mistake{mistakes !== 1 ? 's' : ''} so far</div>}
        {done && <div className="rounded-xl p-3 text-center" style={{ background: 'color-mix(in srgb, var(--color-accent2) 15%, transparent)', border: '1px solid color-mix(in srgb, var(--color-accent2) 30%, transparent)' }}><div className="text-accent2 font-bold">{mistakes === 0 ? 'Perfect' : 'Done'}</div></div>}
        <button onClick={() => onResult(trap, false, mistakes)} className="mt-auto btn-ghost text-sm">Skip →</button>
      </div>
    </div>
  )
}

function SetupScreen({ drillSize, setDrillSize, colorFilter, setColorFilter, onStart }) {
  const sizeIdx = DRILL_SIZES.indexOf(drillSize)
  const stepSize = dir => setDrillSize(DRILL_SIZES[Math.min(DRILL_SIZES.length - 1, Math.max(0, sizeIdx + dir))])

  return (
    <div className="flex items-center justify-center h-full p-6">
      <div className="card max-w-md w-full space-y-6 relative overflow-hidden">
        <div className="absolute -top-4 -right-3 text-8xl leading-none text-gold font-heading select-none pointer-events-none" style={{ opacity: 0.1 }}>♞</div>
        <div className="relative">
          <div className="font-heading text-xs font-bold text-gold uppercase tracking-wide">Memory Drill</div>
          <h2 className="text-2xl font-extrabold text-white font-heading mt-1">Remember Moves</h2>
          <p className="text-muted text-sm mt-1">Play opening moves from memory — no hints</p>
        </div>
        <div className="relative">
          <div className="text-xs font-bold text-muted uppercase tracking-wide mb-2">Trap colour</div>
          <div className="flex gap-2">
            {[{ v: 'all', label: 'All' }, { v: 'white', label: '♔ White' }, { v: 'black', label: '♚ Black' }, { v: 'mates', label: 'Mates' }].map(o => (
              <button key={o.v} onClick={() => setColorFilter(o.v)} className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-colors ${colorFilter === o.v ? 'bg-gold text-bg border-gold' : 'bg-bg3 text-muted border-border hover:text-white'}`}>{o.label}</button>
            ))}
          </div>
        </div>
        <div className="relative">
          <div className="text-xs font-bold text-muted uppercase tracking-wide mb-2">Number of traps</div>
          <div className="flex items-center justify-between bg-bg3 border border-border rounded-lg px-2 py-2">
            <button onClick={() => stepSize(-1)} disabled={sizeIdx === 0}
              className="w-9 h-9 rounded-md bg-bg2 text-white font-bold text-lg leading-none disabled:opacity-30 hover:bg-border transition-colors">−</button>
            <span className="font-heading text-xl font-extrabold text-white tabular-nums">{drillSize}</span>
            <button onClick={() => stepSize(1)} disabled={sizeIdx === DRILL_SIZES.length - 1}
              className="w-9 h-9 rounded-md bg-bg2 text-white font-bold text-lg leading-none disabled:opacity-30 hover:bg-border transition-colors">+</button>
          </div>
        </div>
        <button onClick={onStart} className="relative w-full btn-gold text-base py-3">Start Drill</button>
      </div>
    </div>
  )
}

function ResultsScreen({ results, onRestart, onRetry }) {
  const passed = results.filter(r => r.passed).length
  const pct = Math.round((passed / results.length) * 100)
  return (
    <div className="flex items-center justify-center h-full p-6">
      <div className="card max-w-md w-full space-y-6">
        <div className="text-center">
          <div className="font-heading text-xs font-bold text-gold uppercase tracking-wide">Your Results</div>
          <div className="font-heading text-4xl font-extrabold text-white mt-2 tabular-nums">{pct}%</div>
          <div className="text-muted text-sm mt-1">{passed} of {results.length} correct from memory</div>
        </div>
        <div className="space-y-1.5 max-h-52 overflow-y-auto">
          {results.map(({ trap, passed, mistakes }, i) => {
            const width = Math.max(10, (trap.moves.length - mistakes) / trap.moves.length * 100)
            return (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs text-white flex-1 truncate">{trap.name}</span>
                <div className="w-24 h-2 rounded-full bg-bg3 overflow-hidden shrink-0">
                  <div className={`h-full rounded-full ${passed ? 'bg-accent2' : 'bg-danger'}`} style={{ width: `${passed ? 100 : width}%` }} />
                </div>
                <span className={`text-xs w-4 text-right shrink-0 ${passed ? 'text-accent2' : 'text-danger'}`}>{passed ? '✓' : '✗'}</span>
              </div>
            )
          })}
        </div>
        <div className="flex gap-3"><button onClick={onRestart} className="flex-1 btn-ghost text-sm">New Setup</button><button onClick={onRetry} className="flex-1 btn-gold text-sm">Retry Same</button></div>
      </div>
    </div>
  )
}
