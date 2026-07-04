# Graph Report - .  (2026-06-17)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 335 nodes · 579 edges · 17 communities (11 shown, 6 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c8e9dc83`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Chess Board UI Pages|Chess Board UI Pages]]
- [[_COMMUNITY_App Structure & Docs|App Structure & Docs]]
- [[_COMMUNITY_Openings & Traps Data|Openings & Traps Data]]
- [[_COMMUNITY_App Layout & Navigation|App Layout & Navigation]]
- [[_COMMUNITY_Chess Engine Core|Chess Engine Core]]
- [[_COMMUNITY_Project Dependencies|Project Dependencies]]
- [[_COMMUNITY_Progress & XP Tracking|Progress & XP Tracking]]
- [[_COMMUNITY_AI Coach Assistant|AI Coach Assistant]]
- [[_COMMUNITY_Dev Tooling Dependencies|Dev Tooling Dependencies]]
- [[_COMMUNITY_Spaced Repetition Engine|Spaced Repetition Engine]]
- [[_COMMUNITY_Review Engine|Review Engine]]
- [[_COMMUNITY_Game Import Page|Game Import Page]]
- [[_COMMUNITY_Trap Generation Script|Trap Generation Script]]
- [[_COMMUNITY_Icon Assets|Icon Assets]]

## God Nodes (most connected - your core abstractions)
1. `useAppStore` - 51 edges
2. `ProgressManager` - 36 edges
3. `ChessEngine` - 28 edges
4. `React` - 25 edges
5. `src/pages/` - 19 edges
6. `EloChess` - 16 edges
7. `SpacedRepetitionEngine` - 14 edges
8. `BaseManager` - 13 edges
9. `Chessboard()` - 12 edges
10. `AICoach` - 11 edges

## Surprising Connections (you probably didn't know these)
- `EndgameBoard()` --calls--> `useAppStore`  [EXTRACTED]
  elochess/src/pages/EndgamesPage.jsx → elochess/src/store/useAppStore.js
- `LearnOpeningsPage()` --calls--> `useAppStore`  [EXTRACTED]
  elochess/src/pages/LearnOpeningsPage.jsx → elochess/src/store/useAppStore.js
- `PatternViewer()` --calls--> `useAppStore`  [EXTRACTED]
  elochess/src/pages/MatePatternsPage.jsx → elochess/src/store/useAppStore.js
- `TrapStudy()` --calls--> `useAppStore`  [EXTRACTED]
  elochess/src/pages/OpeningsPage.jsx → elochess/src/store/useAppStore.js
- `PuzzleBoard()` --calls--> `useAppStore`  [EXTRACTED]
  elochess/src/pages/PuzzlesPage.jsx → elochess/src/store/useAppStore.js

## Import Cycles
- None detected.

## Communities (17 total, 6 thin omitted)

### Community 0 - "Chess Board UI Pages"
Cohesion: 0.06
Nodes (34): EloRoadmapPage(), ROADMAP, EndgameBoard(), EndgamesPage(), SCENARIOS, FreePlayPage(), LearnOpeningsPage(), LEVEL_COLORS (+26 more)

### Community 1 - "App Structure & Docs"
Cohesion: 0.05
Nodes (50): src/App.jsx, src/assets/, Capacitor, capacitor.config.json, Checkmate Patterns, Common Chess Terms, Chess.com public API, chess.js (+42 more)

### Community 2 - "Openings & Traps Data"
Cohesion: 0.09
Nodes (12): srsEngine, OPENING_REPERTOIRE, TRAPS, NAV, FavouritesPage(), useFavourites(), OpeningsPage(), TrapStudy() (+4 more)

### Community 3 - "App Layout & Navigation"
Cohesion: 0.08
Nodes (19): getTrapById(), AppLayout(), Sidebar(), PAGE_TITLES, Topbar(), CLASSIFICATIONS, FenImport(), GameReviewPage() (+11 more)

### Community 5 - "Project Dependencies"
Cohesion: 0.08
Nodes (25): dependencies, @capacitor/android, @capacitor/cli, @capacitor/core, @capacitor/ios, chess.js, react, react-chessboard (+17 more)

### Community 7 - "AI Coach Assistant"
Cohesion: 0.10
Nodes (3): AICoach, CHESS_KNOWLEDGE, BaseManager

### Community 8 - "Dev Tooling Dependencies"
Cohesion: 0.12
Nodes (14): devDependencies, autoprefixer, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, postcss (+6 more)

### Community 11 - "Game Import Page"
Cohesion: 0.40
Nodes (4): formatTimeControl(), ImportGamesPage(), MONTHS, parseGame()

## Knowledge Gaps
- **71 isolated node(s):** `traps`, `name`, `private`, `version`, `type` (+66 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `React` connect `Chess Board UI Pages` to `App Structure & Docs`, `Openings & Traps Data`, `App Layout & Navigation`, `Project Dependencies`, `Dev Tooling Dependencies`, `Game Import Page`?**
  _High betweenness centrality (0.380) - this node is a cross-community bridge._
- **Why does `EloChess` connect `App Structure & Docs` to `Chess Board UI Pages`, `Dev Tooling Dependencies`, `Project Dependencies`?**
  _High betweenness centrality (0.254) - this node is a cross-community bridge._
- **Why does `ChessEngine` connect `Chess Engine Core` to `App Layout & Navigation`?**
  _High betweenness centrality (0.147) - this node is a cross-community bridge._
- **What connects `traps`, `name`, `private` to the rest of the system?**
  _71 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Chess Board UI Pages` be split into smaller, more focused modules?**
  _Cohesion score 0.05779220779220779 - nodes in this community are weakly interconnected._
- **Should `App Structure & Docs` be split into smaller, more focused modules?**
  _Cohesion score 0.05241090146750524 - nodes in this community are weakly interconnected._
- **Should `Openings & Traps Data` be split into smaller, more focused modules?**
  _Cohesion score 0.09268292682926829 - nodes in this community are weakly interconnected._