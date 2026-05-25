// src/pages/ChildProfilePage-Enhanced.tsx — COMPLETE REPLACEMENT
// Adds: Documents tab with upload/view/delete, Admin delete option,
//       Edit button, proper action bar

import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { db } from '@/lib/db'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/lib/store'
import type { Child, AnnualFollowup, ChangeLogEntry, Document, DocType } from '@/types'
import {
  ArrowLeft, Plus, AlertTriangle, Calendar, TrendingUp,
  Users, Heart, Home, DollarSign, Activity, FileText,
  Upload, Trash2, Eye, Edit, Image, Award, BookOpen,
  CreditCard, File, Download, Loader2, X
} from 'lucide-react'

const G = '#1a6b4a'

// ── Tiny shared components ────────────────────────────────────
function Tag({ v, t }: { v: string; t: 'r'|'g'|'a'|'b'|'p'|'t' }) {
  const c={r:['#fcebeb','#a32d2d'],g:['#eaf3de','#3b6d11'],a:['#faeeda','#854f0b'],b:['#e6f1fb','#185fa5'],p:['#eeedfe','#3c3489'],t:['#e1f5ee','#085041']}[t]
  return <span style={{fontSize:10,padding:'2px 7px',borderRadius:9,background:c[0],color:c[1],whiteSpace:'nowrap'}}>{v}</span>
}

function Row({ k, v, updated }: { k: string; v?: string | boolean | null; updated?: boolean }) {
  if (v === null || v === undefined || v === '') return null
  const display = typeof v === 'boolean' ? (v ? 'Yes' : 'No') : v
  return (
    <div style={{ display:'flex', justifyContent:'space-between', padding:'5px 0',
      borderBottom:'0.5px solid #f0f0f0', fontSize:12, alignItems:'flex-start', gap:8 }}>
      <span style={{ color:'#888', width:'45%', flexShrink:0, fontSize:11 }}>{k}</span>
      <span style={{ fontWeight:500, color: updated ? '#0f6e56' : '#111', textAlign:'right', flex:1 }}>
        {display} {updated && <span style={{ fontSize:9, color:'#0f6e56' }}>↑ latest</span>}
      </span>
    </div>
  )
}

