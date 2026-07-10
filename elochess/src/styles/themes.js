/**
 * Theme registry — the single source of truth for all 8 medieval styles
 * (from the "chess medieval.png" moodboard). Each theme supplies:
 *   - colors: CSS custom property values applied to document.documentElement
 *   - headingFont: font-family string used for the `--font-heading` variable
 *   - board: chessboard light/dark square colors
 *   - boardTexture: 'wood' | 'stone' | 'parchment' — which grain/vein overlay
 *     Chessboard.jsx layers on top of the flat square colors
 *   - pieces: chessboard white/black piece fill colors
 *
 * Only two themes (illuminatedManuscript, monastery) are light-background —
 * the rest are dark, matching the moodboard's swatches.
 */

import { TEMPO_THEME } from './tempo'
import { PLY_THEME } from './ply'

export const THEMES = [
  {
    id: 'illuminated-manuscript',
    name: 'Illuminated Manuscript',
    description: 'Inspired by hand-painted medieval books.',
    light: true,
    headingFont: "'IM Fell English SC', Georgia, serif",
    colors: {
      bg: '#f2e8d0', bg2: '#e8dcc0', bg3: '#ddcfb0',
      border: '#8a6d3f',
      gold: '#b8860b', gold2: '#9c7209',
      accent: '#2c4a7c', accent2: '#3d6b35',
      muted: '#7a6a4a', dim: '#a89878',
      text: '#2b2014', white: '#2b2014',
      danger: '#8b2c2c',
    },
    board: { light: '#ecdfc0', dark: '#b8986a' },
    boardTexture: 'parchment',
    pieces: { white: '#f7f2e0', black: '#3a2f1a' },
  },
  {
    id: 'castle-stone',
    name: 'Castle Stone',
    description: 'Carved into the walls of a medieval castle.',
    light: false,
    headingFont: "'Cinzel', Georgia, serif",
    colors: {
      bg: '#1c1e21', bg2: '#24272b', bg3: '#2e3236',
      border: '#4a4f56',
      gold: '#c9762f', gold2: '#a35f28',
      accent: '#5c6670', accent2: '#5e7360',
      muted: '#7a8088', dim: '#565b62',
      text: '#d8dadd', white: '#d8dadd',
      danger: '#8f2d2d',
    },
    board: { light: '#a8a8a2', dark: '#6b6b6b' },
    boardTexture: 'stone',
    pieces: { white: '#e8e6e0', black: '#2a2a2a' },
  },
  {
    id: 'gothic-cathedral',
    name: 'Gothic Cathedral',
    description: 'Inspired by gothic architecture and stained glass.',
    light: false,
    headingFont: "'Cinzel', Georgia, serif",
    colors: {
      bg: '#14111a', bg2: '#1c1824', bg3: '#26202f',
      border: '#4a3d5c',
      gold: '#b8963a', gold2: '#9c7a28',
      accent: '#6a4c93', accent2: '#3d6b5c',
      muted: '#8a7fa0', dim: '#5c5270',
      text: '#e6dfec', white: '#e6dfec',
      danger: '#8b2635',
    },
    board: { light: '#cbb8d6', dark: '#3a3048' },
    boardTexture: 'stone',
    pieces: { white: '#ece4f0', black: '#201828' },
  },
  {
    id: 'royal-court',
    name: 'Royal Court',
    description: "Luxurious and regal, fit for a king's court.",
    light: false,
    headingFont: "'Cinzel', Georgia, serif",
    colors: {
      bg: '#1f1114', bg2: '#291720', bg3: '#331d29',
      border: '#5c4a2a',
      gold: '#c9a227', gold2: '#a8871f',
      accent: '#2e4a7a', accent2: '#3f8a5c',
      muted: '#a08a70', dim: '#6b5540',
      text: '#ece2d0', white: '#ece2d0',
      danger: '#b8323f',
    },
    board: { light: '#d8c39a', dark: '#6b2530' },
    boardTexture: 'wood',
    pieces: { white: '#f2e8d0', black: '#2a1216' },
  },
  {
    id: 'blacksmith-forge',
    name: 'Blacksmith Forge',
    description: 'Rugged, handcrafted, and built from iron and fire.',
    light: false,
    headingFont: "'Cinzel', Georgia, serif",
    colors: {
      bg: '#18140f', bg2: '#211b15', bg3: '#2a231a',
      border: '#4a3f30',
      gold: '#c9601f', gold2: '#a34d18',
      accent: '#6b6259', accent2: '#5c7050',
      muted: '#8a7a68', dim: '#5c5040',
      text: '#e0d8c8', white: '#e0d8c8',
      danger: '#8f2d1f',
    },
    board: { light: '#b89468', dark: '#4a3520' },
    boardTexture: 'wood',
    pieces: { white: '#d8cbb0', black: '#1a1510' },
  },
  {
    id: 'medieval-tavern',
    name: 'Medieval Tavern',
    description: 'Warm, welcoming, and full of character.',
    light: false,
    headingFont: "'Cinzel', Georgia, serif",
    colors: {
      // This is the original "Castle & Candlelight" theme built earlier.
      bg: '#1a1613', bg2: '#221c17', bg3: '#2b241c',
      border: '#4a3f2e',
      gold: '#d4a03c', gold2: '#b8872f',
      accent: '#5a7a94', accent2: '#5c7a4f',
      muted: '#9c8f74', dim: '#6b5f4a',
      text: '#e8dfc8', white: '#e8dfc8',
      danger: '#a13b3b',
    },
    board: { light: '#d4bc8c', dark: '#7a5232' },
    boardTexture: 'wood',
    pieces: { white: '#f2e8d0', black: '#241a12' },
  },
  {
    id: 'heraldry',
    name: 'Heraldry',
    description: 'Built around coats of arms, banners, and crests.',
    light: false,
    headingFont: "'Cinzel', Georgia, serif",
    colors: {
      bg: '#14171f', bg2: '#1c2029', bg3: '#262b36',
      border: '#4a5568',
      gold: '#c9a227', gold2: '#a8871f',
      accent: '#3159a3', accent2: '#3d6b3f',
      muted: '#8590a0', dim: '#566070',
      text: '#e4e8ee', white: '#e4e8ee',
      danger: '#a1303a',
    },
    board: { light: '#c7ccd6', dark: '#2e3648' },
    boardTexture: 'wood',
    pieces: { white: '#eef0f4', black: '#1a1e26' },
  },
  {
    id: 'monastery',
    name: 'Monastery',
    description: 'Simple, scholarly, and monastic.',
    light: true,
    headingFont: "'IM Fell English SC', Georgia, serif",
    colors: {
      bg: '#ece4d0', bg2: '#e0d6bc', bg3: '#d4c8a8',
      border: '#8a7d5e',
      gold: '#7a6a3a', gold2: '#6a5c30',
      accent: '#4a5a52', accent2: '#4a5a3a',
      muted: '#8a8068', dim: '#a89c80',
      text: '#2a2418', white: '#2a2418',
      danger: '#7a3530',
    },
    board: { light: '#ece0c4', dark: '#a89878' },
    boardTexture: 'parchment',
    pieces: { white: '#f4ecd8', black: '#3a3020' },
  },
]

export const DEFAULT_THEME_ID = 'medieval-tavern'

export const getTheme = (id) => THEMES.find(t => t.id === id) || THEMES.find(t => t.id === DEFAULT_THEME_ID)

// Resolves visualMode + the medieval theme id down to one active theme
// object. Tempo/Ply aren't in THEMES (see tempo.js/ply.js for why) — this
// used to be a `visualMode === 'tempo' ? TEMPO_THEME : getTheme(themeId)`
// ternary duplicated in AppLayout.jsx and Chessboard.jsx; extracted here
// once a third mode made that worth not copy-pasting a third time.
export const getActiveTheme = (visualMode, themeId) => {
  if (visualMode === 'tempo') return TEMPO_THEME
  if (visualMode === 'ply') return PLY_THEME
  return getTheme(themeId)
}
