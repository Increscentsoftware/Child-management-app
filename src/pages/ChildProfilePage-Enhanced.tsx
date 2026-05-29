import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { db } from '@/lib/db'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/lib/store'
import type { Child, AnnualFollowup, ChangeLogEntry, ChildDocument } from '@/types'
import {
  ArrowLeft, Plus, AlertTriangle, Calendar, TrendingUp,
  Users, Heart, Home, DollarSign, Activity, FileText,
  Upload, Download, Trash2, File, Loader
} from 'lucide-react'
import toast from 'react-hot-toast'

function Tag({ v, t }: { v: string; t: 'r'|'g'|'a'|'b'|'p'|'t' }) {
  const c={r:['#fcebeb','#a32d2d'],g:['#eaf3de','#3b6d11'],a:['#faeeda','#854f0b'],b:['#e6f1fb','#185fa5'],p:['#eeedfe','#3c3489'],t:['#e1f5ee','#085041']}[t]
  return <span style={{fontSize:10,padding:'2px 7px',borderRadius:9,background:c[0],color:c[1],whiteSpace:'nowrap'}}>{v}</span>
}

function Row({ k, v, updated, hide }: { k: string; v?: string | boolean | null; updated?: boolean; hide?: boolean }) {
  if (hide) return null
  const isEmpty = v === null || v === undefined || v === ''
  const display = isEmpty ? '—' : typeof v === 'boolean' ? (v ? 'Yes' : 'No') : v
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '0.5px solid #f0f0f0', fontSize: 12, alignItems: 'flex-start', gap: 8 }}>
      <span style={{ color: '#888', width: '45%', flexShrink: 0, fontSize: 11 }}>{k}</span>
      <span style={{ fontWeight: isEmpty ? 400 : 500, color: isEmpty ? '#ccc' : updated ? '#0f6e56' : '#111', textAlign: 'right', flex: 1 }}>
        {display} {!isEmpty && updated && <span style={{ fontSize: 9, color: '#0f6e56' }}>↑ latest</span>}
      </span>
    </div>
  )
}

function Section({ title, children, badge, icon }: { 
  title: string
  children: React.ReactNode
  badge?: string
  icon?: React.ReactNode
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ 
        fontSize: 11, 
        fontWeight: 600, 
        color: '#1a6b4a', 
        textTransform: 'uppercase', 
        letterSpacing: '0.05em', 
        marginBottom: 8,
        display: 'flex', 
        alignItems: 'center', 
        gap: 6 
      }}>
        {icon}
        {title}
        {badge && (
          <span style={{ 
            background: '#e1f5ee', 
            color: '#0f6e56', 
            fontSize: 9, 
            padding: '2px 6px', 
            borderRadius: 8, 
            fontWeight: 500, 
            textTransform: 'none' 
          }}>
            {badge}
          </span>
        )}
      </div>
      <div style={{ background: '#f9f9f9', borderRadius: 10, padding: '6px 10px' }}>
        {children}
      </div>
    </div>
  )
}

