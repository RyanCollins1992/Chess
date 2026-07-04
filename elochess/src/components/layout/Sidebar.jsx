import { useAppStore } from '../../store/useAppStore'
import { useOpeningsStore } from '../../store/useOpeningsStore'
import { srsEngine } from '../../core/SpacedRepetitionEngine'

const NAV = [
  { section: 'START HERE' },
  { id: 'openings',      label: 'Openings',       icon: '♟',  },
  { id: 'spaced-review', label: 'Spaced Review',  icon: '🔁', badge: true },
  { id: 'progress',      label: 'My Progress',    icon: '📈', },

  { section: 'MY GAMES' },
  { id: 'import-games',  label: 'Import Games',   icon: '📥', },
  { id: 'game-review',   label: 'Game Review',    icon: '♜', },

  { section: 'LEARN' },
  { id: 'elo-roadmap',   label: 'ELO Roadmap',   icon: '🗺', },
  { id: 'learn-openings',label: 'Learn Openings', icon: '📖', },
  { id: 'favourites',    label: 'Favourites',     icon: '⭐', },

  { section: 'PLAY' },
  { id: 'vs-coach',      label: 'vs. Coach',      icon: '🤖', },
  { id: 'free-play',     label: 'Free Play',      icon: '♟', },

  { section: 'TRAIN' },
  { id: 'puzzles',       label: 'Puzzles',        icon: '🧩', },
  { id: 'memory-drill',  label: 'Memory Drill',   icon: '🧠', },
  { id: 'opening-quiz',  label: 'Opening Quiz',   icon: '❓', },
  { id: 'mate-patterns', label: 'Mate Patterns',  icon: '👑', },
  { id: 'endgames',      label: 'Endgames',       icon: '♔', },
  { id: 'piece-values',  label: 'Piece Values',   icon: '⚖️', },
  { id: 'rate-difficulty',label:'Rate Difficulty', icon: '⭐', },
]

export default function Sidebar() {
  const { currentPage, navigate, sidebarOpen, closeSidebar, progress, dueCount } = useAppStore()

  return (
    <>
      {/* Backdrop (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full w-56 z-40 flex flex-col
        bg-[#111827] border-r border-border
        transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:relative lg:z-auto
      `}>
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 py-4 border-b border-border shrink-0">
          <span className="text-2xl">♞</span>
          <div>
            <div className="font-extrabold text-white text-base leading-none">EloChess</div>
            <div className="text-muted text-xs mt-0.5">{progress.totalDrills} drills · {dueCount} due</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2 px-2">
          {NAV.map((item, i) =>
            item.section ? (
              <div key={i} className="text-[10px] font-bold text-muted uppercase tracking-widest px-3 pt-4 pb-1">
                {item.section}
              </div>
            ) : (
              <NavItem
                key={item.id}
                item={item}
                active={currentPage === item.id}
                dueCount={item.badge ? dueCount : 0}
                onClick={() => navigate(item.id)}
              />
            )
          )}
        </nav>

        {/* Footer — streak + XP */}
        <div className="shrink-0 border-t border-border px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-lg">🔥</span>
            <div>
              <div className="text-gold font-extrabold text-sm leading-none">{progress.streak}</div>
              <div className="text-muted text-[10px]">day streak</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-lg">⚡</span>
            <div className="text-right">
              <div className="text-accent2 font-extrabold text-sm leading-none">{progress.xpToday}</div>
              <div className="text-muted text-[10px]">XP today</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}

function NavItem({ item, active, dueCount, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium
        transition-colors text-left mb-0.5 cursor-pointer
        ${active
          ? 'bg-gold/15 text-gold border-l-2 border-gold pl-2.5'
          : 'text-[#9CA3AF] hover:bg-bg3 hover:text-white'
        }
      `}
    >
      <span className="text-base w-5 text-center shrink-0">{item.icon}</span>
      <span className="flex-1 truncate">{item.label}</span>
      {dueCount > 0 && (
        <span className="bg-gold text-bg text-[10px] font-extrabold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
          {dueCount}
        </span>
      )}
    </button>
  )
}
