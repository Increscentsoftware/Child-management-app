import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { saveChildLocally } from '@/lib/db'
import { useAppStore } from '@/lib/store'
import type { Child } from '@/types'
import { ArrowLeft, Camera, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const inp = { 
  width:'100%',
  padding:'8px 10px',
  border:'1px solid #e5e5e5',
  borderRadius:8,
  fontSize:13,
  fontFamily:'inherit',
  outline:'none',
  background:'#fff',
  boxSizing:'border-box' as const,
  color:'#111' 
}

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

function Field({ label, required, children, error }: { 
  label: string
  required?: boolean
  children: React.ReactNode
  error?: string
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ 
        fontSize: 11, 
        color: error ? '#e24b4a' : '#666', 
        display: 'block', 
        marginBottom: 4,
        fontWeight: required ? 600 : 400
      }}>
        {label} {required && <span style={{ color: '#e24b4a' }}>*</span>}
      </label>
      {children}
      {error && (
        <div style={{ fontSize: 10, color: '#e24b4a', marginTop: 3 }}>{error}</div>
      )}
    </div>
  )
}

function Sec({ title }: { title: string }) {
  return (
    <div style={{ 
      fontSize: 11, 
      fontWeight: 600, 
      color: '#1a6b4a', 
      background: '#e1f5ee', 
      padding: '5px 10px', 
      borderRadius: 8, 
      margin: '14px 0 10px' 
    }}>
      {title}
    </div>
  )
}

