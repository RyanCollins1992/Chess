/**
 * "Tempo" — a from-scratch alternative visual identity, separate from the
 * 8-theme medieval system in src/styles/themes.js (see wiki/Claude Code
 * design-brief conversation, 2026-07-07). Deliberately shaped like a theme
 * object (colors/headingFont/board/boardTexture) so it can reuse the exact
 * same application mechanism in AppLayout.jsx — but it lives outside the
 * THEMES array and is gated by settings.visualMode ('medieval' | 'tempo'),
 * not by settings.theme, since it isn't a 9th palette in that switcher.
 *
 * Palette: Ink/Paper neutrals, a single Brass accent (never used for
 * semantic meaning), Sage (positive/secondary) and Oxblood (danger) kept
 * separate from the accent per the design brief. Board squares are fixed
 * (Paper/Graphite) rather than per-theme — the board is a physical object
 * that doesn't change color when the room lights do.
 */

export const TEMPO_THEME = {
  id: 'tempo',
  name: 'Tempo',
  description: 'A quiet, instrument-precise alternative to the medieval themes.',
  light: false,
  headingFont: "'IBM Plex Mono', ui-monospace, monospace",
  bodyFont: "'IBM Plex Sans', -apple-system, sans-serif",
  colors: {
    bg: '#17161A', bg2: '#201F24', bg3: '#28262C',
    border: '#3A383E',
    gold: '#B08D5A', gold2: '#9C7A4A',
    accent: '#8CB088', accent2: '#6F9470',
    muted: '#9C9D95', dim: '#5C5B57',
    text: '#EDEEE7', white: '#EDEEE7',
    danger: '#C9636F',
  },
  board: { light: '#EDEEE7', dark: '#46454A' },
  boardTexture: null,
}
