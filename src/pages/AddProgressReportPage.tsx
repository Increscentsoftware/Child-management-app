import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/lib/store'
import { ArrowLeft, BookOpen, Award, Activity, FileText, Upload } from 'lucide-react'

interface ProgressReportForm {
  report_type: 'academic' | 'behavioral' | 'achievement' | 'health' | 'other'
  title: string
  description: string
  report_date: string
  academic_year: string
  term?: 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'Half-Yearly' | 'Annual'
  
  // Academic specific
  subject?: string
  marks_obtained?: number
  total_marks?: number
  grade?: string
  rank?: number
  
  // Behavioral specific
  behavior_rating?: 'Excellent' | 'Good' | 'Satisfactory' | 'Needs Improvement'
  attendance_percentage?: number
  discipline_notes?: string
  
  // Achievement specific
  achievement_type?: 'Sports' | 'Cultural' | 'Academic' | 'Leadership' | 'Other'
  achievement_level?: 'School' | 'District' | 'State' | 'National' | 'International'
  position?: string
  
  // Health specific
  health_status?: string
  bmi?: number
  vision?: string
  dental?: string
  
  teacher_name: string
}

const inp = {
  width: '100%',
  padding: '9px 11px',
  border: '1px solid #e5e5e5',
  borderRadius: 8,
  fontSize: 13,
  fontFamily: 'inherit',
  outline: 'none',
  background: '#fff',
  boxSizing: 'border-box' as const,
  color: '#111'
}

function Field({ label, required, children, help }: {
  label: string
  required?: boolean
  children: React.ReactNode
  help?: string
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{
        fontSize: 11,
        color: '#666',
        display: 'block',
        marginBottom: 5,
        fontWeight: required ? 600 : 400
      }}>
        {label} {required && <span style={{ color: '#e24b4a' }}>*</span>}
      </label>
      {children}
      {help && (
        <div style={{ fontSize: 10, color: '#999', marginTop: 3, fontStyle: 'italic' }}>
          {help}
        </div>
      )}
    </div>
  )
}

function Section({ title, icon: Icon }: { title: string; icon: any }) {
  return (
    <div style={{
      fontSize: 12,
      fontWeight: 600,
      color: '#1a6b4a',
      background: '#e1f5ee',
      padding: '8px 12px',
      borderRadius: 8,
      margin: '16px 0 12px',
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }}>
      <Icon size={14} />
      {title}
    </div>
  )
}

