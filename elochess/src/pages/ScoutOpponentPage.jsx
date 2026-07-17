import { useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { useOpeningsStore } from '../store/useOpeningsStore'
import { fetchRecentGames } from '../core/ChessComImport'
import { recommendOpenings } from '../core/OpponentScout'

const MONTHS_SCANNED = 4

export default function ScoutOpponentPage() {
  const [username, setUsername] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [result, setResult]     = useState(null) // { username, gameCount, recs }

  const navigate   = useAppStore(s => s.navigate)
  const selectTrap = useOpeningsStore(s => s.selectTrap)
  const setDrillMode = useOpeningsStore(s => s.setDrillMode)
  const setActiveColor = useOpeningsStore(s => s.setActiveColor)

  const scout = async () => {
    const name = username.trim()
    if (!name) { setError('Enter a Chess.com username'); return }
    setLoading(true); setError(''); setResult(null)
    try {
      const games = await fetchRecentGames(name, { months: MONTHS_SCANNED })
      if (games.length === 0) {
        setError(`No recent public games found for "${name}"`)
        return
      }
      const recs = recommendOpenings(games, { max: 3 })
      setResult({ username: name, gameCount: games.length, recs })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const practiceTrap = (trap) => {
    setDrillMode(true)
    setActiveColor(trap.color)
    selectTrap(trap)
    navigate('openings')
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b border-border shrink-0 space-y-4">
        <div>
          <h2 className="text-xl font-extrabold text-white font-heading">Scout Opponent</h2>
          <p className="text-muted text-sm mt-0.5">
            Pull a Chess.com player's recent games and find openings to beat them with
          </p>
        </div>

        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-40">
            <label htmlFor="scout-username" className="text-xs text-muted font-medium block mb-1">Their Chess.com username</label>
            <input
              id="scout-username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && scout()}
              placeholder="e.g. hikaru"
              className="w-full bg-bg3 border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-muted outline-none focus:border-gold/50"
            />
          </div>
          <button onClick={scout} disabled={loading}
            className="btn-gold text-sm px-5 py-2 disabled:opacity-60">
            {loading ? 'Scouting…' : 'Scout'}
          </button>
        </div>

        {error && <div className="text-danger text-sm">{error}</div>}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {!result && !loading && !error && (
          <div className="text-center py-16 text-muted">
            <div className="text-5xl mb-3 opacity-20">🎯</div>
            <div className="font-semibold text-white">No opponent scouted yet</div>
            <p className="text-sm mt-2">
              Enter a public Chess.com username — the last {MONTHS_SCANNED} months of their games get scanned for openings they score badly against
            </p>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <div className="text-xs text-muted uppercase tracking-wide font-bold">
              {result.gameCount} games analyzed · {result.username}
            </div>

            {result.recs.length === 0 && (
              <div className="text-center py-12 text-muted">
                <div className="font-semibold text-white">No clear pattern yet</div>
                <p className="text-sm mt-2">Not enough repeated openings in their recent games to find a real weak spot.</p>
              </div>
            )}

            {result.recs.map((rec, i) => (
              <RecommendationCard key={i} rec={rec} opponent={result.username} onPractice={practiceTrap} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function RecommendationCard({ rec, opponent, onPractice }) {
  const { weakSpot, forColor } = rec
  const name = rec.kind === 'trap' ? rec.trap.name : rec.openingName

  return (
    <div className="p-4 bg-bg2 rounded-xl border border-border space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs text-muted uppercase tracking-wide font-bold">Play as {forColor}</div>
          <div className="font-bold text-white text-base mt-0.5">{name}</div>
        </div>
        {rec.kind === 'trap' && (
          <button onClick={() => onPractice(rec.trap)} className="btn-gold text-xs px-3 py-1.5 shrink-0">
            Practice this trap
          </button>
        )}
      </div>
      <p className="text-sm text-muted">
        {opponent} loses {weakSpot.losses} of {weakSpot.games} recent games ({Math.round(weakSpot.lossRate * 100)}%) playing as {weakSpot.opponentColor} against {weakSpot.openingName} lines.
      </p>
      {rec.kind === 'suggestion' && (
        <p className="text-xs text-muted italic">No matching trap in the library yet — steer into {weakSpot.openingName} and play it out.</p>
      )}
    </div>
  )
}
