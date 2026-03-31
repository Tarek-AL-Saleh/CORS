import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts'

const data = [
  { name: 'CS101', ratio: 0.12 },
  { name: 'MATH201', ratio: 0.28 },
  { name: 'PHY105', ratio: 0.18 },
  { name: 'ENG102', ratio: 0.05 },
  { name: 'BIO302', ratio: 0.22 },
  { name: 'CHEM101', ratio: 0.15 }
]

export function FailRatioChart() {
  return (
    <div className="h-full w-full p-4 bg-white rounded-3xl border border-slate-100/50 shadow-sm">
      <h3 className="text-slate-800 font-display font-bold text-lg mb-4">Course Failure Hotspots</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94a3b8', fontSize: 12 }}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
            />
            <Tooltip 
              cursor={{ fill: '#f8fafc' }}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              formatter={(v: any) => [`${(Number(v) * 100).toFixed(1)}%`, 'Failure Ratio']}
            />
            <Bar dataKey="ratio" radius={[6, 6, 0, 0]}>
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.ratio > 0.25 ? '#ef4444' : entry.ratio > 0.15 ? '#f59e0b' : '#3b82f6'} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

