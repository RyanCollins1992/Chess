/**
 * Shared move-list component — a ruled, numbered White|Black ledger, the
 * same shape a paper tournament scoresheet already has. Extracted from the
 * near-identical markup that used to be duplicated in FreePlayPage.jsx and
 * VsCoachPage.jsx (see Tempo design-brief conversation, 2026-07-07).
 *
 * Theme-reactive through the existing --color-* tokens (works in both the
 * 8 medieval themes and Tempo mode) — not gated by visualMode itself.
 */
export default function MoveLedger({ moveList, className = '' }) {
  if (!moveList || moveList.length === 0) {
    return <div className="text-xs text-muted italic">No moves yet</div>
  }

  const rows = Math.ceil(moveList.length / 2)
  const lastIdx = moveList.length - 1

  return (
    <div className={`font-mono text-xs border border-border rounded-lg overflow-hidden ${className}`}>
      {Array.from({ length: rows }, (_, i) => {
        const wIdx = i * 2
        const bIdx = i * 2 + 1
        return (
          <div
            key={i}
            className={`flex gap-2 px-3 py-1.5 border-b border-border last:border-b-0 ${i % 2 === 1 ? 'bg-bg3/40' : ''}`}
          >
            <span className="text-muted w-5 tabular-nums">{i + 1}.</span>
            <span className={`flex-1 tabular-nums ${wIdx === lastIdx ? 'text-gold font-bold' : 'text-white'}`}>
              {moveList[wIdx] || ''}
            </span>
            <span className={`flex-1 tabular-nums ${bIdx === lastIdx ? 'text-gold font-bold' : 'text-muted'}`}>
              {moveList[bIdx] || ''}
            </span>
          </div>
        )
      })}
    </div>
  )
}
