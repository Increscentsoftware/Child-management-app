import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/lib/store'
import { 
  Users, UserPlus, Edit2, Trash2, Eye, EyeOff, 
  ArrowLeft, Shield, UserCheck, X 
} from 'lucide-react'
import toast from 'react-hot-toast'

interface User {
  id: string
  full_name: string
  role: 'admin' | 'field_worker'
  phone?: string
  area_assigned?: string
  is_active: boolean
  created_at: string
}

interface UserFormData {
  email: string
  password: string
  full_name: string
  employee_id: string
  phone: string
  area_assigned: string
  role: 'admin' | 'field_worker'
}

export default function UserManagementPage() {
  const navigate = useNavigate()
  const { user: currentUser } = useAppStore()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  
  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    password: '',
    full_name: '',
    employee_id: '',
    phone: '',
    area_assigned: '',
    role: 'field_worker'
  })

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') {
      navigate('/')
      toast.error('Admin access required')
      return
    }
    loadUsers()
  }, [currentUser])

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('social_workers')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Error loading users:', error)
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenCreate = () => {
    setEditingUser(null)
    setModalError(null)
    setFormData({
      email: '',
      password: '',
      full_name: '',
      employee_id: '',
      phone: '',
      area_assigned: '',
      role: 'field_worker'
    })
    setShowPassword(false)
    setShowModal(true)
  }

  const handleOpenEdit = (user: User) => {
    setEditingUser(user)
    setModalError(null)
    setFormData({
      email: '',
      password: '',
      full_name: user.full_name,
      employee_id: user.id,
      phone: user.phone || '',
      area_assigned: user.area_assigned || '',
      role: user.role
    })
    setShowPassword(false)
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setModalError(null)

    if (!formData.email || !formData.full_name) {
      setModalError('Email and Full Name are required')
      return
    }
    if (!editingUser && !formData.password) {
      setModalError('Password is required for new users')
      return
    }
    if (!editingUser && formData.password.length < 6) {
      setModalError('Password must be at least 6 characters')
      return
    }

    setSubmitting(true)
    try {
      if (editingUser) {
        const { error } = await supabase
          .from('social_workers')
          .update({
            full_name: formData.full_name,
            phone: formData.phone,
            area_assigned: formData.area_assigned,
            role: formData.role
          })
          .eq('id', editingUser.id)

        if (error) throw error
        toast.success('User updated successfully')
        setShowModal(false)
        loadUsers()
      } else {
        // Save admin session before signUp replaces it
        const { data: { session: adminSession } } = await supabase.auth.getSession()

        // Step 1: Create auth user
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: { data: { full_name: formData.full_name, role: formData.role } }
        })

        // Restore admin session immediately (signUp hijacks the session)
        if (adminSession) {
          await supabase.auth.setSession({
            access_token: adminSession.access_token,
            refresh_token: adminSession.refresh_token,
          })
        }

        if (authError) throw new Error(`Auth error: ${authError.message}`)
        if (!authData.user) throw new Error('User creation failed — no user returned from auth')

        // Step 2: Insert social_workers profile
        const { error: dbError } = await supabase
          .from('social_workers')
          .upsert({
            id: authData.user.id,
            full_name: formData.full_name,
            phone: formData.phone || null,
            area_assigned: formData.area_assigned || null,
            role: formData.role,
            is_active: true
          }, { onConflict: 'id' })

        if (dbError) {
          throw new Error(
            `Account created in Auth but profile save failed: ${dbError.message}. ` +
            `Ask your Supabase admin to add an INSERT policy on social_workers for admins.`
          )
        }

        toast.success('User created successfully')
        setShowModal(false)
        loadUsers()
      }
    } catch (error: any) {
      console.error('User save error:', error)
      setModalError(error.message || 'Failed to save user')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleActive = async (user: User) => {
    try {
      const { error } = await supabase
        .from('social_workers')
        .update({ is_active: !user.is_active })
        .eq('id', user.id)

      if (error) throw error
      toast.success(`User ${!user.is_active ? 'activated' : 'deactivated'}`)
      loadUsers()
    } catch (error) {
      toast.error('Failed to update user status')
    }
  }

  const handleDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return

    try {
      const { error } = await supabase
        .from('social_workers')
        .delete()
        .eq('id', userId)

      if (error) throw error
      toast.success('User deleted successfully')
      loadUsers()
    } catch (error) {
      toast.error('Failed to delete user')
    }
  }

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        fontFamily: "'DM Sans', sans-serif",
        background: '#f5f5f5'
      }}>
        <div style={{ fontSize: 16, color: '#888' }}>Loading...</div>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", minHeight: '100vh', background: '#f5f5f5' }}>
      {/* Header */}
      <div style={{ 
        background: '#1a6b4a', 
        color: '#fff', 
        padding: '14px 16px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: '#fff',
              padding: 8,
              borderRadius: 8,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <ArrowLeft size={20} />
          </button>
          
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 18 }}>User Management</div>
            <div style={{ fontSize: 12, opacity: 0.9 }}>
              {users.filter(u => u.is_active).length} active · {users.length} total
            </div>
          </div>

          <button
            onClick={handleOpenCreate}
            style={{
              background: '#fff',
              border: 'none',
              color: '#1a6b4a',
              padding: '8px 14px',
              borderRadius: 8,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              fontWeight: 600,
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            <UserPlus size={18} />
            Add User
          </button>
        </div>
      </div>

      {/* User List */}
      <div style={{ padding: '16px 16px 100px' }}>
        {users.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: 40, 
            background: '#fff', 
            borderRadius: 12,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <Users size={48} style={{ color: '#ccc', margin: '0 auto 16px' }} />
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>No users yet</div>
            <div style={{ fontSize: 14, color: '#888', marginBottom: 16 }}>
              Create your first user to get started
            </div>
            <button
              onClick={handleOpenCreate}
              style={{
                background: '#1a6b4a',
                color: '#fff',
                border: 'none',
                padding: '10px 20px',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <UserPlus size={16} />
              Add First User
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {users.filter(u => u.id !== currentUser?.id).map(user => (
              <div
                key={user.id}
                style={{
                  background: '#fff',
                  borderRadius: 12,
                  padding: 16,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  opacity: user.is_active ? 1 : 0.6,
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  {/* Avatar */}
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: user.role === 'admin' ? 
                      'linear-gradient(135deg, #dc2626, #b91c1c)' : 
                      'linear-gradient(135deg, #1a6b4a, #15563c)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: 18,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                  }}>
                    {user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>

                  {/* User Info */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 2 }}>
                      {user.full_name}
                    </div>
                    <div style={{ fontSize: 13, color: '#888' }}>{user.phone || user.area_assigned || 'No contact info'}</div>
                  </div>

                  {/* Role Badge */}
                  <div style={{
                    background: user.role === 'admin' ? '#fee2e2' : '#e1f5ee',
                    color: user.role === 'admin' ? '#dc2626' : '#1a6b4a',
                    padding: '4px 12px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}>
                    {user.role === 'admin' ? <Shield size={14} /> : <UserCheck size={14} />}
                    {user.role === 'admin' ? 'Admin' : 'Social Worker'}
                  </div>
                </div>

                {/* Additional Info */}
                {(user.phone || user.area_assigned) && (
                  <div style={{ 
                    fontSize: 13, 
                    color: '#666', 
                    marginBottom: 12,
                    paddingTop: 12,
                    borderTop: '1px solid #f0f0f0'
                  }}>
                    {user.phone && <div style={{ marginBottom: 4 }}>📞 {user.phone}</div>}
                    {user.area_assigned && <div>📍 {user.area_assigned}</div>}
                  </div>
                )}

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => handleToggleActive(user)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid #e5e5e5',
                      background: user.is_active ? '#fff' : '#1a6b4a',
                      color: user.is_active ? '#666' : '#fff',
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 500,
                      transition: 'all 0.2s'
                    }}
                  >
                    {user.is_active ? 'Deactivate' : 'Activate'}
                  </button>

                  <button
                    onClick={() => handleOpenEdit(user)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid #e5e5e5',
                      background: '#fff',
                      color: '#1a6b4a',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f5f5f5'}
                    onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                  >
                    <Edit2 size={16} />
                  </button>

                  <button
                    onClick={() => handleDelete(user.id)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid #fee2e2',
                      background: '#fff',
                      color: '#dc2626',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
                    onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <>
          {/* Backdrop */}
          <div 
            onClick={() => setShowModal(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 100,
              backdropFilter: 'blur(2px)',
              animation: 'fadeIn 0.2s'
            }}
          />

          {/* Modal Content */}
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: '#fff',
            borderRadius: 16,
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            zIndex: 101,
            width: '90%',
            maxWidth: 480,
            maxHeight: '90vh',
            overflow: 'auto',
            animation: 'slideUp 0.3s'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px 20px 16px',
              borderBottom: '1px solid #f0f0f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'sticky',
              top: 0,
              background: '#fff',
              zIndex: 1,
              borderRadius: '16px 16px 0 0'
            }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#111' }}>
                  {editingUser ? 'Edit User' : 'Create New User'}
                </div>
                <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>
                  {editingUser ? 'Update user information' : 'Add a new team member'}
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: '#f5f5f5',
                  border: 'none',
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#666',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#e5e5e5'}
                onMouseLeave={e => e.currentTarget.style.background = '#f5f5f5'}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} style={{ padding: 20 }}>
              {/* Email */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: 13, 
                  fontWeight: 600, 
                  marginBottom: 6,
                  color: '#333'
                }}>
                  Email Address *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  disabled={!!editingUser}
                  placeholder="user@shishumandir.org"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #e5e5e5',
                    borderRadius: 8,
                    fontSize: 14,
                    boxSizing: 'border-box',
                    background: editingUser ? '#f5f5f5' : '#fff',
                    color: editingUser ? '#888' : '#111'
                  }}
                />
              </div>

              {/* Password */}
              {!editingUser && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ 
                    display: 'block', 
                    fontSize: 13, 
                    fontWeight: 600, 
                    marginBottom: 6,
                    color: '#333'
                  }}>
                    Password *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Minimum 6 characters"
                      required
                      minLength={6}
                      style={{
                        width: '100%',
                        padding: '10px 40px 10px 12px',
                        border: '1px solid #e5e5e5',
                        borderRadius: 8,
                        fontSize: 14,
                        boxSizing: 'border-box'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: 10,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#888',
                        padding: 4,
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
                    Password must be at least 6 characters long
                  </div>
                </div>
              )}

              {/* Full Name & Employee ID */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={{ 
                    display: 'block', 
                    fontSize: 13, 
                    fontWeight: 600, 
                    marginBottom: 6,
                    color: '#333'
                  }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="John Doe"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #e5e5e5',
                      borderRadius: 8,
                      fontSize: 14,
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontSize: 13, 
                    fontWeight: 600, 
                    marginBottom: 6,
                    color: '#333'
                  }}>
                    Employee ID
                  </label>
                  <input
                    type="text"
                    value={formData.employee_id}
                    onChange={e => setFormData({ ...formData, employee_id: e.target.value })}
                    placeholder="EMP001"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #e5e5e5',
                      borderRadius: 8,
                      fontSize: 14,
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Phone & Area */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={{ 
                    display: 'block', 
                    fontSize: 13, 
                    fontWeight: 600, 
                    marginBottom: 6,
                    color: '#333'
                  }}>
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #e5e5e5',
                      borderRadius: 8,
                      fontSize: 14,
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontSize: 13, 
                    fontWeight: 600, 
                    marginBottom: 6,
                    color: '#333'
                  }}>
                    Area Assigned
                  </label>
                  <input
                    type="text"
                    value={formData.area_assigned}
                    onChange={e => setFormData({ ...formData, area_assigned: e.target.value })}
                    placeholder="North Zone"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #e5e5e5',
                      borderRadius: 8,
                      fontSize: 14,
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Role */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: 13, 
                  fontWeight: 600, 
                  marginBottom: 6,
                  color: '#333'
                }}>
                  Role *
                </label>
                <select
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value as 'admin' | 'field_worker' })}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #e5e5e5',
                    borderRadius: 8,
                    fontSize: 14,
                    boxSizing: 'border-box',
                    background: '#fff',
                    cursor: 'pointer'
                  }}
                >
                  <option value="field_worker">Social Worker</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              {/* Inline error */}
              {modalError && (
                <div style={{
                  background: '#fcebeb', border: '1px solid #f5c0c0', borderRadius: 8,
                  padding: '10px 13px', fontSize: 13, color: '#a32d2d', marginBottom: 16
                }}>
                  ⚠ {modalError}
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    flex: 1,
                    padding: '12px 20px',
                    border: '1px solid #e5e5e5',
                    background: '#fff',
                    color: '#666',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f5f5f5'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    flex: 1,
                    padding: '12px 20px',
                    border: 'none',
                    background: submitting ? '#5dcaa5' : '#1a6b4a',
                    color: '#fff',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {submitting ? 'Saving…' : editingUser ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  )
}