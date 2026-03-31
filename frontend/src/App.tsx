import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { Dashboard } from '@/pages/Dashboard'
import { DataManagement } from '@/pages/DataManagement'
import { RecommendationEngine } from '@/pages/RecommendationEngine'
import { PrerequisiteGraph } from '@/pages/PrerequisiteGraph'
import { Scheduler } from '@/pages/Scheduler'
import { useNavigation } from '@/hooks/useNavigation'
import type { PageId } from '@/types'

const PAGE_MAP: (navigate: (p: PageId) => void) => Record<PageId, React.ReactElement> = (navigate) => ({
  dashboard: <Dashboard onNavigate={navigate} />,
  data:      <DataManagement />,
  engine:    <RecommendationEngine />,
  graph:     <PrerequisiteGraph />,
  scheduler: <Scheduler />,
})

export default function App() {
  const { currentPage, navigate } = useNavigation('dashboard')
  const [collapsed, setCollapsed] = useState(false)
  
  // Theme logic
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 
           (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  })

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light')

  // Scheduler manages its own internal scroll
  const isScheduler = currentPage === 'scheduler'

  return (
    <div className="flex h-screen bg-main overflow-hidden font-body">
      <Sidebar
        currentPage={currentPage}
        onNavigate={navigate}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(c => !c)}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      <main className={`flex-1 ${isScheduler ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        {PAGE_MAP(navigate)[currentPage]}
      </main>
    </div>
  )
}

