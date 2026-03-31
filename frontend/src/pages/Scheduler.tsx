import { useState, useCallback, useEffect } from 'react'
import { CalendarDays, Download, AlertCircle, X, Trash2 } from 'lucide-react'
import { CoursePanel } from '@/components/scheduler/CoursePanel'
import { TimetableGrid } from '@/components/scheduler/TimetableGrid'
import type { CatalogCourse, ScheduledEntry, WeekDay } from '@/types'
import { api } from '@/services/api'
import { DEPT_CHIP_COLORS } from '@/data/mockData'

export function Scheduler() {
  const [selected, setSelected] = useState<CatalogCourse | null>(null)
  const [selectedEntry, setSelectedEntry] = useState<ScheduledEntry | null>(null)
  const [entries, setEntries] = useState<ScheduledEntry[]>([])
  const [doctors, setDoctors] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const fetchSchedule = useCallback(async () => {
    try {
      setLoading(true)
      const data = await api.scheduler.getSchedule()
      const dData = await api.scheduler.getDoctors()
      setDoctors(dData)

      const mapped = data.map((e: any) => ({
        id: String(e.id),
        courseCode: e.course_code,
        courseName: e.section_name,
        dept: e.course_code.match(/[A-Za-z]+/)?.[0] || 'GEN',
        day: e.day as WeekDay,
        startTime: e.start_time,
        durationMins: e.duration_mins,
        professor: e.doctor?.name || '',
        room: e.room || '',
        color: DEPT_CHIP_COLORS[e.course_code.match(/[A-Za-z]+/)?.[0] || 'GEN']?.text || '#10b981'
      }))
      setEntries(mapped)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSchedule()
  }, [fetchSchedule])

  const handleAdd = useCallback(
    async (
      day: WeekDay,
      startTime: string,
      duration: number,
      professor: string,
      room: string
    ) => {
      if (!selected) return
      
      let docId = doctors.find(d => d.name === professor)?.id
      if (!docId && professor) {
        try {
          const newDoc = await api.scheduler.createDoctor({ name: professor })
          setDoctors(p => [...p, newDoc])
          docId = newDoc.id
        } catch (e) {
          console.error("Failed making doctor")
        }
      }

      const postData = {
        course_code: selected.code,
        section_name: selected.name,
        doctor_id: docId || 1, // Fallback to a valid ID
        day: day,
        start_time: startTime,
        duration_mins: duration,
        room: room || 'TBD'
      }

      try {
        setErrorMsg('')
        const res = await api.scheduler.createEntry(postData)
        const color = DEPT_CHIP_COLORS[selected.dept]?.text || '#10b981'
        setEntries((prev) => [...prev, {
          id: String(res.id),
          courseCode: res.course_code,
          courseName: res.section_name,
          dept: selected.dept,
          day: res.day as WeekDay,
          startTime: res.start_time,
          durationMins: res.duration_mins,
          professor: professor,
          room: res.room,
          color
        }])
        setSelected(null)
      } catch (err: any) {
        setErrorMsg(err.response?.data?.detail || err.message)
      }
    },
    [selected, doctors]
  )

  const handleUpdate = useCallback(async (id: string, professor: string, room: string) => {
    // 1. Find doctor ID
    let docId = doctors.find(d => d.name === professor)?.id
    if (!docId && professor) {
      try {
        const newDoc = await api.scheduler.createDoctor({ name: professor })
        setDoctors(p => [...p, newDoc])
        docId = newDoc.id
      } catch (e) {
        console.error("Failed making doctor in update")
      }
    }

    try {
      const updated = await api.scheduler.updateEntry(parseInt(id), {
        doctor_id: docId || 0,
        room: room
      })
      
      setEntries(prev => prev.map(e => e.id === id ? {
        ...e,
        professor: professor,
        room: updated.room
      } : e))
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || err.message)
    }
  }, [doctors])

  const handleRemove = useCallback(async (id: string) => {
    try {
      await api.scheduler.deleteEntry(parseInt(id))
      setEntries((prev) => prev.filter((e) => e.id !== id))
      if (selectedEntry?.id === id) {
        setSelectedEntry(null)
      }
    } catch (e) {
      console.error(e)
    }
  }, [selectedEntry])

  // Stats
  const totalScheduled = entries.length
  const coursesScheduled = new Set(entries.map((e) => e.courseCode)).size

  return (
    <div className="flex flex-col h-full overflow-hidden animate-fade-in bg-main  ">
      <header className="flex-none px-8 py-6 bg-surface flex items-center justify-between z-10 shadow-sm relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-sidebar z-20" />
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 bg-main rounded-lg flex items-center justify-center border border-premium shadow-sm">
            <CalendarDays className="w-6 h-6 text-main" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-main tracking-tight leading-none">Timetable Orchestration</h1>
            <p className="text-[10px] text-muted font-bold uppercase tracking-widest mt-2">Institutional Capacity & Resource Scheduling</p>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="hidden lg:flex items-center gap-10 pr-8">
            {[
              { label: 'Scheduled Entities',  value: totalScheduled },
              { label: 'Unique Curricula',   value: coursesScheduled },
            ].map((s) => (
              <div key={s.label} className="text-right">
                <div className="text-[9px] text-muted font-black uppercase tracking-[0.2em] mb-2">{s.label}</div>
                <div className="text-2xl font-display font-bold text-[var(--brand-primary)] leading-none tabular-nums">{s.value}</div>
              </div>
            ))}
          </div>

          <button className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest px-6 py-3 bg-[var(--brand-primary)] hover:bg-[var(--brand-hover)] rounded-lg text-white  shadow-lg shadow-[var(--brand-primary)]/20 active:scale-95">
            <Download className="w-4 h-4 text-white" /> Finalize & Export
          </button>
        </div>
      </header>
      
      {errorMsg && (
        <div className="bg-[var(--status-error)]/10 text-[var(--status-error)] p-3 text-center text-[10px] font-bold uppercase tracking-widest flex justify-center items-center gap-2 border-b border-[var(--status-error)]/20 animate-in fade-in slide-in-from-top-1">
          <AlertCircle className="w-4 h-4 text-[var(--status-error)]"/>
          {errorMsg}
        </div>
      )}

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-slate-400 font-medium italic">Synchronizing with Institutional Database...</div>
      ) : (
      <div className="flex flex-1 overflow-hidden relative">
        <CoursePanel selected={selected} onSelect={setSelected} />
        <div className="flex-1 overflow-hidden flex flex-col bg-main border-l border-premium/50">
          {selected ? (
            <div className="flex-none px-6 py-2.5 bg-[var(--brand-primary)] text-white text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-3 shadow-lg z-20 ">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span>Placement Mode: <span className="text-white/90 ml-2">{selected.code} — {selected.name}</span></span>
              <button 
                onClick={() => setSelected(null)}
                className="ml-auto flex items-center gap-2 hover:bg-white/10 px-2 py-1 rounded transition-colors"
              >
                Abort Placement <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="flex-none px-6 py-3 bg-surface border-b border-premium text-[9px] font-black text-muted uppercase tracking-[0.2em] text-center shadow-inner">
              ← Initiate selection from inventory to begin scheduling
            </div>
          )}
          <div className="flex-1 overflow-y-auto h-full">
            <TimetableGrid
              entries={entries}
              selectedCourse={selected}
              onAdd={handleAdd}
              onUpdate={handleUpdate}
              onRemove={handleRemove}
              onEntryClick={(e) => setSelectedEntry(e)}
            />
          </div>
        </div>

        {/* ── Course Detail Drawer ── */}
        {selectedEntry && (
          <div className="absolute top-0 right-0 w-80 h-full bg-surface border-l border-premium shadow-[-10px_0_30px_rgba(0,0,0,0.1)] z-50 animate-slide-in-right flex flex-col">
            <div className="p-6 border-b border-premium flex items-center justify-between bg-main/30">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted">Entity Particulars</h2>
              <button 
                onClick={() => setSelectedEntry(null)}
                className="p-1.5 hover:bg-main rounded-md text-muted hover:text-main transition-colors border border-transparent hover:border-premium"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 p-6 space-y-8 overflow-y-auto institutional-scrollbar">
              <section>
                <div className="text-[10px] font-black text-[var(--brand-primary)] uppercase tracking-widest mb-3">Course Identifier</div>
                <div className="text-2xl font-display font-bold text-main tracking-tight leading-tight mb-2">{selectedEntry.courseCode}</div>
                <div className="text-sm text-secondary font-medium italic">{selectedEntry.courseName}</div>
              </section>

              <section className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-main rounded-lg border border-premium shadow-sm">
                  <div className="text-[9px] font-black text-muted uppercase tracking-widest mb-1">Time Slot</div>
                  <div className="text-xs font-bold text-main">{selectedEntry.day} • {selectedEntry.startTime}</div>
                  <div className="text-[8px] text-[var(--brand-primary)] font-black uppercase mt-1">({selectedEntry.durationMins} mins)</div>
                </div>
                <div className="p-4 bg-main rounded-lg border border-premium shadow-sm">
                  <div className="text-[9px] font-black text-muted uppercase tracking-widest mb-1">Location</div>
                  <div className="text-xs font-bold text-main">{selectedEntry.room}</div>
                </div>
              </section>

              <section>
                <div className="text-[10px] font-black text-muted uppercase tracking-widest mb-4 border-b border-premium pb-2">Assigned Faculty</div>
                <div className="flex items-center gap-3 p-4 bg-[var(--brand-faded)] border border-[var(--brand-primary)]/20 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-[var(--brand-primary)] flex items-center justify-center text-white text-[10px] font-bold">
                    {selectedEntry.professor?.[0] || '?'}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-main">{selectedEntry.professor || 'No Faculty Assigned'}</div>
                    <div className="text-[9px] text-[var(--brand-primary)] font-black uppercase tracking-widest mt-0.5">Primary Instructor</div>
                  </div>
                </div>
              </section>

              <button 
                onClick={() => { handleRemove(selectedEntry.id); setSelectedEntry(null); }}
                className="w-full flex items-center justify-center gap-2 py-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] hover:bg-red-500 hover:text-white transition-all shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5" /> De-commission Entry
              </button>
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  )
}

