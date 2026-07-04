# Testing Agent Memory — EloChess

- [Routing/orphaned routes](elochess_routing.md) — routes in App.jsx's PAGES map can have zero nav entry point; always cross-check Sidebar NAV membership.
- [vs-Coach Stockfish fallback gap](elochess_vscoach_stockfish.md) — Black-AI-moves-first hang fixed w/ 5s timeout; Playwright can't route Worker requests, use window.Worker override to test the timer path specifically.
- [Rate Difficulty rated-count overcounts](elochess_rating_counts.md) — toggling a star off sets rating to 0 instead of deleting the key.
- [SM-2 quality scale mismatch](elochess_sm2_quality_scale.md) — "Hard" (quality=1) button is scheduled identically to a full failure (quality=0).
- [Lint baseline scope claims unreliable](elochess_lint_baseline_scope.md) — a "pre-existing errors confined to file list X" claim had right total count but wrong file scope; always verify per-file with eslint.