function Section({ title, children, badge, icon }: {
  title: string; children: React.ReactNode; badge?: string; icon?: React.ReactNode
}) {
  return (
    <div style={{ marginBottom:12 }}>
      <div style={{ fontSize:11, fontWeight:600, color:G, textTransform:'uppercase',
        letterSpacing:'0.05em', marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
        {icon}{title}
        {badge && <span style={{ background:'#e1f5ee', color:'#0f6e56', fontSize:9,
          padding:'2px 6px', borderRadius:8, fontWeight:500, textTransform:'none' }}>{badge}</span>}
      </div>
      <div style={{ background:'#f9f9f9', borderRadius:10, padding:'6px 10px' }}>
        {children}
      </div>
    </div>
  )
}

// ── Document type config ──────────────────────────────────────
const DOC_CONFIG: Record<DocType, { label: string; icon: React.ReactNode; accept: string }> = {
  photo:            { label:'Photo',           icon:<Image size={14}/>,    accept:'image/*' },
  progress_card:    { label:'Progress Card',   icon:<BookOpen size={14}/>, accept:'image/*,.pdf' },
  certificate:      { label:'Certificate',     icon:<Award size={14}/>,    accept:'image/*,.pdf' },
  aadhar:           { label:'Aadhar Card',     icon:<CreditCard size={14}/>,accept:'image/*,.pdf' },
  birth_certificate:{ label:'Birth Certificate',icon:<FileText size={14}/>,accept:'image/*,.pdf' },
  sponsor_letter:   { label:'Sponsor Letter',  icon:<File size={14}/>,     accept:'.pdf,.doc,.docx' },
  other:            { label:'Other',           icon:<File size={14}/>,     accept:'*' },
}

// ── Documents Tab ─────────────────────────────────────────────
function DocumentsTab({ childId, isAdmin }: { childId: string; isAdmin: boolean }) {
  const [docs, setDocs] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadType, setUploadType] = useState<DocType>('photo')
  const [docNotes, setDocNotes] = useState('')
  const [docYear, setDocYear] = useState('')
  const [docTerm, setDocTerm] = useState<''|'1'|'2'>('')
  const [preview, setPreview] = useState<Document | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadDocs()
  }, [childId])

  async function loadDocs() {
    setLoading(true)
    const { data } = await supabase
      .from('documents')
      .select('*')
      .eq('child_id', childId)
      .order('uploaded_at', { ascending: false })
    if (data) setDocs(data)
    setLoading(false)
  }

  async function handleUpload(file: File) {
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()?.toLowerCase()
      const ts = Date.now()
      const path = `children/${childId}/${uploadType}/${ts}.${ext}`

      const { error: upErr } = await supabase.storage
        .from('child-documents')
        .upload(path, file, { upsert: false })

      if (upErr) throw upErr

      const { data: urlData } = supabase.storage
        .from('child-documents')
        .getPublicUrl(path)

      const doc: Omit<Document, 'uploaded_at'> & { uploaded_at: string } = {
        id: crypto.randomUUID(),
        child_id: childId,
        doc_type: uploadType,
        file_name: file.name,
        storage_path: path,
        public_url: urlData.publicUrl,
        file_size_kb: Math.round(file.size / 1024),
        academic_year: docYear || undefined,
        term: docTerm ? parseInt(docTerm) : undefined,
        notes: docNotes || undefined,
        uploaded_at: new Date().toISOString(),
      }

      const { error: dbErr } = await supabase.from('documents').insert(doc)
      if (dbErr) throw dbErr

      setDocs(prev => [doc, ...prev])
      setDocNotes('')
      if (fileRef.current) fileRef.current.value = ''
    } catch (err) {
      alert('Upload failed: ' + String(err))
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(doc: Document) {
    if (!confirm(`Delete "${doc.file_name}"? This cannot be undone.`)) return
    await supabase.storage.from('child-documents').remove([doc.storage_path])
    await supabase.from('documents').delete().eq('id', doc.id)
    setDocs(prev => prev.filter(d => d.id !== doc.id))
  }

  // Group docs by type
  const grouped = docs.reduce((acc, d) => {
    if (!acc[d.doc_type]) acc[d.doc_type] = []
    acc[d.doc_type].push(d)
    return acc
  }, {} as Record<string, Document[]>)

  const isImage = (url: string) => /\.(jpg|jpeg|png|webp|gif)$/i.test(url)
  const isPdf   = (url: string) => /\.pdf$/i.test(url)

  return (
    <div>
      {/* Upload panel */}
      <div style={{ background:'#f0faf6', border:'1px solid #b3d9c9', borderRadius:10, padding:12, marginBottom:14 }}>
        <div style={{ fontSize:12, fontWeight:600, color:G, marginBottom:10 }}>Upload Document</div>

        {/* Type selector */}
        <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:10 }}>
          {(Object.keys(DOC_CONFIG) as DocType[]).map(type => (
            <button key={type} onClick={() => setUploadType(type)}
              style={{ padding:'5px 10px', border:`1.5px solid ${uploadType===type ? G : '#ddd'}`,
                borderRadius:16, background: uploadType===type ? '#e8f5e9' : '#fff',
                color: uploadType===type ? G : '#666', fontSize:11, fontWeight:600,
                cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:4 }}>
              {DOC_CONFIG[type].icon} {DOC_CONFIG[type].label}
            </button>
          ))}
        </div>

        {/* Optional year/term for progress cards */}
        {(uploadType === 'progress_card' || uploadType === 'certificate') && (
          <div style={{ display:'flex', gap:8, marginBottom:8 }}>
            <input value={docYear} onChange={e => setDocYear(e.target.value)}
              placeholder="Academic year e.g. 2025-26"
              style={{ flex:1, padding:'7px 10px', border:'1px solid #ddd', borderRadius:7,
                fontSize:11, fontFamily:'inherit', outline:'none' }} />
            {uploadType === 'progress_card' && (
              <select value={docTerm} onChange={e => setDocTerm(e.target.value as ''|'1'|'2')}
                style={{ padding:'7px 8px', border:'1px solid #ddd', borderRadius:7,
                  fontSize:11, fontFamily:'inherit', outline:'none', background:'#fff' }}>
                <option value="">Term</option>
                <option value="1">Term 1</option>
                <option value="2">Term 2</option>
              </select>
            )}
          </div>
        )}

        <input value={docNotes} onChange={e => setDocNotes(e.target.value)}
          placeholder="Notes (optional)"
          style={{ width:'100%', padding:'7px 10px', border:'1px solid #ddd', borderRadius:7,
            fontSize:11, fontFamily:'inherit', outline:'none', marginBottom:8, boxSizing:'border-box' }} />

        {/* File picker */}
        <label style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8,
          padding:'10px', border:`2px dashed ${uploading ? '#ddd' : G}`,
          borderRadius:8, cursor: uploading ? 'not-allowed' : 'pointer',
          color: uploading ? '#aaa' : G, fontSize:12, fontWeight:600 }}>
          {uploading
            ? <><Loader2 size={16} style={{ animation:'spin 1s linear infinite' }} /> Uploading…</>
            : <><Upload size={16} /> Choose file to upload</>
          }
          <input ref={fileRef} type="file" accept={DOC_CONFIG[uploadType].accept}
            style={{ display:'none' }} disabled={uploading}
            onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} />
        </label>
      </div>

      {/* Documents list */}
      {loading ? (
        <div style={{ textAlign:'center', padding:20, color:'#999', fontSize:12 }}>Loading documents…</div>
      ) : docs.length === 0 ? (
        <div style={{ textAlign:'center', padding:24, color:'#bbb', fontSize:12 }}>
          <File size={28} style={{ display:'block', margin:'0 auto 8px', opacity:.4 }} />
          No documents uploaded yet
        </div>
      ) : (
        Object.entries(grouped).map(([type, typeDocs]) => (
          <div key={type} style={{ marginBottom:14 }}>
            <div style={{ fontSize:11, fontWeight:600, color:'#555', textTransform:'uppercase',
              letterSpacing:'.05em', marginBottom:6, display:'flex', alignItems:'center', gap:6 }}>
              {DOC_CONFIG[type as DocType]?.icon}
              {DOC_CONFIG[type as DocType]?.label} ({typeDocs.length})
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px,1fr))', gap:8 }}>
              {typeDocs.map(doc => (
                <div key={doc.id} style={{ border:'1px solid #e5e5e5', borderRadius:10,
                  overflow:'hidden', background:'#fff' }}>

                  {/* Thumbnail or file icon */}
                  <div onClick={() => setPreview(doc)}
                    style={{ height:90, background:'#f5f5f5', display:'flex', alignItems:'center',
                      justifyContent:'center', cursor:'pointer', overflow:'hidden', position:'relative' }}>
                    {isImage(doc.public_url)
                      ? <img src={doc.public_url} alt={doc.file_name}
                          style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                      : isPdf(doc.public_url)
                      ? <div style={{ textAlign:'center' }}>
                          <FileText size={28} color="#dc2626" />
                          <div style={{ fontSize:9, color:'#dc2626', marginTop:2, fontWeight:600 }}>PDF</div>
                        </div>
                      : <File size={28} color="#888" />
                    }
                    {/* Year/term badge */}
                    {doc.academic_year && (
                      <div style={{ position:'absolute', top:4, left:4, fontSize:9, fontWeight:600,
                        background:'rgba(0,0,0,.6)', color:'#fff', padding:'1px 5px', borderRadius:5 }}>
                        {doc.academic_year}{doc.term ? ` T${doc.term}` : ''}
                      </div>
                    )}
                  </div>

                  {/* Info + actions */}
                  <div style={{ padding:'6px 8px' }}>
                    <div style={{ fontSize:10, color:'#333', fontWeight:500,
                      overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                      marginBottom:2 }} title={doc.file_name}>
                      {doc.file_name}
                    </div>
                    {doc.file_size_kb && (
                      <div style={{ fontSize:9, color:'#aaa', marginBottom:5 }}>{doc.file_size_kb} KB</div>
                    )}
                    <div style={{ display:'flex', gap:4 }}>
                      <a href={doc.public_url} target="_blank" rel="noreferrer"
                        style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center',
                          gap:3, padding:'4px', background:'#e8f5e9', borderRadius:5,
                          color:G, fontSize:10, fontWeight:600, textDecoration:'none' }}>
                        <Eye size={10} /> View
                      </a>
                      <a href={doc.public_url} download={doc.file_name}
                        style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center',
                          gap:3, padding:'4px', background:'#e3f2fd', borderRadius:5,
                          color:'#1565c0', fontSize:10, fontWeight:600, textDecoration:'none' }}>
                        <Download size={10} /> Save
                      </a>
                      {isAdmin && (
                        <button onClick={() => handleDelete(doc)}
                          style={{ display:'flex', alignItems:'center', justifyContent:'center',
                            padding:'4px 6px', background:'#fef2f2', border:'none', borderRadius:5,
                            color:'#dc2626', cursor:'pointer', fontSize:10 }}>
                          <Trash2 size={10} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Image preview modal */}
      {preview && (
        <div onClick={() => setPreview(null)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.85)', zIndex:9999,
            display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <button onClick={() => setPreview(null)}
            style={{ position:'absolute', top:16, right:16, background:'rgba(255,255,255,.15)',
              border:'none', color:'#fff', borderRadius:'50%', width:36, height:36,
              cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <X size={18} />
          </button>
          {isImage(preview.public_url)
            ? <img src={preview.public_url} alt={preview.file_name}
                style={{ maxWidth:'100%', maxHeight:'80vh', borderRadius:8, objectFit:'contain' }} />
            : <div style={{ color:'#fff', textAlign:'center' }}>
                <FileText size={48} style={{ display:'block', margin:'0 auto 12px' }} />
                <a href={preview.public_url} target="_blank" rel="noreferrer"
                  style={{ color:'#86efac', fontWeight:600 }}>Open {preview.file_name}</a>
              </div>
          }
          {preview.notes && (
            <div style={{ position:'absolute', bottom:20, left:'50%', transform:'translateX(-50%)',
              background:'rgba(0,0,0,.7)', color:'#fff', padding:'6px 14px', borderRadius:20,
              fontSize:11 }}>
              {preview.notes}
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  )
}

// ── Delete Confirm Modal ──────────────────────────────────────
function DeleteConfirm({ name, onConfirm, onCancel }: {
  name: string; onConfirm: () => void; onCancel: () => void
}) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:9999,
      display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:'#fff', borderRadius:16, padding:24, maxWidth:320, width:'100%' }}>
        <div style={{ fontSize:32, textAlign:'center', marginBottom:12 }}>⚠️</div>
        <div style={{ fontSize:15, fontWeight:700, color:'#111', textAlign:'center', marginBottom:8 }}>
          Delete Child Record?
        </div>
        <div style={{ fontSize:12, color:'#666', textAlign:'center', lineHeight:1.5, marginBottom:20 }}>
          This will permanently delete <strong>{name}</strong> and all their followups, academic records, and documents. This cannot be undone.
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onCancel}
            style={{ flex:1, padding:'11px', background:'#f0f0f0', border:'none', borderRadius:10,
              fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
            Cancel
          </button>
          <button onClick={onConfirm}
            style={{ flex:1, padding:'11px', background:'#dc2626', color:'#fff', border:'none',
              borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
            Delete Forever
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────
export default function ChildProfilePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAppStore()
  const isAdmin = user?.role === 'admin'

  const [child, setChild]       = useState<Child | null>(null)
  const [followups, setFollowups] = useState<AnnualFollowup[]>([])
  const [changelog, setChangelog] = useState<ChangeLogEntry[]>([])
  const [view, setView]         = useState<'overview'|'timeline'|'documents'|'comparison'>('overview')
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!id) return
    db.children.get(id).then(c => { if (c) setChild(c) })
    db.followups.where('child_id').equals(id).reverse().sortBy('created_at').then(setFollowups)
    db.change_log.where('child_id').equals(id).reverse().sortBy('changed_at').then(setChangelog)
  }, [id])

  async function handleDelete() {
    if (!id || !child) return
    setDeleting(true)
    try {
      // Delete storage documents
      const { data: docs } = await supabase.from('documents').select('storage_path').eq('child_id', id)
      if (docs?.length) {
        await supabase.storage.from('child-documents').remove(docs.map(d => d.storage_path))
      }
      // Delete child (cascades to followups, academic_records, etc.)
      await supabase.from('children').delete().eq('id', id)
      await db.children.delete(id)
      navigate('/children')
    } catch (err) {
      alert('Delete failed: ' + String(err))
    } finally {
      setDeleting(false)
    }
  }

  if (!child) return (
    <div style={{ padding:24, color:'#888', fontFamily:"'DM Sans',sans-serif", textAlign:'center' }}>
      Loading…
    </div>
  )

  const initials = child.full_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  const admissionYear = child.admission_date ? new Date(child.admission_date).getFullYear() : null
  const yearsInProgram = admissionYear ? new Date().getFullYear() - admissionYear : null
  const latestFollowup = followups[0]

  const TABS = [
    { id:'overview',    label:'Overview',   icon:'📋' },
    { id:'timeline',    label:'Timeline',   icon:'📅' },
    { id:'documents',   label:'Documents',  icon:'📎' },
    { id:'comparison',  label:'Then vs Now',icon:'📊' },
  ]

  return (
    <div style={{ fontFamily:"'DM Sans',system-ui,sans-serif" }}>

      {/* Delete confirm */}
      {showDelete && (
        <DeleteConfirm
          name={child.full_name}
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
        />
      )}

      {/* Header */}
      <div style={{ background:G, padding:'14px', color:'#fff', display:'flex', gap:11, alignItems:'center' }}>
        <button onClick={() => navigate('/children')}
          style={{ background:'none', border:'none', color:'#fff', cursor:'pointer', padding:2, display:'flex' }}>
          <ArrowLeft size={20} />
        </button>

        <div style={{ width:50, height:50, borderRadius:'50%', background:'#9fe1cb',
          color:'#085041', display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:15, fontWeight:700, flexShrink:0, overflow:'hidden' }}>
          {child.photo_url
            ? <img src={child.photo_url} alt="" style={{ width:50, height:50, borderRadius:'50%', objectFit:'cover' }} />
            : initials}
        </div>

        <div style={{ flex:1 }}>
          <div style={{ fontWeight:700, fontSize:16 }}>{child.full_name}</div>
          <div style={{ fontSize:11, opacity:.8 }}>
            ID: {child.school_id}
            {yearsInProgram ? ` · ${yearsInProgram} yr in program` : ''}
            {child.child_type === 'sponsored_external' ? ' · Sponsored' : ''}
            {child.child_type === 'alumni' ? ' · Alumni' : ''}
          </div>
          <div style={{ display:'flex', gap:4, marginTop:5, flexWrap:'wrap' }}>
            {child.sex && <Tag v={child.sex} t="b" />}
            {child.present_class && <Tag v={child.present_class} t="p" />}
            {child.category && <Tag v={child.category} t="t" />}
            {child.lifecycle_status && child.lifecycle_status !== 'active' &&
              <Tag v={child.lifecycle_status} t="a" />}
          </div>
        </div>

        {/* Edit + Admin delete */}
        <div style={{ display:'flex', gap:6 }}>
          <button onClick={() => navigate(`/children/${id}/edit`)}
            style={{ background:'rgba(255,255,255,.15)', border:'none', color:'#fff',
              borderRadius:8, padding:'6px 10px', cursor:'pointer', display:'flex',
              alignItems:'center', gap:4, fontSize:11, fontWeight:600 }}>
            <Edit size={13} /> Edit
          </button>
          {isAdmin && (
            <button onClick={() => setShowDelete(true)}
              style={{ background:'rgba(220,38,38,.3)', border:'none', color:'#fff',
                borderRadius:8, padding:'6px 10px', cursor:'pointer', display:'flex',
                alignItems:'center', gap:4, fontSize:11, fontWeight:600 }}>
              <Trash2 size={13} /> Delete
            </button>
          )}
        </div>
      </div>

      {/* DV Alert */}
      {(child.father_dv || child.mother_dv) && (
        <div style={{ background:'#fcebeb', border:'0.5px solid #f09595', padding:'8px 14px',
          display:'flex', gap:7, alignItems:'center' }}>
          <AlertTriangle size={13} color="#a32d2d" />
          <span style={{ fontSize:11, color:'#a32d2d' }}>
            Domestic violence reported for this child's family.
          </span>
        </div>
      )}

      {/* Tab bar */}
      <div style={{ display:'flex', gap:0, background:'#f5f5f5',
        borderBottom:'1px solid #e5e5e5', overflowX:'auto' }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setView(tab.id as any)}
            style={{ display:'flex', alignItems:'center', gap:5, padding:'10px 14px',
              background: view===tab.id ? '#fff' : 'transparent',
              color: view===tab.id ? G : '#666',
              border:'none', borderBottom: view===tab.id ? `2px solid ${G}` : '2px solid transparent',
              fontSize:12, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap',
              fontFamily:'inherit' }}>
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      <div style={{ padding:'12px 14px 100px' }}>

        {/* ── OVERVIEW ─────────────────────────────────────── */}
        {view === 'overview' && (
          <>
            {/* Quick stats */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:14 }}>
              {[
                { label:'Years in Program', value: yearsInProgram ?? 'N/A', bg:'linear-gradient(135deg,#1a6b4a,#15563c)' },
                { label:'Follow-ups',        value: followups.length,         bg:'linear-gradient(135deg,#0891b2,#0e7490)' },
                { label:'Changes Logged',    value: changelog.length,         bg:'linear-gradient(135deg,#ea580c,#c2410c)' },
              ].map(s => (
                <div key={s.label} style={{ background:s.bg, borderRadius:10, padding:12,
                  color:'#fff', textAlign:'center' }}>
                  <div style={{ fontSize:24, fontWeight:700 }}>{s.value}</div>
                  <div style={{ fontSize:10, opacity:.9 }}>{s.label}</div>
                </div>
              ))}
            </div>

            <Section title="Child Information" icon={<Users size={13}/>}>
              <Row k="Date of birth" v={child.date_of_birth} />
              <Row k="Religion"      v={child.religion} />
              <Row k="Mother tongue" v={child.mother_tongue} />
              <Row k="Aadhar no."   v={child.aadhar_no} />
              <Row k="Normal/Special" v={child.normal_or_special} />
            </Section>

            <Section title="Father's Information" icon={<Users size={13}/>}
              badge={`${changelog.filter(l=>l.field_name.includes('father')).length} changes`}>
              <Row k="Name"           v={child.father_name} />
              <Row k="Status"         v={latestFollowup?.father_status || child.father_status}
                updated={!!latestFollowup?.father_status} />
              <Row k="Age"            v={child.father_age} />
              <Row k="Mobile"         v={child.father_mobile} />
              <Row k="Education"      v={child.father_education} />
              <Row k="Occupation"     v={latestFollowup?.father_occupation || child.father_occupation}
                updated={!!latestFollowup?.father_occupation} />
              <Row k="Monthly income" v={latestFollowup?.father_earnings || child.father_earnings}
                updated={!!latestFollowup?.father_earnings} />
              <Row k="Habits"         v={latestFollowup?.father_habits || child.father_habits}
                updated={!!latestFollowup?.father_habits} />
              <Row k="Health"         v={latestFollowup?.father_health || child.father_health}
                updated={!!latestFollowup?.father_health} />
              <Row k="Domestic violence" v={child.father_dv} />
              <Row k="Place of origin"   v={child.father_origin} />
            </Section>

            <Section title="Mother's Information" icon={<Heart size={13}/>}>
              <Row k="Name"           v={child.mother_name} />
              <Row k="Status"         v={latestFollowup?.mother_status || child.mother_status}
                updated={!!latestFollowup?.mother_status} />
              <Row k="Age"            v={child.mother_age} />
              <Row k="Mobile"         v={child.mother_mobile} />
              <Row k="Education"      v={child.mother_education} />
              <Row k="Occupation"     v={latestFollowup?.mother_occupation || child.mother_occupation}
                updated={!!latestFollowup?.mother_occupation} />
              <Row k="Monthly income" v={latestFollowup?.mother_earnings || child.mother_earnings}
                updated={!!latestFollowup?.mother_earnings} />
              <Row k="Health"         v={latestFollowup?.mother_health || child.mother_health}
                updated={!!latestFollowup?.mother_health} />
              <Row k="Family planning op." v={child.family_planning_op} />
            </Section>

            <Section title="Financial Situation" icon={<DollarSign size={13}/>}>
              <Row k="Avg monthly income" v={child.avg_monthly_income} />
              <Row k="Other income"       v={child.other_income} />
              <Row k="Govt/NGO support"   v={child.govt_support} />
              <Row k="No. of dependents"  v={latestFollowup?.num_dependents || child.num_dependents}
                updated={!!latestFollowup?.num_dependents} />
              <Row k="Debts"              v={latestFollowup?.debts || child.debts}
                updated={!!latestFollowup?.debts} />
              <Row k="Savings/PF"         v={child.savings} />
            </Section>

            <Section title="Living Conditions" icon={<Home size={13}/>}>
              <Row k="Area type"     v={child.area_type} />
              <Row k="House size"    v={child.house_size} />
              <Row k="Roof"          v={child.house_roof} />
              <Row k="Flooring"      v={child.house_floor} />
              <Row k="Ownership"     v={child.house_ownership} />
              <Row k="Rent/month"    v={latestFollowup?.rent_per_month || child.rent_per_month}
                updated={!!latestFollowup?.rent_per_month} />
              <Row k="Advance paid"  v={child.advance_paid} />
              <Row k="Vehicles"      v={(child as any).vehicles} />
              <Row k="Sanitation"    v={child.sanitation} />
              <Row k="Water source"  v={child.water_source} />
            </Section>

            <Section title="Child Health & Profile" icon={<Activity size={13}/>}>
              <Row k="Height / Weight" v={child.height_cm ? `${child.height_cm} cm / ${child.weight_kg || '—'} kg` : null} />
              <Row k="Health"          v={child.child_health} />
              <Row k="Meals/day"       v={child.meals_per_day} />
              <Row k="Food type"       v={child.food_type} />
              <Row k="Medical help from" v={child.medical_help_from} />
              <Row k="Interests"       v={child.interests} />
              <Row k="Preschool"       v={child.preschool} />
            </Section>

            {child.conclusion && (
              <Section title="Social Worker Conclusion" icon={<FileText size={13}/>}>
                <div style={{ fontSize:12, color:'#444', lineHeight:1.65,
                  whiteSpace:'pre-wrap', padding:'4px 0' }}>
                  {child.conclusion}
                </div>
              </Section>
            )}

            {latestFollowup?.special_remarks && (
              <Section title="Latest Observations" icon={<FileText size={13}/>}
                badge={latestFollowup.year_label}>
                <div style={{ fontSize:12, color:'#444', lineHeight:1.65,
                  background:'#fffbeb', padding:10, borderRadius:8,
                  borderLeft:'3px solid #f59e0b', whiteSpace:'pre-wrap' }}>
                  {latestFollowup.special_remarks}
                </div>
                <div style={{ fontSize:10, color:'#aaa', marginTop:6 }}>
                  Recorded by {latestFollowup.recorded_by_name || '—'} · {latestFollowup.visit_date || latestFollowup.created_at?.slice(0,10)}
                </div>
              </Section>
            )}
          </>
        )}

        {/* ── TIMELINE ─────────────────────────────────────── */}
        {view === 'timeline' && (
          <div>
            {followups.length === 0 ? (
              <div style={{ textAlign:'center', padding:24, color:'#bbb', fontSize:12 }}>
                No follow-up records yet
              </div>
            ) : (
              <div style={{ position:'relative', paddingLeft:20 }}>
                <div style={{ position:'absolute', left:6, top:0, bottom:0,
                  width:2, background:'#e5e5e5' }} />
                {[...followups].reverse().map((fu, i) => (
                  <div key={fu.id} style={{ position:'relative', marginBottom:18 }}>
                    <div style={{ position:'absolute', left:-17, top:2, width:18, height:18,
                      borderRadius:'50%', background:'#e8f5e9', border:`2px solid ${G}`,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:8, fontWeight:700, color:G }}>
                      {i+1}
                    </div>
                    <div style={{ background:'#fff', border:'1px solid #e5e5e5',
                      borderRadius:10, padding:'10px 12px' }}>
                      <div style={{ display:'flex', justifyContent:'space-between',
                        alignItems:'center', marginBottom:6 }}>
                        <div style={{ fontSize:12, fontWeight:700, color:'#111' }}>
                          📅 {fu.year_label}
                        </div>
                        {fu.present_class && (
                          <span style={{ fontSize:10, background:'#e8f5e9', color:G,
                            padding:'2px 8px', borderRadius:8, fontWeight:600 }}>
                            Class: {fu.present_class}
                          </span>
                        )}
                      </div>
                      {fu.child_height && (
                        <div style={{ fontSize:11, color:'#666', marginBottom:3 }}>
                          📏 {fu.child_height} cm · ⚖️ {fu.child_weight || '—'} kg
                        </div>
                      )}
                      {fu.father_status && fu.father_status !== child.father_status && (
                        <div style={{ fontSize:11, color:'#b45309', marginBottom:3 }}>
                          ⚠ Father status changed: {fu.father_status}
                        </div>
                      )}
                      {fu.special_remarks && (
                        <div style={{ fontSize:11, color:'#555', marginTop:6,
                          lineHeight:1.55, borderTop:'0.5px solid #f0f0f0', paddingTop:6 }}>
                          {fu.special_remarks.slice(0, 150)}{fu.special_remarks.length > 150 ? '…' : ''}
                        </div>
                      )}
                      <div style={{ fontSize:10, color:'#aaa', marginTop:6 }}>
                        {fu.recorded_by_name || '—'} · {fu.visit_date || fu.created_at?.slice(0,10)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── DOCUMENTS ────────────────────────────────────── */}
        {view === 'documents' && (
          <DocumentsTab childId={id!} isAdmin={isAdmin} />
        )}

        {/* ── THEN VS NOW ──────────────────────────────────── */}
        {view === 'comparison' && (
          <div>
            {followups.length === 0 ? (
              <div style={{ textAlign:'center', padding:24, color:'#bbb', fontSize:12 }}>
                No follow-up data to compare yet
              </div>
            ) : (
              <>
                <div style={{ fontSize:11, color:'#888', marginBottom:12, background:'#f5f5f5',
                  borderRadius:8, padding:'8px 10px' }}>
                  Comparing On Admission vs latest follow-up ({followups[0].year_label})
                </div>
                {[
                  { title:'Class', before: child.present_class, after: latestFollowup.present_class, icon:'🎓' },
                  { title:'Father Status', before: child.father_status, after: latestFollowup.father_status, icon:'👨' },
                  { title:'Father Income', before: child.father_earnings, after: latestFollowup.father_earnings, icon:'💰' },
                  { title:'Father Habits', before: child.father_habits, after: latestFollowup.father_habits, icon:'⚠' },
                  { title:'Mother Status', before: child.mother_status, after: latestFollowup.mother_status, icon:'👩' },
                  { title:'Mother Income', before: child.mother_earnings, after: latestFollowup.mother_earnings, icon:'💰' },
                  { title:'Rent/Month',   before: child.rent_per_month, after: latestFollowup.rent_per_month, icon:'🏠' },
                  { title:'Dependents',   before: child.num_dependents, after: latestFollowup.num_dependents, icon:'👥' },
                ].filter(item => item.after && item.after !== item.before).map((item, i) => (
                  <div key={i} style={{ background:'#fff', border:'1px solid #e5e5e5',
                    borderRadius:10, padding:12, marginBottom:10 }}>
                    <div style={{ fontSize:12, fontWeight:600, marginBottom:8,
                      display:'flex', alignItems:'center', gap:6 }}>
                      {item.icon} {item.title}
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr',
                      gap:8, alignItems:'center' }}>
                      <div style={{ padding:8, background:'#e1f5ee', borderRadius:8,
                        fontSize:11, textAlign:'center' }}>{item.before || '—'}</div>
                      <span style={{ fontSize:14 }}>→</span>
                      <div style={{ padding:8, background:'#e6f1fb', borderRadius:8,
                        fontSize:11, fontWeight:600, textAlign:'center' }}>{item.after || '—'}</div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Bottom action bar */}
      <div style={{ position:'fixed', bottom:0, left:0, right:0,
        width:'100%', background:'#fff', borderTop:'1px solid #e5e5e5',
        padding:'10px 14px', display:'flex', gap:8,
        boxShadow:'0 -4px 20px rgba(0,0,0,.06)' }}>
        <button onClick={() => navigate(`/children/${id}/followup`)}
          style={{ flex:1, padding:'12px', background:G, color:'#fff', border:'none',
            borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center',
            gap:6, fontFamily:'inherit' }}>
          <Plus size={16} /> Annual Follow-up
        </button>
        <button onClick={() => { setView('documents') }}
          style={{ padding:'12px 14px', background:'#e8f5e9', border:'none', borderRadius:10,
            fontSize:13, fontWeight:700, cursor:'pointer', color:G,
            display:'flex', alignItems:'center', gap:6, fontFamily:'inherit' }}>
          <Upload size={15} /> Docs
        </button>
      </div>
    </div>
  )
}