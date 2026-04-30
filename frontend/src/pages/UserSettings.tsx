import { useState, useEffect } from 'react'
import { api } from '@/services/api'
import { User, Mail, Lock, Shield, CheckCircle2 } from 'lucide-react'

export function UserSettings() {
  const [formData, setFormData] = useState({ username: '', email: '', currentPassword: '', password: '', confirmPassword: '' })
  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    // Fetch current user details
    // We can get all users and find ourselves, or rely on localstorage
    // Since we don't have a GET /users/me endpoint, we'll initialize from localStorage
    setFormData(prev => ({ ...prev, username: localStorage.getItem('auth_user') || '' }))
    // To get the email, we would need a proper endpoint or to find ourselves from getUsers
    // We will attempt to fetch it if admin
    if (localStorage.getItem('auth_admin') === 'true') {
      api.users.getUsers().then(users => {
        const me = users.find((u: any) => u.username === localStorage.getItem('auth_user'))
        if (me) setFormData(prev => ({ ...prev, email: me.email }))
      }).catch(() => {})
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')
    
    if (!formData.currentPassword) {
      setErrorMsg("Current password is required to save changes.")
      return
    }

    if (formData.password && formData.password !== formData.confirmPassword) {
      setErrorMsg("New passwords do not match.")
      return
    }

    setLoading(true)
    try {
      await api.users.updateMe({
        username: formData.username,
        email: formData.email,
        current_password: formData.currentPassword,
        new_password: formData.password || undefined
      })
      setSuccessMsg("Profile updated successfully.")
      localStorage.setItem('auth_user', formData.username)
      setFormData(prev => ({ ...prev, currentPassword: '', password: '', confirmPassword: '' }))
    } catch (e: any) {
      setErrorMsg(e.response?.data?.detail || e.message)
    } finally {
      setLoading(false)
    }
  }

  const isAdmin = localStorage.getItem('auth_admin') === 'true'

  return (
    <div className="p-8 space-y-8 animate-fade-in max-w-[800px] mx-auto">
      <div className="pb-8 border-b border-premium/50">
        <h1 className="text-2xl font-display font-bold text-main tracking-tight leading-tight">My Settings</h1>
        <p className="text-secondary text-[10px] mt-2 font-black uppercase tracking-[0.2em] opacity-80 italic">Account Configuration & Security</p>
      </div>

      {successMsg && (
        <div className="bg-[var(--status-success)]/10 text-[var(--status-success)] px-5 py-4 rounded-lg text-xs font-bold border border-[var(--status-success)]/20 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5" />
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="bg-[var(--status-error)]/10 text-[var(--status-error)] px-5 py-4 rounded-lg text-xs font-bold border border-[var(--status-error)]/20">
          {errorMsg}
        </div>
      )}

      <div className="bg-surface rounded-xl border border-premium shadow-sm overflow-hidden p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center gap-4 p-4 bg-main/50 border border-premium rounded-xl mb-8">
            <div className="w-16 h-16 rounded-full bg-[var(--brand-primary)]/10 flex items-center justify-center border border-[var(--brand-primary)]/20">
              <User className="w-8 h-8 text-[var(--brand-primary)]" />
            </div>
            <div>
              <p className="text-lg font-bold text-main">{localStorage.getItem('auth_user')}</p>
              <div className="flex items-center gap-2 mt-1">
                {isAdmin ? (
                  <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-[var(--status-success)]/10 text-[var(--status-success)] border border-[var(--status-success)]/20">
                    <Shield className="w-3 h-3" /> Administrator
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-main text-muted border border-premium">
                    Standard User
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-black text-muted uppercase tracking-widest border-b border-premium pb-2">Profile Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-bold text-muted uppercase tracking-widest mb-1.5 flex items-center gap-2"><User className="w-3 h-3" /> Username</label>
                <input 
                  type="text" required
                  value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})}
                  className="w-full bg-main border border-premium rounded-lg px-4 py-2.5 text-sm text-main focus:outline-none focus:border-[var(--brand-primary)]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-muted uppercase tracking-widest mb-1.5 flex items-center gap-2"><Mail className="w-3 h-3" /> Email Address</label>
                <input 
                  type="email" required
                  value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full bg-main border border-premium rounded-lg px-4 py-2.5 text-sm text-main focus:outline-none focus:border-[var(--brand-primary)]"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <h3 className="text-xs font-black text-muted uppercase tracking-widest border-b border-premium pb-2">Security</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-bold text-muted uppercase tracking-widest mb-1.5 flex items-center gap-2"><Lock className="w-3 h-3 text-[var(--status-warning)]" /> Current Password <span className="text-[var(--status-error)]">*</span></label>
                <input 
                  type="password" required
                  value={formData.currentPassword} onChange={e => setFormData({...formData, currentPassword: e.target.value})}
                  className="w-full bg-main border border-[var(--status-warning)]/30 rounded-lg px-4 py-2.5 text-sm text-main focus:outline-none focus:border-[var(--status-warning)]"
                  placeholder="Verify to save changes"
                />
              </div>
            </div>

            <p className="text-xs text-muted font-medium italic mt-6 mb-2">Leave below fields blank if you do not wish to change your password.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-bold text-muted uppercase tracking-widest mb-1.5 flex items-center gap-2"><Lock className="w-3 h-3" /> New Password</label>
                <input 
                  type="password"
                  value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}
                  className="w-full bg-main border border-premium rounded-lg px-4 py-2.5 text-sm text-main focus:outline-none focus:border-[var(--brand-primary)]"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-muted uppercase tracking-widest mb-1.5 flex items-center gap-2"><Lock className="w-3 h-3" /> Confirm Password</label>
                <input 
                  type="password"
                  value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                  className="w-full bg-main border border-premium rounded-lg px-4 py-2.5 text-sm text-main focus:outline-none focus:border-[var(--brand-primary)]"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <div className="pt-8 flex justify-end">
            <button 
              type="submit" disabled={loading}
              className="bg-[var(--brand-primary)] text-white px-8 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-[var(--brand-primary)]/90 shadow-lg disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
