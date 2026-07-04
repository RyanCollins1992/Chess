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

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

const PIECE_VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }

// Win% from a centipawn eval (white's perspective) — Lichess's own sigmoid.
function winPercent(cpWhite) {
  return 100 / (1 + Math.exp(-0.00368208 * Math.max(-3000, Math.min(3000, cpWhite))))
}

// Lichess's per-move accuracy formula: how much of the mover's win% was
// retained by this move, expressed 0-100.
function moveAccuracy(evalBeforeWhite, evalAfterWhite, isWhite) {
  const winBefore = isWhite ? winPercent(evalBeforeWhite) : 100 - winPercent(evalBeforeWhite)
  const winAfter  = isWhite ? winPercent(evalAfterWhite)  : 100 - winPercent(evalAfterWhite)
  const raw = 103.1668 * Math.exp(-0.04354 * (winBefore - winAfter)) - 3.1669
  return Math.max(0, Math.min(100, raw))
}

// UCI long algebraic ("e7e8q") -> SAN ("e8=Q+") for a given position
function uciToSan(fen, uci) {
  if (!uci) return null
  try {
    const chess = new Chess(fen)
    const move = chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4) || 'q' })
    return move?.san || null
  } catch { return null }
}

// Heuristic approximations of Lichess/Chess.com's Brilliant/Great detection —
// not identical to their algorithms, but real signal rather than guesswork.
// GREAT: this was clearly the one move that mattered (the next-best
// alternative, from MultiPV 2, was meaningfully worse).
function isGreatMove({ playedIsBest, eval1, eval2 }) {
  if (!playedIsBest || eval2 == null) return false
  return Math.abs(eval1 - eval2) >= 70
}

// BRILLIANT: the best move also offers material — the piece that just moved
// can be captured by an opponent piece worth the same or less — yet the
// engine still rates it best, i.e. a justified sacrifice.
function isBrilliantMove({ playedIsBest, fenAfter, toSquare, movedPiece }) {
  if (!playedIsBest || !toSquare || !movedPiece) return false
  let chess
  try { chess = new Chess(fenAfter) } catch { return false }
  const movedValue = PIECE_VALUE[movedPiece] || 0
  const replies = chess.moves({ verbose: true })
  return replies.some(m => m.to === toSquare && m.captured && (PIECE_VALUE[m.piece] || 0) <= movedValue)
}

// ── Stockfish worker ──────────────────────────────────────────────
// Bundled NNUE build (single-threaded "lite") — ships inside the app so
// analysis works offline and nothing fetches/executes remote code.
// Bare filename — the build auto-detects worker context and resolves its own
// .wasm by replacing the .js suffix on its own URL, no query/hash needed.
const ENGINE_JS = 'stockfish/stockfish-18-lite-single.js'
const STOP_AFTER_MS = 2500 // safety net: never block more than this per position

