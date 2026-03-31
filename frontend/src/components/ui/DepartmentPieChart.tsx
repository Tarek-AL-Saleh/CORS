import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts'

const data = [
  { name: 'Computer Science', value: 450, color: '#3b82f6' },
  { name: 'Engineering', value: 320, color: '#6366f1' },
  { name: 'Mathematics', value: 210, color: '#8b5cf6' },
  { name: 'Business', value: 280, color: '#ec4899' },
  { name: 'Liberal Arts', value: 180, color: '#f43f5e' }
]

export function DepartmentPieChart() {
  return (
    <div className="h-full w-full p-4 bg-white rounded-3xl border border-slate-100/50 shadow-sm">
      <h3 className="text-slate-800 font-display font-bold text-lg mb-4">Enrollment Breakdown</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
            />
            <Legend 
              verticalAlign="bottom" 
              align="center"
              iconType="circle"
              wrapperStyle={{ fontSize: '11px', paddingTop: '20px' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

