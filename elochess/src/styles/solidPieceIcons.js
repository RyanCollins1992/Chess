/**
 * Hand-built flat/solid chess piece silhouettes for the "Solid" piece style
 * — original vector artwork (not derived from any existing piece set or
 * font). One shared shape per piece type across both colors, matching how
 * every real chess set works (shape signals piece type, color signals
 * side) — Chessboard.jsx applies the white/black fill+stroke treatment.
 *
 * Each entry is a list of simple primitive shapes (circle/rect/polygon/path)
 * in a shared 0-100 viewBox, all sitting on the same base plinth
 * (BASE_SHAPE) for a consistent silhouette height across piece types.
 */
export const BASE_SHAPE = { tag: 'rect', x: 22, y: 78, width: 56, height: 10, rx: 4 }

export const SOLID_PIECE_SHAPES = {
  P: [
    { tag: 'circle', cx: 50, cy: 26, r: 12 },
    { tag: 'polygon', points: '40,38 60,38 70,76 30,76' },
    BASE_SHAPE,
  ],
  R: [
    { tag: 'rect', x: 24, y: 14, width: 12, height: 16 },
    { tag: 'rect', x: 44, y: 14, width: 12, height: 16 },
    { tag: 'rect', x: 64, y: 14, width: 12, height: 16 },
    { tag: 'rect', x: 26, y: 30, width: 48, height: 46 },
    BASE_SHAPE,
  ],
  N: [
    { tag: 'polygon', points: '22,52 26,38 34,20 40,14 44,22 58,18 72,30 76,40 70,50 74,60 74,76 26,76 28,62' },
    BASE_SHAPE,
  ],
  B: [
    { tag: 'circle', cx: 50, cy: 15, r: 6 },
    {
      tag: 'path',
      d: 'M50,25 C40,25 34,35 36,47 C37,57 42,64 42,64 L37,72 C35,75 37,78 41,78 L59,78 C63,78 65,75 63,72 L58,64 C58,64 63,57 64,47 C66,35 60,25 50,25 Z',
    },
    BASE_SHAPE,
  ],
  Q: [
    { tag: 'circle', cx: 30, cy: 24, r: 5 },
    { tag: 'circle', cx: 40, cy: 18, r: 5 },
    { tag: 'circle', cx: 50, cy: 12, r: 5 },
    { tag: 'circle', cx: 60, cy: 18, r: 5 },
    { tag: 'circle', cx: 70, cy: 24, r: 5 },
    {
      tag: 'path',
      d: 'M50,32 C39,32 31,43 33,55 C34,64 40,71 40,71 L34,76 C31,78 33,80 37,80 L63,80 C67,80 69,78 66,76 L60,71 C60,71 66,64 67,55 C69,43 61,32 50,32 Z',
    },
    BASE_SHAPE,
  ],
  K: [
    { tag: 'rect', x: 47, y: 8, width: 6, height: 14 },
    { tag: 'rect', x: 41, y: 13, width: 18, height: 6 },
    { tag: 'circle', cx: 50, cy: 28, r: 6 },
    {
      tag: 'path',
      d: 'M50,36 C40,36 33,46 35,57 C36,65 41,71 41,71 L36,76 C33,78 35,80 39,80 L61,80 C65,80 67,78 64,76 L59,71 C59,71 64,65 65,57 C67,46 60,36 50,36 Z',
    },
    BASE_SHAPE,
  ],
}
