/**
 * Piece style registry — metadata for the switchable piece styles offered in
 * Settings. The actual rendering (which piece artwork/wrapper to use) lives
 * in src/components/ui/Chessboard.jsx; this file just describes the options
 * for the picker UI, mirroring the pattern in src/styles/themes.js.
 */

export const PIECE_STYLES = [
  { id: 'fantasy', name: 'Fantasy', description: 'Ornate ivory/ebony carved-line artwork.' },
  { id: 'heraldic', name: 'Heraldic', description: 'Illustrated crests — crowned royalty, a castle-turret rook.' },
  { id: 'medallion', name: 'Medallion', description: 'The Heraldic set in gold and pewter coin badges.' },
]

export const DEFAULT_PIECE_STYLE_ID = 'fantasy'
