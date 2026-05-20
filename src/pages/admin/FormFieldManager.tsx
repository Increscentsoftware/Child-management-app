import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { usePermissions } from '@/hooks/usePermissions'
import { ArrowLeft, Plus, Edit, Trash2, GripVertical, X, Save } from 'lucide-react'
import toast from 'react-hot-toast'

interface FormField {
  id: string
  field_name: string
  field_label: string
  field_type: string
  field_options: string[]
  is_required: boolean
  is_active: boolean
  display_order: number
  section: string
  placeholder?: string
  help_text?: string
}

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Select / Dropdown' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'boolean', label: 'Yes/No' },
  { value: 'tel', label: 'Phone Number' },
  { value: 'email', label: 'Email' }
]

const SECTIONS = [
  { value: 'general', label: 'General Information' },
  { value: 'father', label: 'Father Information' },
  { value: 'mother', label: 'Mother Information' },
  { value: 'family', label: 'Family Background' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'financial', label: 'Financial Situation' },
  { value: 'living', label: 'Living Conditions' },
  { value: 'health', label: 'Child Health' },
  { value: 'remarks', label: 'Remarks' }
]

function FormFieldManager() {
  const navigate = useNavigate()
  const { canManageUsers } = usePermissions()
  const [fields, setFields] = useState<FormField[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingField, setEditingField] = useState<FormField | null>(null)

  const [formData, setFormData] = useState({
    field_name: '',
    field_label: '',
    field_type: 'text',
    field_options: '',
    is_required: false,
    section: 'general',
    placeholder: '',
    help_text: ''
  })

  useEffect(() => {
    if (!canManageUsers) {
      toast.error('Access denied')
      navigate('/')
      return
    }
    loadFields()
  }, [canManageUsers])

  const loadFields = async () => {
    try {
      const { data, error } = await supabase
        .from('form_fields')
        .select('*')
        .order('display_order')

      if (error) throw error
      setFields(data || [])
    } catch (error: any) {
      toast.error('Failed to load fields')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      field_name: '',
      field_label: '',
      field_type: 'text',
      field_options: '',
      is_required: false,
      section: 'general',
      placeholder: '',
      help_text: ''
    })
    setEditingField(null)
    setShowForm(false)
  }

  const openEditForm = (field: FormField) => {
    setEditingField(field)
    setFormData({
      field_name: field.field_name,
      field_label: field.field_label,
      field_type: field.field_type,
      field_options: field.field_options.join('\n'),
      is_required: field.is_required,
      section: field.section,
      placeholder: field.placeholder || '',
      help_text: field.help_text || ''
    })
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const options = formData.field_options
        .split('\n')
        .map(o => o.trim())
        .filter(Boolean)

      if (editingField) {
        // Update
        const { error } = await supabase
          .from('form_fields')
          .update({
            field_label: formData.field_label,
            field_type: formData.field_type,
            field_options: options,
            is_required: formData.is_required,
            section: formData.section,
            placeholder: formData.placeholder,
            help_text: formData.help_text
          })
          .eq('id', editingField.id)

        if (error) throw error
        toast.success('Field updated')
      } else {
        // Create
        const { error } = await supabase
          .from('form_fields')
          .insert({
            field_name: formData.field_name.toLowerCase().replace(/\s+/g, '_'),
            field_label: formData.field_label,
            field_type: formData.field_type,
            field_options: options,
            is_required: formData.is_required,
            section: formData.section,
            placeholder: formData.placeholder,
            help_text: formData.help_text,
            display_order: fields.length + 1
          })

        if (error) throw error
        toast.success('Field added')
      }

      resetForm()
      loadFields()
    } catch (error: any) {
      toast.error(error.message || 'Failed to save field')
    }
  }

  const deleteField = async (field: FormField) => {
    if (!confirm(`Delete field "${field.field_label}"?`)) return

    try {
      const { error } = await supabase
        .from('form_fields')
        .delete()
        .eq('id', field.id)

      if (error) throw error
      toast.success('Field deleted')
      loadFields()
    } catch (error: any) {
      toast.error('Failed to delete field')
    }
  }

  const toggleActive = async (field: FormField) => {
    try {
      const { error } = await supabase
        .from('form_fields')
        .update({ is_active: !field.is_active })
        .eq('id', field.id)

      if (error) throw error
      toast.success(field.is_active ? 'Field hidden' : 'Field shown')
      loadFields()
    } catch (error: any) {
      toast.error('Failed to toggle field')
    }
  }

  const groupedFields = fields.reduce((acc, field) => {
    if (!acc[field.section]) {
      acc[field.section] = []
    }
    acc[field.section].push(field)
    return acc
  }, {} as Record<string, FormField[]>)

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", minHeight: '100vh', background: '#f5f5f5' }}>
      {/* Header */}
      <div style={{ 
        background: '#1a6b4a', 
        color: '#fff', 
        padding: '14px 16px', 
        display: 'flex', 
        alignItems: 'center', 
        gap: 12 
      }}>
        <button 
          onClick={() => navigate('/admin/users')} 
          style={{ 
            background: 'none', 
            border: 'none', 
            color: '#fff', 
            cursor: 'pointer', 
            padding: 4 
          }}
        >
          <ArrowLeft size={22} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 17 }}>Form Field Manager</div>
          <div style={{ fontSize: 12, opacity: 0.9 }}>
            {fields.filter(f => f.is_active).length} active · {fields.length} total
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
            fontWeight: 600
          }}
        >
          <Plus size={16} /> Add Field
        </button>
      </div>

      {/* Fields by Section */}
      <div style={{ padding: '16px 16px 100px' }}>
        {Object.entries(groupedFields).map(([section, sectionFields]) => (
          <div key={section} style={{ marginBottom: 20 }}>
            <div style={{ 
              fontSize: 13, 
              fontWeight: 600, 
              color: '#1a6b4a',
              background: '#e1f5ee',
              padding: '6px 12px',
              borderRadius: 8,
              marginBottom: 10
            }}>
              {SECTIONS.find(s => s.value === section)?.label || section} ({sectionFields.length})
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sectionFields.map(field => (
                <div 
                  key={field.id}
                  style={{
                    background: '#fff',
                    borderRadius: 10,
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    border: field.is_active ? '1px solid #e5e5e5' : '1px solid #f5e5e5',
                    opacity: field.is_active ? 1 : 0.6
                  }}
                >
                  <GripVertical size={16} color="#ccc" />

                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#111', marginBottom: 2 }}>
                      {field.field_label}
                      {field.is_required && (
                        <span style={{ color: '#e24b4a', marginLeft: 4 }}>*</span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: '#888' }}>
                      {field.field_name} · {field.field_type}
                      {field.field_options.length > 0 && ` · ${field.field_options.length} options`}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => toggleActive(field)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 600,
                        border: 'none',
                        cursor: 'pointer',
                        background: field.is_active ? '#dcfce7' : '#fee2e2',
                        color: field.is_active ? '#15803d' : '#dc2626'
                      }}
                    >
                      {field.is_active ? 'Active' : 'Hidden'}
                    </button>

                    <button
                      onClick={() => openEditForm(field)}
                      style={{
                        padding: 6,
                        borderRadius: 6,
                        border: '1px solid #e5e5e5',
                        background: '#fff',
                        cursor: 'pointer',
                        display: 'flex'
                      }}
                    >
                      <Edit size={14} />
                    </button>

                    <button
                      onClick={() => deleteField(field)}
                      style={{
                        padding: 6,
                        borderRadius: 6,
                        border: 'none',
                        background: '#fee2e2',
                        color: '#dc2626',
                        cursor: 'pointer',
                        display: 'flex'
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
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
              maxWidth: 500,
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto'
            }} 
            onClick={e => e.stopPropagation()}
          >
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              marginBottom: 20
            }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
                {editingField ? 'Edit Field' : 'Add New Field'}
              </h3>
              <button
                onClick={resetForm}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 4
                }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                
                {/* Field Name (only for new) */}
                {!editingField && (
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, display: 'block' }}>
                      Field Name (Internal) *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.field_name}
                      onChange={e => setFormData({ ...formData, field_name: e.target.value })}
                      placeholder="e.g., child_blood_group"
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        border: '1px solid #e5e5e5',
                        borderRadius: 8,
                        fontSize: 13
                      }}
                    />
                    <div style={{ fontSize: 11, color: '#888', marginTop: 3 }}>
                      Lowercase, underscores only. Cannot be changed later.
                    </div>
                  </div>
                )}

                {/* Field Label */}
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, display: 'block' }}>
                    Field Label (Display) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.field_label}
                    onChange={e => setFormData({ ...formData, field_label: e.target.value })}
                    placeholder="e.g., Child's Blood Group"
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      border: '1px solid #e5e5e5',
                      borderRadius: 8,
                      fontSize: 13
                    }}
                  />
                </div>

                {/* Field Type */}
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, display: 'block' }}>
                    Field Type *
                  </label>
                  <select
                    required
                    value={formData.field_type}
                    onChange={e => setFormData({ ...formData, field_type: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      border: '1px solid #e5e5e5',
                      borderRadius: 8,
                      fontSize: 13
                    }}
                  >
                    {FIELD_TYPES.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Options (for select type) */}
                {formData.field_type === 'select' && (
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, display: 'block' }}>
                      Options (one per line)
                    </label>
                    <textarea
                      value={formData.field_options}
                      onChange={e => setFormData({ ...formData, field_options: e.target.value })}
                      placeholder="A+&#10;B+&#10;O+&#10;AB+"
                      rows={5}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        border: '1px solid #e5e5e5',
                        borderRadius: 8,
                        fontSize: 13,
                        fontFamily: 'monospace'
                      }}
                    />
                  </div>
                )}

                {/* Section */}
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, display: 'block' }}>
                    Section *
                  </label>
                  <select
                    required
                    value={formData.section}
                    onChange={e => setFormData({ ...formData, section: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      border: '1px solid #e5e5e5',
                      borderRadius: 8,
                      fontSize: 13
                    }}
                  >
                    {SECTIONS.map(section => (
                      <option key={section.value} value={section.value}>
                        {section.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Required */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    id="is-required"
                    checked={formData.is_required}
                    onChange={e => setFormData({ ...formData, is_required: e.target.checked })}
                  />
                  <label htmlFor="is-required" style={{ fontSize: 13, cursor: 'pointer' }}>
                    Required field (must be filled)
                  </label>
                </div>

                {/* Placeholder */}
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, display: 'block' }}>
                    Placeholder Text
                  </label>
                  <input
                    type="text"
                    value={formData.placeholder}
                    onChange={e => setFormData({ ...formData, placeholder: e.target.value })}
                    placeholder="e.g., Select blood group"
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      border: '1px solid #e5e5e5',
                      borderRadius: 8,
                      fontSize: 13
                    }}
                  />
                </div>

                {/* Submit */}
                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={resetForm}
                    style={{
                      flex: 1,
                      padding: 12,
                      background: '#f5f5f5',
                      border: 'none',
                      borderRadius: 8,
                      cursor: 'pointer',
                      fontSize: 14
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      flex: 1,
                      padding: 12,
                      background: '#1a6b4a',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      cursor: 'pointer',
                      fontSize: 14,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6
                    }}
                  >
                    <Save size={16} />
                    {editingField ? 'Update' : 'Add'} Field
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

export default FormFieldManager