export default function AddChildPage() {
  const navigate = useNavigate()
  const { user } = useAppStore()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [photo, setPhoto] = useState<File | null>(null)
  const [formFields, setFormFields] = useState<FormField[]>([])
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Load form fields from database
  useEffect(() => {
    loadFormFields()
  }, [])

  const loadFormFields = async () => {
    try {
      const { data, error } = await supabase
        .from('form_fields')
        .select('*')
        .eq('is_active', true)
        .order('display_order')

      if (error) throw error
      
      setFormFields(data || [])
      
      // Initialize form data with empty values
      const initialData: Record<string, any> = {}
      data?.forEach(field => {
        initialData[field.field_name] = field.field_type === 'boolean' ? false : ''
      })
      setFormData(initialData)
      
    } catch (error) {
      console.error('Error loading form fields:', error)
      toast.error('Failed to load form configuration')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (fieldName: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }))
    // Clear error when user starts typing
    if (errors[fieldName]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[fieldName]
        return newErrors
      })
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    formFields.forEach(field => {
      if (field.is_required) {
        const value = formData[field.field_name]
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          newErrors[field.field_name] = `${field.field_label} is required`
        }
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      toast.error('Please fill in all required fields')
      // Scroll to first error
      const firstError = Object.keys(errors)[0]
      if (firstError) {
        const element = document.getElementById(`field-${firstError}`)
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      return
    }

    setSaving(true)
    
    try {
      let photoUrl: string | undefined
      
      // Upload photo if exists
      if (photo) {
        const tempId = crypto.randomUUID()
        const path = `${tempId}/${photo.name}`
        const { error } = await supabase.storage
          .from('child-photos')
          .upload(path, photo)
          
        if (!error) {
          const { data: u } = supabase.storage
            .from('child-photos')
            .getPublicUrl(path)
          photoUrl = u.publicUrl
        }
      }

      // Create child object with dynamic data
      const child: Child = {
        id: crypto.randomUUID(),
        school_id: formData.school_id || `SM-${Date.now()}`,
        full_name: formData.full_name,
        admission_date: formData.admission_date,
        date_of_birth: formData.date_of_birth,
        sex: formData.sex,
        religion: formData.religion,
        mother_tongue: formData.mother_tongue,
        present_class: formData.present_class,
        category: formData.category,
        aadhar_no: formData.aadhar_no,
        normal_or_special: formData.normal_or_special || 'Normal',
        photo_url: photoUrl,

        // Father
        father_name: formData.father_name,
        father_age: formData.father_age,
        father_aadhar: formData.father_aadhar,
        father_mobile: formData.father_mobile,
        father_status: formData.father_status || 'Alive',
        father_occupation: formData.father_occupation,
        father_earnings: formData.father_earnings,
        father_education: formData.father_education,
        father_habits: formData.father_habits,
        father_health: formData.father_health,
        father_dv: formData.father_dv === true,
        father_extramarital: formData.father_extramarital === true,
        father_origin: formData.father_origin,

        // Mother
        mother_name: formData.mother_name,
        mother_age: formData.mother_age,
        mother_aadhar: formData.mother_aadhar,
        mother_mobile: formData.mother_mobile,
        mother_status: formData.mother_status || 'Alive',
        mother_occupation: formData.mother_occupation,
        mother_earnings: formData.mother_earnings,
        mother_education: formData.mother_education,
        mother_habits: formData.mother_habits,
        mother_health: formData.mother_health,
        mother_dv: formData.mother_dv === true,
        family_planning_op: formData.family_planning_op === true,
        mother_origin: formData.mother_origin,

        // Family
        year_of_marriage: formData.year_of_marriage,
        marriage_type: formData.marriage_type,

        // Sibling
        sibling_name: formData.sibling_name,
        sibling_age: formData.sibling_age,
        sibling_sex: formData.sibling_sex,
        sibling_education: formData.sibling_education,

        // Financial
        avg_income_father: formData.avg_income_father,
        avg_income_mother: formData.avg_income_mother,
        other_income: formData.other_income,
        num_dependents: formData.num_dependents,
        debts: formData.debts,
        savings: formData.savings,

        // Living
        area: formData.area,
        house_size: formData.house_size,
        house_roof: formData.house_roof,
        house_floor: formData.house_floor,
        house_ownership: formData.house_ownership,
        rent_per_month: formData.rent_per_month,
        advance_paid: formData.advance_paid,
        vehicles: formData.vehicles,

        // Health
        height_cm: formData.height_cm,
        weight_kg: formData.weight_kg,
        child_health: formData.child_health,
        meals_per_day: formData.meals_per_day,
        food_type: formData.food_type,
        medical_help_from: formData.medical_help_from,

        // Other
        mother_life_skills: false,
        father_life_skills: false,
        special_remarks: formData.special_remarks,

        // Meta
        created_by: user?.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_active: true,
        
        // Store ALL dynamic data in data_json
        data_json: formData
      }

      // Save to Supabase
      const { error: insertError } = await supabase
        .from('children')
        .insert({
          ...child,
          data_json: formData
        })

      if (insertError) throw insertError

      // Also save locally for offline
      await saveChildLocally(child)
      
      toast.success('Child record saved successfully!')
      navigate(`/children/${child.id}`)
      
    } catch (err: any) {
      toast.error(err.message || 'Failed to save child record')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const renderField = (field: FormField) => {
    const value = formData[field.field_name] || ''
    const error = errors[field.field_name]

    const baseStyle = {
      ...inp,
      borderColor: error ? '#e24b4a' : '#e5e5e5'
    }

    switch (field.field_type) {
      case 'text':
      case 'email':
      case 'tel':
        return (
          <input
            id={`field-${field.field_name}`}
            type={field.field_type}
            value={value}
            onChange={e => handleChange(field.field_name, e.target.value)}
            placeholder={field.placeholder}
            style={baseStyle}
          />
        )

      case 'number':
        return (
          <input
            id={`field-${field.field_name}`}
            type="number"
            value={value}
            onChange={e => handleChange(field.field_name, e.target.value)}
            placeholder={field.placeholder}
            style={baseStyle}
          />
        )

      case 'date':
        return (
          <input
            id={`field-${field.field_name}`}
            type="date"
            value={value}
            onChange={e => handleChange(field.field_name, e.target.value)}
            style={baseStyle}
          />
        )

      case 'select':
        return (
          <select
            id={`field-${field.field_name}`}
            value={value}
            onChange={e => handleChange(field.field_name, e.target.value)}
            style={baseStyle}
          >
            <option value="">— select —</option>
            {field.field_options.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        )

      case 'textarea':
        return (
          <textarea
            id={`field-${field.field_name}`}
            value={value}
            onChange={e => handleChange(field.field_name, e.target.value)}
            placeholder={field.placeholder}
            style={{ 
              ...baseStyle, 
              minHeight: 55, 
              resize: 'vertical' as const 
            }}
          />
        )

      case 'boolean':
        return (
          <select
            id={`field-${field.field_name}`}
            value={value ? 'true' : 'false'}
            onChange={e => handleChange(field.field_name, e.target.value === 'true')}
            style={baseStyle}
          >
            <option value="false">No</option>
            <option value="true">Yes</option>
          </select>
        )

      default:
        return (
          <input
            id={`field-${field.field_name}`}
            type="text"
            value={value}
            onChange={e => handleChange(field.field_name, e.target.value)}
            placeholder={field.placeholder}
            style={baseStyle}
          />
        )
    }
  }

  // Group fields by section
  const fieldsBySection = formFields.reduce((acc, field) => {
    if (!acc[field.section]) {
      acc[field.section] = []
    }
    acc[field.section].push(field)
    return acc
  }, {} as Record<string, FormField[]>)

  const sectionTitles: Record<string, string> = {
    general: 'General Information',
    father: 'Father\'s Information',
    mother: 'Mother\'s Information',
    family: 'Family Background',
    sibling: 'Sibling',
    financial: 'Financial Situation',
    living: 'Living Conditions',
    health: 'Child Health & Information',
    remarks: 'Social Worker Details'
  }

  const g2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }

  if (loading) {
    return (
      <div style={{ 
        fontFamily: "'DM Sans', system-ui, sans-serif",
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        flexDirection: 'column',
        gap: 12
      }}>
        <Loader2 size={32} className="animate-spin" color="#1a6b4a" />
        <div style={{ color: '#666', fontSize: 14 }}>Loading form...</div>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div style={{ 
        background: '#1a6b4a', 
        color: '#fff', 
        padding: '12px 14px', 
        display: 'flex', 
        alignItems: 'center', 
        gap: 10 
      }}>
        <button 
          onClick={() => navigate('/children')} 
          style={{ 
            background: 'none', 
            border: 'none', 
            color: '#fff', 
            cursor: 'pointer', 
            padding: 2 
          }}
        >
          <ArrowLeft size={20} />
        </button>
        <div style={{ fontWeight: 600, fontSize: 15 }}>Add New Child (Dynamic Form)</div>
      </div>

      <form onSubmit={onSubmit} style={{ padding: '12px 14px 90px' }}>
        {/* Photo */}
        <div 
          style={{ 
            border: '1.5px dashed #ddd', 
            borderRadius: 10, 
            padding: 14, 
            textAlign: 'center', 
            cursor: 'pointer', 
            marginBottom: 12 
          }}
          onClick={() => document.getElementById('photo-in')?.click()}
        >
          <Camera size={22} color="#999" style={{ margin: '0 auto 5px', display: 'block' }} />
          <div style={{ fontSize: 11, color: '#999' }}>
            {photo ? photo.name : 'Tap to capture or upload child photo'}
          </div>
          <input 
            id="photo-in" 
            type="file" 
            accept="image/*" 
            capture="environment" 
            style={{ display: 'none' }}
            onChange={e => e.target.files?.[0] && setPhoto(e.target.files[0])} 
          />
        </div>

        {/* Dynamic form sections */}
        {Object.entries(fieldsBySection).map(([section, fields]) => (
          <div key={section}>
            <Sec title={sectionTitles[section] || section} />
            
            {fields.map((field, index) => {
              // Check if next field should be on same row (for 2-column layout)
              const nextField = fields[index + 1]
              const shouldPair = nextField && 
                ['text', 'number', 'date', 'select', 'tel', 'email'].includes(field.field_type) &&
                ['text', 'number', 'date', 'select', 'tel', 'email'].includes(nextField.field_type)

              if (shouldPair && index % 2 === 0) {
                return (
                  <div key={field.id} style={g2}>
                    <Field 
                      label={field.field_label} 
                      required={field.is_required}
                      error={errors[field.field_name]}
                    >
                      {renderField(field)}
                    </Field>
                    <Field 
                      label={nextField.field_label} 
                      required={nextField.is_required}
                      error={errors[nextField.field_name]}
                    >
                      {renderField(nextField)}
                    </Field>
                  </div>
                )
              } else if (shouldPair && index % 2 === 1) {
                // Skip because already rendered in pair
                return null
              } else {
                return (
                  <Field 
                    key={field.id}
                    label={field.field_label} 
                    required={field.is_required}
                    error={errors[field.field_name]}
                  >
                    {renderField(field)}
                  </Field>
                )
              }
            })}
          </div>
        ))}

        <button 
          type="submit" 
          disabled={saving} 
          style={{
            width: '100%', 
            padding: 12, 
            background: saving ? '#5dcaa5' : '#1a6b4a', 
            color: '#fff',
            border: 'none', 
            borderRadius: 10, 
            fontSize: 14, 
            fontWeight: 600, 
            cursor: saving ? 'not-allowed' : 'pointer', 
            fontFamily: 'inherit',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8
          }}
        >
          {saving && <Loader2 size={16} className="animate-spin" />}
          {saving ? 'Saving…' : 'Save Child Record'}
        </button>

        <button 
          type="button" 
          onClick={() => navigate('/children')} 
          style={{
            width: '100%', 
            padding: 11, 
            background: 'transparent', 
            color: '#1a6b4a',
            border: '1px solid #1a6b4a', 
            borderRadius: 10, 
            fontSize: 14, 
            cursor: 'pointer', 
            fontFamily: 'inherit', 
            marginTop: 8
          }}
        >
          Cancel
        </button>
      </form>
    </div>
  )
}