import { useState, useMemo } from 'react'
import { CourseLot } from './CourseLot'
import { PlacementForm } from './PlacementForm'
import type { CatalogCourse, ScheduledEntry, WeekDay, PlacementTarget, DoctorResponse } from '@/types'

const DAYS: WeekDay[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const START_HOUR = 8
const END_HOUR = 22
const ROW_HEIGHT = 60 // px per 30 mins

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
  onUpdateEntry,
  onEntryClick,
  onDeleteEntry,
  doctors,
}: {
  entries:        ScheduledEntry[]
  selectedCourse: CatalogCourse | null
  doctors:        DoctorResponse[]
  onAdd:    (day: WeekDay, startTime: string, duration: number, professor: string, room: string, pattern: string) => void
  onUpdateEntry: (id: string, updates: Partial<ScheduledEntry>) => void
  onEntryClick: (entry: ScheduledEntry) => void
  onDeleteEntry: (id: string) => void
}) {
  const [placement, setPlacement] = useState<PlacementTarget | null>(null)
  const [expandedLotId, setExpandedLotId] = useState<string | null>(null)

  const handleEditClick = (entry: ScheduledEntry, anchorDay: WeekDay) => {
    // Keep the current lot expanded while editing
    setPlacement({ 
      day: anchorDay, 
      startTime: entry.startTime, 
      editEntry: entry 
    })
  }

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
    // 1. Always close expanded lists when clicking elsewhere in the grid
    setExpandedLotId(null)

    // 2. If no course selected for placement, just clear and return
    if (!selectedCourse) return
    
    const snappedTime = getSnapTime(day, index)
    
    if (placement?.day === day && placement?.startTime === snappedTime) {
      setPlacement(null)
      return
    }
    setPlacement({ day, startTime: snappedTime })
  }

  const handleConfirm = (professor: string, room: string, duration: number, pattern: string) => {
    if (!placement) return

    if (placement.editEntry) {
      onUpdateEntry(placement.editEntry.id, {
        professor,
        room,
        durationMins: duration,
        day: pattern // Support changing the pattern during edit
      })
    } else if (selectedCourse) {
      onAdd(placement.day, placement.startTime, duration, professor, room, pattern)
      setExpandedLotId(null)
    }
    
    setPlacement(null)
  }

  return (
    <div className="flex-1 overflow-auto bg-main/20">
      <div className="min-w-[1100px] flex flex-col relative">
        
        {/* Header Row */}
        <div className="flex sticky top-0 z-20 bg-surface border-b border-premium">
          <div className="w-24 flex-none border-r border-premium p-4 text-[10px] font-black text-muted uppercase tracking-widest text-center">Time</div>
          {DAYS.map(day => (
            <div key={day} className="flex-1 border-r border-premium p-4 text-[11px] font-black text-main uppercase tracking-[0.2em] text-center">{day}</div>
          ))}
        </div>

        {/* Grid Body */}
        <div className="flex relative pb-[800px]" style={{ height: timeLabels.length * ROW_HEIGHT + 800 }}>
          
          {/* Time Column */}
          <div className="w-24 flex-none border-r border-premium bg-surface/50">
            {timeLabels.map((lbl, idx) => (
              <div key={idx} className="border-b border-premium flex items-start justify-center pt-2" style={{ height: ROW_HEIGHT }}>
                <span className="text-[10px] font-bold text-muted tabular-nums uppercase opacity-60 font-mono">{lbl}</span>
              </div>
            ))}
          </div>

          {/* Day Columns */}
          {DAYS.map((day, dIdx) => (
            <div 
              key={day} 
              className="flex-1 relative border-r border-premium group transition-all"
              style={{ zIndex: (expandedLotId?.startsWith(day) || placement?.day === day) ? 50 : (DAYS.length - dIdx) }}
            >
              
              {/* Background Rows for Interaction */}
              {timeLabels.map((_, idx) => (
                <div 
                  key={idx} 
                  onClick={() => handleCellClick(day, idx)}
                  className="border-b border-premium/50 hover:bg-[var(--brand-faded)]/10 transition-colors cursor-crosshair" 
                  style={{ height: ROW_HEIGHT }}
                />
              ))}

            {/* Course Lots Overlay (Absolute Positioned) */}
            {(() => {
              const DAY_CODES: Record<WeekDay, string> = { Mon: 'M', Tue: 'T', Wed: 'W', Thu: 'R', Fri: 'F', Sat: 'S', Sun: 'U' };
              const code = DAY_CODES[day];
              const dayEntries = entries.filter(e => e.day.includes(code));
              const slotSize = (day === 'Tue' || day === 'Thu') ? 90 : (day === 'Sat' || day === 'Sun' ? 30 : 60);

              const grouped: Record<string, ScheduledEntry[]> = {};
              dayEntries.forEach(e => {
                const startMin = timeToMinutes(e.startTime);
                const numSlots = Math.ceil(e.durationMins / slotSize);
                
                for (let i = 0; i < numSlots; i++) {
                  const virtualStartTime = minutesToTime(startMin + (i * slotSize));
                  if (!grouped[virtualStartTime]) grouped[virtualStartTime] = [];
                  grouped[virtualStartTime].push(e);
                }
              });

              return Object.entries(grouped).map(([startTime, group]) => {
                const startMin = timeToMinutes(startTime);
                const top = (startMin / 30) * ROW_HEIGHT;
                const height = (slotSize / 30) * ROW_HEIGHT;
                const lotId = `${day}-${startTime}`;
                
                return (
                  <div 
                    key={lotId} 
                    className="absolute left-1.5 right-1.5 z-10" 
                    style={{ top: top + 2, height: height - 4 }}
                  >
                    <CourseLot
                      entries={group}
                      isExpanded={expandedLotId === lotId}
                      onToggle={(val) => setExpandedLotId(val ? lotId : null)}
                      onEntryClick={onEntryClick}
                      onEditClick={(e) => handleEditClick(e, day)}
                      onDeleteClick={onDeleteEntry}
                      isPlacementMode={!!selectedCourse}
                      onLotClick={() => handleCellClick(day, startMin / 30)}
                    />
                  </div>
                )
              });
            })()}

              {/* Placement Form Overlay */}
              {placement?.day === day && (
                <div 
                  data-overlay-surface="true"
                  className={`absolute left-1 right-1 z-[70] ${parseInt(placement.startTime.split(':')[0]) >= 13 ? 'bottom-full mb-1' : 'top-1'}`}
                  style={{ top: parseInt(placement.startTime.split(':')[0]) < 13 ? (timeToMinutes(placement.startTime) / 30) * ROW_HEIGHT + 4 : undefined }}
                >
                  {(() => {
                    const courseForForm = placement.editEntry ? {
                      code: placement.editEntry.courseCode,
                      name: placement.editEntry.courseName,
                      dept: placement.editEntry.dept,
                      credits: 3
                    } as CatalogCourse : selectedCourse;

                    return courseForForm && (
                      <div ref={el => { if(el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }) }}>
                        <PlacementForm
                          course={courseForForm}
                          day={day}
                          startTime={placement.startTime}
                          doctors={doctors}
                          editEntry={placement.editEntry}
                          onConfirm={handleConfirm}
                          onCancel={() => setPlacement(null)}
                        />
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
