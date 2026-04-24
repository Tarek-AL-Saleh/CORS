import { useEffect, useState } from 'react'
import {
  Users,
  AlertTriangle,
  BrainCircuit,
  BookOpen,
  ArrowRight,
  Sparkles
} from 'lucide-react'
import { api } from '@/services/api'
import { KPICard } from '@/components/ui/KPICard'
import type { PageId } from '@/types'

export function Dashboard({ onNavigate }: { onNavigate?: (p: PageId) => void }) {
  const [metrics, setMetrics] = useState<any>(null)
  
  useEffect(() => {
    api.dash.getMetrics()
      .then(data => setMetrics(data))
      .catch(err => console.error("Could not load metrics", err))
  }, [])

  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[var(--brand-primary)] border-t-transparent rounded-full animate-spin" />
          <p className="text-muted font-bold uppercase tracking-widest text-[10px]">Synchronizing Institutional Data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-8 animate-fade-in relative z-10 pb-20 max-w-[1600px] mx-auto">
      {/* Main Header */}
      <div className="flex justify-between items-end pb-8 pl-1 transition-all">
        <div>
          <h1 className="text-3xl font-display font-bold text-main tracking-tight leading-tight">Course Offering <br /> Recommendation System</h1>
          <p className="text-secondary text-[10px] mt-4 font-black uppercase tracking-[0.25em] opacity-90 border-t border-premium pt-4 inline-block">Strategic Academic Capacity & Predictive modeling</p>
        </div>
        <div className="flex items-center gap-3 text-[9px] font-black text-muted uppercase tracking-[0.25em] bg-surface px-5 py-2.5 rounded-full border border-premium shadow-lg shadow-black/5 ring-1 ring-black/5">
          <span className="w-2 rounded-full bg-[var(--status-success)] shadow-[0_0_12px_rgba(16,185,129,0.5)] animate-pulse" />
          System Operational
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Course Catalog"
          value={metrics.total_courses}
          trend="Active"
          icon={<BookOpen />}
          description="Total validated courses in the current academic year registry."
        />
        <KPICard
          title="Historical Data"
          value={metrics.total_offerings}
          trend="Sync"
          icon={<Users />}
          description="Total processed enrollment records across all departments."
        />
        <KPICard
          title="Model ROC-AUC"
          value={metrics.latest_run_id ? `${metrics.average_model_confidence.toFixed(1)}%` : "N/A"}
          trend={metrics.latest_run_id ? "Global" : "Pending"}
          icon={<BrainCircuit />}
          description={metrics.latest_run_id ? `Area Under ROC Curve indicating the model's structural discrimination power.` : 'Awaiting first analysis run.'}
        />
        <KPICard
          title="Average Failure Rate"
          value={`${metrics.average_fail_ratio.toFixed(1)}%`}
          trend="-0.5%"
          icon={<AlertTriangle />}
          trendUp={false}
          description="Historical percentage of failing grades across all recorded course offerings."
        />
      </div>

      {/* Action Banner */}
      <div className="bg-[linear-gradient(135deg,#312e81_0%,#4338ca_50%,#1e1b4b_100%)] rounded-2xl p-8 sm:p-12 text-white shadow-2xl relative overflow-hidden ring-1 ring-white/10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600/5 rounded-full blur-[80px] -ml-20 -mb-20" />
        
        <div className="relative z-20 flex flex-col lg:flex-row gap-8 items-start lg:items-center justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-white/15 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-[0.2em] mb-6 border border-white/20 text-indigo-100">
              <Sparkles className="w-3 h-3" /> Machine Learning Engine
            </div>
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-white leading-[1.1] mb-5">
              Predictive Academic Planning <br /> for the Next Semester
            </h2>
            <p className="text-indigo-100/80 font-medium leading-relaxed max-w-xl text-sm italic">
              "Utilizing historical failure rates and student migration patterns to generate optimized course offerings with AI-driven confidence."
            </p>
          </div>
          <button 
            onClick={() => onNavigate?.('engine')}
            className="flex-none bg-white text-indigo-700 px-6 py-3 rounded-lg font-bold text-xs shadow-xl shadow-black/40 hover:bg-indigo-50 hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2 group"
          >
            Initiate Recommendation 
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </div>
  )
}

