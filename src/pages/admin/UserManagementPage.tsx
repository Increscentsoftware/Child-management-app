import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { usePermissions } from '@/hooks/usePermissions'
import type { SocialWorker } from '@/types'
import { ArrowLeft, UserPlus, Trash2, Edit, X, Eye, EyeOff, Settings } from 'lucide-react'
import toast from 'react-hot-toast'

interface UserFormData {
  email: string
  password: string
  full_name: string
  employee_id: string
  role: 'admin' | 'field_worker'
  phone: string
  area_assigned: string
}

export default function UserManagementPage() {
  const navigate = useNavigate()
  const { canManageUsers } = usePermissions()
  const [users, setUsers] = useState<SocialWorker[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState<SocialWorker | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    password: '',
    full_name: '',
    employee_id: '',
    role: 'field_worker',
    phone: '',
    area_assigned: ''
  })

  useEffect(() => {
    if (!canManageUsers) {
      toast.error('Access denied')
      navigate('/')
      return
    }
    loadUsers()
  }, [canManageUsers])

  const loadUsers = async () => {
    const { data, error } = await supabase
      .from('social_workers')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error && data) setUsers(data)
    setLoading(false)
  }

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      full_name: '',
      employee_id: '',
      role: 'field_worker',
      phone: '',
      area_assigned: ''
    })
    setEditingUser(null)
    setShowForm(false)
  }

  const openEditForm = (user: SocialWorker) => {
    setEditingUser(user)
    setFormData({
      email: user.id, // We'll use ID for edit, not email
      password: '', // Password not needed for edit
      full_name: user.full_name,
      employee_id: user.employee_id || '',
      role: user.role as 'admin' | 'field_worker',
      phone: user.phone || '',
      area_assigned: user.area_assigned || ''
    })
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      if (editingUser) {
        // Update existing user
        const { error } = await supabase
          .from('social_workers')
          .update({
            full_name: formData.full_name,
            employee_id: formData.employee_id,
            role: formData.role,
            phone: formData.phone,
            area_assigned: formData.area_assigned
          })
          .eq('id', editingUser.id)

        if (error) throw error
        toast.success('User updated successfully')
      } else {
        // Create new user
        // Step 1: Create auth user
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.full_name
            }
          }
        })

        if (authError) throw authError
        if (!authData.user) throw new Error('Failed to create user')

        // Step 2: Create social worker record
        const { error: workerError } = await supabase
          .from('social_workers')
          .insert({
            id: authData.user.id,
            full_name: formData.full_name,
            employee_id: formData.employee_id,
            role: formData.role,
            phone: formData.phone,
            area_assigned: formData.area_assigned,
            is_active: true
          })

        if (workerError) throw workerError
        toast.success('User created successfully. Check email for verification.')
      }

      resetForm()
      loadUsers()
    } catch (error: any) {
      console.error('Error:', error)
      toast.error(error.message || 'Failed to save user')
    } finally {
      setSubmitting(false)
    }
  }

  const deleteUser = async (user: SocialWorker) => {
    if (!confirm(`Delete ${user.full_name}? This cannot be undone.`)) return

    try {
      // Delete from social_workers table
      const { error: dbError } = await supabase
        .from('social_workers')
        .delete()
        .eq('id', user.id)

      if (dbError) throw dbError

      // Note: Auth user deletion requires admin API
      // For now, just deactivate instead
      await supabase
        .from('social_workers')
        .update({ is_active: false })
        .eq('id', user.id)

      toast.success('User removed')
      loadUsers()
    } catch (error: any) {
      toast.error('Failed to delete user')
    }
  }

  const toggleActive = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from('social_workers')
      .update({ is_active: !isActive })
      .eq('id', id)
    
    if (!error) {
      toast.success(isActive ? 'User deactivated' : 'User activated')
      loadUsers()
    }
  }

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", minHeight: '100vh', background: '#f5f5f5' }}>
      {/* Header */}
      <div style={{ 
        background: '#1a6b4a', 
        color: '#fff', 
        padding: '14px 16px', 
        display: 'flex', 
        alignItems: 'center', 
        gap: 12,
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <button 
          onClick={() => navigate('/')} 
          style={{ 
            background: 'none', 
            border: 'none', 
            color: '#fff', 
            cursor: 'pointer', 
            padding: 4,
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <ArrowLeft size={22} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 17 }}>User Management</div>
          <div style={{ fontSize: 12, opacity: 0.9 }}>
            {users.filter(u => u.is_active).length} active · {users.length} total
          </div>
        </div>
        <button 
          onClick={() => {
            resetForm()
            setShowForm(true)
          }} 
          style={{
            background: '#fff',
            border: 'none',
            color: '#1a6b4a',
            borderRadius: 8,
            padding: '8px 14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            fontWeight: 600,
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          <UserPlus size={16} /> Add User
        </button>

        <button 
          onClick={() => navigate('/admin/form-fields')} 
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            color: '#fff',
            borderRadius: 8,
            padding: '8px 14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            fontWeight: 600
          }}
        >
          <Settings size={16} /> Form Fields
        </button>
      </div>

      {/* User List */}
      <div style={{ padding: '16px 16px 100px' }}>
        {loading ? (
          <div style={{ 
            textAlign: 'center', 
            padding: 60, 
            color: '#999' 
          }}>
            <div style={{ fontSize: 14 }}>Loading users...</div>
          </div>
        ) : users.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: 60, 
            color: '#999' 
          }}>
            <UserPlus size={48} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <div style={{ fontSize: 14 }}>No users found</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Click "Add User" to create one</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {users.map(user => (
              <div 
                key={user.id} 
                style={{
                  background: '#fff',
                  borderRadius: 12,
                  padding: '14px 16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  border: user.is_active ? '1px solid #e5e5e5' : '1px solid #f5e5e5'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  {/* Avatar */}
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: user.role === 'admin' ? '#fef3c7' : '#dbeafe',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                    fontWeight: 600,
                    color: user.role === 'admin' ? '#d97706' : '#2563eb',
                    flexShrink: 0
                  }}>
                    {user.full_name.charAt(0).toUpperCase()}
                  </div>

                  {/* User Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ 
                      fontSize: 15, 
                      fontWeight: 600, 
                      color: '#111',
                      marginBottom: 4
                    }}>
                      {user.full_name}
                    </div>
                    
                    <div style={{ 
                      fontSize: 12, 
                      color: '#666',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 8,
                      marginBottom: 6
                    }}>
                      {user.employee_id && (
                        <span>ID: {user.employee_id}</span>
                      )}
                      <span style={{
                        background: user.role === 'admin' ? '#fef3c7' : '#dbeafe',
                        color: user.role === 'admin' ? '#d97706' : '#2563eb',
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 600
                      }}>
                        {user.role === 'admin' ? 'ADMIN' : 'USER'}
                      </span>
                    </div>

                    {user.phone && (
                      <div style={{ fontSize: 12, color: '#888', marginBottom: 2 }}>
                        📱 {user.phone}
                      </div>
                    )}

                    {user.area_assigned && (
                      <div style={{ fontSize: 12, color: '#888' }}>
                        📍 {user.area_assigned}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: 6,
                    alignItems: 'flex-end'
                  }}>
                    <button
                      onClick={() => toggleActive(user.id, user.is_active)}
                      style={{
                        padding: '5px 12px',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 600,
                        border: 'none',
                        cursor: 'pointer',
                        background: user.is_active ? '#dcfce7' : '#fee2e2',
                        color: user.is_active ? '#15803d' : '#dc2626'
                      }}
                    >
                      {user.is_active ? '✓ Active' : '✗ Inactive'}
                    </button>

                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => openEditForm(user)}
                        style={{
                          padding: 6,
                          borderRadius: 6,
                          border: '1px solid #e5e5e5',
                          background: '#fff',
                          color: '#666',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        title="Edit user"
                      >
                        <Edit size={14} />
                      </button>

                      <button
                        onClick={() => deleteUser(user)}
                        style={{
                          padding: 6,
                          borderRadius: 6,
                          border: 'none',
                          background: '#fee2e2',
                          color: '#dc2626',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        title="Delete user"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit User Modal */}
      {showForm && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 16
          }} 
          onClick={resetForm}
        >
          <div 
            style={{
              background: '#fff',
              borderRadius: 16,
              padding: 24,
              maxWidth: 440,
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto'
            }} 
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              marginBottom: 20
            }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
                {editingUser ? 'Edit User' : 'Add New User'}
              </h3>
              <button
                onClick={resetForm}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                  color: '#666'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                
                {/* Email (only for new users) */}
                {!editingUser && (
                  <div>
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
                      required
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      placeholder="user@example.com"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #e5e5e5',
                        borderRadius: 8,
                        fontSize: 14,
                        fontFamily: 'inherit'
                      }}
                    />
                  </div>
                )}

                {/* Password (only for new users) */}
                {!editingUser && (
                  <div>
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
                        required
                        value={formData.password}
                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                        placeholder="Minimum 6 characters"
                        minLength={6}
                        style={{
                          width: '100%',
                          padding: '10px 42px 10px 12px',
                          border: '1px solid #e5e5e5',
                          borderRadius: 8,
                          fontSize: 14,
                          fontFamily: 'inherit'
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
                          padding: 4,
                          display: 'flex',
                          alignItems: 'center',
                          color: '#666'
                        }}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Full Name */}
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
                    required
                    value={formData.full_name}
                    onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="John Doe"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #e5e5e5',
                      borderRadius: 8,
                      fontSize: 14,
                      fontFamily: 'inherit'
                    }}
                  />
                </div>

                {/* Employee ID */}
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
                      fontFamily: 'inherit'
                    }}
                  />
                </div>

                {/* Role */}
                <div>
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
                    required
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value as 'admin' | 'field_worker' })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #e5e5e5',
                      borderRadius: 8,
                      fontSize: 14,
                      fontFamily: 'inherit',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="field_worker">Regular User (Field Worker)</option>
                    <option value="admin">Admin (Full Access)</option>
                  </select>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
                    {formData.role === 'admin' 
                      ? '✓ Can manage users and all data' 
                      : '✓ Can add/edit children data'}
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label style={{ 
                    display: 'block', 
                    fontSize: 13, 
                    fontWeight: 600, 
                    marginBottom: 6,
                    color: '#333'
                  }}>
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 9876543210"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #e5e5e5',
                      borderRadius: 8,
                      fontSize: 14,
                      fontFamily: 'inherit'
                    }}
                  />
                </div>

                {/* Area Assigned */}
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
                    placeholder="e.g., North Bangalore"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #e5e5e5',
                      borderRadius: 8,
                      fontSize: 14,
                      fontFamily: 'inherit'
                    }}
                  />
                </div>

                {/* Submit Buttons */}
                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={resetForm}
                    disabled={submitting}
                    style={{
                      flex: 1,
                      padding: 12,
                      background: '#f5f5f5',
                      color: '#666',
                      border: 'none',
                      borderRadius: 8,
                      cursor: 'pointer',
                      fontSize: 14,
                      fontWeight: 600
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    style={{
                      flex: 1,
                      padding: 12,
                      background: '#1a6b4a',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      cursor: submitting ? 'not-allowed' : 'pointer',
                      fontSize: 14,
                      fontWeight: 600,
                      opacity: submitting ? 0.6 : 1
                    }}
                  >
                    {submitting ? 'Saving...' : editingUser ? 'Update User' : 'Create User'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}