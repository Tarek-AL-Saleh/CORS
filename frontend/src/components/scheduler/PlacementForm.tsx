import { useState, useRef, useEffect, useMemo } from 'react'
import { Check, X, Clock, GraduationCap, Beaker, Search, User, ChevronDown } from 'lucide-react'
import type { CatalogCourse, ScheduledEntry, WeekDay, DoctorResponse as Doctor } from '@/types'
import { DEPT_CHIP_COLORS } from '@/data/data'

const ALL_DAYS: WeekDay[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAY_ABBR: Record<WeekDay, string> = {
  'Mon': 'M', 'Tue': 'T', 'Wed': 'W', 'Thu': 'R', 'Fri': 'F', 'Sat': 'S', 'Sun': 'U'
}
const ORDER = "MTWRFSU"

interface PlacementFormProps {
  course: CatalogCourse
  day: WeekDay
  startTime: string
  doctors: Doctor[]
  editEntry?: ScheduledEntry
  onConfirm: (professor: string, room: string, duration: number, pattern: string) => void
  onCancel: () => void
}

export function PlacementForm({ course, day, startTime, doctors, editEntry, onConfirm, onCancel }: PlacementFormProps) {
  const [professor, setProfessor] = useState(editEntry?.professor || '')
  const [room, setRoom]           = useState(editEntry?.room === 'TBD' ? '' : (editEntry?.room || ''))
  const [type, setType]           = useState<'Lecture' | 'Lab'>(editEntry?.durationMins && editEntry.durationMins >= 120 ? 'Lab' : 'Lecture')
  
  // Search state
  const [isSearching, setIsSearching] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  // 1. Intelligent Defaulting Logic
  useEffect(() => {
    if (!editEntry && professor === '') {
      // Find specialists for this course
      const specialists = doctors.filter(doc => {
        if (!doc.allowed_courses) return false
        try {
          const allowed = JSON.parse(doc.allowed_courses)
          return Array.isArray(allowed) && allowed.includes(course.code)
        } catch (e) { return false }
      })

      if (specialists.length > 0) {
        // Pick individual at random if multiple exist
        const picked = specialists[Math.floor(Math.random() * specialists.length)]
        setProfessor(picked.name)
      }
    }
  }, [editEntry, course.code, doctors])

  // Multi-day selection
  const defaultDays = useMemo(() => {
    if (editEntry) return ALL_DAYS.filter(d => editEntry.day.includes(DAY_ABBR[d]))
    if (['Mon', 'Wed', 'Fri'].includes(day)) return ['Mon', 'Wed', 'Fri'] as WeekDay[]
    if (['Tue', 'Thu'].includes(day)) return ['Tue', 'Thu'] as WeekDay[]
    return [day]
  }, [day, editEntry])

  const [selectedDays, setSelectedDays] = useState<WeekDay[]>(defaultDays)

  // Default duration logic
  const isTTH = selectedDays.includes('Tue') || selectedDays.includes('Thu')
  const defaultDuration = editEntry?.durationMins || (type === 'Lab' ? 120 : (isTTH ? 90 : 60))
  const [duration, setDuration] = useState(defaultDuration)

  const inputRef = useRef<HTMLInputElement>(null)
  const colors   = DEPT_CHIP_COLORS[course.dept] ?? DEPT_CHIP_COLORS['CSC']

  useEffect(() => { 
    inputRef.current?.focus() 
    if (!editEntry) {
      setDuration(type === 'Lab' ? 120 : (isTTH ? 90 : 60))
    }
  }, [type, isTTH, editEntry])

  // Handle outside clicks for search dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setIsSearching(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggleDay = (d: WeekDay) => {
    setSelectedDays(prev => 
      prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort((a,b) => ALL_DAYS.indexOf(a) - ALL_DAYS.indexOf(b))
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedDays.length === 0) return
    const pattern = selectedDays.map(d => DAY_ABBR[d]).sort((a,b) => ORDER.indexOf(a) - ORDER.indexOf(b)).join('')
    onConfirm(professor.trim(), room.trim(), duration, pattern)
  }

  // Filtered doctors for search
  const filteredDoctors = useMemo(() => {
    if (!professor) return doctors.slice(0, 5) // Show top 5 if empty
    return doctors.filter(d => 
       d.name.toLowerCase().includes(professor.toLowerCase()) || 
       (d.allowed_courses && d.allowed_courses.includes(course.code))
    ).sort((a, b) => {
       // Put specialists first
       const aSpec = a.allowed_courses?.includes(course.code) ? 1 : 0
       const bSpec = b.allowed_courses?.includes(course.code) ? 1 : 0
       return bSpec - aSpec
    }).slice(0, 8)
  }, [professor, doctors, course.code])

  return (
    <div
      className="absolute z-30 top-1 left-1 right-1 bg-surface rounded-lg shadow-2xl border border-premium p-6 animate-in zoom-in-95 duration-150 w-[360px] mx-auto"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-black font-mono px-2.5 py-1 rounded uppercase tracking-wider relative">
            <div className="absolute inset-0 opacity-15 rounded bg-current pointer-events-none" style={{ backgroundColor: colors.bg }} />
            <span style={{ color: colors.text }}>{course.code}</span>
          </span>
          <div className="flex flex-col">
            <span className="text-[10px] text-muted font-bold uppercase tracking-widest leading-none">Institutional Placement</span>
            <span className="text-[11px] text-main font-black tracking-tight">{startTime}</span>
          </div>
        </div>
        <button onClick={onCancel} className="text-muted hover:text-main transition-colors p-1.5 hover:bg-main rounded-md">
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Day Selector Row */}
        <div>
           <label className="text-[9px] font-black text-muted uppercase tracking-[0.1em] block mb-2 opacity-60 italic">Recurrence Pattern</label>
           <div className="flex items-center gap-1.5 justify-between bg-main p-1 rounded-lg border border-premium">
             {ALL_DAYS.slice(0, 5).map(d => (
               <button
                 key={d} type="button" onClick={() => toggleDay(d)}
                 className={`w-10 h-10 rounded-md flex items-center justify-center text-[11px] font-black transition-all border shadow-sm ${
                   selectedDays.includes(d) ? 'bg-[var(--brand-primary)] text-white border-transparent' : 'bg-surface text-muted hover:text-main border-premium'
                 }`}
               >
                 {DAY_ABBR[d]}
               </button>
             ))}
           </div>
        </div>

        {/* Type & Duration Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 grid grid-cols-2 gap-2 p-1 bg-main border border-premium rounded-lg">
            <button
              type="button" onClick={() => setType('Lecture')}
              className={`flex items-center justify-center gap-2 py-2 text-[10px] font-black uppercase rounded-md transition-all ${
                type === 'Lecture' ? 'bg-surface text-[var(--brand-primary)] shadow-sm border border-premium' : 'text-muted hover:text-main'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" /> Lecture
            </button>
            <button
              type="button" onClick={() => setType('Lab')}
              className={`flex items-center justify-center gap-2 py-2 text-[10px] font-black uppercase rounded-md transition-all ${
                type === 'Lab' ? 'bg-surface text-[var(--brand-primary)] shadow-sm border border-premium' : 'text-muted hover:text-main'
              }`}
            >
              <Beaker className="w-3.5 h-3.5" /> Lab
            </button>
          </div>

          <div>
            <label className="text-[10px] font-black text-muted uppercase tracking-widest block mb-1.5">Duration</label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted/50" />
              <input
                type="number" value={duration} onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
                className="w-full bg-main border border-premium rounded-md pl-9 pr-3 py-2 text-xs focus:ring-1 focus:ring-[var(--brand-primary)] text-main font-black"
                step={15}
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black text-muted uppercase tracking-widest block mb-1.5">Room</label>
            <input
              type="text" value={room} onChange={(e) => setRoom(e.target.value)} placeholder="TBD"
              className="w-full bg-main border border-premium rounded-md px-3 py-2 text-xs focus:ring-1 focus:ring-[var(--brand-primary)] text-main font-bold"
            />
          </div>
        </div>

        {/* Searchable Faculty Field */}
        <div className="relative" ref={searchRef}>
          <label className="text-[10px] font-black text-muted uppercase tracking-widest block mb-1.5">Primary Instructor</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted/50" />
            <input
              ref={inputRef}
              type="text" value={professor} 
              onFocus={() => setIsSearching(true)}
              onChange={(e) => { setProfessor(e.target.value); setIsSearching(true) }} 
              placeholder="Search or type name..."
              className="w-full bg-main border border-premium rounded-md pl-9 pr-10 py-2.5 text-xs focus:ring-1 focus:ring-[var(--brand-primary)] text-main font-bold shadow-inner"
            />
            <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/30 transition-transform ${isSearching ? 'rotate-180' : ''}`} />
          </div>

          {/* Search Dropdown */}
          {isSearching && (
            <div className="absolute z-50 left-0 right-0 mt-1 bg-surface border border-premium rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150 max-h-[200px] overflow-y-auto">
              <div className="px-3 py-1.5 bg-main/50 border-b border-premium text-[9px] font-black text-muted uppercase tracking-widest flex justify-between">
                <span>Suggestions</span>
                <span>{course.code} Experts First</span>
              </div>
              {filteredDoctors.length === 0 ? (
                <div className="p-4 text-center text-muted text-xs italic">No matches. Press Enter to add new.</div>
              ) : (
                filteredDoctors.map(doc => {
                   const isSpecialist = doc.allowed_courses?.includes(course.code)
                   return (
                    <button
                      key={doc.id} type="button"
                      onClick={() => { setProfessor(doc.name); setIsSearching(false) }}
                      className="w-full text-left px-4 py-2.5 hover:bg-[var(--brand-faded)] group flex items-center justify-between border-b border-premium/50 last:border-0"
                    >
                      <div className="flex items-center gap-2">
                        <User className={`w-3.5 h-3.5 ${isSpecialist ? 'text-[var(--brand-primary)]' : 'text-muted'}`} />
                        <span className="text-xs font-bold text-main group-hover:text-[var(--brand-primary)]">{doc.name}</span>
                      </div>
                      {isSpecialist && (
                        <span className="text-[9px] font-black bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] px-2 py-0.5 rounded uppercase tracking-tighter border border-[var(--brand-primary)]/20 shadow-sm">Expert</span>
                      )}
                    </button>
                   )
                })
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            className="flex-1 flex items-center justify-center gap-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-hover)] text-white text-[11px] font-black uppercase tracking-widest py-3 rounded-md transition-all shadow-lg shadow-[var(--brand-primary)]/20"
          >
            <Check className="w-4 h-4" />
            {editEntry ? 'Update' : 'Commit'}
          </button>
          <button
            type="button" onClick={onCancel}
            className="px-6 bg-surface hover:bg-main text-muted hover:text-main text-[11px] font-black uppercase py-3 rounded-md border border-premium transition-all"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
