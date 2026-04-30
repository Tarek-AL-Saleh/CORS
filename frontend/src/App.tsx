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
  
  // Theme logic
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 
           (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  })

  // Quick rudimentary check assuming local dev for now without full me endpoint:
  // In a real app we'd call `/auth/me` to read the httpOnly cookie.
  // For basic UX demonstration we'll allow entering if they have a non-empty user state
  useEffect(() => {
    // If we wanted to check the cookie, we'd hit a backend endpoint /auth/me here
    // For now, if the user reloads we just assume they need to login again unless we check an endpoint or localStorage.
    // Let's use localStorage to persist the active username session status.
    const savedUser = localStorage.getItem('auth_user')
    if (savedUser) {
      setIsAuthenticated(true)
    } else {
      setIsAuthenticated(false)
    }
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

  const handleLoginSuccess = (username: string, isAdmin?: boolean) => {
    localStorage.setItem('auth_user', username)
    if (isAdmin) localStorage.setItem('auth_admin', 'true')
    else localStorage.removeItem('auth_admin')
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
      />
      <main className={`flex-1 ${isScheduler ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        {PAGE_MAP(navigate)[currentPage]}
      </main>
    </div>
  )
}

