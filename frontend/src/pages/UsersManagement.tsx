import { useState, useEffect } from 'react'
import { api } from '@/services/api'
import { UserPlus, Edit2, Trash2, Shield, User } from 'lucide-react'

export function UsersManagement() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)
  const [formData, setFormData] = useState({ username: '', email: '', is_admin: false })

  const fetchUsers = async () => {
    try {
      const data = await api.users.getUsers()
      setUsers(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingUser) {
        await api.users.updateUser(editingUser.id, { email: formData.email, is_admin: formData.is_admin })
      } else {
        await api.users.createUser(formData)
      }
      setShowModal(false)
      fetchUsers()
    } catch (error: any) {
      alert('Error: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await api.users.deleteUser(id)
      fetchUsers()
    } catch (error: any) {
      alert('Error: ' + (error.response?.data?.detail || error.message))
    } finally {
      setDeleteConfirmId(null)
    }
  }

  const openModal = (user: any = null) => {
    if (user) {
      setEditingUser(user)
      setFormData({ username: user.username, email: user.email, is_admin: user.is_admin })
    } else {
      setEditingUser(null)
      setFormData({ username: '', email: '', is_admin: false })
    }
    setShowModal(true)
  }

  return (
    <div className="p-8 space-y-8 animate-fade-in max-w-[1600px] mx-auto">
      <div className="flex justify-between items-end pb-8 border-b border-premium/50">
        <div>
          <h1 className="text-2xl font-display font-bold text-main tracking-tight leading-tight">System Users</h1>
          <p className="text-secondary text-[10px] mt-2 font-black uppercase tracking-[0.2em] opacity-80 italic">Access Control & Role Management</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="flex items-center gap-2 bg-[var(--brand-primary)] text-white px-5 py-2.5 rounded-lg text-xs font-bold shadow-md hover:bg-[var(--brand-primary)]/90"
        >
          <UserPlus className="w-4 h-4" /> Add User
        </button>
      </div>

      <div className="bg-surface rounded-xl border border-premium shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-muted">Loading users...</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-main/50 border-b border-premium">
                <tr>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-muted uppercase tracking-widest">User</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-muted uppercase tracking-widest">Email</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-muted uppercase tracking-widest">Role</th>
                  <th className="px-6 py-4 text-right text-[10px] font-bold text-muted uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-premium hover:bg-main/50">
                    <td className="px-6 py-4 font-bold text-main flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-main border border-premium flex items-center justify-center">
                        <User className="w-4 h-4 text-muted" />
                      </div>
                      {u.username}
                    </td>
                    <td className="px-6 py-4 text-muted font-medium">{u.email}</td>
                    <td className="px-6 py-4">
                      {u.is_admin ? (
                        <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-widest px-2 py-1 rounded-md bg-[var(--status-success)]/10 text-[var(--status-success)] border border-[var(--status-success)]/20">
                          <Shield className="w-3 h-3" /> Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-widest px-2 py-1 rounded-md bg-main text-muted border border-premium">
                          User
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openModal(u)} className="p-2 text-muted hover:text-[var(--brand-primary)] bg-surface hover:bg-main rounded border border-transparent hover:border-premium">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteConfirmId(u.id)} className="p-2 text-muted hover:text-[var(--status-error)] bg-surface hover:bg-main rounded border border-transparent hover:border-premium">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface border border-premium rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-premium bg-main/50">
              <h3 className="text-lg font-bold text-main">{editingUser ? 'Edit User' : 'Add New User'}</h3>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-muted uppercase tracking-widest mb-1.5">Username</label>
                <input 
                  type="text" required disabled={!!editingUser}
                  value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})}
                  className="w-full bg-main border border-premium rounded-lg px-4 py-2 text-sm text-main focus:outline-none focus:border-[var(--brand-primary)] disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-muted uppercase tracking-widest mb-1.5">Email</label>
                <input 
                  type="email" required
                  value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full bg-main border border-premium rounded-lg px-4 py-2 text-sm text-main focus:outline-none focus:border-[var(--brand-primary)]"
                />
              </div>
              {!editingUser && (
                <p className="text-xs text-[var(--status-warning)] mt-1 font-medium italic">New users will have the default password: <b>password</b></p>
              )}
              <div className="flex items-center gap-3 pt-2">
                <input 
                  type="checkbox" id="isAdmin"
                  checked={formData.is_admin} onChange={e => setFormData({...formData, is_admin: e.target.checked})}
                  className="w-4 h-4 accent-[var(--brand-primary)]"
                />
                <label htmlFor="isAdmin" className="text-sm font-bold text-main">Administrator Privileges</label>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 rounded-lg text-sm font-bold text-main bg-main border border-premium hover:bg-surface">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2 rounded-lg text-sm font-bold text-white bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirmId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <div className="bg-surface border border-premium rounded-xl p-6 w-[320px] shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-[var(--status-error)]/10 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6 text-[var(--status-error)]" />
            </div>
            <h3 className="text-lg font-bold text-main mb-2">Delete User</h3>
            <p className="text-sm text-muted mb-6">Are you sure you want to permanently delete this user? This action cannot be undone.</p>
            <div className="flex w-full gap-3">
              <button 
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-bold text-main bg-main border border-premium hover:bg-surface transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleDelete(deleteConfirmId)}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-bold text-white bg-[var(--status-error)] hover:bg-[var(--status-error)]/90 shadow-md transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
