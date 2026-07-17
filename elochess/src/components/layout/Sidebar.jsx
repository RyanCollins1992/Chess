import { useAppStore } from '../../store/useAppStore'
import { NAV } from '../../data/navigation'
import { Crown, Flame, Zap } from 'lucide-react'
import { KNIGHTPATH_NAV_ICONS } from '../../styles/knightpathIcons'

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

      {/* Sidebar — dark navy against a cream content area (a two-tone
          layout), so it reads --color-sidebar-bg/-border/-text/-muted
          instead of the shared bg2/border/white/muted the content area
          uses — see styles/knightpath.js. */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-56 z-40 flex flex-col
          transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:relative lg:z-auto
        `}
        style={{ backgroundColor: 'var(--color-sidebar-bg)', borderRight: '1px solid var(--color-sidebar-border)' }}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-2 px-4 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--color-sidebar-border)' }}
        >
          <div className="w-7 h-7 rounded flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--color-accent)' }}>
            <Crown size={13} className="text-white" />
          </div>
          <div>
            <div className="font-heading font-bold text-base leading-none tracking-wide" style={{ color: 'var(--color-sidebar-text)' }}>
              EloChess
            </div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--color-sidebar-muted)' }}>
              {progress.totalDrills} drills · {dueCount} due
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2 px-2">
          {NAV.map((item, i) =>
            item.section ? (
              <div
                key={i}
                className="text-[10px] font-bold uppercase tracking-widest px-3 pt-4 pb-1"
                style={{ color: 'var(--color-sidebar-muted)' }}
              >
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
        <div
          className="shrink-0 px-4 py-3 flex items-center justify-between"
          style={{ borderTop: '1px solid var(--color-sidebar-border)' }}
        >
          <div className="flex items-center gap-1.5">
            <Flame size={16} className="text-orange-400" />
            <div>
              <div className="text-gold font-extrabold text-sm leading-none">{progress.streak}</div>
              <div className="text-[10px]" style={{ color: 'var(--color-sidebar-muted)' }}>day streak</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap size={16} className="text-accent2" />
            <div className="text-right">
              <div className="text-accent2 font-extrabold text-sm leading-none">{progress.xpToday}</div>
              <div className="text-[10px]" style={{ color: 'var(--color-sidebar-muted)' }}>XP today</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}

function NavItem({ item, active, dueCount, onClick }) {
  const Icon = KNIGHTPATH_NAV_ICONS[item.id]

  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium
        transition-colors text-left mb-0.5 cursor-pointer
        ${active ? 'bg-accent/15 text-accent2 border-l-2 border-accent2 pl-2.5' : 'hover:bg-white/5'}
      `}
      style={!active ? { color: 'var(--color-sidebar-muted)' } : undefined}
    >
      <span className="w-5 shrink-0 flex items-center justify-center">{Icon && <Icon size={14} />}</span>
      <span className="flex-1 truncate">{item.label}</span>
      {dueCount > 0 && (
        <span className="bg-gold text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
          {dueCount}
        </span>
      )}
    </button>
  )
}