function clampEval(cp) { return Math.max(-2000, Math.min(2000, cp)) }

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
        const url = new URL(ENGINE_JS, document.baseURI).href
        this._worker = new Worker(url)

        this._worker.onmessage = (e) => {
          const line = e.data
          if (line === 'uciok')   { this._worker.postMessage('setoption name MultiPV value 2'); this._worker.postMessage('isready'); return }
          if (line === 'readyok') { this._ready = true; done(true); return }
          if (this._currentResolve) {
            if (line.startsWith('info') && line.includes(' score ')) {
              const pvMatch   = line.match(/\bmultipv (\d+)/)
              const pvIndex   = pvMatch ? parseInt(pvMatch[1]) : 1
              const cpMatch   = line.match(/score cp (-?\d+)/)
              const mateMatch = line.match(/score mate (-?\d+)/)
              const moveMatch = line.match(/\bpv (\S+)/)
              let cp = null
              // Encode mate as sign * (10000 - distance): closer mates score
              // more extreme, and any |cp| >= 9000 decodes back to "mate in
              // (10000 - |cp|)". Regular cp evals are clamped to ±2000, so the
              // ranges can never collide.
              if (mateMatch) { const m = parseInt(mateMatch[1]); cp = m > 0 ? 10000 - m : -10000 - m }
              else if (cpMatch) { cp = clampEval(parseInt(cpMatch[1])) }
              if (cp !== null) {
                if (pvIndex === 1) { this._eval1 = cp; if (moveMatch) this._move1 = moveMatch[1] }
                else if (pvIndex === 2) { this._eval2 = cp; if (moveMatch) this._move2 = moveMatch[1] }
              }
            }
            if (line.startsWith('bestmove')) {
              clearTimeout(this._stopTimer)
              const parts = line.split(' ')
              this._currentResolve({
                eval: this._eval1 ?? 0,
                bestMove: parts[1] !== '(none)' ? parts[1] : null,
                eval2: this._eval2 ?? null,
                secondMove: this._move2 ?? null,
              })
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

  evaluate(fen, depth = 20) {
    return new Promise(resolve => {
      this._queue.push({ fen, depth, resolve })
      if (!this._currentResolve) this._processQueue()
    })
  }

  _processQueue() {
    if (this._queue.length === 0) return
    const { fen, depth, resolve } = this._queue.shift()
    this._currentResolve = resolve
    this._eval1 = 0; this._move1 = null
    this._eval2 = null; this._move2 = null
    this._worker.postMessage(`position fen ${fen}`)
    this._worker.postMessage(`go depth ${depth}`)
    this._stopTimer = setTimeout(() => this._worker.postMessage('stop'), STOP_AFTER_MS)
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
    const DEPTH = 20

    let prevEval = 0
    let prevRes  = null // full engine result for the position before the current move

    for (let i = 0; i <= moves.length; i++) {
      const fen = i === 0 ? START_FEN : moves[i-1].fenAfter
      const res = await engineRef.current.evaluate(fen, DEPTH)

      if (i > 0) {
        const move      = moves[i-1]
        const isWhite    = move.color === 'w'
        const evalNow    = res.eval
        const betterMove = prevRes?.bestMove || null
        const playedUci  = `${move.from}${move.to}${move.promotion}`
        const playedIsBest = betterMove === playedUci

        let classification = classifyMove(prevEval, evalNow, isWhite)

        // Book move (opening — first 10 plies). Only relabel moves that
        // graded GOOD or better: a blunder on move 4 is still a blunder,
        // and BOOK moves are excluded from the accuracy calculation.
        if (i <= 10 && ['BEST', 'EXCELLENT', 'GOOD'].includes(classification)) {
          classification = 'BOOK'
        }

        // Miss: had forced win last move but didn't play it
        if (Math.abs(prevEval) >= 500 && Math.abs(evalNow) < 200 && classification === 'BLUNDER') {
          classification = 'MISS'
        }

        // Brilliant/Great upgrades only apply to moves that were already the engine's top choice
        if (classification === 'BEST') {
          if (isBrilliantMove({ playedIsBest, fenAfter: move.fenAfter, toSquare: move.to, movedPiece: move.piece })) {
            classification = 'BRILLIANT'
          } else if (isGreatMove({ playedIsBest, eval1: prevRes?.eval, eval2: prevRes?.eval2 })) {
            classification = 'GREAT'
          }
        }

        results.push({
          move:        move.san,
          fen:         move.fenAfter,
          fenBefore:   i === 1 ? START_FEN : moves[i-2].fenAfter,
          classification,
          eval:        evalNow,
          evalBefore:  prevEval,
          bestMove:    res.bestMove,
          betterMove,
          color:       move.color,
          delta:       Math.round(isWhite ? evalNow - prevEval : prevEval - evalNow),
          moveNum:     move.moveNum,
        })

        prevEval = evalNow
        prevRes  = res
      } else {
        prevEval = res.eval
        prevRes  = res
      }

      setProgress(Math.round((i / moves.length) * 100))
    }

    setAnalysis(results)
    setAnalyzing(false)
    showToast('✅ Analysis complete!', 'success')
  }

  const currentFen  = currentIdx === 0
    ? START_FEN
    : moves[currentIdx - 1]?.fenAfter || START_FEN

  const currentAnalysis = analysis[currentIdx - 1] || null

  const bestMoveArrow = currentAnalysis?.bestMove
    ? [{ startSquare: currentAnalysis.bestMove.slice(0, 2), endSquare: currentAnalysis.bestMove.slice(2, 4), color: '#f5b73199' }]
    : []

  const betterSan = currentAnalysis && currentAnalysis.betterMove &&
    !['BEST', 'BRILLIANT', 'GREAT', 'BOOK'].includes(currentAnalysis.classification)
    ? uciToSan(currentAnalysis.fenBefore, currentAnalysis.betterMove)
    : null

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
            arrows={bestMoveArrow}
          />
        </div>

        {/* Nav controls */}
        <div className="flex items-center gap-2">
          <NavBtn onClick={() => setCurrentIdx(0)} disabled={currentIdx === 0} label="⏮" name="First move" />
          <NavBtn onClick={() => setCurrentIdx(i => Math.max(0, i-1))} disabled={currentIdx === 0} label="◀" name="Previous move" />
          <span className="text-sm text-muted px-3 min-w-20 text-center">
            {currentIdx === 0 ? 'Start' : `Move ${currentAnalysis?.moveNum || currentIdx}`}
          </span>
          <NavBtn onClick={() => setCurrentIdx(i => Math.min(moves.length, i+1))} disabled={currentIdx >= moves.length} label="▶" name="Next move" />
          <NavBtn onClick={() => setCurrentIdx(moves.length)} disabled={currentIdx >= moves.length} label="⏭" name="Last move" />
        </div>

        {/* Move classification badge */}
        {currentAnalysis && (
          <ClassificationBadge c={currentAnalysis.classification} eval={currentAnalysis.eval} delta={currentAnalysis.delta} betterSan={betterSan} />
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
                <div className="text-sm text-muted" aria-live="polite">Analysing… {progress}%</div>
                <div className="h-1.5 bg-bg3 rounded-full overflow-hidden">
                  <div className="h-full bg-gold rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
                <div className="text-xs text-muted">Depth 20 · Stockfish 18 Lite</div>
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
  const whitePct = winPercent(ev)
  const isMate   = Math.abs(ev) >= 9000
  const display  = isMate
    ? `M${10000 - Math.abs(ev)}`
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

function NavBtn({ onClick, disabled, label, name }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={name}
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

function ClassificationBadge({ c, eval: ev, delta, betterSan }) {
  const cls = CLASSIFICATIONS[c]
  if (!cls) return null
  const evalDisplay = Math.abs(ev) >= 9000
    ? `Mate in ${10000 - Math.abs(ev)}`
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
        {betterSan && <div className="text-xs text-gold mt-0.5">Better: {betterSan}</div>}
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

  // Accuracy score (0-100) — Lichess's win%-based per-move formula, averaged.
  // (Lichess additionally weights this average by positional volatility; that
  // extra layer is skipped here, but the core per-move formula is the real one.)
  const scored = myMoves.filter(m => m.classification !== 'BOOK')
  const accuracy = scored.length > 0
    ? Math.round(scored.reduce((acc, m) => acc + moveAccuracy(m.evalBefore, m.eval, m.color === 'w'), 0) / scored.length)
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
        san:       move.san,
        fenAfter:  engine.fen,
        color,
        from:      move.from,
        to:        move.to,
        piece:     move.piece,
        promotion: move.promotion || '',
        moveNum:   color === 'w' ? `${moveNum}.` : `${moveNum}…`,
      })
      if (color === 'b') moveNum++
    }

    return result
  } catch {
    return []
  }
}
