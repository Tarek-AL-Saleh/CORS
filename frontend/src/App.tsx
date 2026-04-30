import { useState, useEffect } from 'react'
import { api } from '@/services/api'
import { Sidebar } from '@/components/layout/Sidebar'
import { Dashboard } from '@/pages/Dashboard'
import { DataManagement } from '@/pages/DataManagement'
import { RecommendationEngine } from '@/pages/RecommendationEngine'
import { PrerequisiteGraph } from '@/pages/PrerequisiteGraph'
import { Scheduler } from '@/pages/Scheduler'
import { UsersManagement } from '@/pages/UsersManagement'
import { UserSettings } from '@/pages/UserSettings'
import { ActionLogs } from '@/pages/ActionLogs'
import { LoginPage } from '@/pages/LoginPage'
import { useNavigation } from '@/hooks/useNavigation'
import type { PageId } from '@/types'

const PAGE_MAP: (navigate: (p: PageId) => void) => Record<PageId, React.ReactElement> = (navigate) => ({
  dashboard: <Dashboard onNavigate={navigate} />,
  data:      <DataManagement />,
  engine:    <RecommendationEngine />,
  graph:     <PrerequisiteGraph />,
  scheduler: <Scheduler />,
  users:     <UsersManagement />,
  settings:  <UserSettings />,
  logs:      <ActionLogs />,
})

export default function App() {
  const { currentPage, navigate } = useNavigation('dashboard')
  const [collapsed, setCollapsed] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null) // null = loading
  const [isAdmin, setIsAdmin] = useState(false)
  
  // Theme logic
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 
           (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  })

  // Quick rudimentary check assuming local dev for now without full me endpoint:
  // In a real app we'd call `/auth/me` to read the httpOnly cookie.
  // For basic UX demonstration we'll allow entering if they have a non-empty user state
  useEffect(() => {
    const syncSession = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) throw new Error("No token"); // Fast fail if no token

        const user = await api.auth.getMe()
        localStorage.setItem('auth_user', user.username)
        if (user.is_admin) {
          localStorage.setItem('auth_admin', 'true')
          setIsAdmin(true)
        } else {
          localStorage.removeItem('auth_admin')
          setIsAdmin(false)
        }
        setIsAuthenticated(true)
      } catch (e) {
        // If /me fails, clear and prompt login
        localStorage.removeItem('auth_user')
        localStorage.removeItem('auth_admin')
        localStorage.removeItem('access_token')
        setIsAdmin(false)
        setIsAuthenticated(false)
      }
    }
    syncSession()
  }, [])

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light')

  const handleLoginSuccess = (username: string, is_admin?: boolean) => {
    localStorage.setItem('auth_user', username)
    if (is_admin) {
      localStorage.setItem('auth_admin', 'true')
      setIsAdmin(true)
    } else {
      localStorage.removeItem('auth_admin')
      setIsAdmin(false)
    }
    setIsAuthenticated(true)
  }

  const handleLogout = async () => {
    try {
      await api.auth.logout()
    } catch (e) {
      console.error(e)
    } finally {
      localStorage.removeItem('auth_user')
      localStorage.removeItem('auth_admin')
      localStorage.removeItem('access_token')
      setIsAuthenticated(false)
      window.location.reload()
    }
  }

  // Scheduler manages its own internal scroll
  const isScheduler = currentPage === 'scheduler'

  if (isAuthenticated === null) {
    return <div className="h-screen flex items-center justify-center bg-main text-main font-bold">Loading...</div>
  }

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />
  }

  return (
    <div className="flex h-screen bg-main overflow-hidden font-body">
      <Sidebar
        currentPage={currentPage}
        onNavigate={navigate}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(c => !c)}
        theme={theme}
        onToggleTheme={toggleTheme}
        onLogout={handleLogout}
        isAdmin={isAdmin}
      />
      <main className={`flex-1 ${isScheduler ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        {PAGE_MAP(navigate)[currentPage]}
      </main>
    </div>
  )
}

