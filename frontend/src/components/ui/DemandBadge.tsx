import type { DemandLevel } from '@/types'

interface DemandBadgeProps {
  level: DemandLevel
}

const STYLES: Record<DemandLevel, string> = {
  High:   'bg-[var(--status-success)]/10 text-[var(--status-success)] border-[var(--status-error)]/20',
  Medium: 'bg-[var(--status-warning)]/10 text-[var(--status-warning)] border-[var(--status-warning)]/20',
  Low:    'bg-[var(--status-error)]/10   text-[var(--status-error)]   border-[var(--status-error)]/20',
}

export function DemandBadge({ level }: DemandBadgeProps) {
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${STYLES[level]}`}>
      {level}
    </span>
  )
}

