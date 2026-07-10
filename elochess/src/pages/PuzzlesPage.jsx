import { useState, useMemo } from 'react'
import { Chessboard } from '../components/ui/Chessboard'
import { useChessBoard } from '../hooks/useChessBoard'
import { progressManager } from '../core/ProgressManager'
import { useAppStore } from '../store/useAppStore'
import { PUZZLES } from '../data/puzzles'

const THEMES = ['All', 'Fork', 'Checkmate', 'Tactics', 'Pin', 'Discovery', 'Sacrifice', 'Endgame']
const DIFFICULTIES = ['All', 'beginner', 'intermediate', 'advanced']

export default function PuzzlesPage() {
  const [selectedPuzzle, setSelectedPuzzle] = useState(null)
  const [theme, setTheme]         = useState('All')
  const [difficulty, setDifficulty] = useState('All')
  const solved = useAppStore(s => s.solvedPuzzles)
  const markPuzzleSolved = useAppStore(s => s.markPuzzleSolved)
  const resetSolvedPuzzles = useAppStore(s => s.resetSolvedPuzzles)
  const [streak, setStreak]       = useState(0)
  const showToast     = useAppStore(s => s.showToast)
  const refreshProgress = useAppStore(s => s.refreshProgress)
  const filtered = useMemo(() => PUZZLES.filter(p => (theme === 'All' || p.theme === theme) && (difficulty === 'All' || p.difficulty === difficulty)), [theme, difficulty])

  const pickRandomPuzzle = (excludeIds) => {
    const pool = PUZZLES.filter(p => !excludeIds.includes(p.id))
    return pool[Math.floor(Math.random() * pool.length)]
  }

  const handleSolved = (id) => {
    const next = [...new Set([...solved, id])]
    markPuzzleSolved(id)
    const ns = streak + 1; setStreak(ns)
    progressManager.awardXP('PUZZLE_CORRECT')
    if (ns % 5 === 0) progressManager.awardXP('PUZZLE_STREAK_5')
    refreshProgress()
    showToast(ns % 5 === 0 ? `🔥 ${ns} streak! +25 XP` : '✅ Puzzle solved! +15 XP', 'success')

    setTimeout(() => {
      if (next.length >= PUZZLES.length) {
        resetSolvedPuzzles()
        showToast('🎉 All puzzles completed! Reshuffling...', 'success')
        setSelectedPuzzle(pickRandomPuzzle([]))
      } else {
        setSelectedPuzzle(pickRandomPuzzle(next))
      }
    }, 1200)
  }

  return (
    <div className="flex h-full overflow-hidden">
      <div className="w-64 shrink-0 border-r border-border bg-bg2 flex flex-col">
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
                  <span className={`text-[10px] font-bold uppercase ${p.difficulty === 'beginner' ? 'text-accent2' : p.difficulty === 'intermediate' ? 'text-gold' : 'text-danger'}`}>{p.difficulty}</span>
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
  const { fen, tryMove, undo, reset: resetBoard } = useChessBoard(puzzle.fen)
  const [solved, setSolved] = useState(isSolved)
  const [failed, setFailed] = useState(false)
  const [flash, setFlash]   = useState(null)
  const [showHint, setShowHint] = useState(false)
  const showToast = useAppStore(s => s.showToast)

  const handleDrop = ({ sourceSquare: from, targetSquare: to }) => {
    if (solved) return false
    const result = tryMove(from, to)
    if (!result) return false
    const normalize = s => s.replace(/[+#!?]/g, '')
    if (normalize(result.san) === normalize(puzzle.solution[0])) {
      setFlash('correct'); setSolved(true); onSolved()
      showToast('✅ Solved! +15 XP', 'success')
    } else {
      undo()
      setFlash('wrong'); setFailed(true)
      showToast('Not the right move — try again!', 'error', 1500)
      setTimeout(() => setFlash(null), 800)
    }
    return true
  }

  const reset = () => {
    resetBoard(puzzle.fen)
    setFlash(null)
  }

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[420px]">
          <div className={`rounded-xl overflow-hidden transition-all duration-200 ${flash === 'correct' || solved ? 'ring-2 ring-accent2' : flash === 'wrong' ? 'ring-2 ring-danger' : ''}`}>
            <Chessboard position={fen} onPieceDrop={handleDrop} arePiecesDraggable={!solved} />
          </div>
        </div>
      </div>
      <div className="w-72 shrink-0 border-l border-border bg-bg2 flex flex-col p-4 gap-4 overflow-y-auto">
        <div><div className="font-bold text-white text-lg">{puzzle.title}</div><div className="text-xs text-muted">{puzzle.theme}</div></div>
        {solved
          ? <div className="bg-accent2/15 border border-accent2/30 rounded-xl p-4 text-center"><div className="text-accent2 font-bold text-lg">✅ Solved!</div>{!failed && <div className="text-xs text-muted mt-1">First try!</div>}</div>
          : <div className="bg-bg3 border border-border rounded-xl p-3 text-sm text-muted">🎯 Find the best move for {fen.split(' ')[1] === 'w' ? 'White' : 'Black'}</div>}
        <div className="space-y-2">
          <button onClick={() => setShowHint(!showHint)} className="w-full btn-ghost text-sm">💡 {showHint ? 'Hide' : 'Show'} Hint</button>
          {showHint && <div className="bg-gold/10 border border-gold/30 rounded-lg p-3 text-sm text-muted">{puzzle.hint}</div>}
          <button onClick={reset} className="w-full btn-ghost text-sm">↺ Reset</button>
        </div>
      </div>
    </div>
  )
}
