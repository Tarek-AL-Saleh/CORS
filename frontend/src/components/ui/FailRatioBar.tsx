interface FailRatioBarProps {
  ratio: number
}

export function FailRatioBar({ ratio }: FailRatioBarProps) {
  const pct = Math.min(ratio * 100, 100)
  
  // Use CSS variables for status colors
  const color = 
    ratio > 0.25 ? 'var(--status-error)' : ratio > 0.15 ? 'var(--status-warning)' : 'var(--status-success)'
  
  const textColor = 
     ratio > 0.25 ? 'text-[var(--status-error)]' : ratio > 0.15 ? 'text-[var(--status-warning)]' : 'text-[var(--status-success)]'

  return (
    <div className="flex items-center gap-2  ">
      <div className="w-16 bg-main rounded-full h-1.5 border border-premium">
        <div
          className="h-1.5 rounded-full  "
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className={`text-[10px] font-bold tabular-nums tracking-tight ${textColor}`}>
        {pct.toFixed(1)}%
      </span>
    </div>
  )
}

