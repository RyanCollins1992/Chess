/**
 * Piece style registry — metadata for the switchable piece styles offered in
 * Settings. The actual rendering (which piece artwork/wrapper to use) lives
 * in src/components/ui/Chessboard.jsx; this file just describes the options
 * for the picker UI.
 */

export const PIECE_STYLES = [
  { id: 'classic', name: 'Classic', description: 'Plain glyphs — KnightPath’s default look.' },
  { id: 'solid', name: 'Solid', description: 'Flat, filled silhouettes — no outline on white.' },
  { id: 'fantasy', name: 'Fantasy', description: 'Ornate ivory/ebony carved-line artwork.' },
  { id: 'gothic', name: 'Gothic', description: 'Bold cream-ivory vs. gold-trimmed ebony silhouettes.' },
  { id: 'byzantine', name: 'Byzantine', description: 'Marble-and-gold Byzantines vs. granite-and-steel Crusaders.' },
]

export const DEFAULT_PIECE_STYLE_ID = 'classic'
