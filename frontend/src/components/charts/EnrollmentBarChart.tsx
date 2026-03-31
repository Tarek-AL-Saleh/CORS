import type { EnrollmentPoint } from "@/types";

interface EnrollmentBarChartProps {
  data: EnrollmentPoint[];
}

export function EnrollmentBarChart({ data }: EnrollmentBarChartProps) {
  const max = Math.max(...data.map((d) => d.enrolled));

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-card">
      <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
        Enrollment Trends
      </h2>
      <p className="text-xs text-slate-400 mb-6">
        Students enrolled per semester
      </p>

      <div className="flex items-end gap-3 h-48">
        {data.map((d, i) => {
          const heightPct = (d.enrolled / max) * 100;
          return (
            <div
              key={d.sem}
              className="flex-1 flex flex-col items-center gap-2"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <span className="text-xs text-slate-400 tabular-nums">
                {d.enrolled}
              </span>
              <div className="relative w-full group cursor-default">
                {/* Tooltip */}
                <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs rounded-lg px-2.5 py-1.5 opacity-0 group-hover:opacity-100  pointer-events-none whitespace-nowrap z-10 shadow-lg">
                  {d.sem}: <strong>{d.enrolled.toLocaleString()}</strong>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                </div>
                <div
                  className="w-full rounded-t-lg hover:opacity-80 "
                  style={{
                    height: `${heightPct * 1.6}px`,
                    background:
                      "linear-gradient(180deg, #4f46e5 0%, #818cf8 100%)",
                  }}
                />
              </div>
              <span className="text-xs text-slate-400 text-center leading-tight">
                {d.sem}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

