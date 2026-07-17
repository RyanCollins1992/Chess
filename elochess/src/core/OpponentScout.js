/**
 * OpponentScout — pure analysis over a batch of an opponent's parsed
 * Chess.com games (same shape core/ChessComImport.js#parseGame produces,
 * with `color`/`result`/`opening` from the OPPONENT's own perspective).
 *
 * Finds openings where the opponent has a genuinely bad record (not just a
 * single loss), then tries to match that opening family against our own
 * TRAPS library so the recommendation is something drillable in-app, not
 * just a name. Falls back to a plain suggestion when no trap matches.
 */
import { TRAPS } from '../data/traps'

const MIN_SAMPLE = 3 // 2/2 (100%) is indistinguishable from a coin flip; require a real repeated pattern
const STOPWORDS = new Set(['the', 'of', 'and', 'game', 'defense', 'defence', 'opening', 'attack', 'variation', 'system', 'gambit'])

// "Italian Game: Giuoco Piano, Main Line" → "Italian Game" — the first
// comma/colon-delimited segment is Chess.com's own opening "family" name,
// when the game's PGN has a clean [Opening] tag.
//
// Most games from the Chess.com API don't have that tag at all, though —
// parseGame() falls back to the ECOUrl slug, which appends the actual move
// list onto the name ("Queens Pawn Opening Krause Variation 3.e3 Nf6 4.c4
// cxd4", or "...7.bxc3 Bd6 8.O-O-O" for a line reached via transposition).
// Strip from the first such move token onward before the colon/comma split,
// or family names would end up polluted with raw SAN moves and every game
// would look like its own unique "family" instead of aggregating.
export function openingFamily(name) {
  if (!name) return ''
  const moveTokenIdx = name.search(/(\s|\.{3})\d+\.[A-Za-z0-9]/)
  const withoutMoves = moveTokenIdx === -1 ? name : name.slice(0, moveTokenIdx)
  return withoutMoves.split(/[:,]/)[0].trim()
}

function significantWords(name) {
  return (name || '')
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(w => w && !STOPWORDS.has(w))
}

// Loose family match: true if the two names share at least one non-generic
// word. trap.opening sometimes lists multiple names separated by "/".
export function openingsMatch(trapOpening, openingName) {
  const targetWords = new Set(significantWords(openingName))
  if (targetWords.size === 0) return false
  return (trapOpening || '').split('/').some(part => {
    const partWords = significantWords(part)
    return partWords.some(w => targetWords.has(w))
  })
}

// Groups games by (color the opponent played, opening family), and returns
// buckets with at least MIN_SAMPLE games, worst loss-rate first.
export function findWeakSpots(games, { minSample = MIN_SAMPLE } = {}) {
  const buckets = new Map()

  for (const g of games) {
    const family = openingFamily(g.opening)
    if (!family || family === 'Unknown') continue
    const opponentColor = g.color === 'White' ? 'white' : 'black'
    const key = `${opponentColor}|${family.toLowerCase()}`

    if (!buckets.has(key)) {
      buckets.set(key, { openingName: family, opponentColor, games: 0, wins: 0, losses: 0, draws: 0 })
    }
    const b = buckets.get(key)
    b.games++
    if (g.result === 'Win') b.wins++
    else if (g.result === 'Loss') b.losses++
    else b.draws++
  }

  // Sorted by raw loss count first, not loss rate — with enough games
  // sampled, a 100% rate on the minimum sample size is just as likely to be
  // noise as a real pattern; a higher, still-bad rate backed by more
  // observed losses is the stronger signal.
  return [...buckets.values()]
    .filter(b => b.games >= minSample)
    .map(b => ({ ...b, lossRate: b.losses / b.games }))
    .sort((a, b) => b.losses - a.losses || b.lossRate - a.lossRate)
}

// Top `max` opening recommendations for beating this opponent. Each weak
// spot (an opening the opponent scores badly with, as a given color) maps
// to us playing the opposite color — if they're found to struggle with
// their move choices against 1.e4 lines, we play those lines as White.
export function recommendOpenings(games, { max = 3, minSample = MIN_SAMPLE } = {}) {
  const weakSpots = findWeakSpots(games, { minSample })
  const usedTrapIds = new Set()
  const recs = []

  for (const spot of weakSpots) {
    if (recs.length >= max) break
    const forColor = spot.opponentColor === 'black' ? 'white' : 'black'
    const trap = TRAPS.find(t => t.color === forColor && !usedTrapIds.has(t.id) && openingsMatch(t.opening, spot.openingName))

    if (trap) {
      usedTrapIds.add(trap.id)
      recs.push({ kind: 'trap', trap, forColor, weakSpot: spot })
    } else {
      recs.push({ kind: 'suggestion', openingName: spot.openingName, forColor, weakSpot: spot })
    }
  }

  return recs
}
