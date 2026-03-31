import { LayoutDashboard, Database, Lightbulb, GitFork, CalendarDays, PanelLeftClose, PanelLeftOpen, Sun, Moon } from 'lucide-react'
import type { NavItem, PageId } from '@/types'

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard',             iconName: 'LayoutDashboard' },
  { id: 'data',      label: 'Data Management',       iconName: 'Database'        },
  { id: 'engine',    label: 'Recommendation Engine', iconName: 'Lightbulb'       },
  { id: 'graph',     label: 'Prerequisite Graph',    iconName: 'GitFork'         },
  { id: 'scheduler', label: 'Scheduler',             iconName: 'CalendarDays'    },
]

const IconMap: Record<string, React.ElementType> = {
  LayoutDashboard,
  Database,
  Lightbulb,
  GitFork,
  CalendarDays,
}

interface SidebarProps {
  currentPage:      PageId
  onNavigate:       (page: PageId) => void
  collapsed:        boolean
  onToggleCollapse: () => void
  theme:            'light' | 'dark'
  onToggleTheme:    () => void
}

export function Sidebar({ 
  currentPage, 
  onNavigate, 
  collapsed, 
  onToggleCollapse,
  theme,
  onToggleTheme 
}: SidebarProps) {
  // True width = fully open permanently
  const isOpen = !collapsed

  return (
    <aside
      className={`relative flex-none bg-sidebar border-r border-premium flex flex-col ${
        isOpen ? 'w-60' : 'w-18'
      }`}
    >
      {/* Brand */}
      <div
        className={`flex items-center gap-3 ${
          isOpen ? 'px-6 py-8' : 'px-0 py-8 justify-center'
        }`}
      >
        {isOpen && (
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-main font-display tracking-tight leading-tight">
              Course Offering Recommendation System
            </p>
          </div>
        )}
      </div>

      {/* Collapse toggle button — floats on the right edge */}
      <button
        onClick={onToggleCollapse}
        className="absolute -right-3 top-8 z-20 w-6 h-6 bg-surface border border-premium rounded-full flex items-center justify-center shadow-md hover:bg-[var(--brand-primary)] hover:border-[var(--brand-primary)] text-muted hover:text-white  group"
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed
          ? <PanelLeftOpen  className="w-3 h-3" />
          : <PanelLeftClose className="w-3 h-3" />
        }
      </button>

      {/* Nav */}
      <nav
        className={`flex-1 py-6 space-y-1 overflow-y-auto overflow-x-hidden ${
          isOpen ? 'px-4' : 'px-3'
        }`}
      >
        {isOpen && (
          <p className="text-[9px] font-black text-muted uppercase tracking-[0.25em] px-3 mb-3 select-none">
            Main Menu
          </p>
        )}
        {NAV_ITEMS.map((item) => {
          const Icon   = IconMap[item.iconName]
          const active = currentPage === item.id
          return (
            <button
              key={item.id}
              onClick={() => { onNavigate(item.id) }}
              title={!isOpen ? item.label : undefined}
              className={`w-full flex items-center gap-2.5 rounded-lg text-xs font-bold transition-all ${
                isOpen ? 'px-3 py-2.5' : 'px-0 py-2.5 justify-center'
              } ${
                active
                  ? 'bg-[var(--brand-primary)] text-white shadow-lg shadow-indigo-900/20'
                  : 'text-muted hover:text-[var(--brand-primary)] hover:bg-[var(--brand-faded)]'
              }`}
            >
              <Icon className={`w-[18px] h-[18px] flex-none ${active ? 'text-white' : 'text-muted group-hover:text-main'}`} />
              {isOpen && <span className="truncate">{item.label}</span>}
            </button>
          )
        })}
      </nav>

      {/* Footer / Theme Toggle */}
      <div
        className={`mt-auto flex flex-col gap-4 ${
          isOpen ? 'p-6' : 'p-4 items-center'
        }`}
      >
        <button
          onClick={onToggleTheme}
          className={`flex items-center gap-3 w-full rounded-lg text-xs font-bold uppercase tracking-widest   ${
            isOpen ? 'px-3 py-3' : 'px-0 py-3 justify-center'
          } bg-main border border-premium text-muted hover:text-main hover:bg-surface`}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? (
            <>
              <Moon className="w-[18px] h-[18px]" />
              {isOpen && <span>Dark Mode</span>}
            </>
          ) : (
            <>
              <Sun className="w-[18px] h-[18px]" />
              {isOpen && <span>Light Mode</span>}
            </>
          )}
        </button>

        <div className={`flex items-center gap-3 ${isOpen ? 'px-1' : ''}`}>
          <div className="w-8 h-8 rounded-full bg-main flex items-center justify-center text-[10px] font-bold text-main border border-premium flex-none capitalize">
            R
          </div>
          {isOpen && (
            <div className="min-w-0">
              <p className="text-xs font-semibold text-main truncate">Office of Registrar</p>
              <p className="text-[10px] text-muted font-medium tracking-wide">University System</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}

