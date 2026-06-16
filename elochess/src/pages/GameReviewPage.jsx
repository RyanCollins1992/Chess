import { useState, useEffect, useRef, useCallback } from 'react'
import { Chessboard } from '../components/ui/Chessboard'
import { ChessEngine } from '../core/ChessEngine'
import { Chess } from 'chess.js'
import { useAppStore } from '../store/useAppStore'

// ── Move classification thresholds (centipawns) ───────────────────
// Based on Lichess/Chess.com classification standards
const CLASSIFICATIONS = {
  BRILLIANT:   { label: 'Brilliant',  symbol: '!!', color: '#1baca6', minDelta: null,  maxDelta: null  }, // special
  GREAT:       { label: 'Great',      symbol: '!',  color: '#5c8bb0', minDelta: null,  maxDelta: null  }, // special
  BEST:        { label: 'Best',       symbol: '✓',  color: '#5c8bb0', minDelta: -10,   maxDelta: 0     },
  EXCELLENT:   { label: 'Excellent',  symbol: '✓',  color: '#96bc4b', minDelta: -25,   maxDelta: -10   },
  GOOD:        { label: 'Good',       symbol: '✓',  color: '#96bc4b', minDelta: -50,   maxDelta: -25   },
  INACCURACY:  { label: 'Inaccuracy', symbol: '?!', color: '#f0c15b', minDelta: -100,  maxDelta: -50   },
  MISTAKE:     { label: 'Mistake',    symbol: '?',  color: '#e87b1e', minDelta: -200,  maxDelta: -100  },
  BLUNDER:     { label: 'Blunder',    symbol: '??', color: '#ca3431', minDelta: -Infinity, maxDelta: -200 },
  BOOK:        { label: 'Book',       symbol: '📖', color: '#a88764', minDelta: null,  maxDelta: null  }, // opening
  MISS:        { label: 'Miss',       symbol: '✗',  color: '#e87b1e', minDelta: null,  maxDelta: null  }, // missed forced win
}

function classifyMove(prevEval, newEval, isWhite) {
  // Convert to always-white-perspective delta
  const prevScore = isWhite ? prevEval : -prevEval
  const newScore  = isWhite ? newEval  : -newEval
  const delta     = newScore - prevScore // negative = got worse

  if (delta >= -10)  return 'BEST'
  if (delta >= -25)  return 'EXCELLENT'
  if (delta >= -50)  return 'GOOD'
  if (delta >= -100) return 'INACCURACY'
  if (delta >= -200) return 'MISTAKE'
  return 'BLUNDER'
}

// ── Stockfish worker ──────────────────────────────────────────────
class ReviewEngine {
  constructor() {
    this._worker  = null
    this._ready   = false
    this._queue   = []
  }

  async init() {
    return new Promise(resolve => {
      // Bail out after 15 s if the engine never responds
      const timeout = setTimeout(() => resolve(false), 15000)
      const done = (ok) => { clearTimeout(timeout); resolve(ok) }

      try {
        // Blob wrapper lets the browser treat it as same-origin so Worker() accepts it.
        // Do NOT revoke the blob URL until after the worker has fully loaded its source.
        const CDN = 'https://cdn.jsdelivr.net/npm/stockfish@16.0.0/src/stockfish-16.js'
        const blob = new Blob([`importScripts('${CDN}')`], { type: 'text/javascript' })
        const blobUrl = URL.createObjectURL(blob)
        this._worker = new Worker(blobUrl)
        // Revoke only after a tick so the browser has fetched the blob content
        setTimeout(() => URL.revokeObjectURL(blobUrl), 0)

        this._worker.onmessage = (e) => {
          const line = e.data
          if (line === 'uciok')    { this._worker.postMessage('isready'); return }
          if (line === 'readyok') { this._ready = true; done(true); return }
          if (this._currentResolve) {
            if (line.startsWith('info') && line.includes(' score ')) {
              const cpMatch   = line.match(/score cp (-?\d+)/)
              const mateMatch = line.match(/score mate (-?\d+)/)
              if (mateMatch) {
                const m = parseInt(mateMatch[1])
                this._currentEval = m > 0 ? 10000 : -10000
              } else if (cpMatch) {
                this._currentEval = Math.max(-2000, Math.min(2000, parseInt(cpMatch[1])))
              }
            }
            if (line.startsWith('bestmove')) {
              const parts = line.split(' ')
              this._currentResolve({ eval: this._currentEval, bestMove: parts[1] })
              this._currentResolve = null
              this._processQueue()
            }
          }
        }
        this._worker.onerror = () => done(false)
        this._worker.postMessage('uci')
      } catch { done(false) }
    })
  }