export default function AddProgressReportPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAppStore()
  const [saving, setSaving] = useState(false)
  const [attachments, setAttachments] = useState<File[]>([])

  const { register, handleSubmit, watch, formState: { errors } } = useForm<ProgressReportForm>({
    defaultValues: {
      report_type: 'academic',
      teacher_name: user?.full_name || '',
      report_date: new Date().toISOString().slice(0, 10),
      academic_year: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`
    }
  })

  const reportType = watch('report_type')

  const onSubmit = async (data: ProgressReportForm) => {
    if (!id) return
    setSaving(true)

    try {
      // Upload attachments if any
      const uploadedUrls: string[] = []
      for (const file of attachments) {
        const path = `progress-reports/${id}/${Date.now()}_${file.name}`
        const { error: uploadError } = await supabase.storage
          .from('child-documents')
          .upload(path, file)

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('child-documents')
            .getPublicUrl(path)
          uploadedUrls.push(urlData.publicUrl)
        }
      }

      // Create progress report
      const report = {
        id: crypto.randomUUID(),
        child_id: id,
        report_type: data.report_type,
        title: data.title,
        description: data.description,
        report_date: data.report_date,
        academic_year: data.academic_year,
        term: data.term,
        subject: data.subject,
        marks_obtained: data.marks_obtained,
        total_marks: data.total_marks,
        grade: data.grade,
        rank: data.rank,
        behavior_rating: data.behavior_rating,
        attendance_percentage: data.attendance_percentage,
        discipline_notes: data.discipline_notes,
        achievement_type: data.achievement_type,
        achievement_level: data.achievement_level,
        position: data.position,
        health_status: data.health_status,
        bmi: data.bmi,
        vision: data.vision,
        dental: data.dental,
        teacher_name: data.teacher_name,
        teacher_id: user?.id,
        attachments: uploadedUrls,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('progress_reports')
        .insert(report)

      if (error) throw error

      toast.success('Progress report saved successfully!')
      navigate(`/children/${id}/timeline`)

    } catch (error: any) {
      console.error('Error saving progress report:', error)
      toast.error(error.message || 'Failed to save progress report')
    } finally {
      setSaving(false)
    }
  }

  const g2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", minHeight: '100vh', background: '#f5f5f5' }}>
      {/* Header */}
      <div style={{
        background: '#1a6b4a',
        color: '#fff',
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 10
      }}>
        <button
          onClick={() => navigate(`/children/${id}/timeline`)}
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
        <div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>Add Progress Report</div>
          <div style={{ fontSize: 11, opacity: 0.9 }}>Track academic & behavioral progress</div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} style={{ padding: '14px 14px 100px' }}>
        {/* Report Type Selection */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 10,
          marginBottom: 16
        }}>
          {[
            { value: 'academic', label: 'Academic', icon: BookOpen, color: '#185fa5' },
            { value: 'behavioral', label: 'Behavioral', icon: Activity, color: '#ef9f27' },
            { value: 'achievement', label: 'Achievement', icon: Award, color: '#f59e0b' },
            { value: 'health', label: 'Health', icon: Activity, color: '#dc2626' },
            { value: 'other', label: 'Other', icon: FileText, color: '#888' }
          ].map(type => {
            const Icon = type.icon
            const isSelected = reportType === type.value
            return (
              <label
                key={type.value}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '12px',
                  border: `2px solid ${isSelected ? type.color : '#e5e5e5'}`,
                  borderRadius: 10,
                  background: isSelected ? type.color + '10' : '#fff',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <input
                  type="radio"
                  value={type.value}
                  {...register('report_type')}
                  style={{ display: 'none' }}
                />
                <Icon size={24} color={isSelected ? type.color : '#999'} style={{ marginBottom: 6 }} />
                <span style={{
                  fontSize: 12,
                  fontWeight: isSelected ? 600 : 500,
                  color: isSelected ? type.color : '#666'
                }}>
                  {type.label}
                </span>
              </label>
            )
          })}
        </div>

        {/* Basic Information */}
        <Section title="Basic Information" icon={FileText} />
        
        <Field label="Report Title" required>
          <input
            {...register('title', { required: 'Title is required' })}
            placeholder="e.g., Q1 Mathematics Assessment, Sports Day Achievement"
            style={inp}
          />
          {errors.title && (
            <div style={{ fontSize: 10, color: '#e24b4a', marginTop: 3 }}>
              {errors.title.message}
            </div>
          )}
        </Field>

        <div style={g2}>
          <Field label="Report Date" required>
            <input
              type="date"
              {...register('report_date', { required: 'Date is required' })}
              style={inp}
            />
          </Field>

          <Field label="Academic Year" required>
            <input
              {...register('academic_year', { required: 'Academic year is required' })}
              placeholder="2024-2025"
              style={inp}
            />
          </Field>
        </div>

        {reportType === 'academic' && (
          <Field label="Term">
            <select {...register('term')} style={inp}>
              <option value="">— Select Term —</option>
              <option value="Q1">Quarter 1</option>
              <option value="Q2">Quarter 2</option>
              <option value="Q3">Quarter 3</option>
              <option value="Q4">Quarter 4</option>
              <option value="Half-Yearly">Half-Yearly</option>
              <option value="Annual">Annual</option>
            </select>
          </Field>
        )}

        <Field label="Description / Remarks" required>
          <textarea
            {...register('description', { required: 'Description is required' })}
            placeholder="Detailed observations, progress notes, recommendations..."
            style={{
              ...inp,
              minHeight: 80,
              resize: 'vertical' as const
            }}
          />
          {errors.description && (
            <div style={{ fontSize: 10, color: '#e24b4a', marginTop: 3 }}>
              {errors.description.message}
            </div>
          )}
        </Field>

        {/* Academic Specific Fields */}
        {reportType === 'academic' && (
          <>
            <Section title="Academic Performance" icon={BookOpen} />
            
            <Field label="Subject">
              <input
                {...register('subject')}
                placeholder="Mathematics, English, Science, etc."
                style={inp}
              />
            </Field>

            <div style={g2}>
              <Field label="Marks Obtained">
                <input
                  type="number"
                  {...register('marks_obtained', { valueAsNumber: true })}
                  placeholder="85"
                  style={inp}
                />
              </Field>

              <Field label="Total Marks">
                <input
                  type="number"
                  {...register('total_marks', { valueAsNumber: true })}
                  placeholder="100"
                  style={inp}
                />
              </Field>
            </div>

            <div style={g2}>
              <Field label="Grade">
                <select {...register('grade')} style={inp}>
                  <option value="">— Select Grade —</option>
                  <option value="A+">A+ (Excellent)</option>
                  <option value="A">A (Very Good)</option>
                  <option value="B">B (Good)</option>
                  <option value="C">C (Average)</option>
                  <option value="D">D (Below Average)</option>
                  <option value="E">E (Needs Improvement)</option>
                </select>
              </Field>

              <Field label="Class Rank">
                <input
                  type="number"
                  {...register('rank', { valueAsNumber: true })}
                  placeholder="5"
                  style={inp}
                />
              </Field>
            </div>
          </>
        )}

        {/* Behavioral Specific Fields */}
        {reportType === 'behavioral' && (
          <>
            <Section title="Behavioral Assessment" icon={Activity} />
            
            <Field label="Overall Behavior Rating">
              <select {...register('behavior_rating')} style={inp}>
                <option value="">— Select Rating —</option>
                <option value="Excellent">Excellent</option>
                <option value="Good">Good</option>
                <option value="Satisfactory">Satisfactory</option>
                <option value="Needs Improvement">Needs Improvement</option>
              </select>
            </Field>

            <Field label="Attendance Percentage">
              <input
                type="number"
                {...register('attendance_percentage', { valueAsNumber: true })}
                placeholder="95"
                min="0"
                max="100"
                style={inp}
              />
            </Field>

            <Field label="Discipline Notes">
              <textarea
                {...register('discipline_notes')}
                placeholder="Any behavioral concerns, improvements, or highlights..."
                style={{
                  ...inp,
                  minHeight: 60,
                  resize: 'vertical' as const
                }}
              />
            </Field>
          </>
        )}

        {/* Achievement Specific Fields */}
        {reportType === 'achievement' && (
          <>
            <Section title="Achievement Details" icon={Award} />
            
            <div style={g2}>
              <Field label="Achievement Type">
                <select {...register('achievement_type')} style={inp}>
                  <option value="">— Select Type —</option>
                  <option value="Sports">Sports</option>
                  <option value="Cultural">Cultural</option>
                  <option value="Academic">Academic</option>
                  <option value="Leadership">Leadership</option>
                  <option value="Other">Other</option>
                </select>
              </Field>

              <Field label="Level">
                <select {...register('achievement_level')} style={inp}>
                  <option value="">— Select Level —</option>
                  <option value="School">School</option>
                  <option value="District">District</option>
                  <option value="State">State</option>
                  <option value="National">National</option>
                  <option value="International">International</option>
                </select>
              </Field>
            </div>

            <Field label="Position / Award">
              <input
                {...register('position')}
                placeholder="1st Place, Gold Medal, Certificate of Excellence, etc."
                style={inp}
              />
            </Field>
          </>
        )}

        {/* Health Specific Fields */}
        {reportType === 'health' && (
          <>
            <Section title="Health Assessment" icon={Activity} />
            
            <Field label="Health Status">
              <input
                {...register('health_status')}
                placeholder="General health condition"
                style={inp}
              />
            </Field>

            <div style={g2}>
              <Field label="BMI">
                <input
                  type="number"
                  step="0.1"
                  {...register('bmi', { valueAsNumber: true })}
                  placeholder="18.5"
                  style={inp}
                />
              </Field>

              <Field label="Vision Status">
                <input
                  {...register('vision')}
                  placeholder="Normal, Needs Glasses, etc."
                  style={inp}
                />
              </Field>
            </div>

            <Field label="Dental Health">
              <input
                {...register('dental')}
                placeholder="Good, Cavities found, etc."
                style={inp}
              />
            </Field>
          </>
        )}

        {/* Attachments */}
        <Section title="Attachments (Optional)" icon={Upload} />
        
        <div
          style={{
            border: '1.5px dashed #ddd',
            borderRadius: 10,
            padding: 16,
            textAlign: 'center',
            cursor: 'pointer',
            background: '#fafafa'
          }}
          onClick={() => document.getElementById('file-upload')?.click()}
        >
          <Upload size={24} color="#999" style={{ margin: '0 auto 8px', display: 'block' }} />
          <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
            Upload report cards, certificates, photos
          </div>
          <div style={{ fontSize: 10, color: '#999' }}>
            Click to select files
          </div>
          <input
            id="file-upload"
            type="file"
            multiple
            accept="image/*,.pdf"
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files) {
                setAttachments(Array.from(e.target.files))
              }
            }}
          />
        </div>

        {attachments.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>
              Selected files ({attachments.length}):
            </div>
            {attachments.map((file, i) => (
              <div
                key={i}
                style={{
                  fontSize: 11,
                  color: '#666',
                  padding: '6px 10px',
                  background: '#f0f0f0',
                  borderRadius: 6,
                  marginBottom: 4,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span>{file.name}</span>
                <button
                  type="button"
                  onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#e24b4a',
                    cursor: 'pointer',
                    fontSize: 11,
                    padding: 4
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Teacher Info */}
        <Section title="Recorded By" icon={Activity} />
        
        <Field label="Teacher / Staff Name">
          <input
            {...register('teacher_name')}
            placeholder="Full name"
            style={inp}
          />
        </Field>

        {/* Submit Buttons */}
        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
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
              fontFamily: 'inherit'
            }}
          >
            {saving ? 'Saving...' : 'Save Progress Report'}
          </button>

          <button
            type="button"
            onClick={() => navigate(`/children/${id}/timeline`)}
            style={{
              width: '100%',
              padding: 11,
              background: 'transparent',
              color: '#1a6b4a',
              border: '1px solid #1a6b4a',
              borderRadius: 10,
              fontSize: 14,
              cursor: 'pointer',
              fontFamily: 'inherit'
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}