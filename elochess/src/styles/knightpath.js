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
