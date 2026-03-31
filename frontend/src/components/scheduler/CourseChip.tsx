import { useState, useRef, useEffect } from 'react'
import { Trash2, Pencil, Check, X, User, DoorOpen } from 'lucide-react'
import { DEPT_CHIP_COLORS } from '@/data/mockData'
import type { ScheduledEntry } from '@/types'

interface CourseChipProps {
  entry: ScheduledEntry
  onUpdate: (id: string, professor: string, room: string) => void
  onRemove: (id: string) => void
  onClick?: () => void
}

export function CourseChip({ entry, onUpdate, onRemove, onClick }: CourseChipProps) {
  const [editing, setEditing]     = useState(false)
  const [professor, setProfessor] = useState(entry.professor)
  const [room, setRoom]           = useState(entry.room)
  const inputRef = useRef<HTMLInputElement>(null)
  const colors   = DEPT_CHIP_COLORS[entry.dept] ?? DEPT_CHIP_COLORS['CSC']

  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  const handleSave = () => {
    onUpdate(entry.id, professor.trim(), room.trim())
    setEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter')  handleSave()
    if (e.key === 'Escape') { setEditing(false); setProfessor(entry.professor); setRoom(entry.room) }
  }

  if (editing) {
    return (
      <div
        className="rounded-lg border p-2 space-y-1.5 shadow-xl bg-surface animate-in zoom-in-95 duration-100"
        style={{ borderColor: colors.border }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold font-mono" style={{ color: colors.text }}>{entry.courseCode}</span>
          <button onClick={() => { setEditing(false); setProfessor(entry.professor); setRoom(entry.room) }}
            className="text-slate-400 hover:text-slate-600">
            <X className="w-3 h-3" />
          </button>
        </div>
        <input
          ref={inputRef}
          value={professor}
          onChange={(e) => setProfessor(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Professor…"
          className="w-full text-[10px] font-bold border border-premium rounded-md px-2 py-1.5 bg-main text-main focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]"
        />
        <input
          value={room}
          onChange={(e) => setRoom(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Location…"
          className="w-full text-[10px] font-bold border border-premium rounded-md px-2 py-1.5 bg-main text-main focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]"
        />
        <div className="flex gap-1">
          <button onClick={handleSave}
            className="flex-1 flex items-center justify-center gap-1 bg-[var(--brand-primary)] text-white text-[10px] py-1.5 rounded-md font-black uppercase tracking-widest hover:bg-[var(--brand-hover)] transition-colors">
            <Check className="w-3 h-3" /> Save
          </button>
          <button onClick={() => onRemove(entry.id)}
            className="px-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-md border border-red-500/20 transition-all">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="group relative rounded-lg px-2 py-2 cursor-pointer border hover:shadow-md transition-all bg-surface"
      style={{ borderColor: colors.border }}
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
    >
      {/* Background tint - Semi-transparent brand color */}
      <div 
        className="absolute inset-0 opacity-[0.07] pointer-events-none rounded-lg" 
        style={{ backgroundColor: colors.bg }} 
      />
      {/* Action buttons */}
      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100  flex gap-1 z-20">
        <button
          onClick={() => setEditing(true)}
          className="w-5 h-5 flex items-center justify-center rounded bg-surface/90 hover:bg-main text-muted hover:text-[var(--brand-primary)] shadow-sm border border-premium transition-all"
          title="Edit"
        >
          <Pencil className="w-2.5 h-2.5" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(entry.id); }}
          className="w-5 h-5 flex items-center justify-center rounded bg-surface/90 hover:bg-red-500/20 text-muted hover:text-red-500 shadow-sm border border-premium transition-all"
          title="Remove"
        >
          <Trash2 className="w-2.5 h-2.5" />
        </button>
      </div>

      {/* Course code */}
      <p className="text-[11px] font-black font-mono leading-tight pr-7 relative z-10" style={{ color: colors.text }}>
        {entry.courseCode}
      </p>

      {/* Course name */}
      <p className="text-[10px] text-secondary truncate leading-tight mt-1 relative z-10 font-bold" style={{ maxWidth: '100%' }}>
        {entry.courseName}
      </p>

      {/* Meta row */}
      {(entry.professor || entry.room) && (
        <div className="flex items-center gap-2 mt-2 flex-wrap relative z-10">
          {entry.professor && (
            <span className="flex items-center gap-1 text-muted font-black uppercase tracking-tighter" style={{ fontSize: 8 }}>
              <User className="w-2 h-2" /> {entry.professor}
            </span>
          )}
          {entry.room && (
            <span className="flex items-center gap-1 text-muted font-black uppercase tracking-tighter" style={{ fontSize: 8 }}>
              <DoorOpen className="w-2 h-2" /> {entry.room}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

