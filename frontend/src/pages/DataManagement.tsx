import { useState, useEffect } from 'react'
import { CheckCircle2, Upload, AlertCircle, RefreshCw, SlidersHorizontal, X, Info } from 'lucide-react'
import { FailRatioBar } from '@/components/ui/FailRatioBar'
import { api } from '@/services/api'

type UploadKey = 'courses' | 'offerings' | 'doctors'

interface HelpContent {
  title: string
  desc: string
  example: string
  structure?: string[]
}

const HELP_GUIDES: Record<UploadKey, HelpContent> = {
  courses: {
    title: 'Course Catalog Format',
    desc: 'Upload a JSON file containing the official course registry. Supports nested dictionary or list formats.',
    example: `{
  "CSC201": {
    "course_name": "Computer Applications",
    "prerequisites": ["CSC101"],
    "study_plan": "both",
    "type": "core"
  },
  "CSC243": { 
    "course_name": "Introduction to OOP",
    "prerequisites": ["CSC201"],
    "study_plan": "fall",
    "type": "core"
  }
}`,
    structure: ['course_name (string)', 'prerequisites (list)', 'study_plan (string)', 'type (core/elective)']
  },
  offerings: {
    title: 'Historical Offerings Format',
    desc: 'CSV or XLSX files containing past enrollment data. You can upload the raw institutional grade report or a flat CSV.',
    example: `year,semester,campus,course_prefix,course_num,total_enrolled,passed_count,failed_count,fail_ratio,is_offered
2020,Fall,Beirut,BIF,205,34,25,1,0.26,1
2021,Spring,Byblos,CSC,243,45,40,2,0.15,1`,
    structure: ['year', 'semester', 'campus', 'course_prefix', 'course_num', 'total_enrolled', 'passed_count']
  },
  doctors: {
    title: 'Faculty / Doctor Records',
    desc: 'Provide a listing of available instructors and their areas of expertise. Supports bulk spreadsheets and structured JSON.',
    structure: [
      'name (string)', 
      'courses (list of strings)',
      'availability (list of pattern strings e.g. "MWF 08:00 10:00")',
      'Note: Missing days = Unconstrained (Available all day)'
    ],
    example: `--- JSON FORMAT ---
{
  "name": "Dr. Danielle Azar",
  "courses": ["CSC243", "CSC245"],
  "availability": [
    "M 8:00 10:00", 
    "WF 10:00 15:00", 
    "T 10:00 14:00", 
    "R 10:00 16:00"
  ]
}

--- CSV FORMAT ---
name,courses,days,start,end
"Dr. Azar", "CSC243, CSC245", MWF, 08:00, 10:00
"Dr. Azar", "CSC243, CSC245", T, 11:00, 15:30`
  }
}

