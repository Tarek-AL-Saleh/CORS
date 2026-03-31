import React from 'react'

interface KPICardProps {
  title: string
  value: string | number
  trend?: string
  icon: React.ReactNode
  trendUp?: boolean
  description: string
  gradient?: string
  iconColor?: string
  iconBg?: string
  className?: string
}

export function KPICard({
  title,
  value,
  trend,
  icon,
  trendUp = true,
  description,
  className = ''
}: KPICardProps) {
  return (
    <div
      className={`bg-surface ${className} rounded-lg p-5 border border-premium shadow-sm hover:shadow-md transition-all group relative overflow-hidden`}
    >
      <div className="flex items-start justify-between relative z-10">
        <div className="bg-[var(--brand-faded)] text-[var(--brand-primary)] p-2.5 rounded-lg border border-[var(--brand-primary)]/10 group-hover:border-[var(--brand-primary)] ">
          {React.cloneElement(icon as React.ReactElement, { className: 'w-5 h-5' })}
        </div>
        {trend && (
          <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase flex items-center gap-1 ${
            trendUp 
              ? 'bg-[var(--status-success)]/10 text-[var(--status-success)] border border-[var(--status-success)]/20' 
              : 'bg-[var(--status-error)]/10 text-[var(--status-error)] border border-[var(--status-error)]/20'
          }`}>
            {trend}
          </div>
        )}
      </div>
      
      <div className="mt-4 relative z-10">
        <h3 className="text-muted text-[10px] font-black uppercase tracking-[0.2em]">{title}</h3>
        <p className="text-2xl font-display font-bold text-main mt-1 flex items-baseline gap-1">
          {value}
        </p>
        <p className="text-muted text-xs mt-2 font-medium leading-relaxed">
          {description}
        </p>
      </div>

      {/* Subtle accent line on hover */}
      <div className="absolute top-0 right-0 w-1 h-0 bg-indigo-600   group-hover:h-full opacity-0 group-hover:opacity-100" />
    </div>
  )
}

