import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { db } from '@/lib/db'
import type { Child, AnnualFollowup, ChangeLogEntry } from '@/types'
import { ArrowLeft, Plus, AlertTriangle } from 'lucide-react'

function Tag({ v, t }: { v: string; t: 'r'|'g'|'a'|'b'|'p'|'t' }) {
  const c={r:['#fcebeb','#a32d2d'],g:['#eaf3de','#3b6d11'],a:['#faeeda','#854f0b'],b:['#e6f1fb','#185fa5'],p:['#eeedfe','#3c3489'],t:['#e1f5ee','#085041']}[t]
  return <span style={{fontSize:10,padding:'2px 7px',borderRadius:9,background:c[0],color:c[1]}}>{v}</span>
}

function Row({ k, v, updated }: { k: string; v?: string | boolean | null; updated?: boolean }) {
  if (!v && v !== false) return null
  const display = typeof v === 'boolean' ? (v ? 'Yes' : 'No') : v
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '0.5px solid #f0f0f0', fontSize: 12, alignItems: 'flex-start', gap: 8 }}>
      <span style={{ color: '#888', width: '45%', flexShrink: 0, fontSize: 11 }}>{k}</span>
      <span style={{ fontWeight: 500, color: updated ? '#0f6e56' : '#111', textAlign: 'right', flex: 1 }}>
        {display} {updated && <span style={{ fontSize: 9, color: '#0f6e56' }}>↑ updated</span>}
      </span>
    </div>
  )
}

function Section({ title, children, badge }: { title: string; children: React.ReactNode; badge?: string }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
        {title}
        {badge && <span style={{ background: '#e1f5ee', color: '#0f6e56', fontSize: 9, padding: '1px 6px', borderRadius: 8, fontWeight: 500, textTransform: 'none' }}>{badge}</span>}
      </div>
      <div style={{ background: '#f9f9f9', borderRadius: 10, padding: '2px 10px 2px' }}>
        {children}
      </div>
    </div>
  )
}

