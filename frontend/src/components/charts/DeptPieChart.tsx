import type { DeptSlice } from "@/types";

interface DeptPieChartProps {
  data: DeptSlice[];
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
): string {
  const toRad = (a: number) => ((a - 90) * Math.PI) / 180;
  const x1 = cx + r * Math.cos(toRad(startAngle));
  const y1 = cy + r * Math.sin(toRad(startAngle));
  const x2 = cx + r * Math.cos(toRad(endAngle));
  const y2 = cy + r * Math.sin(toRad(endAngle));
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
}

export function DeptPieChart({ data }: DeptPieChartProps) {
  const total = data.reduce((a, b) => a + b.count, 0);
  let cumAngle = 0;

  const slices = data.map((d) => {
    const angle = (d.count / total) * 360;
    const start = cumAngle;
    cumAngle += angle;
    return { ...d, start, angle };
  });

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-card">
      <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
        Department Split
      </h2>
      <p className="text-xs text-slate-400 mb-4">
        Course distribution by dept.
      </p>

      <svg viewBox="0 0 120 120" className="w-32 h-32 mx-auto block">
        {slices.map((s) => (
          <path
            key={s.dept}
            d={describeArc(60, 60, 50, s.start, s.start + s.angle)}
            fill={s.color}
            stroke="white"
            strokeWidth="2"
            className="hover:opacity-80 cursor-pointer "
          />
        ))}
        <circle cx="60" cy="60" r="26" fill="white" />
        <text
          x="60"
          y="57"
          textAnchor="middle"
          fontSize="7"
          fontWeight="600"
          fill="#64748b"
        >
          Course
        </text>
        <text
          x="60"
          y="67"
          textAnchor="middle"
          fontSize="7"
          fontWeight="600"
          fill="#64748b"
        >
          Depts
        </text>
      </svg>

      <div className="mt-4 space-y-2">
        {data.map((d) => (
          <div
            key={d.dept}
            className="flex items-center justify-between text-xs"
          >
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: d.color }}
              />
              <span className="text-slate-600 font-medium">{d.dept}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">{d.count} courses</span>
              <span className="text-slate-300">·</span>
              <span className="font-semibold text-slate-500">
                {Math.round((d.count / total) * 100)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

