/**
 * "Ply" — a second from-scratch alternative visual identity, invented
 * independently of Tempo (see the "Ply" concept artifact, 2026-07-10) rather
 * than a reskin of it: a light, warm-neutral "editorial instrument" look —
 * serif italic display type, a single spruce-green accent spent sparingly,
 * stone-toned board — where Tempo is dark/mono/matte. Shaped like a theme
 * object (colors/headingFont/board/boardTexture) for the same reason
 * tempo.js is: it reuses AppLayout.jsx's existing --color- and --font-heading
 * variable application mechanism. Gated by settings.visualMode
 * ('medieval' | 'tempo' | 'ply'), not a 9th entry in the medieval THEMES
 * rotation — its type system and board material are structurally different,
 * same rationale as Tempo.
 *
 * Named "gold"/"gold2" for compatibility with the shared --color-gold
 * token every button/badge/highlight already reads — Tempo already set the
 * precedent of that token meaning "the theme's one accent," not literally
 * gold-hued (Tempo's is brass/khaki; Ply's is spruce green).
 */

export const PLY_THEME = {
  id: 'ply',
  name: 'Ply',
  description: 'A calm, editorial instrument — warm paper, serif display type, one spruce accent.',
  light: true,
  headingFont: "'Newsreader', Georgia, 'Iowan Old Style', serif",
  bodyFont: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  colors: {
    bg: '#F1EFEA', bg2: '#FFFFFF', bg3: '#F7F5F0',
    border: '#E1DED4',
    gold: '#1F4D3F', gold2: '#173D32',
    accent: '#3D6E5C', accent2: '#1F4D3F',
    muted: '#6B6F72', dim: '#9A9D9F',
    text: '#17191C', white: '#17191C',
    danger: '#A23B33',
  },
  board: { light: '#E8E2D3', dark: '#6B7364' },
  boardTexture: null,
}
