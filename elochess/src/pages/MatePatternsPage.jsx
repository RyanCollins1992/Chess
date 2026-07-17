import { useState } from 'react'
import { Chessboard } from '../components/ui/Chessboard'
import { useChessBoard } from '../hooks/useChessBoard'
import { useAppStore } from '../store/useAppStore'
import { PATTERNS } from '../data/matePatterns'

const CATEGORIES = ['All', 'Rook', 'Queen', 'Knight', 'Bishop']

export default function MatePatternsPage() {
  const [selected, setSelected] = useState(null)
  const [category, setCategory] = useState('All')
  const learned     = useAppStore(s => s.matePatternsLearned)
  const markLearned = useAppStore(s => s.markMatePatternLearned)
  const filtered = PATTERNS.filter(p => category === 'All' || p.category === category)

  return (
    <div className="flex h-full overflow-hidden">
      <div className="w-64 shrink-0 border-r border-border bg-bg2 flex flex-col">
        <div className="p-3 border-b border-border shrink-0">
          <h2 className="font-bold text-white mb-2 font-heading">Mate Patterns</h2>
          <div className="flex flex-wrap gap-1">
            {CATEGORIES.map(c => <button key={c} onClick={() => setCategory(c)} className={`px-2 py-1 text-xs font-bold rounded-lg transition-colors ${category === c ? 'bg-gold text-bg' : 'bg-bg3 text-muted border border-border hover:text-white'}`}>{c}</button>)}
          </div>
          <div className="text-xs text-muted mt-2">{learned.length}/{PATTERNS.length} learned</div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map(p => (
            <button key={p.id} onClick={() => setSelected(p)} className={`w-full text-left px-4 py-3 border-b border-border/50 hover:bg-bg3 transition-colors ${selected?.id === p.id ? 'bg-gold/10 border-l-2 border-gold pl-3' : ''}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{p.icon}</span>
                  <div><div className={`text-sm font-semibold ${selected?.id === p.id ? 'text-gold' : 'text-white'}`}>{p.name}</div><div className="text-xs text-muted">{p.category}</div></div>
                </div>
                {learned.includes(p.id) && <span className="text-accent2 text-xs shrink-0">✓</span>}
              </div>
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        {selected
          ? <PatternViewer key={selected.id} pattern={selected} isLearned={learned.includes(selected.id)} onLearned={() => markLearned(selected.id)} />
          : <div className="flex items-center justify-center h-full"><div className="text-center"><div className="text-5xl mb-3 opacity-20">👑</div><div className="font-semibold text-white">Select a pattern</div></div></div>}
      </div>
    </div>
  )
}

function PatternViewer({ pattern, isLearned, onLearned }) {
  const { fen, tryMove, undo, reset: resetBoard } = useChessBoard(pattern.fen)
  const [solved, setSolved] = useState(isLearned)
  const [flash, setFlash]   = useState(null)
  const showToast = useAppStore(s => s.showToast)

  const handleDrop = ({ sourceSquare: from, targetSquare: to }) => {
    if (pattern.isDemo || solved || pattern.solution.length === 0) return false
    const result = tryMove(from, to)
    if (!result) return false
    const normalize = s => s.replace(/[+#!?]/g, '')
    if (normalize(result.san) === normalize(pattern.solution[0])) {
      setFlash('correct'); setSolved(true); onLearned()
      showToast('🎉 Correct! Pattern learned!', 'success')
    } else {
      undo(); setFlash('wrong')
      showToast('Not quite — try again!', 'error', 1500)
      setTimeout(() => setFlash(null), 800)
    }
    return true
  }

  const reset = () => { resetBoard(pattern.fen); setFlash(null) }

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[420px]">
          <div className={`rounded-xl overflow-hidden transition-all duration-200 ${flash === 'correct' || solved ? 'ring-2 ring-accent2' : flash === 'wrong' ? 'ring-2 ring-danger' : ''}`}>
            <Chessboard position={fen} onPieceDrop={handleDrop} arePiecesDraggable={!pattern.isDemo && !solved} />
          </div>
          {pattern.isDemo && <div className="mt-2 text-center text-xs text-muted">📖 Study position — no moves required</div>}
        </div>
      </div>
      <div className="w-72 shrink-0 border-l border-border bg-bg2 flex flex-col p-4 gap-4 overflow-y-auto">
        <div><div className="text-2xl mb-1">{pattern.icon}</div><div className="font-bold text-white text-lg">{pattern.name}</div><div className="text-xs text-muted">{pattern.category} pattern</div></div>
        <div className="bg-bg3 border border-border rounded-xl p-3 text-sm text-muted leading-relaxed">{pattern.desc}</div>
        {solved || pattern.isDemo
          ? <div className="bg-accent2/10 border border-accent2/30 rounded-xl p-3"><div className="text-xs font-bold text-accent2 mb-1">✅ Explanation</div><p className="text-sm text-muted">{pattern.explanation}</p></div>
          : <div className="bg-gold/10 border border-gold/30 rounded-xl p-3 text-sm text-muted">🎯 Find the checkmate move!</div>}
        <div className="space-y-2 mt-auto">
          {!pattern.isDemo && !solved && <button onClick={reset} className="w-full btn-ghost text-sm">↺ Reset</button>}
          {!isLearned && (pattern.isDemo || solved) && <button onClick={onLearned} className="w-full btn-gold text-sm">✓ Mark as Learned</button>}
          {isLearned && <div className="text-center text-sm text-accent2">✅ Learned!</div>}
        </div>
      </div>
    </div>
  )
}