function HelpModal({ type, onClose }: { type: UploadKey; onClose: () => void }) {
  const guide = HELP_GUIDES[type]
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-surface w-full max-w-2xl rounded-xl border border-premium shadow-2xl relative animate-in zoom-in-95 duration-200 overflow-hidden">
        <div className="p-6 border-b border-premium flex justify-between items-center bg-main/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--brand-primary)]/10 flex items-center justify-center border border-[var(--brand-primary)]/20">
              <Info className="w-5 h-5 text-[var(--brand-primary)]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-main">{guide.title}</h3>
              <p className="text-[10px] text-muted uppercase font-black tracking-widest">{type} reference guide</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-main rounded-lg transition-colors text-muted hover:text-main">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
          <div>
            <h4 className="text-xs font-black text-muted uppercase tracking-widest mb-2">Description</h4>
            <p className="text-sm text-secondary leading-relaxed">{guide.desc}</p>
          </div>

          <div>
            <h4 className="text-xs font-black text-muted uppercase tracking-widest mb-3">Data Structure</h4>
            <div className="grid grid-cols-2 gap-2">
              {guide.structure?.map(s => (
                <div key={s} className="bg-main border border-premium px-3 py-2 rounded text-[11px] font-bold text-secondary">
                   • {s}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-black text-muted uppercase tracking-widest mb-3">File Example</h4>
            <pre className="bg-[#0f172a] text-[#94a3b8] p-5 rounded-lg text-xs font-mono overflow-x-auto border border-white/5 leading-normal">
              {guide.example}
            </pre>
          </div>
        </div>

        <div className="p-6 bg-main/10 border-t border-premium flex justify-end">
          <button onClick={onClose} className="bg-main border border-premium px-6 py-2 rounded-lg text-xs font-bold text-main hover:bg-surface">
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}

function ChipGroup({ label, options, value, onChange }: {
  label: string; options: string[]; value: string; onChange: (v: string) => void
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">{label}</span>
      <div className="flex gap-1 flex-wrap">
        {options.map((o) => (
          <button key={o} onClick={() => onChange(o)}
            className={`px-3 py-1 rounded-full text-[10px] font-black border transition-all ${
              value === o
                ? 'bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]'
                : 'bg-surface text-muted border-premium hover:bg-main'
            }`}>{o}</button>
        ))}
      </div>
    </div>
  )
}

export function DataManagement() {
  const [uploaded, setUploaded] = useState<Record<UploadKey, boolean>>({ courses: false, offerings: false, doctors: false })
  const [dragging, setDragging] = useState<UploadKey | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetchLoading, setFetchLoading] = useState(true)
  const [records, setRecords] = useState<any[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [helpId, setHelpId] = useState<UploadKey | null>(null)

  const [filterYear, setFilterYear]       = useState('All')
  const [filterSem, setFilterSem]         = useState('All')
  const [filterCampus, setFilterCampus]   = useState('All')
  const [filterPrefix, setFilterPrefix]   = useState('All')
  const [filterRatio, setFilterRatio]     = useState('All')
  const [rowLimit, setRowLimit]           = useState(100)

  const fetchRecords = async () => {
    setFetchLoading(true)
    try {
      const data = await api.data.getOfferings()
      setRecords(data)
    } catch (e) { console.error(e) }
    finally { setFetchLoading(false) }
  }

  useEffect(() => { fetchRecords() }, [])

  const handleDrop = async (e: React.DragEvent, key: UploadKey) => {
    e.preventDefault(); setDragging(null)
    const file = e.dataTransfer.files[0]
    if (!file) return
    await uploadFile(key, file)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, key: UploadKey) => {
    const file = e.target.files?.[0]
    if (!file) return
    await uploadFile(key, file)
  }

  const uploadFile = async (key: UploadKey, file: File) => {
    setLoading(true)
    try {
      if (key === 'courses') await api.data.uploadCourses(file)
      else if (key === 'offerings') await api.data.uploadOfferings(file)
      else if (key === 'doctors') await api.data.uploadDoctors(file)
      setUploaded(p => ({ ...p, [key]: true }))
      fetchRecords()
    } catch (error: any) {
      alert('Error: ' + (error.response?.data?.detail || error.message))
    } finally { setLoading(false) }
  }

  const UPLOAD_ZONES = [
    { key: 'courses' as UploadKey, label: 'Course Catalog (JSON)', desc: 'Contains courses, prerequisites, and study plans', accept: '.json' },
    { key: 'offerings' as UploadKey, label: 'Historical Offerings (CSV/XLSX)', desc: 'Contains past enrollments and failure ratios', accept: '.csv,.xlsx' },
    { key: 'doctors' as UploadKey, label: 'Faculty/Doctor Records (JSON/CSV/XLSX)', desc: 'Institutional professor registry and assignments', accept: '.json,.csv,.xlsx' },
  ]

  const years    = ['All', ...Array.from(new Set(records.map(r => String(r.year)))).sort((a,b)=>Number(b)-Number(a))]
  const sems     = ['All', 'Fall', 'Spring', 'Summer']
  const campuses = ['All', ...Array.from(new Set(records.map(r => r.campus))).sort()]
  const prefixes = ['All', 'CSC', 'BIF', 'MTH', 'STA']

  const getPrefix = (code: string) => code?.match(/^[A-Z]+/)?.[0] ?? ''
  const getRatioLabel = (ratio: number) => ratio > 0.5 ? 'High' : ratio > 0.25 ? 'Mid' : 'Low'

  const filtered = records.filter(r => {
    if (filterYear   !== 'All' && String(r.year) !== filterYear) return false
    if (filterSem    !== 'All' && r.semester !== filterSem) return false
    if (filterCampus !== 'All' && r.campus !== filterCampus) return false
    if (filterPrefix !== 'All' && getPrefix(r.course_code) !== filterPrefix) return false
    if (filterRatio  !== 'All' && getRatioLabel(r.fail_ratio) !== filterRatio) return false
    return true
  })

  const activeFilterCount = [filterYear, filterSem, filterCampus, filterPrefix, filterRatio].filter(v => v !== 'All').length

  const resetFilters = () => {
    setFilterYear('All'); setFilterSem('All'); setFilterCampus('All')
    setFilterPrefix('All'); setFilterRatio('All'); setRowLimit(100)
  }

  return (
    <div className="p-8 space-y-8 animate-fade-in max-w-[1600px] mx-auto">
      {helpId && <HelpModal type={helpId} onClose={() => setHelpId(null)} />}

      <div className="flex justify-between items-end pb-8 border-b border-premium/50">
        <div>
          <h1 className="text-2xl font-display font-bold text-main tracking-tight leading-tight">Institutional Data Records</h1>
          <p className="text-secondary text-[10px] mt-2 font-black uppercase tracking-[0.2em] opacity-80 italic">Course Registry & Demographic Analytical Baseline</p>
        </div>
        <button onClick={fetchRecords} className="flex items-center gap-3 bg-surface border border-premium px-5 py-2.5 rounded-lg text-sm font-bold text-main hover:bg-main hover:border-accent shadow-sm active:scale-95">
          <RefreshCw className={`w-4 h-4 ${fetchLoading ? 'animate-spin text-[var(--brand-primary)]' : ''}`} /> Refresh Repository
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 z-10 relative">
        {UPLOAD_ZONES.map((zone) => {
          const isUploaded = uploaded[zone.key]
          const isDragging = dragging === zone.key
          return (
            <div key={zone.key} className="relative group">
               {/* Help Trigger */}
               <button 
                onClick={(e) => { e.preventDefault(); setHelpId(zone.key) }}
                className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-main/50 backdrop-blur-md border border-premium flex items-center justify-center text-muted hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/40 transition-all hover:scale-110 shadow-sm"
               >
                 <Info className="w-4 h-4" />
               </button>

              <label
                onDragOver={(e) => { e.preventDefault(); setDragging(zone.key) }}
                onDragLeave={() => setDragging(null)}
                onDrop={(e) => handleDrop(e, zone.key)}
                className={`rounded-xl border-2 border-dashed p-8 cursor-pointer block relative overflow-hidden transition-all ${
                  isUploaded ? 'border-[var(--status-success)]/30 bg-[var(--status-success)]/5'
                  : isDragging ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/5 scale-[1.01]'
                  : 'border-premium bg-surface hover:border-[var(--brand-primary)]/50 hover:bg-main shadow-sm hover:shadow-md'
                } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input type="file" accept={zone.accept} className="hidden" onChange={(e) => handleFileChange(e, zone.key)} disabled={loading} />
                {isUploaded ? (
                  <div className="text-center py-6">
                    <div className="w-14 h-14 bg-[var(--status-success)]/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-[var(--status-success)]/20 shadow-sm">
                      <CheckCircle2 className="w-7 h-7 text-[var(--status-success)]" />
                    </div>
                    <p className="text-base font-bold text-[var(--status-success)]">Dataset Synchronized</p>
                    <p className="text-xs text-[var(--status-success)]/80 mt-1.5 font-medium">{zone.label} successfully internalized</p>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <div className="w-14 h-14 bg-main rounded-full flex items-center justify-center mx-auto mb-4 border border-premium group-hover:bg-[var(--brand-faded)] group-hover:border-[var(--brand-primary)]/30 ">
                      <Upload className="w-6 h-6 text-muted group-hover:text-[var(--brand-primary)] " />
                    </div>
                    <p className="text-base font-bold text-main group-hover:text-[var(--brand-primary)] ">{zone.label}</p>
                    <p className="text-xs text-muted mt-1.5 mb-6 font-medium tracking-wide">{zone.desc}</p>
                    <div className="inline-flex items-center gap-2 bg-[var(--brand-primary)] text-white text-[11px] px-6 py-2 rounded-md font-bold hover:bg-[var(--brand-hover)] shadow-[var(--brand-primary)]/20 group-hover:shadow-[var(--brand-primary)]/40">
                      Import File
                    </div>
                  </div>
                )}
              </label>
            </div>
          )
        })}
      </div>

      <div className="bg-surface rounded-xl border border-premium shadow-sm overflow-hidden mb-12 relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-[var(--brand-primary)] z-20" />

        <div className="px-8 py-6 border-b border-premium bg-main/50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[11px] font-bold text-muted uppercase tracking-[0.2em] mb-1.5">Offerings Ledger Preview</h2>
              <p className="text-xs text-muted font-medium italic">
                Visualizing <span className="text-main font-bold">{Math.min(filtered.length, rowLimit)}</span> records of {filtered.length} matching institutional queries
              </p>
            </div>
            <div className="flex items-center gap-3">
              {activeFilterCount > 0 && (
                <button onClick={resetFilters} className="flex items-center gap-2 text-[10px] font-bold text-[var(--status-error)] hover:text-[var(--status-error)]/80 uppercase tracking-widest px-3 py-1.5 bg-[var(--status-error)]/10 rounded border border-[var(--status-error)]/20">
                  <X className="w-3.5 h-3.5" /> Clear Filters
                </button>
              )}
              <button
                onClick={() => setShowFilters(v => !v)}
                className={`flex items-center gap-2 px-5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest border  ${
                  showFilters || activeFilterCount > 0
                    ? 'bg-[var(--brand-primary)] text-white border-[var(--brand-primary)] shadow-lg shadow-black/20'
                    : 'bg-surface text-main border-premium hover:bg-main'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                Parameters
                {activeFilterCount > 0 && (
                  <span className="bg-white text-[var(--brand-primary)] rounded w-4 h-4 flex items-center justify-center text-[10px] font-bold ml-1">{activeFilterCount}</span>
                )}
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="mt-6 pt-6 border-t border-slate-200/60 space-y-5 animate-in fade-in slide-in-from-top-2 ">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
                <ChipGroup label="Fiscal Year"   options={years}    value={filterYear}   onChange={setFilterYear} />
                <ChipGroup label="Term" options={sems}   value={filterSem}    onChange={setFilterSem} />
                <ChipGroup label="Campus Site" options={campuses} value={filterCampus} onChange={setFilterCampus} />
                <ChipGroup label="Department"   options={prefixes} value={filterPrefix} onChange={setFilterPrefix} />
                <ChipGroup label="Risk Index" options={['All', 'Low', 'Mid', 'High']} value={filterRatio} onChange={setFilterRatio} />
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-bold text-muted uppercase tracking-widest whitespace-nowrap">Page Limit</span>
                  <input
                    type="number" min="1" max="5000" value={rowLimit}
                    onChange={e => setRowLimit(parseInt(e.target.value) || 100)}
                    className="w-24 bg-surface border border-premium rounded-md px-3 py-1.5 text-xs text-main font-bold text-center focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)]"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="overflow-x-auto max-h-[600px] overflow-y-auto institutional-scrollbar">
          {fetchLoading ? (
            <div className="p-20 text-center text-slate-400 font-medium">Internalizing academic records...</div>
          ) : filtered.length === 0 ? (
            <div className="p-20 flex flex-col items-center text-slate-400">
              <AlertCircle className="w-10 h-10 mb-4 opacity-20" />
              <p className="font-medium">{records.length === 0 ? 'Institutional database is currently unpopulated.' : 'No data satisfies the active filtering criteria.'}</p>
            </div>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0 bg-surface shadow-sm z-10">
                <tr>
                  {['Year', 'Semester', 'Campus', 'Course Identifier', 'Pass Metric', 'Attrition Metric', 'Status'].map((h) => (
                    <th key={h} className="px-8 py-4 text-left text-[10px] font-bold text-muted uppercase tracking-[0.15em] border-b border-premium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, rowLimit).map((r, i) => (
                  <tr key={i} className="border-b border-premium hover:bg-main/50 group">
                    <td className="px-8 py-4 text-muted tabular-nums font-medium">{r.year}</td>
                    <td className="px-8 py-4 text-muted font-medium">{r.semester}</td>
                    <td className="px-8 py-4 text-muted font-medium">{r.campus}</td>
                    <td className="px-8 py-4 font-bold text-main font-mono text-xs tracking-wider group-hover:text-[var(--brand-primary)] ">{r.course_code}</td>
                    <td className="px-8 py-4 text-[var(--status-success)] font-bold tabular-nums text-right w-32">{r.passed_count}</td>
                    <td className="px-8 py-4 text-[var(--status-error)] font-bold tabular-nums text-right w-32">{r.failed_count}</td>
                    <td className="px-8 py-4"><FailRatioBar ratio={r.fail_ratio} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
