import { useState, useMemo } from 'react'
import { TRAPS } from '../data/traps'
import { srsEngine } from '../core/SpacedRepetitionEngine'
import { progressManager } from '../core/ProgressManager'
import { useAppStore } from '../store/useAppStore'

const FILTERS = ['All', 'Unrated', 'Easy', 'Medium', 'Hard']

export default function RateDifficultyPage() {
  const ratings = useAppStore(s => s.difficultyRatings)
  const setDifficultyRating = useAppStore(s => s.setDifficultyRating)
  const [filter, setFilter]   = useState('All')
  const [search, setSearch]   = useState('')
  const showToast = useAppStore(s => s.showToast)

  const saveRating = (trapId, stars) => {
    setDifficultyRating(trapId, stars)
    srsEngine.setRating(trapId, stars)
    showToast(
      stars === 1 ? '⭐ Marked as Easy' : stars === 2 ? '⭐⭐ Marked as Medium' : '⭐⭐⭐ Marked as Hard',
      'success', 1200
    )
  }

  const filtered = useMemo(() => {
    return TRAPS.filter(t => {
      const r = ratings[t.id]
      const filterMatch =
        filter === 'All'    ? true :
        filter === 'Unrated' ? !r :
        filter === 'Easy'    ? r === 1 :
        filter === 'Medium'  ? r === 2 :
        filter === 'Hard'    ? r === 3 : true
      const searchMatch = !search || t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.opening?.toLowerCase().includes(search.toLowerCase())
      return filterMatch && searchMatch
    })
  }, [filter, search, ratings])

  const ratedCount = Object.values(ratings).filter(Boolean).length
  const pct        = Math.round((ratedCount / TRAPS.length) * 100)

  // Group by color
  const whites = filtered.filter(t => t.color === 'white' && !t.isMate)
  const blacks = filtered.filter(t => t.color === 'black' && !t.isMate)
  const mates  = filtered.filter(t => t.isMate)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-5 pb-3 border-b border-border shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xl font-extrabold text-white">Rate Difficulty</h2>
            <p className="text-muted text-sm mt-0.5">Star each trap — Spaced Review drills hard ones more often</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-extrabold text-gold">{ratedCount}/{TRAPS.length}</div>
            <div className="text-xs text-muted">rated</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-bg3 rounded-full overflow-hidden mb-3">
          <div className="h-full bg-gold rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>

        {/* Filters + search */}
        <div className="flex gap-2">
          <div className="flex gap-1">
            {FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                  filter === f ? 'bg-gold text-bg border-gold' : 'bg-bg3 text-muted border-border hover:text-white'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search…"
            className="flex-1 bg-bg3 border border-border rounded-lg px-3 py-1.5 text-sm text-white placeholder-muted outline-none focus:border-gold/50"
          />
        </div>

        {/* Legend */}
        <div className="flex gap-4 mt-2 text-xs text-muted">
          <span>⭐ Easy — review less often</span>
          <span>⭐⭐ Medium</span>
          <span>⭐⭐⭐ Hard — review more often</span>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        {whites.length > 0 && (
          <TrapGroup title="♔ White Traps" traps={whites} ratings={ratings} onRate={saveRating} />
        )}
        {blacks.length > 0 && (
          <TrapGroup title="♚ Black Traps" traps={blacks} ratings={ratings} onRate={saveRating} />
        )}
        {mates.length > 0 && (
          <TrapGroup title="💀 Mates" traps={mates} ratings={ratings} onRate={saveRating} />
        )}
        {filtered.length === 0 && (
          <div className="text-center text-muted py-16">
            <div className="text-4xl mb-3 opacity-30">⭐</div>
            <div>No traps match this filter</div>
          </div>
        )}
      </div>
    </div>
  )
}

function TrapGroup({ title, traps, ratings, onRate }) {
  return (
    <div>
      <div className="text-xs font-bold text-muted uppercase tracking-widest mb-3">{title}</div>
      <div className="space-y-2">
        {traps.map(trap => (
          <TrapRateRow key={trap.id} trap={trap} rating={ratings[trap.id] || 0} onRate={onRate} />
        ))}
      </div>
    </div>
  )
}

function TrapRateRow({ trap, rating, onRate }) {
  const [hovered, setHovered] = useState(0)

  const levelColors = {
    beginner:     'text-green-400 bg-green-900/30 border-green-800/40',
    intermediate: 'text-yellow-400 bg-yellow-900/30 border-yellow-800/40',
    advanced:     'text-red-400 bg-red-900/30 border-red-800/40',
  }

  const studyCount = progressManager.getTrapStudyCount(trap.id)
  const inSRS      = srsEngine.isEnrolled(trap.id)

  return (
    <div className="flex items-center gap-4 px-4 py-3 bg-bg2 rounded-xl border border-border hover:border-border/80 transition-colors">
      {/* Name */}
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-white text-sm truncate">{trap.name}</div>
        <div className="text-xs text-muted truncate mt-0.5">{trap.opening}</div>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-2 shrink-0">
        {studyCount > 0 && (
          <span className="text-xs text-accent2">✓{studyCount}x</span>
        )}
        {inSRS && (
          <span className="text-xs text-accent">🔁</span>
        )}
        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${levelColors[trap.level] || 'text-muted'}`}>
          {trap.level}
        </span>
      </div>

      {/* Stars */}
      <div
        className="flex gap-0.5 shrink-0"
        onMouseLeave={() => setHovered(0)}
      >
        {[1, 2, 3].map(star => (
          <button
            key={star}
            onClick={() => onRate(trap.id, rating === star ? 0 : star)}
            onMouseEnter={() => setHovered(star)}
            className="text-xl transition-all hover:scale-110 active:scale-95"
            title={star === 1 ? 'Easy' : star === 2 ? 'Medium' : 'Hard'}
          >
            <span className={
              (hovered ? star <= hovered : star <= rating)
                ? star === 1 ? 'text-green-400' : star === 2 ? 'text-yellow-400' : 'text-red-400'
                : 'text-bg3'
            }>
              ★
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
