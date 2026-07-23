/**
 * OpponentScout — pure analysis over a batch of an opponent's parsed
 * Chess.com games (same shape core/ChessComImport.js#parseGame produces,
 * with `color`/`result`/`opening` from the OPPONENT's own perspective).
 *
 * Two views over the same bucketed data: allOpenings surfaces every opening
 * family the opponent has played, most-played first, for a "what do they
 * actually play" breakdown; findWeakSpots/recommendOpenings narrow that
 * down to openings with a genuinely bad record (not just a single loss) and
 * map onto our own TRAPS library so the recommendation is something
 * drillable in-app, not just a name — falling back to a plain suggestion
 * when no trap matches.
 */
import { TRAPS } from '../data/traps'
import { identifyOpening } from './openingIdentifier'

const MIN_SAMPLE = 3 // 2/2 (100%) is indistinguishable from a coin flip; require a real repeated pattern
const STOPWORDS = new Set(['the', 'of', 'and', 'game', 'defense', 'defence', 'opening', 'attack', 'variation', 'system', 'gambit'])

// "Italian Game: Giuoco Piano, Main Line" → "Italian Game" — the first
// comma/colon-delimited segment is the opening's "family" name.
//
// Applied to whichever name resolveOpeningName() produced. When that came
// from identifyOpening() (the common case — see below) it's already a clean
// name from the app's own data files. The fallback path — Chess.com's own
// [Opening] tag, or its ECOUrl slug when that tag is missing, which appends
// the actual move list onto the name ("Queens Pawn Opening Krause Variation
// 3.e3 Nf6 4.c4 cxd4", or "...7.bxc3 Bd6 8.O-O-O" for a transposition) —
// still needs the move-token stripping below, since that raw string can
// reach here whenever no move-based match was found.
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

// Chess.com's own opening metadata (see openingFamily's comment above) is
// frequently missing or slug-mangled. Prefer identifying the opening from
// what was actually played — matched against the app's curated traps/
// repertoire and its 1,345-line ECO database — and only fall back to the
// raw Chess.com field when the game's moves don't match anything known
// (e.g. it ended before reaching any named position).
function resolveOpeningName(g) {
  return identifyOpening(g.sanMoves) || g.opening
}

// Groups games by (color the opponent played, opening family). Every family
// with at least one game gets a bucket — filtering/sorting for a particular
// use (worst record vs. most-played) is left to the caller.
function bucketOpenings(games) {
  const buckets = new Map()

  for (const g of games) {
    const family = openingFamily(resolveOpeningName(g))
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

  return [...buckets.values()].map(b => ({ ...b, lossRate: b.losses / b.games }))
}

// Buckets with at least MIN_SAMPLE games, worst loss-rate first.
export function findWeakSpots(games, { minSample = MIN_SAMPLE } = {}) {
  // Sorted by raw loss count first, not loss rate — with enough games
  // sampled, a 100% rate on the minimum sample size is just as likely to be
  // noise as a real pattern; a higher, still-bad rate backed by more
  // observed losses is the stronger signal.
  return bucketOpenings(games)
    .filter(b => b.games >= minSample)
    .sort((a, b) => b.losses - a.losses || b.lossRate - a.lossRate)
}

// Every opening family the opponent has played, regardless of record — for
// a full prep breakdown rather than just their worst spots. Sorted by how
// often they reach for it (most-played first), not by how badly it's going.
export function allOpenings(games) {
  return bucketOpenings(games)
    .sort((a, b) => b.games - a.games || b.losses - a.losses || b.lossRate - a.lossRate)
}

// A single opening bucket -> a counter recommendation: play the opposite
// color from what the opponent played, matched against our own TRAPS
// library when possible, falling back to a plain named suggestion.
// Mutates `usedTrapIds` so the same trap is never recommended twice across
// a batch of buckets.
function recommendFor(spot, usedTrapIds) {
  const forColor = spot.opponentColor === 'black' ? 'white' : 'black'
  const trap = TRAPS.find(t => t.color === forColor && !usedTrapIds.has(t.id) && openingsMatch(t.opening, spot.openingName))

  if (trap) {
    usedTrapIds.add(trap.id)
    return { kind: 'trap', trap, forColor, weakSpot: spot }
  }
  return { kind: 'suggestion', openingName: spot.openingName, forColor, weakSpot: spot }
}

// Top `max` opening recommendations for beating this opponent, restricted
// to their genuine weak spots (see findWeakSpots).
export function recommendOpenings(games, { max = 3, minSample = MIN_SAMPLE } = {}) {
  const usedTrapIds = new Set()
  return findWeakSpots(games, { minSample }).slice(0, max).map(spot => recommendFor(spot, usedTrapIds))
}
