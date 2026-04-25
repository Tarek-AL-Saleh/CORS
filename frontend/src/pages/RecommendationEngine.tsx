import { useState, useEffect } from "react";
import { CheckCircle2, HelpCircle, Activity, BrainCircuit, ChevronDown, ChevronUp, ArrowUpDown, SlidersHorizontal, X } from "lucide-react";
import { CircularProgress } from "@/components/ui/CircularProgress";
import { DemandBadge } from "@/components/ui/DemandBadge";
import { api } from "@/services/api";

// ─── Helpers ────────────────────────────────────────────────────────────────
// const getPrefix = (code: string) => code.split("/").map(c => c.match(/^[A-Z]+/)?.[0] ?? "").filter(Boolean).join("/");
const getDemandLevel = (v: number) => (v > 40 ? "High" : v > 15 ? "Medium" : "Low");

const getTypesForCode = (code: string, map: Record<string, string>): string[] => {
  const parseTypes = (raw: string): string[] => {
    try { const p = JSON.parse(raw); return Array.isArray(p) ? p : [raw]; }
    catch { return [raw]; }
  };
  if (map[code]) return parseTypes(map[code]); // Exact joint-code lookup
  // For joint codes not found directly, union types from all components
  const found = code.split("/").flatMap(p => map[p] ? parseTypes(map[p]) : []);
  return found.length > 0 ? [...new Set(found)] : ["elective"];
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function ChipGroup({
  label, options, value, onChange,
}: { label: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">{label}</span>
      <div className="flex gap-1 flex-wrap">
        {options.map((o) => (
          <button
            key={o}
            onClick={() => onChange(o)}
            className={`px-3 py-1 rounded-full text-xs font-semibold  border ${
              value === o
                ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]"
                : "bg-surface text-muted border-premium hover:bg-main"
            }`}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

function SortBtn({
  label, value, onChange,
}: { label: string; value: "none" | "asc" | "desc"; onChange: (v: "none" | "asc" | "desc") => void }) {
  const cycle = () => onChange(value === "none" ? "desc" : value === "desc" ? "asc" : "none");
  return (
    <button
      onClick={cycle}
      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border  ${
        value !== "none"
          ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]"
          : "bg-surface text-muted border-premium hover:bg-main"
      }`}
    >
      {value === "desc" ? <ChevronDown className="w-3 h-3" /> : value === "asc" ? <ChevronUp className="w-3 h-3" /> : <ArrowUpDown className="w-3 h-3" />}
      {label}
    </button>
  );
}

function WhyPopover({ rec, open, onToggle }: any) {
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border  ${
          open
            ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]"
            : "bg-[var(--brand-faded)] text-[var(--brand-primary)] border-[var(--brand-primary)]/20 hover:bg-[var(--brand-primary)]/10"
        }`}
      >
        <HelpCircle className="w-3.5 h-3.5" />
        Why?
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 z-20 bg-surface text-main text-xs rounded-xl p-4 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] border border-premium w-72">
          <p className="font-semibold mb-1.5 text-[var(--brand-primary)]">AI Reasoning</p>
          <div className="space-y-2 text-slate-300">
            <p><strong>Latent Demand:</strong> {rec.latent_demand}</p>
            <p><strong>Bottleneck Score:</strong> {rec.bottleneck_score}</p>
            <p><strong>Model Confidence:</strong> {(rec.confidence * 100).toFixed(1)}%</p>
            {rec.projected_sections > 0 && (
              <p className="text-[var(--status-success)] font-semibold pt-1 border-t border-slate-700 mt-2">
                Action: Open {rec.projected_sections} Section(s)
              </p>
            )}
            {rec.is_tech_elective_pool && (
              <p className="text-[var(--status-warning)] font-semibold pt-1">Note: Grouped as Elective Pool</p>
            )}
          </div>
          <div className="absolute -top-1.5 right-5 w-3 h-3 bg-surface border-t border-l border-premium rotate-45" />
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const SLOT_DEFS = [
  { key: "csc_core"     as const, label: "CSC Core" },
  { key: "csc_elective" as const, label: "CSC Elec." },
  { key: "bif_core"     as const, label: "BIF Core" },
  { key: "bif_elective" as const, label: "BIF Elec." },
  { key: "mth"          as const, label: "MTH" },
  { key: "sta"          as const, label: "STA" },
];

export function RecommendationEngine() {
  // Config
  const [campus, setCampus] = useState("Beirut");
  const [newFreshman, setNewFreshman] = useState("50");
  const [newSophomores, setNewSophomores] = useState("100");
  const [newMasters, setNewMasters] = useState("10");
  const [slots, setSlots] = useState({
    csc_core: 12, csc_elective: 3,
    bif_core: 6,  bif_elective: 2,
    mth: 8,       sta: 3,
  });
  const setSlot = (key: keyof typeof slots, val: string) =>
    setSlots((prev) => ({ ...prev, [key]: parseInt(val) || 0 }));

  const [useQuotas, setUseQuotas] = useState(false);

  // Term
  const [nextTerm, setNextTerm] = useState<{ year: number; semester: string } | null>(null);
  const [nextTermLoading, setNextTermLoading] = useState(true);

  // Results
  const [entries, setEntries] = useState<any[]>([]);
  const [courseTypeMap, setCourseTypeMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [trainStatus, setTrainStatus] = useState<string | null>(null);
  const [openPopover, setOpenPopover] = useState<number | null>(null);

  // Table filters
  const [filterPrefix, setFilterPrefix] = useState("All");
  const [filterType, setFilterType]     = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterDemand, setFilterDemand] = useState("All");
  const [sortScore, setSortScore]       = useState<"none" | "asc" | "desc">("desc");
  const [sortSections, setSortSections] = useState<"none" | "asc" | "desc">("none");
  const [showFilters, setShowFilters]   = useState(false);

  useEffect(() => {
    api.predict.nextTerm()
      .then((t: { year: number; semester: string }) => setNextTerm(t))
      .catch(() => setNextTerm({ year: new Date().getFullYear(), semester: "Fall" }))
      .finally(() => setNextTermLoading(false));

    api.data.getCourses().then((courses: any[]) => {
      const map: Record<string, string> = {};
      courses.forEach((c) => { map[c.code] = c.type ?? "core"; });
      setCourseTypeMap(map);
    }).catch(() => {});

    api.predict.getRuns(campus).then((runs: any[]) => {
      if (runs && runs.length > 0) {
        setEntries([...runs[0].entries].sort((a: any, b: any) => b.offer_score - a.offer_score));
      } else {
        setEntries([]);
      }
    }).catch(() => {});
  }, [campus]);

  const runTraining = async () => {
    setTrainStatus("training");
    try {
      const res = await api.predict.train();
      setTrainStatus(`Success: Trained on ${res.samples_trained} samples.`);
      setTimeout(() => setTrainStatus(null), 5000);
    } catch (e: any) {
      setTrainStatus("Error: " + (e.response?.data?.detail || e.message));
    }
  };

  const runAnalysis = async () => {
    if (!nextTerm) return;
    setLoading(true);
    try {
      const res = await api.predict.bulkPredict({
        run_name: `Prediction_${nextTerm.year}_${nextTerm.semester}_${campus}`,
        target_year: nextTerm.year,
        target_semester: nextTerm.semester,
        target_campus: campus,
        new_freshman: parseInt(newFreshman) || 0,
        new_sophomores: parseInt(newSophomores) || 0,
        new_masters: parseInt(newMasters) || 0,
        use_quotas: useQuotas,
        slots,
      });
      setEntries([...res.entries].sort((a: any, b: any) => b.offer_score - a.offer_score));
    } catch (e: any) {
      alert("Error: " + (e.response?.data?.detail || e.message));
    } finally {
      setLoading(false);
    }
  };

  const activeFilters = [
    filterPrefix !== "All",
    filterType !== "All",
    filterStatus !== "All",
    filterDemand !== "All",
    sortScore !== "desc",
    sortSections !== "none"
  ].filter(Boolean).length;

  const resetFilters = () => {
    setFilterPrefix("All"); setFilterType("All");
    setFilterStatus("All"); setFilterDemand("All");
    setSortScore("desc"); setSortSections("none");
  };

  // ─── Filtering & sorting ──────────────────────────────────────────────────
  const filteredEntries = entries
    .filter((e) => {
      const matchesPrefix = (code: string, prefix: string) => {
        if (prefix === "All") return true;
        const upperPrefix = prefix.toUpperCase();
        return code.toUpperCase().split("/").some((part) => part.trim().startsWith(upperPrefix));
      };

      if (!matchesPrefix(e.course_code, filterPrefix)) return false;

      const courseTypes = getTypesForCode(e.course_code, courseTypeMap);
      const isCore    = courseTypes.some(t => t === "core" || t === "math");
      const isMasters = courseTypes.includes("masters");
      const isMinor   = courseTypes.includes("minor");
      const isElective = courseTypes.includes("elective");

      if (filterType === "Core"     && !isCore)     return false;
      if (filterType === "Elective" && !isElective)  return false;
      if (filterType === "Masters"  && !isMasters)   return false;
      if (filterType === "Minor"    && !isMinor)     return false;

      if (filterStatus === "Offer" && !e.offer) return false;
      if (filterStatus === "Skip" && e.offer) return false;

      if (filterDemand !== "All" && getDemandLevel(e.latent_demand) !== filterDemand) return false;

      return true;
    })
    .sort((a, b) => {
      if (sortSections !== "none") {
        const diff = a.projected_sections - b.projected_sections;
        return sortSections === "desc" ? -diff : diff;
      }
      if (sortScore !== "none") {
        return sortScore === "desc" ? b.offer_score - a.offer_score : a.offer_score - b.offer_score;
      }
      return 0;
    });

  return (
    <div className="p-8 space-y-6 animate-fade-in pb-24 max-w-[1600px] mx-auto  ">

      {/* ── Header ── */}
      <div className="flex items-start justify-between pb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-main tracking-tight leading-tight">Recommendation Engine</h1>
          <p className="text-secondary text-[10px] mt-2 font-black uppercase tracking-[0.2em] opacity-80 italic">Predictive Capacity Intelligence & Optimization</p>
        </div>
        <button
          onClick={runTraining}
          disabled={trainStatus === "training"}
          className="flex items-center gap-2.5 px-6 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] shadow-lg bg-surface border border-premium text-main hover:bg-main hover:border-[var(--brand-primary)] active:scale-95 transition-all"
        >
          <BrainCircuit className={`w-3.5 h-3.5 ${trainStatus === "training" ? "animate-spin text-[var(--brand-primary)]" : "text-[var(--brand-primary)]"}`} />
          {trainStatus === "training" ? "Calibrating Neural Weights..." : "Recalibrate Intelligence"}
        </button>
      </div>

      {trainStatus && trainStatus !== "training" && (
        <div className="bg-[var(--status-success)]/10 text-[var(--status-success)] px-5 py-4 rounded-lg text-xs font-bold border border-[var(--status-success)]/20 shadow-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 text-[var(--status-success)]" />
          <span className="uppercase tracking-widest">{trainStatus}</span>
        </div>
      )}

      {/* ── Config Card ── */}
      <div className="bg-surface rounded-xl border border-premium shadow-sm p-8 space-y-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-[var(--brand-primary)]/20" />

        {/* Row 1: Term · Campus · New Enrollees */}
        <div className="flex gap-8 items-end flex-wrap">
          <div className="min-w-[180px]">
            <p className="text-[10px] font-bold text-muted uppercase tracking-[0.2em] mb-2.5">Analysis Target</p>
            <div className="bg-main border border-premium rounded-lg px-4 py-3 text-sm font-bold text-main shadow-inner">
              {nextTermLoading ? "Detecting Term…" : nextTerm ? `${nextTerm.semester} ${nextTerm.year}` : "—"}
            </div>
          </div>

          <div className="min-w-[160px] flex-1 max-w-[200px]">
            <p className="text-[10px] font-bold text-muted uppercase tracking-[0.2em] mb-2.5">Institutional Campus</p>
            <select
              value={campus}
              onChange={(e) => setCampus(e.target.value)}
              className="w-full bg-surface border border-premium rounded-lg px-3 py-3 text-sm text-main font-bold focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] shadow-sm "
            >
              {["Byblos", "Beirut"].map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>

          <div className="flex flex-1 gap-4">
            <div className="flex-1">
              <p className="text-[10px] font-bold text-muted uppercase tracking-[0.2em] mb-2.5">New Freshman</p>
              <input
                type="number" min="0" value={newFreshman}
                onChange={(e) => setNewFreshman(e.target.value)}
                placeholder="Freshman"
                className="w-full bg-surface border border-premium rounded-lg px-4 py-3 text-sm text-main font-bold focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] shadow-sm "
              />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold text-muted uppercase tracking-[0.2em] mb-2.5">New Sophomores</p>
              <input
                type="number" min="0" value={newSophomores}
                onChange={(e) => setNewSophomores(e.target.value)}
                placeholder="Sophomore"
                className="w-full bg-surface border border-premium rounded-lg px-4 py-3 text-sm text-main font-bold focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] shadow-sm "
              />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold text-muted uppercase tracking-[0.2em] mb-2.5">New Masters</p>
              <input
                type="number" min="0" value={newMasters}
                onChange={(e) => setNewMasters(e.target.value)}
                placeholder="Masters"
                className="w-full bg-surface border border-premium rounded-lg px-4 py-3 text-sm text-main font-bold focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] shadow-sm "
              />
            </div>
          </div>
        </div>

        {/* Divider with Toggle Button */}
        <div className="flex items-center justify-between pt-6 mt-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setUseQuotas(!useQuotas)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
                useQuotas ? "bg-[var(--brand-primary)]" : "bg-main border border-premium"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  useQuotas ? "translate-x-1.5" : "-translate-x-1.5 bg-slate-400"
                }`}
              />
            </button>
            <div>
              <p className="text-[11px] font-bold text-main uppercase tracking-widest">Strict Capacity Quotas</p>
              <p className="text-[10px] text-muted">Constrain ML predictions to fixed department slot limits.</p>
            </div>
          </div>
          
          {/* Main Execution Button */}
          <div className="flex-none pb-0.5">
            <button
              onClick={runAnalysis}
              disabled={loading || nextTermLoading}
              className="group flex items-center gap-3 bg-[linear-gradient(135deg,var(--brand-primary)_0%,#312e81_100%)] hover:shadow-indigo-500/40 text-white px-8 py-3 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] shadow-xl transition-all disabled:opacity-50 active:scale-95 ring-1 ring-white/10"
            >
              {loading ? <Activity className="w-4 h-4 animate-spin text-white" /> : <Activity className="w-4 h-4 text-indigo-100" />}
              Execute Analysis
            </button>
          </div>
        </div>

        {/* Row 2: Slot quotas (Conditional) */}
        {useQuotas && (
          <div className="flex gap-8 items-end flex-wrap animate-in fade-in slide-in-from-top-2">
            <div className="flex-1">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {SLOT_DEFS.map(({ key, label }) => (
                  <div key={key} className="flex flex-col gap-2">
                    <span className="text-[9px] font-bold text-muted uppercase tracking-widest leading-tight">{label}</span>
                    <input
                      type="number" min="0" value={slots[key]}
                      onChange={(e) => setSlot(key, e.target.value)}
                      className="w-full bg-surface border border-premium rounded-lg px-2 py-2.5 text-sm font-bold text-[var(--brand-primary)] text-center focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] shadow-sm "
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Results Card ── */}
      <div className="bg-surface rounded-xl border border-premium shadow-sm overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-[var(--brand-primary)] z-20" />

        {/* Table Filter Bar */}
        <div className="px-8 py-6 border-b border-premium bg-main/50 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[11px] font-bold text-muted uppercase tracking-[0.2em] mb-1.5">Simulation Results</h2>
              <p className="text-xs text-muted font-medium">
                Internalizing <span className="text-main font-bold">{filteredEntries.length}</span> course entities
                {" · "}
                <span className="text-[var(--status-success)] font-bold">{filteredEntries.filter((e) => e.offer).length} Priority Offerings</span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] bg-surface text-muted px-3 py-1.5 rounded border border-premium font-bold uppercase tracking-widest shadow-sm">
                Slot-Optimized Mode
              </span>
              {activeFilters > 0 && (
                <button onClick={resetFilters} className="flex items-center gap-2 text-[10px] font-bold text-[var(--status-error)] hover:text-[var(--status-error)]/80 px-3 py-1.5 uppercase tracking-widest bg-[var(--status-error)]/10 rounded border border-[var(--status-error)]/20">
                  <X className="w-3.5 h-3.5" /> Reset
                </button>
              )}
              <button
                onClick={() => setShowFilters(v => !v)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border  ${
                  showFilters || activeFilters > 0
                    ? 'bg-[var(--brand-primary)] text-white border-[var(--brand-primary)] shadow-lg shadow-black/20'
                    : 'bg-surface text-main border-premium hover:bg-main'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                Parameters
                {activeFilters > 0 && (
                  <span className="bg-white text-[var(--brand-primary)] rounded w-4 h-4 flex items-center justify-center text-[10px] font-bold ml-1">{activeFilters}</span>
                )}
              </button>
            </div>
          </div>

          {/* Collapsible filter chips */}
          {showFilters && (
            <div className="pt-6 border-t border-slate-200/60 flex flex-wrap gap-x-8 gap-y-4 items-center animate-in fade-in slide-in-from-top-2">
              <ChipGroup label="Department" options={["All", "CSC", "BIF", "MTH", "STA"]} value={filterPrefix} onChange={setFilterPrefix} />
              <div className="w-px h-6 bg-slate-200" />
              <ChipGroup label="Academic Category" options={["All", "Core", "Elective", "Masters", "Minor"]} value={filterType} onChange={setFilterType} />
              <div className="w-px h-6 bg-slate-200" />
              <ChipGroup label="Offer Status" options={["All", "Offer", "Skip"]} value={filterStatus} onChange={setFilterStatus} />
              <div className="w-px h-6 bg-slate-200" />
              <ChipGroup label="Demand Index" options={["All", "High", "Medium", "Low"]} value={filterDemand} onChange={setFilterDemand} />
              <div className="w-px h-6 bg-premium" />
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-bold text-muted uppercase tracking-widest">Sort Metric</span>
                <div className="flex gap-2">
                  <SortBtn label="Propensity" value={sortScore} onChange={(v) => { setSortScore(v); if (v !== "none") setSortSections("none"); }} />
                  <SortBtn label="Capacity" value={sortSections} onChange={(v) => { setSortSections(v); if (v !== "none") setSortScore("none"); }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto min-h-[400px] institutional-scrollbar">
          {filteredEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-24 text-slate-400">
              <Activity className="w-12 h-12 mb-4 opacity-10" />
              <p className="font-medium text-sm">{entries.length === 0 ? 'Simulation results will populate here upon analytical execution.' : "No analytical records satisfy the current parameters."}</p>
            </div>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead className="bg-surface border-b border-premium">
                <tr>
                  {["Status", "Course Code", "Score Index", "Projected Demand", "Optimal Sections", "Intelligence"].map((h) => (
                    <th key={h} className={`px-8 py-5 text-left text-[10px] font-bold text-muted uppercase tracking-[0.15em] ${h === "Intelligence" || h === "Score Index" ? "text-center" : ""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((rec, i) => (
                  <tr
                    key={i}
                    className={`border-b border-premium/50 group ${
                      rec.offer ? "hover:bg-[var(--brand-faded)]/40" : "bg-main/30 opacity-50 grayscale-[0.5]"
                    }`}
                  >
                    <td className="px-6 py-3.5">
                      <div className="flex items-center">
                        {rec.offer
                          ? (
                            <span className="inline-flex items-center gap-1.5 bg-[var(--status-success)]/10 text-[var(--status-success)] text-[9px] font-black uppercase tracking-[0.1em] px-3 py-1.5 rounded-full border border-[var(--status-success)]/20 shadow-sm">
                              <div className="w-1.5 h-1.5 rounded-full bg-[var(--status-success)] shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                              Recommended
                            </span>
                          )
                          : (
                            <span className="inline-flex items-center gap-1.5 bg-main text-muted text-[9px] font-bold uppercase tracking-[0.1em] px-3 py-1.5 rounded-full border border-premium">
                              De-prioritized
                            </span>
                          )}
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="font-mono text-main bg-main border border-premium px-2 py-1 rounded font-bold text-[11px] tracking-wider group-hover:text-[var(--brand-primary)] group-hover:border-[var(--brand-primary)]/30 group-hover:bg-[var(--brand-faded)] ">{rec.course_code}</span>
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center justify-center">
                        <CircularProgress value={rec.offer_score} size={40} />
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex justify-start">
                        <DemandBadge level={getDemandLevel(rec.latent_demand)} />
                      </div>
                    </td>
                    <td className="px-6 py-3.5 font-bold text-main text-center text-base shadow-sm bg-main border-x border-premium tabular-nums">{rec.projected_sections}</td>
                    <td className="px-6 py-3.5">
                      <div className="flex justify-center">
                        <WhyPopover rec={rec} open={openPopover === i} onToggle={() => setOpenPopover((p) => (p === i ? null : i))} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

