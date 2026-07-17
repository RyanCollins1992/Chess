/**
 * "KnightPath" — EloChess's visual identity, sourced from a Figma Make
 * design Ryan shared (2026-07-15). Values below are copied verbatim from
 * the actual exported source code's `src/styles/theme.css` `:root` block
 * (`Ryan's Brain/Chess Info/Chess ui code/`, a shadcn/ui + Tailwind v4
 * project with every screen inlined in one `src/app/App.tsx`), not
 * re-sampled from screenshots.
 *
 * One structural wrinkle: the sidebar is dark navy while the content area
 * is warm cream — a two-tone layout. The shared `bg2` token can't cover
 * both (it's "card background," which needs to stay white/cream to match
 * content-area cards), so the dark sidebar has its own `sidebarBg`/
 * `sidebarBorder`/`sidebarText`/`sidebarMuted` fields that Sidebar.jsx/
 * Topbar.jsx read directly instead of through bg2/white/muted.
 */

export const KNIGHTPATH_THEME = {
  id: 'knightpath',
  name: 'KnightPath',
  description: 'Warm cream dashboard with a dark navy sidebar and a single spruce-green accent.',
  light: true,
  headingFont: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  bodyFont: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  colors: {
    bg: '#F0EBE0', bg2: '#FFFFFF', bg3: '#E8E2D6',
    border: '#DBD7CE',
    gold: '#2D7A52', gold2: '#256A46',
    accent: '#2D7A52', accent2: '#5DBF8A',
    muted: '#8A8176', dim: '#C5BFB2',
    text: '#1C2130', white: '#1C2130',
    danger: '#DC2626',
  },
  // chart-1..5 from theme.css, for any future chart that wants more than the
  // single accent color (the Dashboard's rating chart only needs one line).
  chartColors: ['#2D7A52', '#1C6B9A', '#B58863', '#D97706', '#7C3AED'],
  board: { light: '#F0D9B5', dark: '#B58863' },
  boardTexture: null,
  sidebarBg: '#1C2130',
  sidebarBorder: 'rgba(255, 255, 255, 0.07)',
  sidebarText: '#FFFFFF',
  // theme.css's --sidebar-foreground (#8B91A8) is a distinct, cooler gray
  // from --muted-foreground (#8A8176, the `muted` above) — tuned to read on
  // the dark navy sidebar specifically, not reused from the content-area
  // muted tone the way this app's other themes get away with for both.
  sidebarMuted: '#8B91A8',
}

/**
 * KnightPath Dark — same layout/typography/accent identity as the light
 * theme above, built with the standard 60/30/10 dark-UI split (60% base
 * canvas, 30% card/surface, 10% accent used only for interactive
 * elements), rather than a literal color-inversion of the light palette.
 * Kept the same spruce-green accent (gold/gold2/accent/accent2) as the
 * light theme, brightened slightly — dark backgrounds need a bit more
 * saturation/lightness for the same accent to read with equal visual
 * weight — rather than switching to a different named palette, so the
 * brand identity stays the same between modes.
 *
 * The sidebar was already dark navy in the *light* theme (KnightPath's
 * two-tone layout), so it's carried over unchanged here rather than
 * re-tinted — it already sits comfortably against the new dark content
 * area. The chessboard's wood-tone squares are also left unchanged:
 * chess boards conventionally stay light/wood-toned regardless of the
 * surrounding app theme in every major chess app, not something this
 * toggle should touch.
 */
export const KNIGHTPATH_DARK_THEME = {
  ...KNIGHTPATH_THEME,
  id: 'knightpath-dark',
  name: 'KnightPath Dark',
  description: 'Dark navy/charcoal dashboard with the same spruce-green accent as KnightPath, brightened for contrast.',
  light: false,
  colors: {
    bg: '#14161C', bg2: '#1E2129', bg3: '#262A35',
    border: '#333849',
    gold: '#3DA36B', gold2: '#2D7A52',
    accent: '#3DA36B', accent2: '#6EE7B0',
    muted: '#9CA3AF', dim: '#4B5160',
    text: '#E8EAF0', white: '#E8EAF0',
    danger: '#F87171',
  },
}
