import { useAppStore } from '../../store/useAppStore'
import { NAV } from '../../data/navigation'

// Icons are plain-text Unicode symbols (not color emoji) so they inherit the
// active theme's colors like any other text — color emoji (🔁📈🤖 etc, the
// original icons here) are rendered by the OS's color-emoji font and cannot
// be recolored by CSS in any theme, which is why they were replaced.

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
        bg-bg2 border-r border-border
        transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:relative lg:z-auto
      `}>
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 py-4 border-b border-border shrink-0">
          <span className="text-2xl">♞</span>
          <div>
            <div className="font-heading font-bold text-white text-base leading-none tracking-wide">EloChess</div>
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
            <span className="text-lg">☼</span>
            <div>
              <div className="text-gold font-extrabold text-sm leading-none">{progress.streak}</div>
              <div className="text-muted text-[10px]">day streak</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-lg">✵</span>
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
          : 'text-muted hover:bg-bg3 hover:text-white'
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
