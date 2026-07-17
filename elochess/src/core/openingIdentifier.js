import { TRAPS } from '../data/traps'
import { OPENING_REPERTOIRE } from '../data/openingsRepertoire'

// Same SAN-decoration stripping already used in OpeningsPage.jsx/
// MemoryDrillPage.jsx for the same "does the played move match the
// scripted move" comparison problem.
const normalize = s => s.replace(/[+#!?]/g, '')

// Every named line the app knows about, flattened to just {name, moves} —
// TRAPS entries directly, OPENING_REPERTOIRE's group.lines unwrapped.
function allNamedLines() {
  const trapLines = TRAPS.map(t => ({ name: t.name, moves: t.moves }))
  const repertoireLines = OPENING_REPERTOIRE.flatMap(group => group.lines.map(l => ({ name: l.name, moves: l.moves })))
  return [...trapLines, ...repertoireLines]
}

// How many of the played moves agree with this line's own moves, from the
// start — 0 if they disagree on move 1. Comparing up to the shorter of the
// two lengths: once a game runs past a line's own length, the position still
// genuinely passed through that line before diverging further, so it's
// still a real (if no-longer-deepening) match.
function matchLength(sanMoves, lineMoves) {
  const max = Math.min(sanMoves.length, lineMoves.length)
  let i = 0
  while (i < max && normalize(sanMoves[i]) === normalize(lineMoves[i])) i++
  return i
}

// Identifies the opening/trap a live game's move list has followed, by
// finding the named line (from the app's own curated traps.js/
// openingsRepertoire.js — there's no broader ECO-style database) whose own
// moves share the longest matching prefix with what's actually been played.
// Returns null once the game diverges from every known line, or before any
// moves have been played.
export function identifyOpening(sanMoves) {
  if (!sanMoves || sanMoves.length === 0) return null

  let best = null
  let bestLen = 0
  for (const line of allNamedLines()) {
    const len = matchLength(sanMoves, line.moves)
    if (len > bestLen) { bestLen = len; best = line }
  }
  return bestLen > 0 ? best.name : null
}