export default function ChildProfilePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAppStore()
  const [child, setChild] = useState<Child | null>(null)
  const [followups, setFollowups] = useState<AnnualFollowup[]>([])
  const [changelog, setChangelog] = useState<ChangeLogEntry[]>([])
  const [view, setView] = useState<'overview' | 'timeline' | 'comparison' | 'documents'>('overview')
  const [documents, setDocuments] = useState<ChildDocument[]>([])
  const [docsLoading, setDocsLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadDocuments = async () => {
    if (!id) return
    setDocsLoading(true)
    try {
      const { data, error } = await supabase
        .from('child_documents')
        .select('*')
        .eq('child_id', id)
        .order('uploaded_at', { ascending: false })
      if (error) throw error
      setDocuments(data || [])
    } catch {
      // table may not exist yet — silently show empty state
      setDocuments([])
    } finally {
      setDocsLoading(false)
    }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !id) return
    setUploading(true)
    try {
      const path = `${id}/${Date.now()}_${file.name}`
      const { error: upErr } = await supabase.storage
        .from('child-documents')
        .upload(path, file)
      if (upErr) throw upErr

      const { data: urlData } = supabase.storage
        .from('child-documents')
        .getPublicUrl(path)

      const doc: ChildDocument = {
        id: crypto.randomUUID(),
        child_id: id,
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_type: file.type || 'application/octet-stream',
        file_size: file.size,
        uploaded_by: user?.id,
        uploaded_by_name: user?.full_name,
        uploaded_at: new Date().toISOString(),
      }

      const { error: dbErr } = await supabase
        .from('child_documents')
        .insert(doc)
      if (dbErr) throw dbErr

      setDocuments(prev => [doc, ...prev])
      toast.success(`${file.name} uploaded`)
    } catch (err: any) {
      toast.error(err?.message || 'Upload failed')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDelete = async (doc: ChildDocument) => {
    if (!confirm(`Delete "${doc.file_name}"?`)) return
    try {
      const storagePath = doc.file_url.split('/child-documents/')[1]
      await supabase.storage.from('child-documents').remove([storagePath])
      await supabase.from('child_documents').delete().eq('id', doc.id)
      setDocuments(prev => prev.filter(d => d.id !== doc.id))
      toast.success('Document deleted')
    } catch {
      toast.error('Delete failed')
    }
  }

  const handleDeleteChild = async () => {
    if (!child) return
    if (!confirm(`Permanently delete ${child.full_name}? This cannot be undone.`)) return
    try {
      await supabase.from('children').delete().eq('id', child.id)
      await db.children.delete(child.id)
      toast.success('Child record deleted')
      navigate('/children')
    } catch {
      toast.error('Failed to delete child record')
    }
  }

  useEffect(() => {
    if (!id) return
    db.children.get(id).then(c => { if (c) setChild(c) })
    db.followups.where('child_id').equals(id).reverse().sortBy('created_at').then(setFollowups)
    db.change_log.where('child_id').equals(id).reverse().sortBy('changed_at').then(setChangelog)
    loadDocuments()
  }, [id])

  if (!child) return <div style={{ padding: 24, color: '#888' }}>Loading…</div>

  const initials = child.full_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  
  // Get latest followup data
  const latestFollowup = followups[0]
  
  // Calculate years in program
  const admissionYear = child.admission_date ? new Date(child.admission_date).getFullYear() : null
  const currentYear = new Date().getFullYear()
  const yearsInProgram = admissionYear ? currentYear - admissionYear : null

  // Detect major life events
  const fatherStatusChanged = followups.some(f => 
    f.father_status && f.father_status !== child.father_status
  )
  const motherStatusChanged = followups.some(f => 
    f.mother_status && f.mother_status !== child.mother_status
  )

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ background: '#1a6b4a', padding: '14px', color: '#fff', display: 'flex', gap: 11, alignItems: 'center' }}>
        <button onClick={() => navigate('/children')} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 2, display: 'flex' }}>
          <ArrowLeft size={20} />
        </button>
        {/* Admin-only delete */}
        {user?.role === 'admin' && (
          <button onClick={handleDeleteChild} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', cursor: 'pointer', padding: '5px 8px', borderRadius: 7, display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, marginLeft: 'auto' }}>
            <Trash2 size={14} /> Delete
          </button>
        )}
        <div style={{ width: 50, height: 50, borderRadius: '50%', background: '#9fe1cb', color: '#085041', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, flexShrink: 0 }}>
          {child.photo_url
            ? <img src={child.photo_url} alt="" style={{ width: 50, height: 50, borderRadius: '50%', objectFit: 'cover' }} />
            : initials}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{child.full_name}</div>
          <div style={{ fontSize: 11, opacity: 0.8 }}>
            ID: {child.school_id} · 
            {yearsInProgram && ` ${yearsInProgram} years in program`}
          </div>
          <div style={{ display: 'flex', gap: 4, marginTop: 5, flexWrap: 'wrap' }}>
            {child.sex && <Tag v={child.sex} t="b" />}
            {child.present_class && <Tag v={child.present_class} t="p" />}
            {child.category && <Tag v={child.category} t="t" />}
            {fatherStatusChanged && <Tag v="Father status changed" t="a" />}
          </div>
        </div>
      </div>

      {/* View Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: 4, 
        padding: '8px 14px', 
        background: '#f5f5f5',
        borderBottom: '1px solid #e5e5e5',
        overflowX: 'auto'
      }}>
        {[
          { id: 'overview', label: 'Overview', icon: <FileText size={14} /> },
          { id: 'timeline', label: 'Journey Timeline', icon: <Calendar size={14} /> },
          { id: 'comparison', label: 'Then vs Now', icon: <TrendingUp size={14} /> },
          { id: 'documents', label: 'Documents', icon: <File size={14} /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setView(tab.id as any)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              background: view === tab.id ? '#1a6b4a' : 'transparent',
              color: view === tab.id ? '#fff' : '#666',
              border: 'none',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '12px 14px 90px' }}>
        {/* DV Alert */}
        {(child.father_dv || child.mother_dv) && (
          <div style={{ 
            background: '#fcebeb', 
            border: '0.5px solid #f09595', 
            borderRadius: 10, 
            padding: '8px 11px', 
            marginBottom: 12, 
            display: 'flex', 
            gap: 7, 
            alignItems: 'center' 
          }}>
            <AlertTriangle size={13} color="#a32d2d" />
            <span style={{ fontSize: 11, color: '#a32d2d' }}>
              Domestic violence reported for this child's family.
            </span>
          </div>
        )}

        {/* OVERVIEW VIEW */}
        {view === 'overview' && (
          <>
            {/* Quick Stats */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(3, 1fr)', 
              gap: 10,
              marginBottom: 14
            }}>
              <div style={{ 
                background: 'linear-gradient(135deg, #1a6b4a, #15563c)', 
                borderRadius: 10, 
                padding: '12px',
                color: '#fff',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: 24, fontWeight: 700 }}>{yearsInProgram || 'N/A'}</div>
                <div style={{ fontSize: 10, opacity: 0.9 }}>Years in Program</div>
              </div>
              
              <div style={{ 
                background: 'linear-gradient(135deg, #0891b2, #0e7490)', 
                borderRadius: 10, 
                padding: '12px',
                color: '#fff',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: 24, fontWeight: 700 }}>{followups.length}</div>
                <div style={{ fontSize: 10, opacity: 0.9 }}>Follow-ups</div>
              </div>
              
              <div style={{ 
                background: 'linear-gradient(135deg, #ea580c, #c2410c)', 
                borderRadius: 10, 
                padding: '12px',
                color: '#fff',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: 24, fontWeight: 700 }}>{changelog.length}</div>
                <div style={{ fontSize: 10, opacity: 0.9 }}>Changes</div>
              </div>
            </div>

            <Section title="Child Information" icon={<Users size={13} />}>
              <Row k="Admission date" v={child.admission_date} />
              <Row k="Date of birth" v={child.date_of_birth} />
              <Row k="Age" v={child.date_of_birth ?
                `${Math.floor((Date.now() - new Date(child.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} years` :
                null
              } />
              <Row k="Sex" v={child.sex} />
              <Row k="Present class" v={child.present_class} />
              <Row k="Category" v={child.category} />
              <Row k="Religion" v={child.religion} />
              <Row k="Mother tongue" v={child.mother_tongue} />
              <Row k="Aadhar no." v={child.aadhar_no} />
              <Row k="Normal / special" v={child.normal_or_special} />
            </Section>

            <Section
              title="Father's Information"
              icon={<Users size={13} />}
              badge={changelog.filter(l => l.field_name.toLowerCase().includes('father')).length + ' changes'}
            >
              <Row k="Name" v={child.father_name} />
              <Row k="Status" v={latestFollowup?.father_status || child.father_status} updated={!!latestFollowup?.father_status} />
              <Row k="Age" v={child.father_age} />
              <Row k="Mobile" v={child.father_mobile} />
              <Row k="Aadhar" v={child.father_aadhar} />
              <Row k="Education" v={child.father_education} />
              <Row k="Occupation" v={latestFollowup?.father_occupation || child.father_occupation} updated={!!latestFollowup?.father_occupation} />
              <Row k="Monthly income" v={latestFollowup?.father_earnings || child.father_earnings} updated={!!latestFollowup?.father_earnings} />
              <Row k="Habits" v={latestFollowup?.father_habits || child.father_habits} updated={!!latestFollowup?.father_habits} />
              <Row k="Health" v={latestFollowup?.father_health || child.father_health} updated={!!latestFollowup?.father_health} />
              <Row k="Origin / native" v={child.father_origin} />
              <Row k="Domestic violence" v={latestFollowup?.father_dv !== undefined ? (latestFollowup.father_dv ? 'Yes' : 'No') : (child.father_dv ? 'Yes' : 'No')} updated={latestFollowup?.father_dv !== undefined} />
              <Row k="Extramarital affair" v={child.father_extramarital ?? false} />
            </Section>

            <Section title="Mother's Information" icon={<Heart size={13} />}>
              <Row k="Name" v={child.mother_name} />
              <Row k="Status" v={latestFollowup?.mother_status || child.mother_status} updated={!!latestFollowup?.mother_status} />
              <Row k="Age" v={child.mother_age} />
              <Row k="Mobile" v={child.mother_mobile} />
              <Row k="Aadhar" v={child.mother_aadhar} />
              <Row k="Education" v={child.mother_education} />
              <Row k="Occupation" v={latestFollowup?.mother_occupation || child.mother_occupation} updated={!!latestFollowup?.mother_occupation} />
              <Row k="Monthly income" v={latestFollowup?.mother_earnings || child.mother_earnings} updated={!!latestFollowup?.mother_earnings} />
              <Row k="Habits" v={child.mother_habits} />
              <Row k="Health" v={latestFollowup?.mother_health || child.mother_health} updated={!!latestFollowup?.mother_health} />
              <Row k="Origin / native" v={child.mother_origin} />
              <Row k="Domestic violence" v={child.mother_dv ?? false} />
              <Row k="Family planning op" v={child.family_planning_op ?? false} />
            </Section>

            <Section title="Family Background" icon={<Heart size={13} />}>
              <Row k="Year of marriage" v={child.year_of_marriage} />
              <Row k="Marriage type" v={child.marriage_type} />
            </Section>

            <Section title="Sibling" icon={<Users size={13} />}>
              <Row k="Name" v={child.sibling_name} />
              <Row k="Age" v={child.sibling_age} />
              <Row k="Sex" v={child.sibling_sex} />
              <Row k="Education" v={child.sibling_education} />
              <Row k="SM support" v={child.sibling_sm_support ?? false} />
            </Section>

            <Section title="Financial Situation" icon={<DollarSign size={13} />}>
              <Row k="Father's avg income" v={child.avg_income_father} />
              <Row k="Mother's avg income" v={child.avg_income_mother} />
              <Row k="Father's earnings" v={latestFollowup?.father_earnings || child.father_earnings} updated={!!latestFollowup?.father_earnings} />
              <Row k="Mother's earnings" v={latestFollowup?.mother_earnings || child.mother_earnings} updated={!!latestFollowup?.mother_earnings} />
              <Row k="Other income" v={child.other_income} />
              <Row k="No. of dependents" v={latestFollowup?.num_dependents || child.num_dependents} updated={!!latestFollowup?.num_dependents} />
              <Row k="Debts" v={latestFollowup?.debts || child.debts} updated={!!latestFollowup?.debts} />
              <Row k="Savings / PF" v={child.savings} />
            </Section>

            <Section title="Living Conditions" icon={<Home size={13} />}>
              <Row k="Area / Village" v={child.area} />
              <Row k="House size" v={child.house_size} />
              <Row k="Roof" v={child.house_roof} />
              <Row k="Flooring" v={child.house_floor} />
              <Row k="Ownership" v={child.house_ownership} />
              <Row k="Rent / month" v={latestFollowup?.rent_per_month || child.rent_per_month} updated={!!latestFollowup?.rent_per_month} />
              <Row k="Advance paid" v={child.advance_paid} />
              <Row k="Vehicles" v={child.vehicles} />
            </Section>

            <Section title="Child Health" icon={<Activity size={13} />}>
              <Row k="Height" v={child.height_cm ? `${child.height_cm} cm` : null} />
              <Row k="Weight" v={child.weight_kg ? `${child.weight_kg} kg` : null} />
              <Row k="Health status" v={child.child_health} />
              <Row k="Meals / day" v={child.meals_per_day} />
              <Row k="Food type" v={child.food_type} />
              <Row k="Medical help from" v={child.medical_help_from} />
            </Section>

            <Section title="Life Skills" icon={<Activity size={13} />}>
              <Row k="Mother trained" v={child.mother_life_skills ?? false} />
              <Row k="Father trained" v={child.father_life_skills ?? false} />
            </Section>

            {/* Special Remarks - Admission */}
            {child.special_remarks && (
              <Section title="Special Remarks (On Admission)" icon={<FileText size={13} />}>
                <div style={{ 
                  fontSize: 12, 
                  color: '#444', 
                  padding: '8px 0', 
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap'
                }}>
                  {child.special_remarks}
                </div>
              </Section>
            )}

            {/* Special Remarks from Latest Follow-up */}
            {latestFollowup?.special_remarks && (
              <Section 
                title="Latest Social Worker Observations" 
                icon={<FileText size={13} />}
                badge={latestFollowup.year_label}
              >
                <div style={{ 
                  fontSize: 12, 
                  color: '#444', 
                  padding: '8px 0', 
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  background: '#fffbeb',
                  padding: '10px',
                  borderRadius: 8,
                  borderLeft: '3px solid #f59e0b'
                }}>
                  {latestFollowup.special_remarks}
                </div>
                <div style={{ 
                  fontSize: 10, 
                  color: '#888', 
                  marginTop: 6,
                  fontStyle: 'italic'
                }}>
                  Recorded by: {latestFollowup.recorded_by_name} on {latestFollowup.visit_date}
                </div>
              </Section>
            )}
          </>
        )}

        {/* TIMELINE VIEW */}
        {view === 'timeline' && (() => {
          const SKIP_FIELDS = new Set([
            'recorded_by_name','recorded_by','year_label','special_remarks',
            'child_name','child_id','id','created_at','updated_at','verified_by',
            'visit_date','photo_url'
          ])
          const humanize = (f: string) => {
            const map: Record<string,string> = {
              father_status:'Father Status', father_occupation:'Father Occupation',
              father_earnings:'Father Earnings', father_habits:'Father Habits',
              father_health:'Father Health', father_dv:'Father DV',
              mother_status:'Mother Status', mother_occupation:'Mother Occupation',
              mother_earnings:'Mother Earnings', mother_health:'Mother Health',
              present_class:'Present Class', child_height:'Height',
              child_weight:'Weight', child_health:'Child Health',
              num_dependents:'Dependents', debts:'Debts',
              rent_per_month:'Rent / Month', sibling_age:'Sibling Age',
              sibling_education:'Sibling Education',
              mother_life_skills:'Mother Life Skills', father_life_skills:'Father Life Skills',
            }
            return map[f] || f.split('_').map(w => w.charAt(0).toUpperCase()+w.slice(1)).join(' ')
          }
          return (
            <div style={{ position: 'relative', paddingLeft: 24 }}>
              <div style={{ position: 'absolute', left: 8, top: 8, bottom: 0, width: 2, background: '#e5e5e5' }} />

              {/* On Admission — always first */}
              <div style={{ marginBottom: 20, position: 'relative' }}>
                <div style={{ position: 'absolute', left: -16, width: 16, height: 16, borderRadius: '50%', background: '#1a6b4a', border: '3px solid #fff', boxShadow: '0 0 0 1px #e5e5e5' }} />
                <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 10, padding: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1a6b4a', marginBottom: 6 }}>
                    On Admission
                  </div>
                  <div style={{ fontSize: 11, color: '#555', marginBottom: 4 }}>
                    {child.admission_date || 'Date not recorded'}
                  </div>
                  {[
                    child.present_class && `Class: ${child.present_class}`,
                    child.father_status && `Father: ${child.father_status}${child.father_occupation ? ` · ${child.father_occupation}` : ''}`,
                    child.num_dependents && `Dependents: ${child.num_dependents}`,
                    child.area && `Area: ${child.area}`,
                  ].filter(Boolean).map((line, i) => (
                    <div key={i} style={{ fontSize: 11, color: '#666', lineHeight: 1.8 }}>• {line}</div>
                  ))}
                  {child.special_remarks && (
                    <div style={{ fontSize: 11, color: '#666', fontStyle: 'italic', marginTop: 8, padding: '6px 8px', background: '#f9f9f9', borderRadius: 6, lineHeight: 1.5 }}>
                      "{child.special_remarks}"
                    </div>
                  )}
                </div>
              </div>

              {/* Follow-ups — newest first */}
              {followups.map(fu => {
                const meaningful = changelog.filter(c =>
                  c.followup_id === fu.id &&
                  !SKIP_FIELDS.has(c.field_name) &&
                  c.new_value != null && c.new_value !== '' &&
                  c.new_value !== c.old_value
                )
                return (
                  <div key={fu.id} style={{ marginBottom: 20, position: 'relative' }}>
                    <div style={{ position: 'absolute', left: -16, width: 16, height: 16, borderRadius: '50%', background: meaningful.length > 0 ? '#ea580c' : '#0891b2', border: '3px solid #fff', boxShadow: '0 0 0 1px #e5e5e5' }} />
                    <div style={{ background: '#fff', border: `1px solid ${meaningful.length > 0 ? '#faeeda' : '#e5e5e5'}`, borderRadius: 10, padding: 12 }}>

                      {/* Header: year + count */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: meaningful.length > 0 ? '#854f0b' : '#0891b2' }}>
                          {fu.year_label}
                        </div>
                        {meaningful.length > 0 && (
                          <span style={{ fontSize: 10, background: '#faeeda', color: '#854f0b', padding: '2px 7px', borderRadius: 6 }}>
                            {meaningful.length} change{meaningful.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>

                      {/* Who & when */}
                      <div style={{ fontSize: 11, color: '#888', marginBottom: meaningful.length > 0 || fu.special_remarks ? 10 : 0 }}>
                        {fu.recorded_by_name || 'Unknown'}{fu.visit_date || fu.created_at ? ` · ${fu.visit_date || fu.created_at.slice(0, 10)}` : ''}
                      </div>

                      {/* Meaningful changes */}
                      {meaningful.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: fu.special_remarks ? 8 : 0 }}>
                          {meaningful.map(c => (
                            <div key={c.id} style={{ fontSize: 11, padding: '5px 8px', background: '#f9f9f9', borderRadius: 6, display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                              <span style={{ fontWeight: 600, color: '#444' }}>{humanize(c.field_name)}</span>
                              <span style={{ color: '#a32d2d', textDecoration: 'line-through' }}>{c.old_value || '—'}</span>
                              <span style={{ color: '#999' }}>→</span>
                              <span style={{ color: '#1a6b4a', fontWeight: 600 }}>{c.new_value || '—'}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Remark */}
                      {fu.special_remarks && (
                        <div style={{ fontSize: 11, color: '#555', fontStyle: 'italic', padding: '6px 8px', background: '#fffbeb', borderRadius: 6, borderLeft: '3px solid #f59e0b', lineHeight: 1.5 }}>
                          "{fu.special_remarks}"
                        </div>
                      )}

                      {meaningful.length === 0 && !fu.special_remarks && (
                        <div style={{ fontSize: 11, color: '#bbb' }}>No changes recorded</div>
                      )}
                    </div>
                  </div>
                )
              })}

              {followups.length === 0 && (
                <div style={{ fontSize: 12, color: '#999', padding: '20px 0' }}>No follow-ups recorded yet.</div>
              )}
            </div>
          )
        })()}

        {/* COMPARISON VIEW */}
        {view === 'comparison' && (
          <div>
            {!latestFollowup ? (
              <div style={{ textAlign: 'center', padding: '40px 16px', color: '#999', fontSize: 13 }}>
                No follow-up recorded yet.<br/>Add an annual follow-up to see the comparison.
              </div>
            ) : (() => {
              const sections = [
                { title: 'Child', icon: '👦', items: [
                  { label: 'Class',       before: child.present_class,     after: latestFollowup.present_class },
                  { label: 'Height (cm)', before: child.height_cm,         after: latestFollowup.child_height },
                  { label: 'Weight (kg)', before: child.weight_kg,         after: latestFollowup.child_weight },
                  { label: 'Health',      before: child.child_health,      after: latestFollowup.child_health },
                ]},
                { title: 'Father', icon: '👨', items: [
                  { label: 'Status',      before: child.father_status,     after: latestFollowup.father_status },
                  { label: 'Occupation',  before: child.father_occupation, after: latestFollowup.father_occupation },
                  { label: 'Income (₹)', before: child.father_earnings,   after: latestFollowup.father_earnings },
                  { label: 'Health',      before: child.father_health,     after: latestFollowup.father_health },
                  { label: 'Habits',      before: child.father_habits,     after: latestFollowup.father_habits },
                  { label: 'DV',          before: child.father_dv ? 'Yes' : 'No', after: latestFollowup.father_dv ? 'Yes' : 'No' },
                ]},
                { title: 'Mother', icon: '👩', items: [
                  { label: 'Status',      before: child.mother_status,     after: latestFollowup.mother_status },
                  { label: 'Occupation',  before: child.mother_occupation, after: latestFollowup.mother_occupation },
                  { label: 'Income (₹)', before: child.mother_earnings,   after: latestFollowup.mother_earnings },
                  { label: 'Health',      before: child.mother_health,     after: latestFollowup.mother_health },
                ]},
                { title: 'Financial & Housing', icon: '🏠', items: [
                  { label: 'Rent/Month',  before: child.rent_per_month,    after: latestFollowup.rent_per_month },
                  { label: 'Dependents',  before: child.num_dependents,    after: latestFollowup.num_dependents },
                  { label: 'Debts',       before: child.debts,             after: latestFollowup.debts },
                ]},
              ]
              const totalChanges = sections.flatMap(s => s.items).filter(({ before, after }) => {
                const b = String(before ?? ''), a = String(after ?? '')
                return a && a !== b
              }).length
              return (
                <>
                  {/* Summary banner */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                    <div style={{ flex: 1, background: '#1a6b4a', color: '#fff', borderRadius: 10, padding: '10px 12px' }}>
                      <div style={{ fontSize: 9, opacity: 0.75, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>On Admission</div>
                      <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>{child.admission_date || '—'}</div>
                    </div>
                    <div style={{ background: '#fff', border: '1.5px solid #e5e5e5', borderRadius: 10, padding: '10px 12px', textAlign: 'center', minWidth: 64 }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: totalChanges > 0 ? '#d97706' : '#10b981', lineHeight: 1 }}>{totalChanges}</div>
                      <div style={{ fontSize: 9, color: '#888', fontWeight: 600, textTransform: 'uppercase', marginTop: 2 }}>Changes</div>
                    </div>
                    <div style={{ flex: 1, background: '#1e40af', color: '#fff', borderRadius: 10, padding: '10px 12px', textAlign: 'right' }}>
                      <div style={{ fontSize: 9, opacity: 0.75, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Latest Follow-up</div>
                      <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>{latestFollowup.year_label}</div>
                    </div>
                  </div>

                  {/* Column labels */}
                  <div style={{ display: 'grid', gridTemplateColumns: '76px 1fr 16px 1fr', gap: 6, padding: '0 2px', marginBottom: 6 }}>
                    <div />
                    <div style={{ fontSize: 9, fontWeight: 700, color: '#1a6b4a', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Then</div>
                    <div />
                    <div style={{ fontSize: 9, fontWeight: 700, color: '#1e40af', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Now</div>
                  </div>

                  {sections.map(({ title, icon, items }) => {
                    const changedCount = items.filter(({ before, after }) => {
                      const b = String(before ?? ''), a = String(after ?? '')
                      return a && a !== b
                    }).length
                    return (
                      <div key={title} style={{ background: '#fff', borderRadius: 12, border: '1px solid #ebebeb', marginBottom: 10, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#f8f9fa', borderBottom: '1px solid #ebebeb' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 14 }}>{icon}</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#111' }}>{title}</span>
                          </div>
                          {changedCount > 0 && (
                            <span style={{ background: '#fef3c7', color: '#92400e', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, border: '1px solid #fcd34d' }}>
                              {changedCount} changed
                            </span>
                          )}
                        </div>
                        <div style={{ padding: '6px 8px' }}>
                          {items.map(({ label, before, after }) => {
                            const b = String(before ?? '') || '—'
                            const a = String(after  ?? '') || '—'
                            const changed = a !== '—' && a !== b
                            return (
                              <div key={label} style={{
                                display: 'grid', gridTemplateColumns: '76px 1fr 16px 1fr', gap: 6,
                                alignItems: 'center', padding: '5px 4px', borderRadius: 7, marginBottom: 3,
                                background: changed ? '#fffbeb' : 'transparent',
                              }}>
                                <div style={{ fontSize: 10, color: '#888', fontWeight: 500, lineHeight: 1.3 }}>{label}</div>
                                <div style={{ fontSize: 11, textAlign: 'center', padding: '4px 6px', background: '#f0faf5', borderRadius: 6, color: '#085041', border: '1px solid #c6e8d5' }}>
                                  {b}
                                </div>
                                <div style={{ textAlign: 'center', fontSize: 14, color: changed ? '#d97706' : '#e0e0e0', fontWeight: 700 }}>›</div>
                                <div style={{
                                  fontSize: 11, textAlign: 'center', padding: '4px 6px', borderRadius: 6,
                                  background: changed ? '#dbeafe' : '#f5f5f5',
                                  color: changed ? '#1e40af' : '#bbb',
                                  fontWeight: changed ? 700 : 400,
                                  border: changed ? '1px solid #bfdbfe' : '1px solid transparent',
                                }}>
                                  {a}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </>
              )
            })()}
          </div>
        )}

        {/* DOCUMENTS VIEW */}
        {view === 'documents' && (
          <div>
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              style={{ display: 'none' }}
              onChange={handleUpload}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx"
            />

            {/* Upload button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 8, padding: '12px', marginBottom: 16,
                background: uploading ? '#5dcaa5' : '#1a6b4a', color: '#fff',
                border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600,
                cursor: uploading ? 'not-allowed' : 'pointer', fontFamily: 'inherit'
              }}
            >
              {uploading ? <Loader size={15} /> : <Upload size={15} />}
              {uploading ? 'Uploading…' : 'Upload Document'}
            </button>

            {/* Document list */}
            {docsLoading ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: '#999', fontSize: 12 }}>
                Loading…
              </div>
            ) : documents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#999', fontSize: 12 }}>
                <File size={28} color="#ddd" style={{ margin: '0 auto 8px', display: 'block' }} />
                No documents uploaded yet
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {documents.map(doc => (
                  <div key={doc.id} style={{
                    background: '#fff', border: '1px solid #e5e5e5', borderRadius: 10,
                    padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 8, background: '#e1f5ee',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                      <File size={16} color="#1a6b4a" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {doc.file_name}
                      </div>
                      <div style={{ fontSize: 10, color: '#999', marginTop: 2 }}>
                        {doc.uploaded_by_name || 'Unknown'} · {new Date(doc.uploaded_at).toLocaleDateString('en-IN')}
                        {doc.file_size ? ` · ${(doc.file_size / 1024).toFixed(0)} KB` : ''}
                      </div>
                    </div>
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ padding: 6, color: '#1a6b4a', display: 'flex' }}
                    >
                      <Download size={15} />
                    </a>
                    <button
                      onClick={() => handleDelete(doc)}
                      style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#a32d2d', display: 'flex' }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Add Follow-up Button */}
        <button onClick={() => navigate(`/children/${child.id}/followup`)} style={{
          width: '100%', 
          padding: '12px', 
          background: '#1a6b4a', 
          color: '#fff',
          border: 'none', 
          borderRadius: 10, 
          fontSize: 14, 
          fontWeight: 600, 
          cursor: 'pointer',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          gap: 6, 
          fontFamily: 'inherit',
          marginTop: 16
        }}>
          <Plus size={16} /> Add Annual Follow-up
        </button>
      </div>
    </div>
  )
}