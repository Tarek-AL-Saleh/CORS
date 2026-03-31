import { useState, useRef, useEffect } from 'react'
import { Check, X, Clock, GraduationCap, Beaker } from 'lucide-react'
import type { CatalogCourse, WeekDay } from '@/types'
import { DEPT_CHIP_COLORS } from '@/data/mockData'

interface PlacementFormProps {
  course: CatalogCourse
  day: WeekDay
  startTime: string
  onConfirm: (professor: string, room: string, duration: number) => void
  onCancel: () => void
}

export function PlacementForm({ course, day, startTime, onConfirm, onCancel }: PlacementFormProps) {
  const [professor, setProfessor] = useState('')
  const [room, setRoom]           = useState('')
  const [type, setType]           = useState<'Lecture' | 'Lab'>('Lecture')
  
  // Default duration logic based on day and type
  const isTTH = day === 'Tue' || day === 'Thu'
  const defaultDuration = type === 'Lab' ? 120 : (isTTH ? 90 : 60)
  const [duration, setDuration] = useState(defaultDuration)

  const inputRef = useRef<HTMLInputElement>(null)
  const colors   = DEPT_CHIP_COLORS[course.dept] ?? DEPT_CHIP_COLORS['CSC']

  useEffect(() => { 
    inputRef.current?.focus() 
    // Sync duration when type changes if user hasn't manually edited it much
    setDuration(type === 'Lab' ? 120 : (isTTH ? 90 : 60))
  }, [type, isTTH])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onConfirm(professor.trim(), room.trim(), duration)
  }

  return (
    <div
      className="absolute z-30 top-1 left-1 right-1 bg-surface rounded-lg shadow-2xl border border-premium p-6 animate-in zoom-in-95 duration-150 w-[320px] mx-auto"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Course badge + slot info */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <span
            className="text-[11px] font-black font-mono px-2.5 py-1 rounded uppercase tracking-wider relative"
          >
            <div className="absolute inset-0 opacity-15 rounded bg-current pointer-events-none" style={{ backgroundColor: colors.bg }} />
            <span style={{ color: colors.text }}>{course.code}</span>
          </span>
          <div className="flex flex-col">
            <span className="text-[10px] text-muted font-bold uppercase tracking-widest leading-none">{day}</span>
            <span className="text-[11px] text-main font-black tracking-tight">{startTime}</span>
          </div>
        </div>
        <button onClick={onCancel} className="text-muted hover:text-main transition-colors p-1.5 hover:bg-main rounded-md">
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Entry Type Toggle */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-main border border-premium rounded-lg">
          <button
            type="button"
            onClick={() => setType('Lecture')}
            className={`flex items-center justify-center gap-2 py-2 text-[10px] font-black uppercase tracking-widest rounded-md transition-all ${
              type === 'Lecture' ? 'bg-surface text-[var(--brand-primary)] shadow-sm border border-premium' : 'text-muted hover:text-main'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" /> Lecture
          </button>
          <button
            type="button"
            onClick={() => setType('Lab')}
            className={`flex items-center justify-center gap-2 py-2 text-[10px] font-black uppercase tracking-widest rounded-md transition-all ${
              type === 'Lab' ? 'bg-surface text-[var(--brand-primary)] shadow-sm border border-premium' : 'text-muted hover:text-main'
            }`}
          >
            <Beaker className="w-3.5 h-3.5" /> Lab
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-black text-muted uppercase tracking-[0.1em] block mb-1.5">
              Duration <span className="text-[9px] lowercase opacity-60 font-medium">(min)</span>
            </label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted/50" />
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
                className="w-full bg-main border border-premium rounded-md pl-9 pr-3 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)] text-main font-black"
                step={15}
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black text-muted uppercase tracking-[0.1em] block mb-1.5">
              Room
            </label>
            <input
              type="text"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="e.g. S-302"
              className="w-full bg-main border border-premium rounded-md px-3 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)] text-main placeholder:text-muted/40 font-bold"
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-black text-muted uppercase tracking-[0.1em] block mb-1.5">
            Primary Faculty
          </label>
          <input
            ref={inputRef}
            type="text"
            value={professor}
            onChange={(e) => setProfessor(e.target.value)}
            placeholder="Assign Professor..."
            className="w-full bg-main border border-premium rounded-md px-3 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)] text-main placeholder:text-muted/40 font-bold"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            className="flex-1 flex items-center justify-center gap-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-hover)] text-white text-[11px] font-black uppercase tracking-widest py-3 rounded-md transition-all shadow-lg shadow-[var(--brand-primary)]/20"
          >
            <Check className="w-4 h-4" />
            Commit Entry
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-6 bg-surface hover:bg-main text-muted hover:text-main text-[11px] font-black uppercase tracking-widest py-3 rounded-md border border-premium transition-all"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

