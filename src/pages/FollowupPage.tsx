import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { saveFollowupLocally, saveChangeLogLocally } from '@/lib/db'
import { useAppStore } from '@/lib/store'
import type { Child, AnnualFollowup, ChangeLogEntry } from '@/types'
import toast from 'react-hot-toast'
import { ArrowLeft, Check, Loader2, Paperclip } from 'lucide-react'
import { DocumentUpload } from '@/components/DocumentComponents'

const G = '#1a6b4a'
const inp: React.CSSProperties = {
  width: '100%', padding: '9px 11px', border: '1px solid #e0e0e0',
  borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none',
  background: '#fff', boxSizing: 'border-box', color: '#111'
}
const sel: React.CSSProperties = { ...inp, cursor: 'pointer' }
const ta: React.CSSProperties = { ...inp, minHeight: 80, resize: 'vertical' as const }
const g2: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }

function F({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontSize: 11, color: '#666', display: 'block', marginBottom: 4 }}>{label}</label>
      {children}
      {hint && <div style={{ fontSize: 10, color: '#999', marginTop: 3 }}>{hint}</div>}
    </div>
  )
}

function Sec({ title }: { title: string }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, color: G, background: '#e8f5e9', padding: '5px 10px', borderRadius: 8, margin: '16px 0 10px', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>
      {title}
    </div>
  )
}

const TRACKED_FIELDS: { key: keyof AnnualFollowup; label: string; childKey?: keyof Child }[] = [
  { key: 'present_class',      label: 'Present Class',       childKey: 'present_class' },
  { key: 'child_health',       label: 'Child Health',         childKey: 'child_health' },
  { key: 'father_status',      label: 'Father Status',        childKey: 'father_status' },
  { key: 'father_occupation',  label: 'Father Occupation',    childKey: 'father_occupation' },
  { key: 'father_earnings',    label: 'Father Earnings',      childKey: 'father_earnings' },
  { key: 'father_habits',      label: 'Father Habits',        childKey: 'father_habits' },
  { key: 'father_health',      label: 'Father Health',        childKey: 'father_health' },
  { key: 'mother_status',      label: 'Mother Status',        childKey: 'mother_status' },
  { key: 'mother_occupation',  label: 'Mother Occupation',    childKey: 'mother_occupation' },
  { key: 'mother_earnings',    label: 'Mother Earnings',      childKey: 'mother_earnings' },
  { key: 'mother_health',      label: 'Mother Health',        childKey: 'mother_health' },
  { key: 'rent_per_month',     label: 'Rent / Month',         childKey: 'rent_per_month' },
  { key: 'num_dependents',     label: 'No. of Dependents',    childKey: 'num_dependents' },
  { key: 'debts',              label: 'Debts',                childKey: 'debts' },
]

