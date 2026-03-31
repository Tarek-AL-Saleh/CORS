import { useState, useMemo } from 'react'
import { CourseChip } from './CourseChip'
import { PlacementForm } from './PlacementForm'
import type { CatalogCourse, ScheduledEntry, WeekDay, PlacementTarget } from '@/types'

const DAYS: WeekDay[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const START_HOUR = 8
const END_HOUR = 22
const ROW_HEIGHT = 44 // px per 30 mins

// Helper to convert "HH:MM" to minutes since START_HOUR:00
function timeToMinutes(time: string) {
  const [h, m] = time.split(':').map(Number)
  return (h - START_HOUR) * 60 + m
}

// Helper to convert minutes since START_HOUR:00 back to "HH:MM"
function minutesToTime(mins: number) {
  const h = Math.floor(mins / 60) + START_HOUR
  const m = mins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function TimetableGrid({
  entries,
  selectedCourse,
  onAdd,
  onUpdate,
  onRemove,
  onEntryClick,
}: {
  entries:        ScheduledEntry[]
  selectedCourse: CatalogCourse | null
  onAdd:    (day: WeekDay, startTime: string, duration: number, professor: string, room: string) => void
  onUpdate: (id: string, professor: string, room: string) => void
  onRemove: (id: string) => void
  onEntryClick: (entry: ScheduledEntry) => void
}) {
  const [placement, setPlacement] = useState<PlacementTarget | null>(null)

  // Generate background slots (every 30 mins)
  const timeLabels = useMemo(() => {
    const labels = []
    for (let h = START_HOUR; h < END_HOUR; h++) {
      labels.push(`${h}:00`)
      labels.push(`${h}:30`)
    }
    return labels
  }, [])

  // Institutional Slot Snap Logic
  const getSnapTime = (day: WeekDay, indexInDay: number) => {
    const isMWF = day === 'Mon' || day === 'Wed' || day === 'Fri'
    const isTTH = day === 'Tue' || day === 'Thu'
    
    // Minutes from 8:00
    const rawMins = indexInDay * 30
    
    if (isMWF) {
      // Snap to whole hours: 0, 60, 120...
      const hourlyIdx = Math.floor(rawMins / 60)
      return minutesToTime(hourlyIdx * 60)
    }
    if (isTTH) {
      // Snap to 90min blocks: 0, 90, 180...
      const blockIdx = Math.floor(rawMins / 90)
      return minutesToTime(blockIdx * 90)
    }
    // Default to 30min for weekends/others
    return minutesToTime(rawMins)
  }

  const handleCellClick = (day: WeekDay, index: number) => {
    if (!selectedCourse) return
    const snappedTime = getSnapTime(day, index)
    
    if (placement?.day === day && placement?.startTime === snappedTime) {
      setPlacement(null)
      return
    }
    setPlacement({ day, startTime: snappedTime })
  }

  const handleConfirm = (professor: string, room: string, duration: number) => {
    if (!placement || !selectedCourse) return
    onAdd(placement.day, placement.startTime, duration, professor, room)
    setPlacement(null)
  }

  return (
    <div className="flex-1 overflow-auto bg-main/20">
      <div className="min-w-[1000px] flex flex-col relative">
        
        {/* Header Row */}
        <div className="flex sticky top-0 z-20 bg-surface border-b border-premium">
          <div className="w-20 flex-none border-r border-premium p-4 text-[10px] font-black text-muted uppercase tracking-widest text-center">Time</div>
          {DAYS.map(day => (
            <div key={day} className="flex-1 border-r border-premium p-4 text-[11px] font-black text-main uppercase tracking-[0.2em] text-center">{day}</div>
          ))}
        </div>

        {/* Grid Body - Massive padding to ensure the end of day and placement forms are never clipped */}
        <div className="flex relative pb-[600px]" style={{ height: timeLabels.length * ROW_HEIGHT + 600 }}>
          
          {/* Time Column */}
          <div className="w-20 flex-none border-r border-premium bg-surface/50">
            {timeLabels.map((lbl, idx) => (
              <div key={idx} className="border-b border-premium flex items-start justify-center pt-1" style={{ height: ROW_HEIGHT }}>
                <span className="text-[9px] font-bold text-muted tabular-nums uppercase opacity-60">{lbl}</span>
              </div>
            ))}
          </div>

          {/* Day Columns */}
          {DAYS.map(day => (
            <div key={day} className="flex-1 relative border-r border-premium group">
              
              {/* Background Rows for Interaction */}
              {timeLabels.map((_, idx) => (
                <div 
                  key={idx} 
                  onClick={() => handleCellClick(day, idx)}
                  className="border-b border-premium/50 hover:bg-[var(--brand-faded)]/10 transition-colors cursor-crosshair" 
                  style={{ height: ROW_HEIGHT }}
                />
              ))}

              {/* Course Chips Overlay (Absolute Positioned) */}
              {entries.filter(e => e.day === day).map(entry => {
                const top = (timeToMinutes(entry.startTime) / 30) * ROW_HEIGHT
                const height = (entry.durationMins / 30) * ROW_HEIGHT
                return (
                  <div 
                    key={entry.id} 
                    className="absolute left-1 right-1 z-10" 
                    style={{ top: top + 4, height: height - 8 }}
                  >
                    <CourseChip
                      entry={entry}
                      onUpdate={onUpdate}
                      onRemove={onRemove}
                      onClick={() => onEntryClick(entry)}
                    />
                  </div>
                )
              })}

              {/* Placement Form Overlay - Aggressive flipping for any slot after 1 PM */}
              {placement?.day === day && (
                <div 
                  className={`absolute left-1 right-1 z-30 ${parseInt(placement.startTime.split(':')[0]) >= 13 ? 'bottom-full mb-1' : 'top-1'}`}
                  style={{ top: parseInt(placement.startTime.split(':')[0]) < 13 ? (timeToMinutes(placement.startTime) / 30) * ROW_HEIGHT + 4 : undefined }}
                >
                  {selectedCourse && (
                    <div ref={el => { if(el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }) }}>
                      <PlacementForm
                        course={selectedCourse}
                        day={day}
                        startTime={placement.startTime}
                        onConfirm={handleConfirm}
                        onCancel={() => setPlacement(null)}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

