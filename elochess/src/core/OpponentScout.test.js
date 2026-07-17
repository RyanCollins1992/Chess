import { describe, it, expect } from 'vitest'
import { openingFamily, openingsMatch, findWeakSpots, recommendOpenings } from './OpponentScout'

function game({ color, result, opening }) {
  return { color, result, opening }
}

describe('openingFamily', () => {
  it('strips everything after the first colon or comma', () => {
    expect(openingFamily('Italian Game: Giuoco Piano, Main Line')).toBe('Italian Game')
    expect(openingFamily('Sicilian Defense, Najdorf Variation')).toBe('Sicilian Defense')
  })

  it('returns the name unchanged when there is no delimiter', () => {
    expect(openingFamily('London System')).toBe('London System')
  })

  it('strips an appended move list from ECOUrl-derived names', () => {
    // Chess.com's public API rarely sets a clean [Opening] tag — parseGame()
    // falls back to the ECOUrl slug, which appends the actual moves played.
    expect(openingFamily('Queens Pawn Opening Krause Variation 3.e3 Nf6 4.c4 cxd4')).toBe('Queens Pawn Opening Krause Variation')
    expect(openingFamily('Four Knights Game Glek Variation...7.bxc3 Bd6 8.O-O-O')).toBe('Four Knights Game Glek Variation')
  })

  it('handles empty input', () => {
    expect(openingFamily('')).toBe('')
    expect(openingFamily(undefined)).toBe('')
  })
})

describe('openingsMatch', () => {
  it('matches on a shared significant word', () => {
    expect(openingsMatch('Italian Game', 'Italian Game: Giuoco Piano')).toBe(true)
  })

  it('matches across a "/"-joined trap opening', () => {
    expect(openingsMatch('Ruy Lopez / Italian', 'Italian Game')).toBe(true)
  })

  it('does not match unrelated openings', () => {
    expect(openingsMatch('London System', 'Sicilian Defense')).toBe(false)
  })

  it('ignores generic words like "Game"/"Defense"/"Opening"', () => {
    // Both contain "Game" and "Defense" but nothing else in common.
    expect(openingsMatch('Open Game', 'Caro-Kann Defense')).toBe(false)
  })
})

describe('findWeakSpots', () => {
  it('buckets by opponent color + opening family and computes loss rate', () => {
    const games = [
      game({ color: 'Black', result: 'Loss', opening: 'Italian Game: Giuoco Piano' }),
      game({ color: 'Black', result: 'Loss', opening: 'Italian Game: Two Knights' }),
      game({ color: 'Black', result: 'Win',  opening: 'Italian Game: Fried Liver' }),
      game({ color: 'White', result: 'Win',  opening: 'Sicilian Defense: Najdorf' }),
    ]
    const spots = findWeakSpots(games)
    const italian = spots.find(s => s.openingName === 'Italian Game' && s.opponentColor === 'black')
    expect(italian).toBeDefined()
    expect(italian.games).toBe(3)
    expect(italian.losses).toBe(2)
    expect(italian.lossRate).toBeCloseTo(2 / 3)
  })

  it('excludes buckets below the minimum sample size', () => {
    const games = [
      game({ color: 'Black', result: 'Loss', opening: 'Italian Game' }),
      game({ color: 'Black', result: 'Loss', opening: 'Italian Game' }),
    ]
    expect(findWeakSpots(games, { minSample: 3 })).toEqual([])
  })

  it('sorts by raw loss count before loss rate', () => {
    const games = [
      // "R Opening": 3 games, all losses (100%)
      game({ color: 'Black', result: 'Loss', opening: 'R Opening' }),
      game({ color: 'Black', result: 'Loss', opening: 'R Opening' }),
      game({ color: 'Black', result: 'Loss', opening: 'R Opening' }),
      // "S Opening": 6 games, 4 losses (67%) — more raw losses, lower rate
      game({ color: 'Black', result: 'Loss', opening: 'S Opening' }),
      game({ color: 'Black', result: 'Loss', opening: 'S Opening' }),
      game({ color: 'Black', result: 'Loss', opening: 'S Opening' }),
      game({ color: 'Black', result: 'Loss', opening: 'S Opening' }),
      game({ color: 'Black', result: 'Win',  opening: 'S Opening' }),
      game({ color: 'Black', result: 'Win',  opening: 'S Opening' }),
    ]
    const spots = findWeakSpots(games)
    expect(spots[0].openingName).toBe('S Opening')
    expect(spots[0].losses).toBe(4)
  })

  it('ignores games with an unknown opening', () => {
    const games = [
      game({ color: 'Black', result: 'Loss', opening: 'Unknown' }),
      game({ color: 'Black', result: 'Loss', opening: 'Unknown' }),
      game({ color: 'Black', result: 'Loss', opening: 'Unknown' }),
    ]
    expect(findWeakSpots(games)).toEqual([])
  })
})

describe('recommendOpenings', () => {
  const lossTrio = (color, opening) => [
    game({ color, result: 'Loss', opening }),
    game({ color, result: 'Loss', opening }),
    game({ color, result: 'Loss', opening }),
  ]

  it('recommends a White trap when the opponent is weak as Black in a matching family', () => {
    const games = lossTrio('Black', 'Italian Game: Giuoco Piano')
    const [rec] = recommendOpenings(games, { max: 1 })
    expect(rec.kind).toBe('trap')
    expect(rec.forColor).toBe('white')
    expect(rec.trap.color).toBe('white')
    expect(rec.trap.opening).toContain('Italian')
  })

  it('recommends a Black trap when the opponent is weak as White in a matching family', () => {
    const games = lossTrio('White', 'Sicilian Defence: Najdorf')
    const [rec] = recommendOpenings(games, { max: 1 })
    expect(rec.kind).toBe('trap')
    expect(rec.forColor).toBe('black')
    expect(rec.trap.color).toBe('black')
    expect(rec.trap.opening).toContain('Sicilian')
  })

  it('falls back to a plain suggestion when no trap matches the family', () => {
    const games = lossTrio('Black', 'Modern Defense: Averbakh Variation')
    const [rec] = recommendOpenings(games, { max: 1 })
    expect(rec.kind).toBe('suggestion')
    expect(rec.openingName).toBe('Modern Defense')
  })

  it('never recommends the same trap twice', () => {
    const games = [
      ...lossTrio('Black', 'Italian Game: Giuoco Piano'),
      ...lossTrio('Black', 'Ruy Lopez: Berlin'),
    ]
    const recs = recommendOpenings(games, { max: 3 })
    const trapIds = recs.filter(r => r.kind === 'trap').map(r => r.trap.id)
    expect(new Set(trapIds).size).toBe(trapIds.length)
  })

  it('caps recommendations at `max`', () => {
    const games = [
      ...lossTrio('Black', 'Italian Game: Giuoco Piano'),
      ...lossTrio('White', 'Sicilian Defence: Najdorf'),
      ...lossTrio('Black', 'Caro-Kann Defence: Classical'),
    ]
    expect(recommendOpenings(games, { max: 2 })).toHaveLength(2)
  })
})
