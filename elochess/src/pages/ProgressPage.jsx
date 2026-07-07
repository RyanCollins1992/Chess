import { useMemo } from 'react'
import { progressManager } from '../core/ProgressManager'
import { srsEngine } from '../core/SpacedRepetitionEngine'
import { TRAPS } from '../data/traps'
import { useAppStore } from '../store/useAppStore'

export default function ProgressPage() {
  const progress = useAppStore(s => s.progress)
  const srsStats = useMemo(() => srsEngine.getStats(), [])
  const eloHistory = progressManager.eloHistory.slice(-10)

  const knownCount  = progress.knownCount
  const totalTraps  = TRAPS.length
  const masteredPct = totalTraps > 0 ? Math.round((knownCount / totalTraps) * 100) : 0

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-white font-heading">My Progress</h2>
        <p className="text-muted text-sm mt-1">Track your chess improvement over time</p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon="⚡" label="XP Today"    value={progress.xpToday}     color="text-gold" />
        <StatCard icon="🔥" label="Day Streak"  value={`${progress.streak}d`} color="text-orange-400" />
        <StatCard icon="📊" label="ELO"         value={progress.currentElo}  color="text-accent" />
        <StatCard icon="🏋️" label="Total Drills" value={progress.totalDrills} color="text-accent2" />
      </div>

      {/* ELO + Level */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Level */}
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-bold text-white">Level {progress.level}</div>
            <div className="text-xs text-muted">{progress.xpTotal} XP total</div>
          </div>
          <div className="h-2 bg-bg3 rounded-full overflow-hidden">
            <div
              className="h-full bg-gold rounded-full transition-all"
              style={{ width: `${Math.min(100, (progress.xpTotal % 200) / 2)}%` }}
            />
          </div>
          <div className="text-xs text-muted">
            {200 - (progress.xpTotal % 200)} XP to level {progress.level + 1}
          </div>
        </div>

        {/* ELO history mini chart */}
        <div className="card space-y-3">
          <div className="font-bold text-white">ELO History</div>
          {eloHistory.length < 2 ? (
            <div className="text-muted text-sm">Play more games to see your ELO trend</div>
          ) : (
            <MiniLineChart data={eloHistory.map(e => e.elo)} />
          )}
        </div>
      </div>

      {/* Trap mastery */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <div className="font-bold text-white">Trap Mastery</div>
          <div className="text-sm text-muted">{knownCount} / {totalTraps} known</div>
        </div>
        <div className="h-3 bg-bg3 rounded-full overflow-hidden">
          <div
            className="h-full bg-accent2 rounded-full transition-all duration-700"
            style={{ width: `${masteredPct}%` }}
          />
        </div>
        <div className="grid grid-cols-3 divide-x divide-border text-center">
          <MiniStat label="Enrolled in SRS" value={srsStats.total} />
          <MiniStat label="Due Today"       value={srsStats.due} color="text-gold" />
          <MiniStat label="Mastered (21d+)" value={srsStats.mastered} color="text-accent2" />
        </div>
      </div>

      {/* Badges */}
      <div className="card space-y-3">
        <div className="font-bold text-white">Badges</div>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
          {BADGES.map(badge => {
            const earned = progressManager.hasBadge(badge.id)
            return (
              <div key={badge.id} className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${
                earned ? 'border-gold/40 bg-gold/5' : 'border-border bg-bg3 opacity-40 grayscale'
              }`}>
                <span className="text-2xl">{badge.icon}</span>
                <span className="text-[10px] text-center text-muted leading-tight">{badge.name}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* XP breakdown */}
      <div className="card space-y-3">
        <div className="font-bold text-white">How to Earn XP</div>
        <div className="space-y-2">
          {XP_GUIDE.map(item => (
            <div key={item.label} className="flex items-center justify-between text-sm">
              <span className="text-muted">{item.label}</span>
              <span className="text-gold font-bold">+{item.xp} XP</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────

function StatCard({ icon, label, value, color }) {
  return (
    <div className="card flex flex-col gap-1">
      <span className="text-xl">{icon}</span>
      <span className={`text-2xl font-extrabold ${color || 'text-white'}`}>{value}</span>
      <span className="text-xs text-muted">{label}</span>
    </div>
  )
}

function MiniStat({ label, value, color }) {
  return (
    <div className="px-3">
      <div className={`text-xl font-extrabold ${color || 'text-white'}`}>{value}</div>
      <div className="text-xs text-muted mt-0.5">{label}</div>
    </div>
  )
}

function MiniLineChart({ data }) {
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const w = 280, h = 60, pad = 8

  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2)
    const y = h - pad - ((v - min) / range) * (h - pad * 2)
    return `${x},${y}`
  }).join(' ')

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
      <polyline
        points={points}
        fill="none"
        stroke="#3b82f6"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {data.map((v, i) => {
        const x = pad + (i / (data.length - 1)) * (w - pad * 2)
        const y = h - pad - ((v - min) / range) * (h - pad * 2)
        return <circle key={i} cx={x} cy={y} r="3" fill="#3b82f6" />
      })}
      <text x={pad} y={h - 1} fontSize="9" fill="#6b7280">{min}</text>
      <text x={w - pad} y={h - 1} fontSize="9" fill="#6b7280" textAnchor="end">{max}</text>
    </svg>
  )
}

// ── Data ──────────────────────────────────────────────────────────

const BADGES = [
  { id: 'first_drill',    icon: '🎯', name: 'First Drill' },
  { id: 'streak_7',       icon: '🔥', name: '7-Day Streak' },
  { id: 'streak_30',      icon: '💎', name: '30-Day Streak' },
  { id: 'trap_master',    icon: '🪤', name: 'Trap Master' },
  { id: 'perfect_drill',  icon: '⭐', name: 'Perfect Drill' },
  { id: 'srs_100',        icon: '🧠', name: '100 Reviews' },
  { id: 'elo_600',        icon: '📈', name: 'Hit 600 ELO' },
  { id: 'elo_800',        icon: '🚀', name: 'Hit 800 ELO' },
  { id: 'elo_1000',       icon: '👑', name: 'Hit 1000 ELO' },
  { id: 'puzzle_50',      icon: '🧩', name: '50 Puzzles' },
  { id: 'all_white',      icon: '♟', name: 'All White Traps' },
  { id: 'all_black',      icon: '♜', name: 'All Black Traps' },
]

const XP_GUIDE = [
  { label: 'Complete a trap drill',   xp: 10 },
  { label: 'Perfect drill (no mistakes)', xp: 20 },
  { label: 'Spaced review card',      xp: 5  },
  { label: 'Solve a puzzle',          xp: 15 },
  { label: 'Puzzle streak of 5',      xp: 25 },
  { label: 'Complete an endgame',     xp: 20 },
  { label: 'Daily login',             xp: 10 },
  { label: 'Master a trap (21+ days)', xp: 50 },
]