export default function FollowupPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAppStore()

  const [child, setChild] = useState<Child | null>(null)
  const [saving, setSaving] = useState(false)
  const [d, setD] = useState<Record<string, unknown>>({})
  const [uploadedDocs, setUploadedDocs] = useState<{ name: string; url: string }[]>([])

  useEffect(() => {
    if (!id) return
    supabase.from('children').select('*').eq('id', id).single().then(({ data }) => {
      if (data) {
        setChild(data as Child)
        // Pre-fill form with current child values
        setD({
          year_label: '',
          visit_date: new Date().toISOString().slice(0, 10),
          gift_received: false,
          gift_description: '',
          gift_date: '',
          gift_value: '',
          present_class:     data.present_class     ?? '',
          child_height:      data.height_cm         ?? '',
          child_weight:      data.weight_kg         ?? '',
          child_health:      data.child_health      ?? '',
          father_status:     data.father_status     ?? '',
          father_occupation: data.father_occupation ?? '',
          father_earnings:   data.father_earnings   ?? '',
          father_habits:     data.father_habits     ?? '',
          father_health:     data.father_health     ?? '',
          father_dv:         data.father_dv         ?? false,
          mother_status:     data.mother_status     ?? '',
          mother_occupation: data.mother_occupation ?? '',
          mother_earnings:   data.mother_earnings   ?? '',
          mother_health:     data.mother_health     ?? '',
          rent_per_month:    data.rent_per_month    ?? '',
          num_dependents:    data.num_dependents    ?? '',
          debts:             data.debts             ?? '',
          special_remarks:   '',
          recorded_by_name:  user?.full_name        ?? '',
          verified_by:       '',
        })
      }
    })
  }, [id, user])

  const set = (k: string, v: unknown) => setD(p => ({ ...p, [k]: v }))
  const str = (k: string) => String(d[k] ?? '')

  async function handleSave() {
    if (!child || !id) return
    if (!str('year_label').trim()) { toast.error('Year label is required (e.g. 2024-25)'); return }

    setSaving(true)
    try {
      const fuId = crypto.randomUUID()
      const now = new Date().toISOString()

      const followup: AnnualFollowup = {
        id: fuId,
        child_id: id,
        year_label:        str('year_label'),
        visit_date:        str('visit_date') || null,
        present_class:     str('present_class')     || null,
        child_height:      str('child_height')      || null,
        child_weight:      str('child_weight')      || null,
        child_health:      str('child_health')      || null,
        father_status:     str('father_status')     || null,
        father_occupation: str('father_occupation') || null,
        father_earnings:   str('father_earnings')   || null,
        father_habits:     str('father_habits')     || null,
        father_health:     str('father_health')     || null,
        father_dv:         d.father_dv === true,
        mother_status:     str('mother_status')     || null,
        mother_occupation: str('mother_occupation') || null,
        mother_earnings:   str('mother_earnings')   || null,
        mother_health:     str('mother_health')     || null,
        rent_per_month:    str('rent_per_month')    || null,
        num_dependents:    str('num_dependents')    || null,
        debts:             str('debts')             || null,
        gift_received:     d.gift_received === true,
        gift_description:  str('gift_description')  || null,
        gift_date:         str('gift_date')          || null,
        gift_value:        str('gift_value')         || null,
        special_remarks:   str('special_remarks')   || null,
        recorded_by:       user?.id                 ?? null,
        recorded_by_name:  str('recorded_by_name')  || null,
        verified_by:       str('verified_by')       || null,
        created_at:        now,
        updated_at:        now,
      } as unknown as AnnualFollowup

      // Save followup
      const { error: fuErr } = await supabase.from('annual_followups').insert(followup)
      if (fuErr) throw fuErr
      await saveFollowupLocally(followup)

      // Build change log entries for fields that changed from child baseline
      const changeEntries: ChangeLogEntry[] = []
      for (const field of TRACKED_FIELDS) {
        const newVal = String((followup as unknown as Record<string, unknown>)[field.key] ?? '')
        const oldVal = field.childKey ? String((child as unknown as Record<string, unknown>)[field.childKey] ?? '') : ''
        if (newVal && newVal !== oldVal) {
          const entry: ChangeLogEntry = {
            id: crypto.randomUUID(),
            child_id: id,
            child_name: child.full_name,
            field_name: field.label,
            old_value: oldVal || null,
            new_value: newVal,
            changed_by: user?.id ?? null,
            changed_by_name: str('recorded_by_name') || null,
            followup_id: fuId,
            followup_year: str('year_label'),
            changed_at: now,
          } as unknown as ChangeLogEntry
          changeEntries.push(entry)
        }
      }

      if (changeEntries.length > 0) {
        await supabase.from('change_log').insert(changeEntries)
        for (const entry of changeEntries) {
          await saveChangeLogLocally(entry)
        }
      }

      // Update child record with latest values from this follow-up so risk indicators stay current
      const childUpdates: Record<string, unknown> = {
        last_followup_date:  str('visit_date') || now.slice(0, 10),
        present_class:       str('present_class')     || child.present_class,
        child_health:        str('child_health')      || child.child_health,
        father_status:       str('father_status')     || child.father_status,
        father_occupation:   str('father_occupation') || child.father_occupation,
        father_earnings:     str('father_earnings')   || child.father_earnings,
        father_habits:       str('father_habits')     || child.father_habits,
        father_health:       str('father_health')     || child.father_health,
        father_dv:           d.father_dv === true,
        mother_status:       str('mother_status')     || child.mother_status,
        mother_occupation:   str('mother_occupation') || child.mother_occupation,
        mother_earnings:     str('mother_earnings')   || child.mother_earnings,
        mother_health:       str('mother_health')     || child.mother_health,
        rent_per_month:      str('rent_per_month')    || child.rent_per_month,
        num_dependents:      str('num_dependents')    || child.num_dependents,
        debts:               str('debts')             || child.debts,
      }
      if (str('child_height')) childUpdates.height_cm = str('child_height')
      if (str('child_weight')) childUpdates.weight_kg = str('child_weight')
      // Persist gift info into data_json so dashboard & filters can read it
      if (d.gift_received === true) {
        const existingJson = (child as any).data_json || {}
        childUpdates.data_json = {
          ...existingJson,
          received_gifts: true,
          gift_description: str('gift_description') || existingJson.gift_description,
          gift_date:        str('gift_date')        || existingJson.gift_date,
          gift_value:       str('gift_value')       || existingJson.gift_value,
        }
      }
      await supabase.from('children').update(childUpdates).eq('id', id)

      toast.success('Annual follow-up saved!')
      navigate(`/children/${id}`)
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (!child) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#888', fontFamily: "'DM Sans',sans-serif" }}>
        Loading…
      </div>
    )
  }

  return (
    <div style={{ fontFamily: "'DM Sans',system-ui,sans-serif" }}>
      {/* Header */}
      <div style={{ background: G, color: '#fff', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => navigate(`/children/${id}`)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 2 }}>
          <ArrowLeft size={20} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>Annual Follow-up</div>
          <div style={{ fontSize: 11, opacity: 0.75 }}>{child.full_name} · {child.school_id}</div>
        </div>
      </div>

      <div style={{ padding: '14px 16px 160px' }}>
        <Sec title="Visit Details" />
        <div style={g2}>
          <F label="Year Label *" hint="e.g. 2024-25, 2025-26">
            <input style={inp} value={str('year_label')} onChange={e => set('year_label', e.target.value)} placeholder="2024-25" />
          </F>
          <F label="Visit Date">
            <input type="date" style={inp} value={str('visit_date')} onChange={e => set('visit_date', e.target.value)} />
          </F>
        </div>

        <Sec title="Child at Follow-up" />
        <div style={g2}>
          <F label="Present Class">
            <input style={inp} value={str('present_class')} onChange={e => set('present_class', e.target.value)} placeholder="e.g. 5th Std" />
          </F>
          <F label="Child Health">
            <input style={inp} value={str('child_health')} onChange={e => set('child_health', e.target.value)} placeholder="Good / Fair / Poor" />
          </F>
          <F label="Height (cm)">
            <input style={inp} value={str('child_height')} onChange={e => set('child_height', e.target.value)} placeholder="120" />
          </F>
          <F label="Weight (kg)">
            <input style={inp} value={str('child_weight')} onChange={e => set('child_weight', e.target.value)} placeholder="25" />
          </F>
        </div>

        <Sec title="Father at Follow-up" />
        <div style={g2}>
          <F label="Father Status">
            <select style={sel} value={str('father_status')} onChange={e => set('father_status', e.target.value)}>
              <option value="">—</option>
              <option>Alive</option><option>Dead</option><option>Abandoned</option><option>Unknown</option>
            </select>
          </F>
          <F label="Occupation">
            <input style={inp} value={str('father_occupation')} onChange={e => set('father_occupation', e.target.value)} />
          </F>
          <F label="Monthly Income (₹)">
            <input style={inp} value={str('father_earnings')} onChange={e => set('father_earnings', e.target.value)} />
          </F>
          <F label="Health">
            <input style={inp} value={str('father_health')} onChange={e => set('father_health', e.target.value)} />
          </F>
        </div>
        <F label="Habits">
          <input style={inp} value={str('father_habits')} onChange={e => set('father_habits', e.target.value)} placeholder="e.g. Alcoholic, Smoking" />
        </F>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <input type="checkbox" id="fdv" checked={d.father_dv === true} onChange={e => set('father_dv', e.target.checked)} style={{ width: 16, height: 16, accentColor: G }} />
          <label htmlFor="fdv" style={{ fontSize: 12, color: '#333' }}>Domestic violence reported</label>
        </div>

        <Sec title="Mother at Follow-up" />
        <div style={g2}>
          <F label="Mother Status">
            <select style={sel} value={str('mother_status')} onChange={e => set('mother_status', e.target.value)}>
              <option value="">—</option>
              <option>Alive</option><option>Dead</option><option>Abandoned</option><option>Unknown</option>
            </select>
          </F>
          <F label="Occupation">
            <input style={inp} value={str('mother_occupation')} onChange={e => set('mother_occupation', e.target.value)} />
          </F>
          <F label="Monthly Income (₹)">
            <input style={inp} value={str('mother_earnings')} onChange={e => set('mother_earnings', e.target.value)} />
          </F>
          <F label="Health">
            <input style={inp} value={str('mother_health')} onChange={e => set('mother_health', e.target.value)} />
          </F>
        </div>

        <Sec title="Financial & Housing" />
        <div style={g2}>
          <F label="Rent / Month (₹)">
            <input style={inp} value={str('rent_per_month')} onChange={e => set('rent_per_month', e.target.value)} />
          </F>
          <F label="No. of Dependents">
            <input style={inp} value={str('num_dependents')} onChange={e => set('num_dependents', e.target.value)} />
          </F>
        </div>
        <F label="Debts">
          <input style={inp} value={str('debts')} onChange={e => set('debts', e.target.value)} />
        </F>

        <Sec title="Gifts" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <input type="checkbox" id="gift_received" checked={d.gift_received === true} onChange={e => set('gift_received', e.target.checked)} style={{ width: 16, height: 16, accentColor: G }} />
          <label htmlFor="gift_received" style={{ fontSize: 12, color: '#333', fontWeight: 500 }}>Gift received this year</label>
        </div>
        {d.gift_received === true && (
          <div style={{ background: '#f0faf5', border: '1px solid #b2dfc9', borderRadius: 10, padding: '12px', marginBottom: 12 }}>
            <F label="What was gifted?">
              <input style={inp} value={str('gift_description')} onChange={e => set('gift_description', e.target.value)} placeholder="e.g. School bag, uniform, books" />
            </F>
            <div style={g2}>
              <F label="Date of gift">
                <input type="date" style={inp} value={str('gift_date')} onChange={e => set('gift_date', e.target.value)} />
              </F>
              <F label="Value (₹)">
                <input style={inp} value={str('gift_value')} onChange={e => set('gift_value', e.target.value)} placeholder="e.g. 500" />
              </F>
            </div>
          </div>
        )}

        <Sec title="Documents" />
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: '#666', marginBottom: 6 }}>
            Attach progress report, visit photo, or any relevant document
          </div>
          <DocumentUpload
            childId={id!}
            category="follow_up"
            documentType="progress_card"
            yearLabel={str('year_label') || undefined}
            onSuccess={(_, url) => {
              const name = url.split('/').pop() || 'document'
              setUploadedDocs(prev => [...prev, { name, url }])
              toast.success('Document attached')
            }}
          />
          {uploadedDocs.length > 0 && (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {uploadedDocs.map((doc, i) => (
                <div key={i} style={{ fontSize: 11, color: '#1a6b4a', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Paperclip size={11} />
                  {doc.name}
                </div>
              ))}
            </div>
          )}
        </div>

        <Sec title="Social Worker Notes" />
        <F label="Special Remarks / Observations">
          <textarea style={ta} value={str('special_remarks')} onChange={e => set('special_remarks', e.target.value)} placeholder="Key observations from this visit…" />
        </F>
        <div style={g2}>
          <F label="Recorded by">
            <input style={inp} value={str('recorded_by_name')} onChange={e => set('recorded_by_name', e.target.value)} />
          </F>
          <F label="Verified by">
            <input style={inp} value={str('verified_by')} onChange={e => set('verified_by', e.target.value)} />
          </F>
        </div>
      </div>

      {/* Submit bar */}
      <div style={{ position: 'fixed', bottom: 68, left: 0, right: 0, background: '#fff', borderTop: '1px solid #e5e5e5', padding: '10px 14px', display: 'flex', gap: 10, zIndex: 250 }}>
        <button onClick={() => navigate(`/children/${id}`)} style={{ padding: '12px 18px', background: '#f0f0f0', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          Cancel
        </button>
        <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: '12px', background: saving ? '#5dcaa5' : G, color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={16} />}
          {saving ? 'Saving…' : 'Save Follow-up'}
        </button>
      </div>

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  )
}
