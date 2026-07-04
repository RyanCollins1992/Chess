import { useAppStore } from '../../store/useAppStore'

const PAGE_TITLES = {
  'openings':       { icon: '♟', title: 'Openings' },
  'spaced-review':  { icon: '🔁', title: 'Spaced Review' },
  'progress':       { icon: '📈', title: 'My Progress' },
  'import-games':   { icon: '📥', title: 'Import Games' },
  'game-review':    { icon: '♜', title: 'Game Review' },
  'elo-roadmap':    { icon: '🗺', title: 'ELO Roadmap' },
  'favourites':     { icon: '⭐', title: 'Favourites' },
  'vs-coach':       { icon: '🤖', title: 'vs. Coach' },
  'free-play':      { icon: '♟', title: 'Free Play' },
  'puzzles':        { icon: '🧩', title: 'Puzzles' },
  'memory-drill':   { icon: '🧠', title: 'Memory Drill' },
  'opening-quiz':   { icon: '❓', title: 'Opening Quiz' },
  'mate-patterns':  { icon: '👑', title: 'Mate Patterns' },
  'endgames':       { icon: '♔', title: 'Endgame Trainer' },
  'piece-values':   { icon: '⚖️', title: 'Piece Values' },
  'rate-difficulty':{ icon: '⭐', title: 'Rate Difficulty' },
  'settings':       { icon: '⚙️', title: 'Settings' },
}

export default function Topbar({ onCoachClick }) {
  const { currentPage, toggleSidebar, progress, navigate } = useAppStore()
  const page = PAGE_TITLES[currentPage] || { icon: '♟', title: 'EloChess' }

  return (
    <header className="h-14 shrink-0 bg-[#111827] border-b border-border flex items-center px-4 gap-3 z-20">
      {/* Mobile hamburger */}
      <button
        onClick={toggleSidebar}
        className="lg:hidden text-muted hover:text-white transition-colors p-1"
        aria-label="Open menu"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Page title */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-lg">{page.icon}</span>
        <h1 className="font-bold text-white text-base truncate">{page.title}</h1>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 shrink-0">
        {/* ELO badge */}
        <div className="flex items-center gap-1.5 bg-bg3 border border-border rounded-lg px-3 py-1.5">
          <span className="text-gold font-extrabold text-sm">{progress.currentElo}</span>
          <span className="text-muted text-xs font-medium">ELO</span>
        </div>

        {/* XP */}
        <div className="hidden sm:flex items-center gap-1 text-gold">
          <span className="text-base">⚡</span>
          <span className="font-bold text-sm">{progress.xpToday}</span>
        </div>

        {/* Coach button */}
        <button
          onClick={onCoachClick}
          className="flex items-center gap-1.5 bg-gold text-bg font-bold px-3 py-1.5 rounded-lg hover:bg-gold2 transition-colors text-sm active:scale-95"
        >
          <span>+</span>
          <span>Coach</span>
        </button>

        {/* Settings */}
        <button
          onClick={() => navigate('settings')}
          className="text-muted hover:text-white transition-colors p-1.5"
          aria-label="Settings"
        >
          <span className="text-lg">⚙️</span>
        </button>
      </div>
    </header>
  )
}
