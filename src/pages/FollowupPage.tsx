import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { db, updateChildLocally, saveFollowupLocally, saveChangeLogLocally } from '@/lib/db'
import { detectChanges } from '@/lib/excelImport'
import { useAppStore } from '@/lib/store'
import type { Child, AnnualFollowup, ChangeLogEntry } from '@/types'
import { ArrowLeft, Camera } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type FUForm = Partial<AnnualFollowup> & { year_label: string; recorded_by_name: string; visit_date: string }

function Field({ label, children, changed }: { label: string; children: React.ReactNode; changed?: boolean }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ fontSize: 11, color: changed ? '#0f6e56' : '#666', display: 'block', marginBottom: 4, fontWeight: changed ? 600 : 400 }}>
        {label}{changed && <span style={{ marginLeft: 4, fontSize: 10 }}>⚠ will update main record</span>}
      </label>
      {children}
    </div>
  )
}

const inp = (changed = false) => ({
  width: '100%', padding: '8px 10px', border: `1px solid ${changed ? '#0f6e56' : '#e5e5e5'}`,
  borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none',
  background: changed ? '#f0faf6' : '#fff', boxSizing: 'border-box' as const, color: '#111'
})

function Sec({ title }: { title: string }) {
  return <div style={{ fontSize: 11, fontWeight: 600, color: '#1a6b4a', background: '#e1f5ee', padding: '5px 10px', borderRadius: 8, margin: '14px 0 10px' }}>{title}</div>
}