  evaluate(fen, depth = 16) {
    return new Promise(resolve => {
      this._queue.push({ fen, depth, resolve })
      if (!this._currentResolve) this._processQueue()
    })
  }

  _processQueue() {
    if (this._queue.length === 0) return
    const { fen, depth, resolve } = this._queue.shift()
    this._currentResolve = resolve
    this._currentEval    = 0
    this._worker.postMessage(`position fen ${fen}`)
    this._worker.postMessage(`go depth ${depth}`)
  }

  terminate() { this._worker?.terminate() }
}

// ── Main component ────────────────────────────────────────────────
export default function GameReviewPage() {
  const [game, setGame]           = useState(() => {
    try { return JSON.parse(localStorage.getItem('elochess-review-game') || 'null') } catch { return null }
  })
  const [moves, setMoves]         = useState([])  // parsed move objects
  const [currentIdx, setCurrentIdx] = useState(0)
  const [analysis, setAnalysis]   = useState([])  // per-move analysis
  const [analyzing, setAnalyzing] = useState(false)
  const [progress, setProgress]   = useState(0)
  const [sfReady, setSfReady]     = useState(false)
  const engineRef = useRef(null)
  const navigate  = useAppStore(s => s.navigate)
  const showToast = useAppStore(s => s.showToast)

  // Parse PGN into move list on load
  useEffect(() => {
    if (!game?.pgn) return
    const parsed = parsePGN(game.pgn)
    setMoves(parsed)
    setCurrentIdx(0)
    setAnalysis([])
  }, [game])

  // Init Stockfish
  useEffect(() => {
    engineRef.current = new ReviewEngine()
    engineRef.current.init().then(ok => {
      setSfReady(ok)
      if (!ok) showToast('⚠️ Stockfish unavailable — analysis disabled', 'error', 5000)
    })
    return () => engineRef.current?.terminate()
  }, [])

  // Analyse all moves
  const analyseGame = async () => {
    if (!sfReady || moves.length === 0) return
    setAnalyzing(true)
    setProgress(0)
    const results = []
    const DEPTH = 16

    let prevEval = 0

    for (let i = 0; i <= moves.length; i++) {
      const fen = i === 0 ? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' : moves[i-1].fenAfter
      const res = await engineRef.current.evaluate(fen, DEPTH)

      if (i > 0) {
        const move    = moves[i-1]
        const isWhite = move.color === 'w'
        const evalNow  = res.eval
        const delta    = isWhite ? (evalNow - prevEval) : (prevEval - evalNow)
        const prevBest = results[i-2]?.bestMove || null

        let classification = classifyMove(prevEval, evalNow, isWhite)

        // Book move (opening — first 10 moves)
        if (i <= 10) classification = 'BOOK'

        // Miss: had forced win last move but didn't play it
        if (Math.abs(prevEval) >= 500 && Math.abs(evalNow) < 200 && classification === 'BLUNDER') {
          classification = 'MISS'
        }

        results.push({
          move:        move.san,
          fen:         move.fenAfter,
          fenBefore:   i === 1 ? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' : moves[i-2].fenAfter,
          classification,
          eval:        evalNow,
          evalBefore:  prevEval,
          bestMove:    res.bestMove,
          color:       move.color,
          delta:       Math.round(isWhite ? evalNow - prevEval : prevEval - evalNow),
          moveNum:     move.moveNum,
        })

        prevEval = evalNow
      } else {
        prevEval = res.eval
      }

      setProgress(Math.round((i / moves.length) * 100))
    }

    setAnalysis(results)
    setAnalyzing(false)
    showToast('✅ Analysis complete!', 'success')
  }

  const currentFen  = currentIdx === 0
    ? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    : moves[currentIdx - 1]?.fenAfter || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

  const currentAnalysis = analysis[currentIdx - 1] || null

  if (!game) return <ImportPanel onGameLoaded={g => setGame(g)} />

  return (
    <div className="flex h-full overflow-hidden">
      {/* Board */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-3">
        {/* Eval bar */}
        <div className="w-full max-w-[480px]">
          <EvalBar eval={currentAnalysis?.eval || 0} />
        </div>

        <div className="w-full max-w-[480px]">
          <Chessboard
            position={currentFen}
            arePiecesDraggable={false}
            boardOrientation={game.color === 'Black' ? 'black' : 'white'}
            customDarkSquareStyle={{ backgroundColor: '#b58863' }}
            customLightSquareStyle={{ backgroundColor: '#f0d9b5' }}
          />
        </div>

        {/* Nav controls */}
        <div className="flex items-center gap-2">
          <NavBtn onClick={() => setCurrentIdx(0)} disabled={currentIdx === 0} label="⏮" />
          <NavBtn onClick={() => setCurrentIdx(i => Math.max(0, i-1))} disabled={currentIdx === 0} label="◀" />
          <span className="text-sm text-muted px-3 min-w-20 text-center">
            {currentIdx === 0 ? 'Start' : `Move ${currentAnalysis?.moveNum || currentIdx}`}
          </span>
          <NavBtn onClick={() => setCurrentIdx(i => Math.min(moves.length, i+1))} disabled={currentIdx >= moves.length} label="▶" />
          <NavBtn onClick={() => setCurrentIdx(moves.length)} disabled={currentIdx >= moves.length} label="⏭" />
        </div>

        {/* Move classification badge */}
        {currentAnalysis && (
          <ClassificationBadge c={currentAnalysis.classification} eval={currentAnalysis.eval} delta={currentAnalysis.delta} />
        )}
      </div>

      {/* Right panel */}
      <div className="w-72 shrink-0 border-l border-border bg-[#111827] flex flex-col overflow-hidden">
        {/* Game info */}
        <div className="p-4 border-b border-border shrink-0">
          <div className="flex items-start justify-between gap-2">
            <div className="font-bold text-white truncate">vs {game.opponent} ({game.opponentRating})</div>
            <button
              onClick={() => { setGame(null); setMoves([]); setAnalysis([]) }}
              className="text-xs text-gold border border-gold/40 bg-gold/10 hover:bg-gold/20 px-2 py-0.5 rounded-lg shrink-0 transition-colors"
            >
              ← Load New
            </button>
          </div>
          <div className="text-xs text-muted mt-0.5">{game.timeControl} · {game.date} · {game.color}</div>
          <div className={`text-sm font-bold mt-1 ${
            game.result === 'Win' ? 'text-accent2' : game.result === 'Loss' ? 'text-danger' : 'text-muted'
          }`}>{game.result}</div>
        </div>

        {/* Analysis button */}
        {analysis.length === 0 && (
          <div className="p-4 border-b border-border shrink-0">
            {analyzing ? (
              <div className="space-y-2">
                <div className="text-sm text-muted">Analysing… {progress}%</div>
                <div className="h-1.5 bg-bg3 rounded-full overflow-hidden">
                  <div className="h-full bg-gold rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
                <div className="text-xs text-muted">Depth 16 · Stockfish 16</div>
              </div>
            ) : (
              <button
                onClick={analyseGame}
                disabled={!sfReady || moves.length === 0}
                className="w-full btn-gold text-sm disabled:opacity-50"
              >
                {sfReady ? '🔍 Analyse Game' : '⏳ Loading…'}
              </button>
            )}
          </div>
        )}

        {/* Summary stats */}
        {analysis.length > 0 && (
          <div className="p-3 border-b border-border shrink-0">
            <AnalysisSummary analysis={analysis} color={game.color} />
          </div>
        )}

        {/* Move list */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="space-y-0.5">
            {Array.from({ length: Math.ceil(moves.length / 2) }, (_, i) => {
              const wIdx = i * 2
              const bIdx = i * 2 + 1
              const wMove = moves[wIdx]
              const bMove = moves[bIdx]
              const wAn   = analysis[wIdx]
              const bAn   = analysis[bIdx]
              return (
                <div key={i} className="flex items-center gap-1 text-xs font-mono">
                  <span className="text-muted w-6 text-right shrink-0">{i+1}.</span>
                  <MoveChip
                    move={wMove?.san} an={wAn}
                    active={currentIdx === wIdx + 1}
                    onClick={() => setCurrentIdx(wIdx + 1)}
                  />
                  <MoveChip
                    move={bMove?.san} an={bAn}
                    active={currentIdx === bIdx + 1}
                    onClick={() => setCurrentIdx(bIdx + 1)}
                  />
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────

function EvalBar({ eval: ev }) {
  // Sigmoid win-probability (same formula as Lichess) — small advantages are clearly visible
  const whitePct = 100 / (1 + Math.exp(-0.00368208 * Math.max(-3000, Math.min(3000, ev))))
  const isMate   = Math.abs(ev) >= 9000
  const display  = isMate
    ? `M${Math.abs(ev) - 9000}`
    : (Math.abs(ev) / 100).toFixed(1)
  const sign = ev >= 0 ? '+' : '-'

  return (
    <div className="flex items-center gap-2 h-5">
      <div className="flex-1 h-3 bg-[#2a2a2a] rounded-full overflow-hidden relative">
        <div
          className="h-full bg-[#f0d9b5] transition-all duration-500 ease-out absolute left-0 top-0"
          style={{ width: `${whitePct}%` }}
        />
      </div>
      <div className={`text-xs font-bold font-mono w-14 text-right tabular-nums ${ev >= 0 ? 'text-[#f0d9b5]' : 'text-muted'}`}>
        {sign}{display}
      </div>
    </div>
  )
}

function NavBtn({ onClick, disabled, label }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-9 h-9 rounded-lg bg-bg3 border border-border text-white hover:bg-border transition-colors disabled:opacity-30 text-sm"
    >
      {label}
    </button>
  )
}

function MoveChip({ move, an, active, onClick }) {
  if (!move) return <div className="flex-1" />
  const cls = an ? CLASSIFICATIONS[an.classification] : null
  return (
    <button
      onClick={onClick}
      className={`flex-1 text-left px-1.5 py-0.5 rounded transition-colors ${
        active ? 'bg-gold/20 text-gold' : 'text-[#9CA3AF] hover:bg-bg3'
      }`}
    >
      {move}
      {cls && <span className="ml-0.5 text-[10px]" style={{ color: cls.color }}>{cls.symbol}</span>}
    </button>
  )
}

function ClassificationBadge({ c, eval: ev, delta }) {
  const cls = CLASSIFICATIONS[c]
  if (!cls) return null
  const evalDisplay = Math.abs(ev) >= 9000
    ? `Mate in ${Math.abs(ev) - 9000}`
    : `${ev >= 0 ? '+' : ''}${(ev / 100).toFixed(2)}`

  return (
    <div className="flex items-center gap-3 px-4 py-2 rounded-xl border" style={{ borderColor: cls.color + '40', backgroundColor: cls.color + '15' }}>
      <span className="text-lg font-bold" style={{ color: cls.color }}>{cls.symbol}</span>
      <div>
        <div className="font-bold text-sm" style={{ color: cls.color }}>{cls.label}</div>
        <div className="text-xs text-muted">
          Eval: {evalDisplay}
          {delta != null && ` · ${delta >= 0 ? '+' : ''}${(delta / 100).toFixed(2)}`}
        </div>
      </div>
    </div>
  )
}

function AnalysisSummary({ analysis, color }) {
  const isWhite = color === 'White'
  const myMoves = analysis.filter(a => (a.color === 'w') === isWhite)
  const counts  = {}
  myMoves.forEach(m => { counts[m.classification] = (counts[m.classification] || 0) + 1 })

  const ORDER = ['BRILLIANT','GREAT','BEST','EXCELLENT','GOOD','BOOK','INACCURACY','MISTAKE','MISS','BLUNDER']

  // Accuracy score (0-100)
  const scored = myMoves.filter(m => m.classification !== 'BOOK')
  const accuracy = scored.length > 0
    ? Math.round(scored.reduce((acc, m) => {
        const weights = { BRILLIANT:100,GREAT:100,BEST:100,EXCELLENT:90,GOOD:75,INACCURACY:50,MISTAKE:30,MISS:20,BLUNDER:0 }
        return acc + (weights[m.classification] || 0)
      }, 0) / scored.length)
    : null

  return (
    <div className="space-y-2">
      {accuracy != null && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted font-medium">Your accuracy</span>
          <span className={`text-sm font-extrabold ${accuracy >= 80 ? 'text-accent2' : accuracy >= 60 ? 'text-gold' : 'text-danger'}`}>
            {accuracy}%
          </span>
        </div>
      )}
      <div className="grid grid-cols-2 gap-1">
        {ORDER.filter(k => counts[k]).map(k => {
          const cls = CLASSIFICATIONS[k]
          return (
            <div key={k} className="flex items-center gap-1.5 text-xs">
              <span style={{ color: cls.color }}>{cls.symbol}</span>
              <span className="text-muted">{cls.label}</span>
              <span className="text-white font-bold ml-auto">{counts[k]}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Import panel (shown when no game is loaded) ───────────────────

function ImportPanel({ onGameLoaded }) {
  return (
    <div className="flex items-start justify-center p-6 h-full overflow-y-auto">
      <div className="w-full max-w-lg space-y-5 pt-6">
        <div>
          <div className="text-4xl mb-3 opacity-20">♜</div>
          <h2 className="text-xl font-extrabold text-white">Load a Game</h2>
          <p className="text-sm text-muted mt-1">Paste PGN from Chess.com or Lichess</p>
        </div>
        <PgnImport onLoad={onGameLoaded} />
      </div>
    </div>
  )
}

function ColorPicker({ value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted">I played as:</span>
      {['White', 'Black'].map(c => (
        <button key={c} onClick={() => onChange(c)}
          className={`text-xs px-3 py-1 rounded-lg border transition-colors ${
            value === c
              ? 'border-gold text-gold bg-gold/10'
              : 'border-border text-muted hover:text-white'
          }`}
        >
          {c === 'White' ? '♔' : '♚'} {c}
        </button>
      ))}
    </div>
  )
}

function PgnImport({ onLoad }) {
  const [pgn, setPgn]         = useState('')
  const [myColor, setMyColor] = useState('White')
  const [error, setError]     = useState('')
  const showToast = useAppStore(s => s.showToast)

  const handleLoad = () => {
    if (!pgn.trim()) { setError('Paste a PGN to continue'); return }
    try {
      const chess = new Chess()
      chess.loadPgn(pgn.trim())
      const game = parsePgnToGame(pgn.trim(), myColor)
      localStorage.setItem('elochess-review-game', JSON.stringify(game))
      onLoad(game)
      showToast('✅ Game loaded', 'success')
    } catch {
      setError('Invalid PGN — check the format and try again')
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">Paste standard PGN from Chess.com, Lichess or any chess database</p>
      <textarea
        value={pgn}
        onChange={e => { setPgn(e.target.value); setError('') }}
        placeholder={'[White "Player"]\n[Black "Opponent"]\n[Result "1-0"]\n\n1. e4 e5 2. Nf3 Nc6 ...'}
        rows={9}
        className="w-full bg-bg3 border border-border rounded-xl p-3 text-sm text-white font-mono placeholder-muted/40 outline-none focus:border-gold/50 resize-none"
      />
      <ColorPicker value={myColor} onChange={setMyColor} />
      {error && <div className="text-danger text-sm">{error}</div>}
      <button onClick={handleLoad} className="btn-gold w-full">Load Game →</button>
    </div>
  )
}

function UrlImport({ onLoad }) {
  const [url, setUrl]         = useState('')
  const [myColor, setMyColor] = useState('White')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const showToast = useAppStore(s => s.showToast)

  const trimmed    = url.trim()
  const isChesscom = trimmed.includes('chess.com')
  // Lichess game URLs: lichess.org/{8-char-id}  or  lichess.org/{id}/white etc.
  const lichessId  = trimmed.match(/lichess\.org\/([a-zA-Z0-9]{6,12})(?:[/#?]|$)/)?.[1] ?? null

  const handleFetch = async () => {
    if (!trimmed) { setError('Paste a game URL'); return }
    if (isChesscom) return  // button is disabled, but guard anyway
    if (!lichessId) { setError('Unrecognised URL — paste a Lichess game link (e.g. lichess.org/AbCd1234)'); return }

    setLoading(true); setError('')
    try {
      // No Accept header — Lichess returns PGN by default; custom headers trigger CORS preflight
      const res = await fetch(
        `https://lichess.org/game/export/${lichessId}?clocks=false&evals=false&literate=false`
      )
      if (res.status === 404) throw new Error(`Game "${lichessId}" not found on Lichess`)
      if (!res.ok) throw new Error(`Lichess error ${res.status} — try again in a moment`)

      const pgn = await res.text()
      if (!pgn || pgn.trim().length < 5) throw new Error('Empty response from Lichess — is the game public?')

      const game = parsePgnToGame(pgn, myColor)
      localStorage.setItem('elochess-review-game', JSON.stringify(game))
      onLoad(game)
      showToast('✅ Game loaded', 'success')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <input
        value={url}
        onChange={e => { setUrl(e.target.value); setError('') }}
        onKeyDown={e => e.key === 'Enter' && !isChesscom && handleFetch()}
        placeholder="https://lichess.org/AbCd1234"
        className="w-full bg-bg3 border border-border rounded-xl px-3 py-2.5 text-sm text-white placeholder-muted/50 outline-none focus:border-gold/50"
      />
      <ColorPicker value={myColor} onChange={setMyColor} />
      {error && <div className="text-danger text-sm">{error}</div>}

      {/* Chess.com help — shown as soon as a chess.com link is typed */}
      {isChesscom && (
        <div className="bg-bg3 border border-gold/30 rounded-xl p-3 space-y-1.5 text-xs text-muted">
          <div className="font-bold text-white text-sm">Chess.com doesn't allow direct URL import</div>
          <div className="mt-1 space-y-1">
            <div>1. Open the game on Chess.com</div>
            <div>2. Click the <span className="text-white font-semibold">⚙ gear icon</span> below the board</div>
            <div>3. Click <span className="text-white font-semibold">Download PGN</span></div>
            <div>4. Open the file, copy all the text</div>
            <div>5. Switch to the <span className="text-gold font-bold">PGN tab</span> and paste it there</div>
          </div>
        </div>
      )}

      {!isChesscom && !trimmed && (
        <p className="text-xs text-muted">Supports Lichess game links only. For Chess.com, paste the PGN instead.</p>
      )}

      <button
        onClick={handleFetch}
        disabled={loading || isChesscom || (!lichessId && !!trimmed)}
        className="btn-gold w-full disabled:opacity-50"
      >
        {loading   ? 'Fetching…'
         : isChesscom ? 'Chess.com — use PGN tab ↑'
         : 'Fetch from Lichess →'}
      </button>
    </div>
  )
}

function FenImport({ onLoad }) {
  const [fen, setFen]     = useState('')
  const [error, setError] = useState('')
  const showToast = useAppStore(s => s.showToast)

  const handleLoad = () => {
    const trimmed = fen.trim()
    if (!trimmed) { setError('Paste a FEN string'); return }
    try {
      new Chess(trimmed)
      const game = {
        pgn:            `[SetUp "1"]\n[FEN "${trimmed}"]\n\n*`,
        color:          'White',
        result:         'Unknown',
        opponent:       'Position Analysis',
        opponentRating: '?',
        myRating:       '?',
        opening:        'Custom Position',
        timeControl:    '—',
        date:           new Date().toISOString().split('T')[0],
        moves:          0,
        termination:    '',
        accuracy:       null,
      }
      localStorage.setItem('elochess-review-game', JSON.stringify(game))
      onLoad(game)
      showToast('✅ Position loaded', 'success')
    } catch {
      setError('Invalid FEN — check the string and try again')
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">Analyse a specific board position with Stockfish</p>
      <input
        value={fen}
        onChange={e => { setFen(e.target.value); setError('') }}
        onKeyDown={e => e.key === 'Enter' && handleLoad()}
        placeholder="rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"
        className="w-full bg-bg3 border border-border rounded-xl px-3 py-2.5 text-sm text-white font-mono placeholder-muted/40 outline-none focus:border-gold/50"
      />
      {error && <div className="text-danger text-sm">{error}</div>}
      <button onClick={handleLoad} className="btn-gold w-full">Analyse Position →</button>
      <p className="text-xs text-muted">
        Get the FEN from Chess.com board editor or Lichess analysis board.
      </p>
    </div>
  )
}

function ImageImport({ onLoad }) {
  const [preview, setPreview] = useState(null)
  const [fen, setFen]         = useState('')
  const [error, setError]     = useState('')
  const [dragging, setDragging] = useState(false)
  const inputRef  = useRef(null)
  const showToast = useAppStore(s => s.showToast)

  const handleFile = (f) => {
    if (!f || !f.type.startsWith('image/')) { setError('Please upload an image file'); return }
    setError('')
    const reader = new FileReader()
    reader.onload = e => setPreview(e.target.result)
    reader.readAsDataURL(f)
  }

  const handleLoad = () => {
    const trimmed = fen.trim()
    if (!trimmed) { setError('Enter the FEN for this position'); return }
    try {
      new Chess(trimmed)
      const game = {
        pgn:            `[SetUp "1"]\n[FEN "${trimmed}"]\n\n*`,
        color:          'White',
        result:         'Unknown',
        opponent:       'Position Analysis',
        opponentRating: '?',
        myRating:       '?',
        opening:        'Custom Position',
        timeControl:    '—',
        date:           new Date().toISOString().split('T')[0],
        moves:          0,
        termination:    '',
        accuracy:       null,
      }
      localStorage.setItem('elochess-review-game', JSON.stringify(game))
      onLoad(game)
      showToast('✅ Position loaded', 'success')
    } catch {
      setError('Invalid FEN — copy it exactly from your chess platform')
    }
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]) }}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-xl border-2 border-dashed transition-colors flex flex-col items-center justify-center gap-2 p-6 ${
          dragging ? 'border-gold bg-gold/5' : 'border-border hover:border-gold/40'
        }`}
        style={{ minHeight: preview ? undefined : '10rem' }}
      >
        <input ref={inputRef} type="file" accept="image/*" className="hidden"
          onChange={e => handleFile(e.target.files[0])} />
        {preview
          ? <img src={preview} alt="Board" className="max-h-52 rounded-lg object-contain" />
          : <>
              <span className="text-4xl opacity-30">🖼</span>
              <span className="text-sm text-muted text-center">Drop a board screenshot or click to upload</span>
            </>
        }
      </div>

      {preview && (
        <>
          <p className="text-xs text-muted">
            Paste the FEN for this position — copy it from Chess.com's board editor or Lichess's analysis board.
          </p>
          <input
            value={fen}
            onChange={e => { setFen(e.target.value); setError('') }}
            onKeyDown={e => e.key === 'Enter' && handleLoad()}
            placeholder="Paste FEN string here"
            className="w-full bg-bg3 border border-border rounded-xl px-3 py-2.5 text-sm text-white font-mono placeholder-muted/40 outline-none focus:border-gold/50"
          />
          {error && <div className="text-danger text-sm">{error}</div>}
          <button onClick={handleLoad} className="btn-gold w-full">Analyse Position →</button>
        </>
      )}
      {!preview && error && <div className="text-danger text-sm">{error}</div>}
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────

function parsePgnToGame(pgn, myColor = 'White') {
  const header = (tag) => {
    const m = pgn.match(new RegExp(`\\[${tag} "([^"]+)"\\]`))
    return m ? m[1] : ''
  }
  const resultStr = header('Result') || '*'
  let result = 'Draw'
  if (resultStr === '1-0') result = myColor === 'White' ? 'Win' : 'Loss'
  else if (resultStr === '0-1') result = myColor === 'Black' ? 'Win' : 'Loss'

  const opponent   = myColor === 'White' ? (header('Black') || 'Black') : (header('White') || 'White')
  const oppRating  = myColor === 'White' ? (header('BlackElo') || '?') : (header('WhiteElo') || '?')
  const myRating   = myColor === 'White' ? (header('WhiteElo') || '?') : (header('BlackElo') || '?')
  const date       = (header('Date') || header('UTCDate') || '').replace(/\./g, '-')

  const movesOnly = pgn
    .replace(/\[[^\]]+\]/g, '').replace(/\{[^}]+\}/g, '')
    .replace(/\([^)]+\)/g, '').replace(/\$\d+/g, '')
    .replace(/\d+\./g, ' ').replace(/(1-0|0-1|1\/2-1\/2|\*)/g, '').trim()
  const moveCount = Math.ceil(movesOnly.split(/\s+/).filter(Boolean).length / 2)

  return {
    pgn,
    color:          myColor,
    result,
    opponent,
    opponentRating: oppRating,
    myRating,
    opening:        header('Opening') || header('ECO') || 'Unknown',
    timeControl:    header('TimeControl') || 'Unknown',
    date:           date || 'Unknown',
    moves:          moveCount,
    termination:    header('Termination') || '',
    accuracy:       null,
  }
}

// ── PGN move parser ───────────────────────────────────────────────
function parsePGN(pgn) {
  try {
    const engine = new ChessEngine()
    // Strip headers and comments
    const movesText = pgn
      .replace(/\[[^\]]+\]/g, '')
      .replace(/\{[^}]+\}/g, '')
      .replace(/\([^)]+\)/g, '')
      .replace(/\$\d+/g, '')
      .replace(/\d+\./g, ' ')
      .replace(/(1-0|0-1|1\/2-1\/2|\*)/g, '')
      .trim()

    const tokens = movesText.split(/\s+/).filter(Boolean)
    const result = []
    let moveNum  = 1

    for (const token of tokens) {
      const color = engine.turn
      const move  = engine.move(token)
      if (!move) continue
      result.push({
        san:      move.san,
        fenAfter: engine.fen,
        color,
        moveNum:  color === 'w' ? `${moveNum}.` : `${moveNum}…`,
      })
      if (color === 'b') moveNum++
    }

    return result
  } catch {
    return []
  }
}
