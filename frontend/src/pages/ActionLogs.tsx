import { useState, useEffect } from 'react'
import { api } from '@/services/api'
import { Database, User } from 'lucide-react'

export function ActionLogs() {
  const [actionLogs, setActionLogs] = useState<any[]>([])
  const [dataLogs, setDataLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'actions' | 'data'>('actions')

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const [aLogs, dLogs] = await Promise.all([
          api.logs.getActionLogs(),
          api.logs.getDataLogs()
        ])
        setActionLogs(aLogs)
        setDataLogs(dLogs)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchLogs()
  }, [])

  return (
    <div className="p-8 space-y-8 animate-fade-in max-w-[1600px] mx-auto">
      <div className="flex justify-between items-end pb-8 border-b border-premium/50">
        <div>
          <h1 className="text-2xl font-display font-bold text-main tracking-tight leading-tight">System Logs</h1>
          <p className="text-secondary text-[10px] mt-2 font-black uppercase tracking-[0.2em] opacity-80 italic">Audit Trails & Administrative Actions</p>
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={() => setActiveTab('actions')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
            activeTab === 'actions'
              ? 'bg-[var(--brand-primary)] text-white shadow-md'
              : 'bg-surface text-muted border border-premium hover:bg-main'
          }`}
        >
          <User className="w-4 h-4" /> User Actions
        </button>
        <button
          onClick={() => setActiveTab('data')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
            activeTab === 'data'
              ? 'bg-[var(--brand-primary)] text-white shadow-md'
              : 'bg-surface text-muted border border-premium hover:bg-main'
          }`}
        >
          <Database className="w-4 h-4" /> Data Changes
        </button>
      </div>

      <div className="bg-surface rounded-xl border border-premium shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto institutional-scrollbar">
          {loading ? (
            <div className="p-12 text-center text-muted">Loading logs...</div>
          ) : activeTab === 'actions' ? (
            <table className="w-full text-sm">
              <thead className="bg-main/50 border-b border-premium sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-muted uppercase tracking-widest">Timestamp</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-muted uppercase tracking-widest">User</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-muted uppercase tracking-widest">Action</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-muted uppercase tracking-widest">Description</th>
                </tr>
              </thead>
              <tbody>
                {actionLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-12 text-center text-muted">No user action logs found.</td>
                  </tr>
                ) : actionLogs.map(log => (
                  <tr key={log.id} className="border-b border-premium hover:bg-main/50">
                    <td className="px-6 py-4 text-muted tabular-nums font-mono text-xs">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 font-bold text-main">{log.username}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-2 py-1 rounded text-[10px] font-bold tracking-widest bg-main text-muted border border-premium uppercase">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted">{log.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-main/50 border-b border-premium sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-muted uppercase tracking-widest">Timestamp</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-muted uppercase tracking-widest">Table Affected</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-muted uppercase tracking-widest">User</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-muted uppercase tracking-widest">Action</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-muted uppercase tracking-widest">Description</th>
                </tr>
              </thead>
              <tbody>
                {dataLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-muted">No data logs found.</td>
                  </tr>
                ) : dataLogs.map(log => (
                  <tr key={log.id} className="border-b border-premium hover:bg-main/50">
                    <td className="px-6 py-4 text-muted tabular-nums font-mono text-xs">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 font-bold text-main">{log.table_affected}</td>
                    <td className="px-6 py-4 text-muted">{log.username || "System"}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 rounded text-[10px] font-bold tracking-widest uppercase border ${
                        log.action === 'UPLOAD' ? 'bg-[var(--status-success)]/10 text-[var(--status-success)] border-[var(--status-success)]/20' :
                        log.action === 'DELETE' ? 'bg-[var(--status-error)]/10 text-[var(--status-error)] border-[var(--status-error)]/20' :
                        'bg-main text-muted border-premium'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted">{log.description}</td>
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
