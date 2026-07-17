import { useState, useRef } from 'react'
import { Chessboard } from '../components/ui/Chessboard'
import MoveLedger from '../components/ui/MoveLedger'
import { Chess } from 'chess.js'
import { useChessBoard } from '../hooks/useChessBoard'
import { useOpeningsStore } from '../store/useOpeningsStore'
import { useAppStore } from '../store/useAppStore'
import { progressManager } from '../core/ProgressManager'
import { srsEngine } from '../core/SpacedRepetitionEngine'
import { OPENING_REPERTOIRE } from '../data/openingsRepertoire'

export default function OpeningsPage() {
  const { activeColor, setActiveColor, searchQuery, setSearchQuery, selectedTrap, selectTrap, getFilteredTraps } = useOpeningsStore()
  const showToast = useAppStore(s => s.showToast)
  const traps = getFilteredTraps()
  const [selectedRepertoire, setSelectedRepertoire] = useState(null)
  const [selectedLine, setSelectedLine] = useState(null)
  const [prevActiveColor, setPrevActiveColor] = useState(activeColor)
  const [prevSelectedTrap, setPrevSelectedTrap] = useState(selectedTrap)

  const filteredRepertoire = OPENING_REPERTOIRE
    .filter(r => activeColor !== 'mates' ? r.color === activeColor : false)
    .map(group => ({
      ...group,
      lines: searchQuery
        ? group.lines.filter(l => l.name.toLowerCase().includes(searchQuery.toLowerCase()))
        : group.lines,
    }))
    .filter(group => group.lines.length > 0)

  const openingsByLevel = ['beginner', 'intermediate', 'advanced']
    .map(level => ({
      level,
      lines: filteredRepertoire.flatMap(group =>
        group.lines.filter(l => l.level === level).map(l => ({ ...l, group }))
      ),
    }))
    .filter(g => g.lines.length > 0)

  // Reset the study panel whenever the color tab or the selected trap changes,
  // adjusted during render rather than in an effect (react-hooks/set-state-in-effect).
  if (activeColor !== prevActiveColor) {
    setPrevActiveColor(activeColor)
    setSelectedRepertoire(null)
    setSelectedLine(null)
  }
  if (selectedTrap !== prevSelectedTrap) {
    setPrevSelectedTrap(selectedTrap)
    if (selectedTrap) {
      setSelectedRepertoire(null)
      setSelectedLine(null)
    }
  }

  const chooseLine = (line, group) => {
    selectTrap(null)
    setSelectedRepertoire(group)
    setSelectedLine(line)
  }

  return (
    <div className="flex h-full overflow-hidden">
      <div className="w-72 shrink-0 border-r border-border flex flex-col bg-bg2 overflow-hidden">
        <div className="p-3 border-b border-border space-y-2 shrink-0">
          <div className="flex gap-1">
            {[{ id: 'white', label: 'White' }, { id: 'black', label: 'Black' }, { id: 'mates', label: 'Mates' }].map(tab => (
              <button key={tab.id} onClick={() => setActiveColor(tab.id)}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${activeColor === tab.id ? 'bg-gold text-bg' : 'bg-bg3 text-muted hover:text-white border border-border'}`}>
                {tab.label}
              </button>
            ))}
          </div>
          <input type="text" placeholder="Search traps, openings…" value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-bg3 border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-muted outline-none focus:border-gold/50" />
        </div>
        <div className="flex-1 overflow-y-auto">
          {openingsByLevel.length > 0 && (
            <>
              <div className="px-4 py-2 text-[10px] font-bold text-muted uppercase tracking-widest border-b border-border bg-bg3/40">
                Openings
              </div>
              {openingsByLevel.map(({ level, lines }) => (
                <div key={level}>
                  <div className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest border-b border-border/50 ${
                    level === 'beginner' ? 'text-accent2 bg-accent2/5' :
                    level === 'intermediate' ? 'text-gold bg-gold/5' :
                    'text-danger bg-danger/5'
                  }`}>
                    {level}
                  </div>
                  {lines.map(({ group, ...line }) => (
                    <button
                      key={line.name}
                      onClick={() => chooseLine(line, group)}
                      className={`w-full text-left px-4 py-2.5 border-b border-border/40 transition-colors hover:bg-bg3 ${
                        selectedLine?.name === line.name && !selectedTrap ? 'bg-gold/10 border-l-2 border-gold pl-3' : ''
                      }`}
                    >
                      <div className={`text-sm font-semibold truncate ${
                        selectedLine?.name === line.name && !selectedTrap ? 'text-gold' : 'text-white'
                      }`}>
                        {line.name}
                      </div>
                      <div className="text-xs text-muted font-mono mt-0.5 truncate">
                        {line.moves.slice(0, 5).join(' ')}
                      </div>
                    </button>
                  ))}
                </div>
              ))}
            </>
          )}
          {(activeColor === 'mates' || traps.length > 0) && (
            <>
              {openingsByLevel.length > 0 && (
                <div className="px-4 py-2 text-[10px] font-bold text-muted uppercase tracking-widest border-b border-border bg-bg3/40">
                  Traps
                </div>
              )}
              {traps.length === 0
                ? <div className="text-center text-muted py-10 text-sm">No traps found</div>
                : ['beginner', 'intermediate', 'advanced'].map(level => {
                    const group = traps.filter(t => t.level === level)
                    if (!group.length) return null
                    return (
                      <div key={level}>
                        <div className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest border-b border-border/50 ${
                          level === 'beginner' ? 'text-accent2 bg-accent2/5' :
                          level === 'intermediate' ? 'text-gold bg-gold/5' :
                          'text-danger bg-danger/5'
                        }`}>
                          {level}
                        </div>
                        {group.map(trap => (
                          <TrapListItem key={trap.id} trap={trap} active={selectedTrap?.id === trap.id}
                            onClick={() => selectTrap(trap)}
                            studyCount={progressManager.getTrapStudyCount(trap.id)}
                            inSRS={srsEngine.isEnrolled(trap.id)} />
                        ))}
                      </div>
                    )
                  })
              }
            </>
          )}
          {openingsByLevel.length === 0 && traps.length === 0 && (
            <div className="text-center text-muted py-10 text-sm">No results found</div>
          )}
        </div>
      </div>
      <div className="flex-1 min-w-0 overflow-hidden">
        {selectedTrap
          ? <TrapStudy key={selectedTrap.id} trap={selectedTrap} showToast={showToast} />
          : selectedLine
            ? <RepertoireStudy key={selectedLine.name} line={selectedLine} group={selectedRepertoire} />
            : <TrapEmpty />}
      </div>
    </div>
  )
}

function TrapListItem({ trap, active, onClick, studyCount, inSRS }) {
  const levelColors = { beginner: 'text-accent2', intermediate: 'text-gold', advanced: 'text-danger' }
  return (
    <button onClick={onClick} className={`w-full text-left px-4 py-3 border-b border-border/50 transition-colors hover:bg-bg3 ${active ? 'bg-gold/10 border-l-2 border-gold pl-3' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className={`text-sm font-semibold truncate ${active ? 'text-gold' : 'text-white'}`}>{trap.name}</div>
          <div className="text-xs text-muted truncate mt-0.5">{trap.opening}</div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`text-[10px] font-bold uppercase ${levelColors[trap.level] || 'text-muted'}`}>{trap.level}</span>
          {studyCount > 0 && <span className="text-[10px] text-accent2">✓ {studyCount}x</span>}
          {inSRS && <span className="text-[10px] text-accent">🔁</span>}
        </div>
      </div>
    </button>
  )
}

function TrapEmpty() {
  return (
    <div className="flex-1 flex items-center justify-center h-full text-muted">
      <div className="text-center">
        <div className="text-6xl mb-4 opacity-20">♟</div>
        <div className="text-lg font-semibold">Select a trap to study</div>
        <div className="text-sm mt-1">Choose from the list on the left</div>
      </div>
    </div>
  )
}

function TrapStudy({ trap, showToast }) {
  // Array indices are always White's book moves at even positions regardless
  // of trap.color — for a black trap, the whole point is drilling BLACK's
  // winning line, so the drill starts with White's first move already
  // played rather than making the user input White's move first (which is
  // what starting at index 0 would otherwise hand them for every black
  // trap). Computed once via a lazy initializer (same pattern as
  // browseFens/startPreviewFens below) rather than an effect/render-time ref
  // mutation, both of which this project's lint config disallows.
  const [primed] = useState(() => {
    if (trap.color !== 'black' || trap.moves.length === 0) return { fen: trap.fen, moveIdx: 0 }
    const c = new Chess(trap.fen)
    try {
      c.move(trap.moves[0])
      return { fen: c.fen(), moveIdx: 1 }
    } catch {
      return { fen: trap.fen, moveIdx: 0 }
    }
  })

  // Chess instance + fen sync live in the hook; move index stays in a ref
  // (not state) to avoid stale closures
  const { fen, tryMove, undo, move, reset: resetBoard } = useChessBoard(primed.fen)
  const moveIdxRef = useRef(primed.moveIdx)

  const [moveIdx, setMoveIdx]   = useState(primed.moveIdx)   // for UI only
  const [mistakes, setMistakes] = useState(0)
  const [complete, setComplete] = useState(false)
  const [flash, setFlash]       = useState(null)
  const [browseMode, setBrowseMode] = useState(false)
  const [browseFens] = useState(() => {
    // Pre-compute all FENs for prev/next navigation
    const c = new Chess(trap.fen)
    const fens = [trap.fen]
    for (const m of trap.moves) {
      try { c.move(m); fens.push(c.fen()) } catch { /* invalid move in trap data, skip */ }
    }
    return fens
  })
  const [browseIdx, setBrowseIdx] = useState(0)

  // Preview FENs computed from a fresh game start (standard chess initial position)
  const [startPreviewFens] = useState(() => {
    const c = new Chess()
    const fens = [c.fen()]
    for (const m of trap.moves) {
      try { c.move(m); fens.push(c.fen()) } catch { /* invalid move in trap data, skip */ }
    }
    return fens
  })
  // When previewing in Drill mode, prefer the trap's start position by default
  const drillPreviewFromStart = false

  // When in Drill mode the user can step through moves visually
  // without switching to Browse mode. `drillPreviewIdx` is null
  // when showing the live drill `fen`, otherwise it indexes into
  // `browseFens` for a visual preview of that ply.
  const [drillPreviewIdx, setDrillPreviewIdx] = useState(null)

  const [inSRS, setInSRS]       = useState(srsEngine.isEnrolled(trap.id))
  const refreshProgress         = useAppStore(s => s.refreshProgress)
  const mistakesRef             = useRef(0)

  // A drill can end on either side's move (most traps end on the "hero"
  // color's move, but a few — e.g. budapest-white, petrov-trap — happen to
  // end on the opponent's reply instead), so completion has to be checked
  // after BOTH a user move and an auto-played reply, not just the former.
  const finishDrill = () => {
    setComplete(true)
    progressManager.recordTrapStudy(trap.id, mistakesRef.current === 0)
    progressManager.awardXP(mistakesRef.current === 0 ? 'TRAP_DRILL_PERFECT' : 'TRAP_DRILL_COMPLETE')
    srsEngine.enroll(trap.id)
    setInSRS(true)
    refreshProgress()
    showToast(mistakesRef.current === 0 ? '🎉 Perfect drill!' : '✅ Drill complete!', mistakesRef.current === 0 ? 'gold' : 'success')
    setTimeout(() => setFlash(null), 800)
  }

  const handleDrop = ({ sourceSquare: from, targetSquare: to }) => {
    console.log('TrapStudy.handleDrop', { from, to, moveIdx: moveIdxRef.current })
    if (complete || browseMode) { console.log('TrapStudy: ignored (complete or browseMode)'); return false }

    const expected  = trap.moves[moveIdxRef.current]
    // Scripted underpromotions (e.g. Lasker Trap's "fxg1=N+") need the drag to
    // promote to that exact piece — tryMove defaults to queen otherwise, which
    // would never match the expected line.
    const expectedPromotion = expected?.match(/=([QRBN])/i)?.[1]?.toLowerCase() || 'q'
    const result = tryMove(from, to, expectedPromotion)
    if (!result) return false

    const normalize = s => s.replace(/[+#!?]/g, '')

    console.log('TrapStudy: move result', result)
    if (normalize(result.san) === normalize(expected)) {
      setDrillPreviewIdx(null)
      setFlash('correct')
      const next = moveIdxRef.current + 1
      moveIdxRef.current = next
      setMoveIdx(next)

      if (next >= trap.moves.length) {
        finishDrill()
      } else {
        // Auto-play opponent move after delay
        setTimeout(() => {
          setFlash(null)
          if (move(trap.moves[next])) {
            const after = next + 1
            moveIdxRef.current = after
            setMoveIdx(after)
            setDrillPreviewIdx(null)
            if (after >= trap.moves.length) finishDrill()
          }
        }, 500)
      }
    } else {
      undo()
      console.log('TrapStudy: wrong move', { attempted: result && result.san, expected })
      setFlash('wrong')
      mistakesRef.current += 1
      setMistakes(m => m + 1)
      showToast('Not the right move — try again!', 'error', 1500)
      setTimeout(() => setFlash(null), 800)
    }
    return true
  }

  const reset = () => {
    resetBoard(primed.fen)
    moveIdxRef.current = primed.moveIdx
    mistakesRef.current = 0
    setMoveIdx(primed.moveIdx)
    setMistakes(0)
    setComplete(false)
    setFlash(null)
    setBrowseMode(false)
    setBrowseIdx(0)
    setDrillPreviewIdx(null)
  }

  const toggleSRS = () => {
    if (inSRS) { srsEngine.unenroll(trap.id); setInSRS(false) }
    else { srsEngine.enroll(trap.id); setInSRS(true) }
    refreshProgress()
  }

  // Browse mode: prev/next through moves
  const handlePrev = () => {
    if (browseMode) {
      const next = Math.max(0, browseIdx - 1)
      setBrowseIdx(next)
    } else {
      const next = Math.max(0, (drillPreviewIdx ?? 0) - 1)
      setDrillPreviewIdx(next)
    }
  }
  const handleNext = () => {
    if (browseMode) {
      const next = Math.min(browseFens.length - 1, browseIdx + 1)
      setBrowseIdx(next)
    } else {
      const len = drillPreviewFromStart ? startPreviewFens.length : browseFens.length
      const next = Math.min(len - 1, (drillPreviewIdx ?? 0) + 1)
      setDrillPreviewIdx(next)
    }
  }
  const toggleBrowse = () => {
    setBrowseMode(b => !b)
    // Always start Browse mode from the beginning of the line rather than
    // wherever the live drill currently sits — Browse exists to review the
    // whole trap, and seeding from moveIdx meant finishing a drill (or
    // switching mid-drill) dropped you on the last move instead of the
    // first. browseIdx isn't read in Drill mode, so resetting it
    // unconditionally here is safe in both toggle directions.
    setBrowseIdx(0)
    setDrillPreviewIdx(null)
  }

  const displayFen   = drillPreviewIdx != null
    ? (drillPreviewFromStart ? startPreviewFens[drillPreviewIdx] : browseFens[drillPreviewIdx])
    : (browseMode ? browseFens[browseIdx] : fen)
  const studyCount   = progressManager.getTrapStudyCount(trap.id)
  const currentMoveNum = browseMode ? browseIdx : (drillPreviewIdx != null ? drillPreviewIdx : moveIdx)

  return (
    <div className="flex h-full overflow-hidden">
      {/* Board area */}
      <div className="flex flex-col items-center justify-center p-6 flex-1">
        <div className="w-full max-w-[440px]">

          {/* Mode toggle */}
          <div className="flex items-center justify-between mb-3">
            <span className={`text-xs font-bold px-2 py-1 rounded-lg ${browseMode ? 'bg-accent/20 text-accent' : 'bg-gold/20 text-gold'}`}>
              {browseMode ? '📖 Browse Mode' : '🎯 Drill Mode'}
            </span>
            <button onClick={toggleBrowse} className="text-xs text-muted hover:text-white border border-border rounded-lg px-3 py-1 transition-colors">
              {browseMode ? 'Switch to Drill' : 'Switch to Browse'}
            </button>
          </div>

          {/* Board */}
          <div className={`rounded-xl overflow-hidden transition-all duration-300 ${
            flash === 'correct' ? 'ring-2 ring-accent2' :
            flash === 'wrong'   ? 'ring-2 ring-danger'  : ''
          }`}>
            <Chessboard
              position={displayFen}
              onPieceDrop={handleDrop}
              boardOrientation={trap.color === 'black' ? 'black' : 'white'}
              customBoardStyle={{ borderRadius: '8px' }}
              arePiecesDraggable={!complete && !browseMode}
            />
          </div>

          {/* Progress bar */}
          <div className="mt-3 bg-bg3 rounded-full h-1.5 overflow-hidden">
            <div className="h-full bg-gold transition-all duration-500 rounded-full"
              style={{ width: `${(currentMoveNum / trap.moves.length) * 100}%` }} />
          </div>

          {/* Prev / Next navigation */}
          <div className="flex items-center justify-between mt-3 gap-2">
            <button
              onClick={handlePrev}
              disabled={browseMode ? browseIdx === 0 : (drillPreviewIdx ?? 0) === 0}
              className="flex-1 btn-ghost text-sm disabled:opacity-30"
            >
              ◀ Prev
            </button>
            <span className="text-xs text-muted px-2 text-center min-w-20">
              {currentMoveNum === 0 ? 'Start' : `Move ${Math.ceil(currentMoveNum / 2)} of ${Math.ceil(trap.moves.length / 2)}`}
            </span>
            <button
              onClick={handleNext}
              disabled={browseMode ? browseIdx >= browseFens.length - 1 : (drillPreviewIdx ?? 0) >= ((drillPreviewFromStart ? startPreviewFens.length : browseFens.length) - 1)}
              className="flex-1 btn-ghost text-sm disabled:opacity-30"
            >
              Next ▶
            </button>
          </div>

          {/* Move notation — a scoresheet ledger you step through, not a
              slideshow (Tempo design doc, "Openings / Learn" brief) */}
          <MoveLedger
            moveList={trap.moves}
            activeIdx={currentMoveNum - 1}
            onMoveClick={i => browseMode ? setBrowseIdx(i + 1) : setDrillPreviewIdx(i + 1)}
            className="mt-2"
          />
        </div>
      </div>

      {/* Right panel */}
      <div className="w-72 shrink-0 border-l border-border bg-bg2 flex flex-col overflow-y-auto">
        <div className="p-4 border-b border-border">
          <h2 className="font-extrabold text-white text-lg font-heading">{trap.name}</h2>
          <div className="text-muted text-sm mt-0.5">{trap.opening}</div>
          {studyCount > 0 && (
            <span className="text-xs bg-accent2/15 text-accent2 border border-accent2/30 px-2 py-0.5 rounded-full font-medium mt-2 inline-block">
              Studied {studyCount}×
            </span>
          )}
        </div>

        <div className="p-4 border-b border-border">
          {complete ? (
            <div className="bg-accent2/15 border border-accent2/30 rounded-xl p-3 text-center">
              <div className="text-accent2 font-bold text-base">✅ Complete!</div>
              <div className="text-muted text-xs mt-1">
                {mistakes === 0 ? 'Perfect run! +20 XP' : `${mistakes} mistake${mistakes !== 1 ? 's' : ''}. +10 XP`}
              </div>
            </div>
          ) : browseMode ? (
            <div className="bg-accent/10 border border-accent/30 rounded-xl p-3 text-sm text-muted">
              📖 Browsing moves — click Prev/Next or tap a move
            </div>
          ) : (
            <div className="text-sm text-white font-medium">
              {complete ? 'Done!' : `Move ${Math.floor(moveIdx/2)+1} of ${Math.ceil(trap.moves.length/2)}`}
              {mistakes > 0 && <span className="text-danger text-xs ml-2">({mistakes} mistake{mistakes !== 1 ? 's' : ''})</span>}
            </div>
          )}
        </div>

        <div className="p-4 space-y-2">
          <button onClick={reset} className="w-full btn-ghost text-sm">↺ Restart</button>
          <button onClick={toggleSRS}
            className={`w-full text-sm px-4 py-2 rounded-lg font-medium border transition-colors ${inSRS ? 'bg-accent/15 text-accent border-accent/30' : 'bg-bg3 text-muted border-border hover:text-white'}`}>
            {inSRS ? '🔁 In Spaced Review ✓' : '+ Add to Spaced Review'}
          </button>
        </div>

        <div className="p-4 border-t border-border">
          <div className="text-xs font-bold text-muted uppercase tracking-wide mb-2">💡 Key Concept</div>
          <p className="text-sm text-muted leading-relaxed">{trap.description}</p>
        </div>
      </div>
    </div>
  )
}

function RepertoireStudy({ line, group }) {
  const [browseFens] = useState(() => {
    const c = new Chess()
    const fens = [c.fen()]
    for (const m of line.moves) {
      try { c.move(m); fens.push(c.fen()) } catch { /* invalid move in line data, skip */ }
    }
    return fens
  })
  const [browseIdx, setBrowseIdx] = useState(browseFens.length - 1)

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex flex-col items-center justify-center p-6 flex-1">
        <div className="w-full max-w-[440px]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold px-2 py-1 rounded-lg bg-accent/20 text-accent">
              📖 Opening Theory
            </span>
            <span className="text-xs text-muted">{group?.name}</span>
          </div>

          <div className="rounded-xl overflow-hidden">
            <Chessboard
              position={browseFens[browseIdx]}
              boardOrientation={group?.color === 'black' ? 'black' : 'white'}
              arePiecesDraggable={false}
              customBoardStyle={{ borderRadius: '8px' }}
            />
          </div>

          <div className="mt-3 bg-bg3 rounded-full h-1.5 overflow-hidden">
            <div className="h-full bg-gold transition-all duration-500 rounded-full"
              style={{ width: browseFens.length > 1 ? `${(browseIdx / (browseFens.length - 1)) * 100}%` : '0%' }} />
          </div>

          <div className="flex items-center justify-between mt-3 gap-2">
            <button onClick={() => setBrowseIdx(i => Math.max(0, i - 1))}
              disabled={browseIdx === 0}
              className="flex-1 btn-ghost text-sm disabled:opacity-30">
              ◀ Prev
            </button>
            <span className="text-xs text-muted px-2 text-center min-w-20">
              {browseIdx === 0 ? 'Start' : `Move ${Math.ceil(browseIdx / 2)} of ${Math.ceil(line.moves.length / 2)}`}
            </span>
            <button onClick={() => setBrowseIdx(i => Math.min(browseFens.length - 1, i + 1))}
              disabled={browseIdx >= browseFens.length - 1}
              className="flex-1 btn-ghost text-sm disabled:opacity-30">
              Next ▶
            </button>
          </div>

          <div className="mt-2 flex flex-wrap gap-1">
            {line.moves.map((m, i) => (
              <span key={i}
                onClick={() => setBrowseIdx(i + 1)}
                className={`text-xs font-mono px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                  i + 1 === browseIdx
                    ? 'text-gold bg-gold/20 font-bold'
                    : i < browseIdx
                      ? 'text-accent2 bg-accent2/10'
                      : 'text-muted hover:text-white'
                }`}>
                {i % 2 === 0 ? `${Math.floor(i / 2) + 1}.` : ''}{m}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="w-72 shrink-0 border-l border-border bg-bg2 flex flex-col overflow-y-auto">
        <div className="p-4 border-b border-border">
          <div className="flex items-start justify-between gap-2">
            <h2 className="font-extrabold text-white text-lg leading-tight font-heading">{line.name}</h2>
            {line.level && (
              <span className={`text-[10px] font-bold uppercase shrink-0 px-2 py-0.5 rounded-full border mt-1 ${
                line.level === 'beginner' ? 'text-accent2 border-accent2/30 bg-accent2/10' :
                line.level === 'intermediate' ? 'text-gold border-gold/30 bg-gold/10' :
                'text-danger border-danger/30 bg-danger/10'
              }`}>
                {line.level}
              </span>
            )}
          </div>
          <div className="text-muted text-sm mt-0.5">{group?.name}</div>
        </div>
        <div className="p-4 border-b border-border">
          <div className="text-xs font-bold text-muted uppercase tracking-wide mb-2">💡 Main Idea</div>
          <p className="text-sm text-muted leading-relaxed">{line.idea}</p>
        </div>
        <div className="p-4">
          <div className="text-xs font-bold text-muted uppercase tracking-wide mb-2">Move Order</div>
          <div className="flex flex-wrap gap-1">
            {line.moves.map((m, i) => (
              <span key={i} className="text-xs font-mono text-accent2 bg-accent2/10 px-1.5 py-0.5 rounded">
                {i % 2 === 0 ? `${Math.floor(i / 2) + 1}.` : ''}{m}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
