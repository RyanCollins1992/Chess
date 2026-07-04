import { useState } from 'react'
import { useAppStore } from '../store/useAppStore'

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
]

export default function ImportGamesPage() {
  // Seed from the store so an already-fetched list survives navigating away and back
  const [saved] = useState(() => {
    const { settings, importedGames } = useAppStore.getState()
    const username = settings.chesscomUsername || ''
    return { username, ...importedGames[username.trim().toLowerCase()] }
  })
  const [username, setUsername] = useState(saved.username)
  const [year, setYear]     = useState(saved.year ?? new Date().getFullYear())
  const [month, setMonth]   = useState(saved.month ?? new Date().getMonth() + 1)
  const [games, setGames]   = useState(saved.games ?? [])
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')
  const [fetched, setFetched] = useState(Boolean(saved.games?.length))
  const navigate  = useAppStore(s => s.navigate)
  const showToast = useAppStore(s => s.showToast)
  const setImportedGames = useAppStore(s => s.setImportedGames)

  const fetchGames = async () => {
    if (!username.trim()) { setError('Enter your Chess.com username'); return }
    setLoading(true); setError(''); setGames([])
    try {
      const mm = String(month).padStart(2, '0')
      const url = `https://api.chess.com/pub/player/${username.trim().toLowerCase()}/games/${year}/${mm}`
      const res = await fetch(url)
      if (res.status === 404) throw new Error(`Player "${username}" not found on Chess.com`)
      if (!res.ok) throw new Error(`Chess.com API error (${res.status})`)
      const data = await res.json()
      const parsed = (data.games || [])
        .filter(g => g.pgn)
        .map(g => parseGame(g, username.trim().toLowerCase()))
        .reverse()
      setGames(parsed)
      setFetched(true)
      if (parsed.length === 0) setError(`No games found for ${MONTHS[month-1]} ${year}`)
      else {
        setImportedGames(username.trim().toLowerCase(), { games: parsed, year, month })
        showToast(`✅ Imported ${parsed.length} games`, 'success')
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const openReview = (game) => {
    localStorage.setItem('elochess-review-game', JSON.stringify(game))
    navigate('game-review')
  }

  const years = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b border-border shrink-0 space-y-4">
        <div>
          <h2 className="text-xl font-extrabold text-white">Import Games</h2>
          <p className="text-muted text-sm mt-0.5">Fetch your Chess.com games for review</p>
        </div>

        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-40">
            <label htmlFor="import-username" className="text-xs text-muted font-medium block mb-1">Chess.com username</label>
            <input
              id="import-username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchGames()}
              placeholder="e.g. hikaru"
              className="w-full bg-bg3 border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-muted outline-none focus:border-gold/50"
            />
          </div>
          <div>
            <label htmlFor="import-month" className="text-xs text-muted font-medium block mb-1">Month</label>
            <select id="import-month" value={month} onChange={e => setMonth(Number(e.target.value))}
              className="bg-bg3 border border-border rounded-lg px-3 py-2 text-sm text-white outline-none">
              {MONTHS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="import-year" className="text-xs text-muted font-medium block mb-1">Year</label>
            <select id="import-year" value={year} onChange={e => setYear(Number(e.target.value))}
              className="bg-bg3 border border-border rounded-lg px-3 py-2 text-sm text-white outline-none">
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button onClick={fetchGames} disabled={loading}
            className="btn-gold text-sm px-5 py-2 disabled:opacity-60">
            {loading ? 'Loading…' : 'Fetch Games'}
          </button>
        </div>

        {error && <div className="text-danger text-sm">{error}</div>}
      </div>

      {/* Game list */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {games.length === 0 && !fetched && (
          <div className="text-center py-16 text-muted">
            <div className="text-5xl mb-3 opacity-20">📥</div>
            <div className="font-semibold text-white">No games loaded yet</div>
            <p className="text-sm mt-2">Enter your Chess.com username and fetch a month of games</p>
          </div>
        )}

        {games.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs text-muted uppercase tracking-wide font-bold mb-3">
              {games.length} games · {MONTHS[month-1]} {year}
            </div>
            {games.map((game, i) => (
              <GameRow key={i} game={game} onReview={() => openReview(game)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function GameRow({ game, onReview }) {
  const resultColor =
    game.result === 'Win'  ? 'text-accent2 bg-accent2/10 border-accent2/30' :
    game.result === 'Loss' ? 'text-danger bg-danger/10 border-danger/30' :
                             'text-muted bg-bg3 border-border'

  return (
    <div className="flex items-center gap-4 px-4 py-3 bg-bg2 rounded-xl border border-border hover:border-border/60 transition-colors">
      {/* Result */}
      <div className={`text-xs font-extrabold px-2.5 py-1 rounded-lg border shrink-0 ${resultColor}`}>
        {game.result}
      </div>

      {/* Opponent */}
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-white text-sm truncate">
          vs {game.opponent} ({game.opponentRating})
        </div>
        <div className="text-xs text-muted mt-0.5">
          {game.timeControl} · {game.opening} · {game.color} · {game.date}
        </div>
      </div>

      {/* Accuracy if available */}
      {game.accuracy != null && (
        <div className="text-right shrink-0">
          <div className={`text-sm font-bold ${game.accuracy >= 80 ? 'text-accent2' : game.accuracy >= 60 ? 'text-gold' : 'text-danger'}`}>
            {game.accuracy}%
          </div>
          <div className="text-[10px] text-muted">accuracy</div>
        </div>
      )}

      {/* Moves */}
      <div className="text-right shrink-0">
        <div className="text-sm font-bold text-white">{game.moves} moves</div>
        <div className="text-[10px] text-muted">{game.termination}</div>
      </div>

      <button onClick={onReview} className="btn-gold text-xs px-3 py-1.5 shrink-0">
        Review
      </button>
    </div>
  )
}

// ── PGN parser ────────────────────────────────────────────────────
function parseGame(g, myUsername) {
  const pgn = g.pgn || ''

  const header = (tag) => {
    const m = pgn.match(new RegExp(`\\[${tag} "([^"]+)"\\]`))
    return m ? m[1] : ''
  }

  const isWhite   = (g.white?.username || '').toLowerCase() === myUsername
  const color     = isWhite ? 'White' : 'Black'
  const myRating  = isWhite ? g.white?.rating : g.black?.rating
  const oppName   = isWhite ? (g.black?.username || 'Unknown') : (g.white?.username || 'Unknown')
  const oppRating = isWhite ? g.black?.rating : g.white?.rating

  // Result
  const resultStr = header('Result')
  let result = 'Draw'
  if (resultStr === '1-0') result = isWhite ? 'Win' : 'Loss'
  else if (resultStr === '0-1') result = isWhite ? 'Loss' : 'Win'

  // Termination
  const term = header('Termination').replace(/^.+? by /, '') || 'unknown'

  // Date
  const dateStr = header('Date') || header('UTCDate') || ''
  const date    = dateStr.replace(/\./g, '-')

  // Opening
  const opening = header('Opening') || header('ECOUrl')?.split('/').pop()?.replace(/-/g, ' ') || 'Unknown'

  // Time control
  const tc     = g.time_control || header('TimeControl') || '?'
  const tcLabel = formatTimeControl(tc)

  // Move count
  const movesOnly = pgn.replace(/\[[^\]]+\]/g, '').replace(/\{[^}]+\}/g, '').replace(/\d+\./g, '').trim()
  const moveTokens = movesOnly.split(/\s+/).filter(t => t && !t.match(/^(1-0|0-1|1\/2-1\/2|\*)$/))
  const moveCount  = Math.ceil(moveTokens.length / 2)

  // Accuracy (from Chess.com data if available)
  const myAcc = isWhite ? g.accuracies?.white : g.accuracies?.black

  return {
    pgn,
    color,
    result,
    opponent:       oppName,
    opponentRating: oppRating || '?',
    myRating:       myRating || '?',
    opening,
    timeControl:    tcLabel,
    date,
    moves:          moveCount,
    termination:    term,
    accuracy:       myAcc != null ? Math.round(myAcc) : null,
    url:            g.url || '',
    white:          g.white?.username || '',
    black:          g.black?.username || '',
  }
}

function formatTimeControl(tc) {
  if (!tc || tc === '-') return 'Unknown'
  const [base, inc] = tc.split('+').map(Number)
  if (isNaN(base)) return tc
  if (base < 180) return `${base}s Bullet`
  if (base < 600) return `${Math.round(base/60)}min Blitz`
  if (base < 1800) return `${Math.round(base/60)}min Rapid`
  return `${Math.round(base/60)}min Classical`
}
