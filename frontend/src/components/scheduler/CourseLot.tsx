import { useState, useRef } from 'react'
import { Pencil, Trash2, Layers, X, Check, RotateCcw } from 'lucide-react'
import { DEPT_CHIP_COLORS } from '@/data/mockData'
import type { ScheduledEntry } from '@/types'

interface CourseLotProps {
  entries: ScheduledEntry[]
  isExpanded: boolean
  onToggle: (val: boolean) => void
  onEntryClick: (entry: ScheduledEntry) => void
  onEditClick?: (entry: ScheduledEntry) => void
  onDeleteClick?: (id: string) => void
  isPlacementMode?: boolean
  onLotClick?: () => void
}

export function CourseLot({ 
  entries, 
  isExpanded,
  onToggle,
  onEntryClick, 
  onEditClick, 
  onDeleteClick, 
  isPlacementMode, 
  onLotClick 
}: CourseLotProps) {
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Use the color of the first department in the lot
  const mainDept = entries[0]?.dept || 'CSC'
  const colors = DEPT_CHIP_COLORS[mainDept] ?? DEPT_CHIP_COLORS['CSC']

  return (
    <div className="relative h-full" ref={containerRef}>
      {/* The "Lot" Block */}
      <div 
        onClick={(ev) => {
          ev.stopPropagation()
          if (isPlacementMode) {
            onLotClick?.()
          } else {
            onToggle(!isExpanded)
          }
        }}
        className={`group h-full rounded-lg border p-2 cursor-pointer transition-all hover:shadow-lg flex flex-col justify-center bg-surface relative overflow-hidden 
          ${isExpanded ? 'ring-2 ring-[var(--brand-primary)] z-40' : 'z-10'}
          ${isPlacementMode ? 'hover:ring-2 hover:ring-[var(--brand-primary)]' : ''}
        `}
        style={{ borderColor: colors.border }}
      >
        <div 
          className="absolute inset-0 opacity-[0.05] pointer-events-none rounded-lg" 
          style={{ backgroundColor: colors.bg }} 
        />
        
        {/* Header Indicators */}
        <div className="flex items-center justify-between mb-1.5 relative z-10">
          <div className="flex items-center gap-1.5">
            <Layers className="w-3 h-3" style={{ color: colors.text }} />
            <span className="text-[9px] font-black uppercase tracking-[0.15em] text-muted">
              {entries.length} {entries.length === 1 ? 'Entity' : 'Entities'}
            </span>
          </div>
          {isExpanded && <X className="w-3 h-3 text-muted hover:text-main" />}
        </div>

        {/* Course Codes List */}
        <div className="flex flex-wrap gap-1.5 relative z-10">
          {entries.slice(0, 5).map(e => (
            <span 
              key={e.id} 
              className="text-[11px] font-black font-mono shadow-sm bg-surface/90 px-2 py-0.5 rounded border border-premium transition-transform group-hover:scale-105" 
              style={{ color: DEPT_CHIP_COLORS[e.dept]?.text || colors.text }}
            >
              {e.courseCode}
            </span>
          ))}
          {entries.length > 5 && (
            <span className="text-[10px] font-black text-muted px-2 py-0.5 bg-main rounded flex items-center gap-1 border border-premium/50">
              <Layers className="w-2.5 h-2.5" />
              +{entries.length - 5}
            </span>
          )}
        </div>
      </div>

      {/* Expanded Course List Dropdown */}
      {isExpanded && (
        <div 
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="absolute top-0 left-full ml-3 w-80 bg-surface border-2 border-premium rounded-xl shadow-[0_30px_60px_rgba(0,0,0,0.4)] z-[60] p-3 animate-in slide-in-from-left-3 duration-200"
        >
           <div className="px-3 py-2.5 border-b-2 border-premium mb-4 flex items-center justify-between">
             <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-main">Resource Entities in Slot</h4>
             <span className="px-2 py-1 bg-main rounded text-[11px] font-black text-[var(--brand-primary)] border border-premium">{entries.length}</span>
           </div>
           
           <div className="space-y-4 max-h-[450px] overflow-y-auto custom-scrollbar pr-2 pb-2">
             {entries.map(e => {
               const itemColors = DEPT_CHIP_COLORS[e.dept] ?? colors;
               return (
                <div
                  key={e.id}
                  onClick={() => onEntryClick(e)}
                  className="w-full text-left p-3 pt-5 bg-slate-100/80 dark:bg-main rounded-xl border-2 border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 transition-colors group/item flex flex-col gap-1 relative overflow-hidden shadow-sm cursor-pointer"
                >
                  {/* High Contrast Vertical Barrier Accent */}
                  <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: itemColors.text }} />
                  
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="text-[14px] font-black font-mono leading-none mb-1.5 shadow-text" style={{ color: itemColors.text }}>
                        {e.courseCode}
                      </div>
                      <div className="text-[11px] text-main dark:text-main font-bold truncate max-w-[170px] leading-tight opacity-90 dark:opacity-100">
                        {e.courseName}
                      </div>
                    </div>
                    
                    {/* Action Hub */}
                    <div className="flex flex-col gap-1.5 ml-2">
                        {confirmingDeleteId === e.id ? (
                          <div className="flex flex-col gap-1.5 animate-in slide-in-from-right-2 duration-150">
                             <button 
                               onClick={(ev) => { ev.stopPropagation(); onDeleteClick?.(e.id); setConfirmingDeleteId(null); }}
                               className="p-1.5 rounded-md bg-red-600 text-white shadow-lg shadow-red-500/40 hover:bg-red-700 transition-all"
                               title="Confirm Removal"
                             >
                               <Check className="w-3.5 h-3.5" />
                             </button>
                             <button 
                               onClick={(ev) => { ev.stopPropagation(); setConfirmingDeleteId(null); }}
                               className="p-1.5 rounded-md bg-surface border-2 border-premium text-main hover:bg-main transition-all"
                               title="Cancel"
                             >
                               <RotateCcw className="w-3.5 h-3.5" />
                             </button>
                          </div>
                        ) : (
                          <>
                            <button 
                              onClick={(ev) => { ev.stopPropagation(); onEditClick?.(e); }}
                              className="p-2 rounded-md bg-surface border-2 border-premium hover:bg-[var(--brand-primary)] hover:border-transparent transition-all group/btn shadow-sm"
                              title="Edit Entity"
                            >
                              <Pencil className="w-3.5 h-3.5 text-slate-500 group-hover/btn:text-white transition-all" />
                            </button>
                            <button 
                              onClick={(ev) => { ev.stopPropagation(); setConfirmingDeleteId(e.id); }}
                              className="p-2 rounded-md bg-surface border-2 border-premium hover:bg-red-600 hover:border-transparent transition-all group/dev shadow-sm"
                              title="Delete Entity"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-slate-500 group-hover/dev:text-white transition-all" />
                            </button>
                          </>
                        )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 mt-2.5 pt-2.5 border-t-2 border-slate-200 dark:border-premium/20 pointer-events-none">
                     <div className="flex flex-col">
                       <span className="text-[8px] uppercase tracking-[0.2em] text-slate-500 font-black mb-0.5">Faculty</span>
                       <span className="text-[11px] text-slate-900 dark:text-main font-black truncate max-w-[110px]">{e.professor || 'Unassigned'}</span>
                     </div>
                     <div className="flex flex-col">
                       <span className="text-[8px] uppercase tracking-[0.2em] text-slate-500 font-black mb-0.5">Location</span>
                       <span className="text-[11px] text-slate-900 dark:text-main font-black">{e.room || 'TBD'}</span>
                     </div>
                  </div>
                </div>
               )
             })}
           </div>
        </div>
      )}
    </div>
  )
}