export default function ChildProfilePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [child, setChild] = useState<Child | null>(null)
  const [followups, setFollowups] = useState<AnnualFollowup[]>([])
  const [changelog, setChangelog] = useState<ChangeLogEntry[]>([])

  useEffect(() => {
    if (!id) return
    db.children.get(id).then(c => { if (c) setChild(c) })
    db.followups.where('child_id').equals(id).reverse().sortBy('created_at').then(setFollowups)
    db.change_log.where('child_id').equals(id).reverse().sortBy('changed_at').then(setChangelog)
  }, [id])

  if (!child) return <div style={{ padding: 24, color: '#888' }}>Loading…</div>

  const initials = child.full_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  const changed = (field: string) => changelog.some(l => l.field_name.toLowerCase().includes(field.toLowerCase()))

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ background: '#1a6b4a', padding: '14px', color: '#fff', display: 'flex', gap: 11, alignItems: 'center' }}>
        <button onClick={() => navigate('/children')} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 2, display: 'flex' }}>
          <ArrowLeft size={20} />
        </button>
        <div style={{ width: 50, height: 50, borderRadius: '50%', background: '#9fe1cb', color: '#085041', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, flexShrink: 0 }}>
          {child.photo_url
            ? <img src={child.photo_url} alt="" style={{ width: 50, height: 50, borderRadius: '50%', objectFit: 'cover' }} />
            : initials}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{child.full_name}</div>
          <div style={{ fontSize: 11, opacity: 0.8 }}>ID: {child.school_id} · Admitted: {child.admission_date || '—'}</div>
          <div style={{ display: 'flex', gap: 4, marginTop: 5, flexWrap: 'wrap' }}>
            {child.sex && <span style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: 10, padding: '1px 7px', borderRadius: 9 }}>{child.sex}</span>}
            {child.present_class && <span style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: 10, padding: '1px 7px', borderRadius: 9 }}>{child.present_class}</span>}
            {child.category && <span style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: 10, padding: '1px 7px', borderRadius: 9 }}>{child.category}</span>}
          </div>
        </div>
      </div>

      <div style={{ padding: '12px 14px 90px' }}>
        {/* DV alert */}
        {(child.father_dv || child.mother_dv) && (
          <div style={{ background: '#fcebeb', border: '0.5px solid #f09595', borderRadius: 10, padding: '8px 11px', marginBottom: 10, display: 'flex', gap: 7, alignItems: 'center' }}>
            <AlertTriangle size={13} color="#a32d2d" />
            <span style={{ fontSize: 11, color: '#a32d2d' }}>Domestic violence reported for this child's family.</span>
          </div>
        )}

        <Section title="General information">
          <Row k="Date of birth" v={child.date_of_birth} />
          <Row k="Religion" v={child.religion} />
          <Row k="Mother tongue" v={child.mother_tongue} />
          <Row k="Aadhar no." v={child.aadhar_no} />
          <Row k="Normal / special" v={child.normal_or_special} />
          <Row k="Area / Village" v={child.area} />
          <Row k="Contact" v={child.father_mobile || child.mother_mobile} />
          <Row k="Address" v={child.house_size} />
        </Section>

        <Section title="Father's details" badge={changelog.filter(l => l.field_name.toLowerCase().includes('father')).length + ' changes'}>
          <Row k="Name" v={child.father_name} />
          <Row k="Status" v={child.father_status} updated={changed('father status')} />
          <Row k="Age" v={child.father_age} />
          <Row k="Aadhar" v={child.father_aadhar} />
          <Row k="Mobile" v={child.father_mobile} />
          <Row k="Education" v={child.father_education} />
          <Row k="Occupation" v={child.father_occupation} updated={changed('father occupation')} />
          <Row k="Monthly income" v={child.father_earnings} updated={changed('father income')} />
          <Row k="Habits" v={child.father_habits} updated={changed('father habits')} />
          <Row k="Health" v={child.father_health} updated={changed('father health')} />
          <Row k="Domestic violence" v={child.father_dv ? 'Yes' : 'No'} updated={changed('domestic violence')} />
          <Row k="Place of origin" v={child.father_origin} />
        </Section>

        <Section title="Mother's details">
          <Row k="Name" v={child.mother_name} />
          <Row k="Status" v={child.mother_status} updated={changed('mother status')} />
          <Row k="Age" v={child.mother_age} />
          <Row k="Aadhar" v={child.mother_aadhar} />
          <Row k="Mobile" v={child.mother_mobile} />
          <Row k="Education" v={child.mother_education} />
          <Row k="Occupation" v={child.mother_occupation} updated={changed('mother occupation')} />
          <Row k="Monthly income" v={child.mother_earnings} updated={changed('mother income')} />
          <Row k="Habits" v={child.mother_habits} />
          <Row k="Health" v={child.mother_health} updated={changed('mother health')} />
          <Row k="Family planning op." v={child.family_planning_op} />
        </Section>

        {child.sibling_name && (
          <Section title="Sibling">
            <Row k="Name" v={child.sibling_name} />
            <Row k="Age / sex" v={`${child.sibling_age || '—'} · ${child.sibling_sex || '—'}`} />
            <Row k="Education" v={child.sibling_education} />
          </Section>
        )}

        <Section title="Financial situation">
          <Row k="Father's income" v={child.avg_income_father} />
          <Row k="Mother's income" v={child.avg_income_mother} />
          <Row k="Other income" v={child.other_income} />
          <Row k="No. of dependents" v={child.num_dependents} />
          <Row k="Debts" v={child.debts} />
          <Row k="Savings / PF" v={child.savings} />
        </Section>

        <Section title="Living conditions">
          <Row k="House size" v={child.house_size} />
          <Row k="Roof" v={child.house_roof} />
          <Row k="Flooring" v={child.house_floor} />
          <Row k="Ownership" v={child.house_ownership} />
          <Row k="Rent / month" v={child.rent_per_month} />
          <Row k="Advance paid" v={child.advance_paid} />
          <Row k="Vehicles" v={child.vehicles} />
        </Section>

        {child.height_cm && (
          <Section title="Child health">
            <Row k="Height / weight" v={`${child.height_cm} / ${child.weight_kg || '—'}`} />
            <Row k="Health" v={child.child_health} />
            <Row k="Meals / day" v={child.meals_per_day} />
            <Row k="Food type" v={child.food_type} />
            <Row k="Medical help from" v={child.medical_help_from} />
          </Section>
        )}

        {child.special_remarks && (
          <Section title="Special remarks">
            <div style={{ fontSize: 12, color: '#444', padding: '8px 0', lineHeight: 1.6 }}>{child.special_remarks}</div>
          </Section>
        )}

        {/* Change log for this child */}
        {changelog.length > 0 && (
          <>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, marginTop: 4 }}>
              Change History ({changelog.length})
            </div>
            {changelog.slice(0, 8).map(cl => (
              <div key={cl.id} style={{ display: 'flex', gap: 9, marginBottom: 9, alignItems: 'flex-start' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: cl.field_name.includes('status') ? '#e24b4a' : '#ef9f27', flexShrink: 0, marginTop: 4 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: '#111', fontWeight: 500 }}>{cl.field_name}</div>
                  <div style={{ display: 'flex', gap: 5, alignItems: 'center', fontSize: 11, margin: '3px 0', background: '#f0faf6', border: '0.5px solid #9fe1cb', borderRadius: 7, padding: '3px 8px' }}>
                    <span style={{ color: '#a32d2d', textDecoration: 'line-through' }}>{cl.old_value}</span>
                    <span style={{ color: '#888' }}>→</span>
                    <span style={{ color: '#3b6d11', fontWeight: 600 }}>{cl.new_value}</span>
                  </div>
                  <div style={{ fontSize: 10, color: '#999' }}>By {cl.changed_by_name || '—'} · {cl.followup_year} · {new Date(cl.changed_at).toLocaleDateString('en-IN')}</div>
                </div>
              </div>
            ))}
          </>
        )}

        {/* Annual follow-ups */}
        <div style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, marginTop: 4 }}>
          Annual Follow-up History ({followups.length})
        </div>
        {followups.map(fu => (
          <div key={fu.id} style={{ border: '0.5px solid #e5e5e5', borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#1a6b4a', marginBottom: 3, display: 'flex', justifyContent: 'space-between' }}>
              <span>{fu.year_label}</span>
              <span style={{ fontSize: 10, color: '#888', fontWeight: 400 }}>{fu.recorded_by_name} · {fu.visit_date || fu.created_at?.slice(0, 10)}</span>
            </div>
            <div style={{ fontSize: 11, color: '#555', lineHeight: 1.6 }}>
              {[
                fu.present_class && `Class: ${fu.present_class}`,
                fu.father_status && `Father: ${fu.father_status}`,
                fu.father_earnings && `Income: ${fu.father_earnings}`,
                fu.father_dv ? 'DV: Yes' : '',
              ].filter(Boolean).join(' · ')}
            </div>
            {fu.special_remarks && <div style={{ fontSize: 11, color: '#888', marginTop: 4, fontStyle: 'italic' }}>{fu.special_remarks}</div>}
          </div>
        ))}

        {/* Add follow-up button */}
        <button onClick={() => navigate(`/children/${child.id}/followup`)} style={{
          width: '100%', padding: '12px', background: '#1a6b4a', color: '#fff',
          border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'inherit'
        }}>
          <Plus size={16} /> Add Annual Follow-up
        </button>
      </div>
    </div>
  )
}