export default function FollowupPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAppStore()
  const [child, setChild] = useState<Child | null>(null)
  const [changedFields, setChangedFields] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [photo, setPhoto] = useState<File | null>(null)

  const { register, handleSubmit, watch, setValue } = useForm<FUForm>({
    defaultValues: { year_label: new Date().getFullYear() + '-' + String(new Date().getFullYear() + 1).slice(2), recorded_by_name: user?.full_name || '' }
  })

  useEffect(() => {
    if (!id) return
    db.children.get(id).then(c => {
      if (!c) return
      setChild(c)
      setValue('present_class', c.present_class || '')
      setValue('father_status', c.father_status)
      setValue('father_occupation', c.father_occupation || '')
      setValue('father_earnings', c.father_earnings || '')
      setValue('father_habits', c.father_habits || '')
      setValue('father_health', c.father_health || '')
      setValue('father_dv', c.father_dv)
      setValue('mother_status', c.mother_status)
      setValue('mother_occupation', c.mother_occupation || '')
      setValue('mother_earnings', c.mother_earnings || '')
      setValue('mother_health', c.mother_health || '')
      setValue('rent_per_month', c.rent_per_month || '')
      setValue('num_dependents', c.num_dependents || '')
      setValue('debts', c.debts || '')
    })
  }, [id])

  // Track changes vs original child data
  const watchAll = watch()
  useEffect(() => {
    if (!child) return
    const changed = new Set<string>()
    const checks: Array<[string, keyof Child]> = [
      ['father_status', 'father_status'], ['father_health', 'father_health'],
      ['father_habits', 'father_habits'], ['father_earnings', 'father_earnings'],
      ['father_occupation', 'father_occupation'], ['father_dv', 'father_dv'],
      ['mother_status', 'mother_status'], ['mother_occupation', 'mother_occupation'],
      ['mother_earnings', 'mother_earnings'], ['mother_health', 'mother_health'],
      ['present_class', 'present_class'], ['rent_per_month', 'rent_per_month'],
      ['num_dependents', 'num_dependents'], ['debts', 'debts'],
    ]
    checks.forEach(([fuKey, childKey]) => {
      const newVal = String((watchAll as Record<string, unknown>)[fuKey] ?? '')
      const oldVal = String((child as unknown as Record<string, unknown>)[childKey] ?? '')
      if (newVal && newVal !== oldVal) changed.add(fuKey)
    })
    setChangedFields(changed)
  }, [watchAll, child])

  const onSubmit = async (data: FUForm) => {
    if (!child || !id) return
    setSaving(true)

    try {
      let photoUrl = child.photo_url
      if (photo) {
        const path = `${id}/${Date.now()}_${photo.name}`
        const { error: upErr } = await supabase.storage
          .from('child-photos')
          .upload(path, photo)
        if (!upErr) {
          const { data: urlData } = supabase.storage.from('child-photos').getPublicUrl(path)
          photoUrl = urlData.publicUrl
        }
      }

      const fuId = crypto.randomUUID()
      const fu: AnnualFollowup = {
        id: fuId,
        child_id: id,
        year_label: data.year_label,
        visit_date: data.visit_date,
        present_class: data.present_class,
        father_status: data.father_status,
        father_occupation: data.father_occupation,
        father_earnings: data.father_earnings,
        father_habits: data.father_habits,
        father_health: data.father_health,
        father_dv: data.father_dv,
        mother_status: data.mother_status,
        mother_occupation: data.mother_occupation,
        mother_earnings: data.mother_earnings,
        mother_health: data.mother_health,
        rent_per_month: data.rent_per_month,
        num_dependents: data.num_dependents,
        debts: data.debts,
        mother_life_skills: data.mother_life_skills,
        father_life_skills: data.father_life_skills,
        special_remarks: data.special_remarks,
        recorded_by_name: data.recorded_by_name || user?.full_name,
        recorded_by: user?.id,
        photo_url: photoUrl,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      // Save followup locally (and queue for sync)
      await saveFollowupLocally(fu)

      // Detect changes and build change log entries
      const changes = detectChanges(id, child.full_name, child as unknown as Record<string, unknown>, data, data.recorded_by_name || '', fuId, data.year_label)

      for (const ch of changes) {
        const entry: ChangeLogEntry = {
          id: ch.id,
          child_id: ch.child_id,
          child_name: ch.child_name,
          field_name: ch.field_name,
          old_value: ch.old_value,
          new_value: ch.new_value,
          changed_by_name: ch.changed_by_name,
          changed_by: user?.id,
          followup_id: ch.followup_id,
          followup_year: ch.followup_year,
          changed_at: ch.changed_at,
        }
        await saveChangeLogLocally(entry)
      }

      // Update child's main record with latest values from followup
      const updatedChild: Partial<Child> & { id: string } = {
        id,
        updated_at: new Date().toISOString(),
        last_followup_date: data.visit_date || new Date().toISOString().slice(0, 10),
        photo_url: photoUrl,
      }
      if (data.present_class) updatedChild.present_class = data.present_class
      if (data.father_status) updatedChild.father_status = data.father_status
      if (data.father_occupation) updatedChild.father_occupation = data.father_occupation
      if (data.father_earnings) updatedChild.father_earnings = data.father_earnings
      if (data.father_habits) updatedChild.father_habits = data.father_habits
      if (data.father_health) updatedChild.father_health = data.father_health
      if (data.father_dv !== undefined) updatedChild.father_dv = data.father_dv
      if (data.mother_status) updatedChild.mother_status = data.mother_status
      if (data.mother_occupation) updatedChild.mother_occupation = data.mother_occupation
      if (data.mother_earnings) updatedChild.mother_earnings = data.mother_earnings
      if (data.mother_health) updatedChild.mother_health = data.mother_health
      if (data.rent_per_month) updatedChild.rent_per_month = data.rent_per_month
      if (data.num_dependents) updatedChild.num_dependents = data.num_dependents
      if (data.debts) updatedChild.debts = data.debts

      await updateChildLocally(updatedChild)

      toast.success(`Follow-up saved! ${changes.length} field(s) updated.`)
      navigate(`/children/${id}`)
    } catch (err) {
      toast.error('Failed to save follow-up')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  if (!child) return <div style={{ padding: 24, color: '#888' }}>Loading…</div>

  const isChg = (f: string) => changedFields.has(f)

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div style={{ background: '#1a6b4a', color: '#fff', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => navigate(`/children/${id}`)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 2 }}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>Annual Follow-up</div>
          <div style={{ fontSize: 11, opacity: 0.8 }}>{child.full_name} · {child.school_id}</div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} style={{ padding: '12px 14px 90px' }}>
        <div style={{ background: '#e1f5ee', border: '0.5px solid #5dcaa5', borderRadius: 10, padding: '9px 11px', marginBottom: 12, fontSize: 11, color: '#085041' }}>
          Fields pre-filled from latest record. Changed fields are highlighted green and will update the child's main record + be logged in Change Log.
        </div>

        {/* Photo upload */}
        <div style={{ border: '1.5px dashed #ddd', borderRadius: 10, padding: 14, textAlign: 'center', cursor: 'pointer', marginBottom: 12 }}
          onClick={() => document.getElementById('photo-inp')?.click()}>
          <Camera size={20} color="#999" style={{ margin: '0 auto 4px', display: 'block' }} />
          <div style={{ fontSize: 11, color: '#999' }}>{photo ? photo.name : 'Capture or upload updated photo'}</div>
          <input id="photo-inp" type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
            onChange={e => e.target.files?.[0] && setPhoto(e.target.files[0])} />
        </div>

        <Sec title="Child — general update" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="Year" changed={false}>
            <input {...register('year_label')} style={inp()} />
          </Field>
          <Field label="Present class" changed={isChg('present_class')}>
            <input {...register('present_class')} style={inp(isChg('present_class'))} />
          </Field>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="Height (cm)">
            <input {...register('child_height')} style={inp()} />
          </Field>
          <Field label="Weight (kg)">
            <input {...register('child_weight')} style={inp()} />
          </Field>
        </div>

        <Sec title="Father — status update" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="Live status" changed={isChg('father_status')}>
            <select {...register('father_status')} style={inp(isChg('father_status'))}>
              <option>Alive</option><option>Dead</option><option>Abandoned</option><option>Unknown</option>
            </select>
          </Field>
          <Field label="Health" changed={isChg('father_health')}>
            <input {...register('father_health')} style={inp(isChg('father_health'))} />
          </Field>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="Habits" changed={isChg('father_habits')}>
            <select {...register('father_habits')} style={inp(isChg('father_habits'))}>
              <option>None</option><option>Drinking & Smoking</option><option>Alcoholic</option>
              <option>Social Drinker</option><option>AA Meetings</option><option>Other</option>
            </select>
          </Field>
          <Field label="Domestic violence" changed={isChg('father_dv')}>
            <select {...register('father_dv', { setValueAs: v => v === 'true' || v === true })} style={inp(isChg('father_dv'))}>
              <option value="false">No</option><option value="true">Yes</option>
            </select>
          </Field>
        </div>
        <Field label="Monthly income" changed={isChg('father_earnings')}>
          <input {...register('father_earnings')} style={inp(isChg('father_earnings'))} />
        </Field>
        <Field label="Occupation" changed={isChg('father_occupation')}>
          <input {...register('father_occupation')} style={inp(isChg('father_occupation'))} />
        </Field>

        <Sec title="Mother — status update" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="Live status" changed={isChg('mother_status')}>
            <select {...register('mother_status')} style={inp(isChg('mother_status'))}>
              <option>Alive</option><option>Dead</option><option>Abandoned</option>
            </select>
          </Field>
          <Field label="Occupation" changed={isChg('mother_occupation')}>
            <input {...register('mother_occupation')} style={inp(isChg('mother_occupation'))} />
          </Field>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="Monthly income" changed={isChg('mother_earnings')}>
            <input {...register('mother_earnings')} style={inp(isChg('mother_earnings'))} />
          </Field>
          <Field label="Health" changed={isChg('mother_health')}>
            <input {...register('mother_health')} style={inp(isChg('mother_health'))} />
          </Field>
        </div>

        <Sec title="Living conditions" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="Rent / month" changed={isChg('rent_per_month')}>
            <input {...register('rent_per_month')} style={inp(isChg('rent_per_month'))} />
          </Field>
          <Field label="No. of dependents" changed={isChg('num_dependents')}>
            <input {...register('num_dependents')} style={inp(isChg('num_dependents'))} />
          </Field>
        </div>
        <Field label="Debts (with purpose)" changed={isChg('debts')}>
          <textarea {...register('debts')} style={{ ...inp(isChg('debts')), minHeight: 55, resize: 'vertical' }} />
        </Field>

        <Sec title="Life skills training" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="Mother attended">
            <select {...register('mother_life_skills', { setValueAs: v => v === 'true' })} style={inp()}>
              <option value="false">No</option><option value="true">Yes</option>
            </select>
          </Field>
          <Field label="Father attended">
            <select {...register('father_life_skills', { setValueAs: v => v === 'true' })} style={inp()}>
              <option value="false">No</option><option value="true">Yes</option>
            </select>
          </Field>
        </div>

        <Sec title="Special remarks" />
        <Field label="Observations / family changes">
          <textarea {...register('special_remarks')} style={{ ...inp(), minHeight: 70, resize: 'vertical' }} placeholder="Detailed observations about family situation, child's progress…" />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="Social worker name">
            <input {...register('recorded_by_name')} style={inp()} />
          </Field>
          <Field label="Visit date">
            <input type="date" {...register('visit_date')} style={inp()} />
          </Field>
        </div>

        {/* Changed fields summary */}
        {changedFields.size > 0 && (
          <div style={{ background: '#faeeda', border: '0.5px solid #ef9f27', borderRadius: 10, padding: '9px 11px', marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#854f0b', marginBottom: 4 }}>
              {changedFields.size} field(s) will be updated in main record:
            </div>
            <div style={{ fontSize: 11, color: '#854f0b' }}>{[...changedFields].join(', ')}</div>
          </div>
        )}

        <button type="submit" disabled={saving} style={{
          width: '100%', padding: 12, background: saving ? '#5dcaa5' : '#1a6b4a', color: '#fff',
          border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit'
        }}>
          {saving ? 'Saving…' : `Save & Update Child Record${changedFields.size > 0 ? ` (${changedFields.size} changes)` : ''}`}
        </button>
        <button type="button" onClick={() => navigate(`/children/${id}`)} style={{
          width: '100%', padding: 11, background: 'transparent', color: '#1a6b4a',
          border: '1px solid #1a6b4a', borderRadius: 10, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', marginTop: 8
        }}>Cancel</button>
      </form>
    </div>
  )
}
