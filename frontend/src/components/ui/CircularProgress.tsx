interface CircularProgressProps {
  value: number
  size?: number
}

export function CircularProgress({ value, size = 48 }: CircularProgressProps) {
  const r = 21
  const cx = 24
  const cy = 24
  const strokeWidth = 3.5
  const circ = 2 * Math.PI * r
  const offset = circ - (value / 100) * circ
  
  // Use CSS variables for colors
  const color = value >= 80 ? 'var(--brand-primary)' : value >= 60 ? 'var(--status-success)' : 'var(--text-muted)'

  return (
    <div
      className="relative inline-flex items-center justify-center  "
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox="0 0 48 48">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border-subtle)" strokeWidth={strokeWidth} />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 24 24)"
          style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s ease' }}
        />
      </svg>
      <span
        className="absolute font-bold  "
        style={{ color, fontSize: 10 }}
      >
        {value.toFixed(1)}%
      </span>
    </div>
  )
}

