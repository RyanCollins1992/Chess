import { describe, it, expect } from 'vitest'
import { identifyOpening } from './openingIdentifier'

describe('identifyOpening', () => {
  it('returns null when no moves have been played', () => {
    expect(identifyOpening([])).toBeNull()
    expect(identifyOpening(null)).toBeNull()
  })

  it('returns null when the opening move matches nothing in the curated data', () => {
    expect(identifyOpening(['a4'])).toBeNull()
  })

  it('picks the longest-matching line when two lines share a prefix', () => {
    // Fried Liver Attack and Italian Game: Two Knights Defense (openingsRepertoire.js)
    // share their first 9 plies (e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5) before
    // diverging (Na5 vs Nxd5) — playing all the way to Fried Liver's own
    // 15-move line should resolve to it specifically, not the shorter-matching
    // near-duplicate.
    const moves = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5', 'exd5', 'Na5', 'Bb5+', 'c6', 'dxc6', 'bxc6', 'Bxc6+']
    expect(identifyOpening(moves)).toBe('Fried Liver Attack')
  })

  it('still matches once the game has diverged past a known line\'s own length', () => {
    const moves = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5', 'exd5', 'Na5', 'Bb5+', 'c6', 'dxc6', 'bxc6', 'Bxc6+', 'Kd7']
    expect(identifyOpening(moves)).toBe('Fried Liver Attack')
  })

  it('normalizes decorated SAN (check/mate/! symbols) when comparing', () => {
    // Scholar's Mate is stored as ['Qh5', 'Nc6', 'Qxf7#'] — a played move
    // list without the trailing "#" should still match.
    expect(identifyOpening(['Qh5', 'Nc6', 'Qxf7'])).toBe("Scholar's Mate")
  })

  it('resolves a shared opening prefix before any traps diverge', () => {
    // Just 1.e4 e5 2.Nf3 Nc6 3.Bc4 matches many lines equally — the result
    // should still be one specific named line, not null/undefined.
    const result = identifyOpening(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'])
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })
})
