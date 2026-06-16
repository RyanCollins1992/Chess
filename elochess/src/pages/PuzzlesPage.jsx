import { useState, useRef, useMemo } from 'react'
import { Chessboard } from '../components/ui/Chessboard'
import { Chess } from 'chess.js'
import { progressManager } from '../core/ProgressManager'
import { useAppStore } from '../store/useAppStore'

const PUZZLES = [
  { id: 'p1', title: 'Back Rank Checkmate', theme: 'Checkmate', fen: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1', solution: ['Rd8'], hint: 'The enemy king is trapped on the back rank', difficulty: 'beginner' },
  { id: 'p2', title: 'Win the Queen', theme: 'Tactics', fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 4', solution: ['g6'], hint: 'Drive the queen away with a pawn', difficulty: 'beginner' },
  { id: 'p3', title: 'Pin and Win', theme: 'Pin', fen: 'r1bqk2r/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 0 6', solution: ['Bxf7+'], hint: 'The f7 square is a classic weakness', difficulty: 'intermediate' },
  { id: 'p4', title: 'Discovered Attack', theme: 'Discovery', fen: '4r1k1/pp3ppp/2p5/8/3B4/1P6/P4PPP/R5K1 w - - 0 1', solution: ['Bf6'], hint: 'Move the bishop to reveal a hidden attack', difficulty: 'intermediate' },
  { id: 'p5', title: 'Fork the King and Rook', theme: 'Fork', fen: 'r3k3/8/8/8/8/8/8/4KN2 w - - 0 1', solution: ['Nd2'], hint: 'Knight forks are powerful', difficulty: 'beginner' },
  { id: 'p6', title: 'Queen Sacrifice', theme: 'Sacrifice', fen: '5rk1/pb3p1p/1p4p1/3q4/3P4/5N2/PP3PPP/R2QR1K1 w - - 0 1', solution: ['Qxd5'], hint: 'Sometimes giving up the queen wins more back', difficulty: 'advanced' },
  { id: 'p7', title: 'King Opposition', theme: 'Endgame', fen: '8/8/4k3/8/4K3/8/8/8 w - - 0 1', solution: ['Ke5'], hint: 'Gain the opposition to control the board', difficulty: 'beginner' },
  { id: 'p8', title: 'Smothered Mate Setup', theme: 'Checkmate', fen: '5rk1/5ppp/8/8/8/8/5PPP/4RNK1 w - - 0 1', solution: ['Ne3'], hint: 'The knight needs to reach h6', difficulty: 'intermediate' },
]
const THEMES = ['All', 'Fork', 'Checkmate', 'Tactics', 'Pin', 'Discovery', 'Sacrifice', 'Endgame']
const DIFFICULTIES = ['All', 'beginner', 'intermediate', 'advanced']

export default function PuzzlesPage() {
  const [selectedPuzzle, setSelectedPuzzle] = useState(null)
  const [theme, setTheme]         = useState('All')
  const [difficulty, setDifficulty] = useState('All')
  const [solved, setSolved]       = useState(() => { try { return JSON.parse(localStorage.getItem('elochess-solved-puzzles') || '[]') } catch { return [] } })
  const [streak, setStreak]       = useState(0)
  const showToast     = useAppStore(s => s.showToast)
  const refreshProgress = useAppStore(s => s.refreshProgress)
  const filtered = useMemo(() => PUZZLES.filter(p => (theme === 'All' || p.theme === theme) && (difficulty === 'All' || p.difficulty === difficulty)), [theme, difficulty])

  const handleSolved = (id) => {
    const next = [...new Set([...solved, id])]
    setSolved(next); localStorage.setItem('elochess-solved-puzzles', JSON.stringify(next))
    const ns = streak + 1; setStreak(ns)
    progressManager.awardXP('PUZZLE_CORRECT')
    if (ns % 5 === 0) progressManager.awardXP('PUZZLE_STREAK_5')
    refreshProgress()
    showToast(ns % 5 === 0 ? `🔥 ${ns} streak! +25 XP` : '✅ Puzzle solved! +15 XP', 'success')
  }

  return (
    <div className="flex h-full overflow-hidden">
      <div className="w-64 shrink-0 border-r border-border bg-[#111827] flex flex-col">
        <div className="p-3 border-b border-border space-y-2 shrink-0">
          <select value={theme} onChange={e => setTheme(e.target.value)} className="w-full bg-bg3 border border-border rounded-lg px-2 py-1.5 text-sm text-white outline-none">
            {THEMES.map(t => <option key={t} value={t}>{t === 'All' ? 'All Themes' : t}</option>)}
          </select>
          <select value={difficulty} onChange={e => setDifficulty(e.target.value)} className="w-full bg-bg3 border border-border rounded-lg px-2 py-1.5 text-sm text-white outline-none">
            {DIFFICULTIES.map(d => <option key={d} value={d}>{d === 'All' ? 'All Levels' : d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
          </select>
          <div className="text-xs text-muted">{solved.length}/{PUZZLES.length} solved · Streak: {streak}</div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map(p => (
            <button key={p.id} onClick={() => setSelectedPuzzle(p)} className={`w-full text-left px-4 py-3 border-b border-border/50 hover:bg-bg3 transition-colors ${selectedPuzzle?.id === p.id ? 'bg-gold/10 border-l-2 border-gold pl-3' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div><div className={`text-sm font-semibold ${selectedPuzzle?.id === p.id ? 'text-gold' : 'text-white'}`}>{p.title}</div><div className="text-xs text-muted mt-0.5">{p.theme}</div></div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`text-[10px] font-bold uppercase ${p.difficulty === 'beginner' ? 'text-green-400' : p.difficulty === 'intermediate' ? 'text-yellow-400' : 'text-red-400'}`}>{p.difficulty}</span>
                  {solved.includes(p.id) && <span className="text-accent2 text-xs">✓</span>}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        {selectedPuzzle
          ? <PuzzleBoard key={selectedPuzzle.id} puzzle={selectedPuzzle} isSolved={solved.includes(selectedPuzzle.id)} onSolved={() => handleSolved(selectedPuzzle.id)} />
          : <div className="flex items-center justify-center h-full"><div className="text-center"><div className="text-5xl mb-3 opacity-20">🧩</div><div className="font-semibold text-white">Select a puzzle</div></div></div>}
      </div>
    </div>
  )
}

function PuzzleBoard({ puzzle, isSolved, onSolved }) {
  const chessRef = useRef(new Chess(puzzle.fen))
  const [fen, setFen]     = useState(puzzle.fen)
  const [solved, setSolved] = useState(isSolved)
  const [failed, setFailed] = useState(false)
  const [flash, setFlash]   = useState(null)
  const [showHint, setShowHint] = useState(false)
  const showToast = useAppStore(s => s.showToast)

  const handleDrop = ({ sourceSquare: from, targetSquare: to }) => {
    if (solved) return false
    let result
    try { result = chessRef.current.move({ from, to, promotion: 'q' }) } catch { return false }
    if (!result) return false
    const normalize = s => s.replace(/[+#!?]/g, '')
    if (normalize(result.san) === normalize(puzzle.solution[0])) {
      setFen(chessRef.current.fen())
      setFlash('correct'); setSolved(true); onSolved()
      showToast('✅ Solved! +15 XP', 'success')
    } else {
      chessRef.current.undo()
      setFlash('wrong'); setFailed(true)
      showToast('Not the right move — try again!', 'error', 1500)
      setTimeout(() => setFlash(null), 800)
    }
    return true
  }

  const reset = () => {
    chessRef.current = new Chess(puzzle.fen)
    setFen(puzzle.fen); setFlash(null)
  }

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[420px]">
          <div className={`rounded-xl overflow-hidden transition-all duration-200 ${flash === 'correct' || solved ? 'ring-2 ring-accent2' : flash === 'wrong' ? 'ring-2 ring-danger' : ''}`}>
            <Chessboard position={fen} onPieceDrop={handleDrop} arePiecesDraggable={!solved}
              customDarkSquareStyle={{ backgroundColor: '#b58863' }} customLightSquareStyle={{ backgroundColor: '#f0d9b5' }} />
          </div>
        </div>
      </div>
      <div className="w-72 shrink-0 border-l border-border bg-[#111827] flex flex-col p-4 gap-4 overflow-y-auto">
        <div><div className="font-bold text-white text-lg">{puzzle.title}</div><div className="text-xs text-muted">{puzzle.theme}</div></div>
        {solved
          ? <div className="bg-accent2/15 border border-accent2/30 rounded-xl p-4 text-center"><div className="text-accent2 font-bold text-lg">✅ Solved!</div>{!failed && <div className="text-xs text-muted mt-1">First try!</div>}</div>
          : <div className="bg-bg3 border border-border rounded-xl p-3 text-sm text-[#9CA3AF]">🎯 Find the best move for {chessRef.current.turn() === 'w' ? 'White' : 'Black'}</div>}
        <div className="space-y-2">
          <button onClick={() => setShowHint(!showHint)} className="w-full btn-ghost text-sm">💡 {showHint ? 'Hide' : 'Show'} Hint</button>
          {showHint && <div className="bg-gold/10 border border-gold/30 rounded-lg p-3 text-sm text-[#9CA3AF]">{puzzle.hint}</div>}
          <button onClick={reset} className="w-full btn-ghost text-sm">↺ Reset</button>
        </div>
      </div>
    </div>
  )
}
