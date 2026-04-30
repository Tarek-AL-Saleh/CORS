import { useState } from 'react'
import { BookOpen, Key, Mail, Lock, AlertCircle, ArrowRight } from 'lucide-react'
import { api } from '@/services/api'

interface LoginPageProps {
  onLoginSuccess: (username: string, isAdmin: boolean) => void
}

export function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !password) {
      setErrorMsg('Please enter both username and password.')
      return
    }

    try {
      setLoading(true)
      setErrorMsg('')
      const res = await api.auth.login(username, password)
      if (res.status === '2FA_REQUIRED') {
        setStep(2)
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code) {
      setErrorMsg('Please enter the verification code.')
      return
    }

    try {
      setLoading(true)
      setErrorMsg('')
      const res = await api.auth.verify2FA(username, code)
      localStorage.setItem('access_token', res.access_token);
      onLoginSuccess(res.username, res.is_admin)
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Invalid verification code')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-main flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background aesthetics */}
      <div className="absolute top-0 left-0 w-full h-[50vh] bg-[var(--brand-primary)]/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[50vw] h-[50vh] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] flex items-center justify-center rounded-2xl mb-6 shadow-sm border border-[var(--brand-primary)]/20">
            <BookOpen className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-display font-bold text-main tracking-tight">Access Control</h1>
          <p className="text-xs text-muted font-bold uppercase tracking-widest mt-3">Institutional Resource Scheduler</p>
        </div>

        <div className="bg-surface border border-premium shadow-xl rounded-2xl overflow-hidden backdrop-blur-sm p-8">
          
          
          <div>
            {step === 1 ? (
              <form 
                onSubmit={handleLogin}
                className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-500"
              >
                <div>
                  <label className="block text-[10px] font-black text-muted uppercase tracking-[0.2em] mb-2">Username</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <UserIcon className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 border border-premium rounded-xl text-sm bg-main text-main placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)] focus:border-[var(--brand-primary)] transition-all"
                      placeholder="e.g. admin"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-muted uppercase tracking-[0.2em] mb-2">Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Key className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 border border-premium rounded-xl text-sm bg-main text-main placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)] focus:border-[var(--brand-primary)] transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                {errorMsg && (
                  <div className="bg-red-500/10 text-red-500 p-3 rounded-lg text-xs font-medium flex items-center gap-2 border border-red-500/20">
                    <AlertCircle className="w-4 h-4 flex-none" /> {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-[var(--brand-primary)]/20 text-xs font-bold uppercase tracking-widest text-white bg-[var(--brand-primary)] hover:bg-[var(--brand-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--brand-primary)] focus:ring-offset-main transition-all active:scale-95 disabled:opacity-50"
                >
                  {loading ? 'Authenticating...' : 'Secure Login'} <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <form 
                onSubmit={handleVerify}
                className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500"
              >
                <div className="text-center mb-6">
                  <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
                    <Mail className="w-6 h-6" />
                  </div>
                  <h2 className="text-lg font-bold text-main">2-Step Verification</h2>
                  <p className="text-xs text-secondary mt-2">We've sent a 6-digit code to your registered academic email address.</p>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-muted uppercase tracking-[0.2em] mb-2 text-center">Security Code</label>
                  <div className="relative max-w-[240px] mx-auto">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={code}
                      onChange={e => setCode(e.target.value)}
                      className="block w-full pl-10 pr-3 py-4 border border-premium rounded-xl text-xl tracking-widest text-center font-mono font-bold bg-main text-main focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      placeholder="000000"
                    />
                  </div>
                </div>

                {errorMsg && (
                  <div className="bg-red-500/10 text-red-500 p-3 rounded-lg text-xs font-medium flex items-center gap-2 border border-red-500/20">
                    <AlertCircle className="w-4 h-4 flex-none" /> {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-blue-500/20 text-xs font-bold uppercase tracking-widest text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-main transition-all active:scale-95 disabled:opacity-50"
                >
                  {loading ? 'Verifying...' : 'Complete Sign In'}
                </button>
                
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-full text-center text-xs text-muted hover:text-main font-semibold transition-colors mt-4"
                >
                  ← Return to Login
                </button>
              </form>
            )}
          </div>

        </div>
        
        <p className="text-center text-[10px] text-muted font-bold uppercase tracking-widest mt-8">
          Authorized Academic Personnel Only
        </p>
      </div>
    </div>
  )
}

function UserIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}
