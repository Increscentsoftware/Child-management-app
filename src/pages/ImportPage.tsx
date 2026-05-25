// src/pages/ImportPage.tsx — COMPLETE REWRITE
import { useState, useCallback } from 'react'
import type { ImportError, ImportWarning } from '@/types'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'
import { importFile, checkDuplicate } from '@/lib/excelImport'
import { supabase } from '@/lib/supabase'
import { saveChildLocally, saveFollowupLocally } from '@/lib/db'
import type { ImportResult, Child, AnnualFollowup, ChildType } from '@/types'
import {
  ArrowLeft, Upload, FileText, FileSpreadsheet, CheckCircle,
  AlertCircle, AlertTriangle, ChevronRight, Loader2,
  SkipForward, GitMerge, Plus, Trash2, Eye
} from 'lucide-react'

const G = '#1a6b4a'
const AMBER = '#b45309'
const RED = '#dc2626'

// ─────────────────────────────────────────────────────────────
// Step indicator
// ─────────────────────────────────────────────────────────────
function Steps({ current }: { current: number }) {
  const labels = ['Upload', 'Preview', 'Duplicates', 'Import']
  return (
    <div style={{ display:'flex', padding:'10px 14px', background:'#f8f8f8', borderBottom:'1px solid #e5e5e5', gap:0 }}>
      {labels.map((l, i) => (
        <div key={i} style={{ display:'flex', alignItems:'center', flex: i < labels.length-1 ? 1 : 0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
            <div style={{
              width:22, height:22, borderRadius:'50%', display:'flex',
              alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700,
              background: i < current ? G : i === current ? G : '#e0e0e0',
              color: i <= current ? '#fff' : '#999'
            }}>
              {i < current ? '✓' : i+1}
            </div>
            <span style={{ fontSize:11, fontWeight: i===current ? 600 : 400,
              color: i===current ? G : i<current ? '#555' : '#aaa' }}>{l}</span>
          </div>
          {i < labels.length-1 && (
            <div style={{ flex:1, height:2, margin:'0 8px',
              background: i < current ? G : '#e0e0e0' }} />
          )}
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Field preview row
// ─────────────────────────────────────────────────────────────
function FieldRow({ label, value, fieldKey, onEdit, status }: {
  label: string; value: unknown; fieldKey: string
  onEdit: (key: string, val: string) => void
  status: 'ok'|'warn'|'missing'
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const colors = { ok:['#f0faf6','#1a6b4a'], warn:['#fffbeb','#b45309'], missing:['#fef2f2','#dc2626'] }
  const [bg, fg] = colors[status]
  const isMissing = !value || !String(value).trim()
  const displayVal = !isMissing
    ? (String(value).length > 60 ? String(value).slice(0,57)+'…' : String(value))
    : '—'

  function startEdit() { setDraft(isMissing ? '' : String(value)); setEditing(true) }
  function save() { onEdit(fieldKey, draft); setEditing(false) }

  if (editing) {
    return (
      <div style={{ display:'flex', gap:6, alignItems:'center', padding:'4px 8px',
        background:'#fffbeb', borderRadius:6, marginBottom:3 }}>
        <span style={{ color:'#666', width:'42%', flexShrink:0, fontSize:11 }}>{label}</span>
        <input autoFocus value={draft} onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key==='Enter') save(); if (e.key==='Escape') setEditing(false) }}
          style={{ flex:1, padding:'3px 6px', border:'1px solid #1a6b4a', borderRadius:5,
            fontSize:11, fontFamily:'inherit', outline:'none' }} />
        <button onClick={save}
          style={{ padding:'3px 8px', background:'#1a6b4a', color:'#fff', border:'none',
            borderRadius:5, fontSize:11, cursor:'pointer', fontFamily:'inherit' }}>✓</button>
        <button onClick={() => setEditing(false)}
          style={{ padding:'3px 6px', background:'#f0f0f0', border:'none',
            borderRadius:5, fontSize:11, cursor:'pointer', fontFamily:'inherit' }}>✕</button>
      </div>
    )
  }

  return (
    <div onClick={startEdit}
      style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
        padding:'5px 8px', background:bg, borderRadius:6, marginBottom:3, fontSize:11,
        cursor:'pointer', transition:'opacity .15s' }}
      title="Click to edit">
      <span style={{ color:'#666', width:'45%', flexShrink:0 }}>{label}</span>
      <span style={{ color:fg, fontWeight:500, textAlign:'right', flex:1 }}>{displayVal}</span>
      <span style={{ color:'#bbb', fontSize:9, marginLeft:6, flexShrink:0 }}>✎</span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Section in preview
// ─────────────────────────────────────────────────────────────
function PreviewSection({ title, fields, onEdit }: {
  title: string
  fields: { label: string; key: string; value: unknown }[]
  onEdit: (key: string, val: string) => void
}) {
  const [open, setOpen] = useState(true)
  const missingCount = fields.filter(f => !f.value || !String(f.value).trim()).length
  return (
    <div style={{ marginBottom:10, border:'1px solid #e8e8e8', borderRadius:8, overflow:'hidden' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width:'100%', display:'flex', justifyContent:'space-between',
          padding:'8px 10px', background:'#f5f5f5', border:'none', cursor:'pointer',
          fontSize:11, fontWeight:600, color:'#444', fontFamily:'inherit' }}>
        <span>{title}</span>
        <span style={{ display:'flex', alignItems:'center', gap:8 }}>
          {missingCount > 0 && (
            <span style={{ fontSize:10, background:'#fef2f2', color:'#dc2626',
              padding:'1px 6px', borderRadius:8, fontWeight:600 }}>
              {missingCount} missing
            </span>
          )}
          <span style={{ color:'#999' }}>{open ? '▲' : '▼'}</span>
        </span>
      </button>
      {open && (
        <div style={{ padding:'8px' }}>
          {fields.map(f => (
            <FieldRow
              key={f.key}
              label={f.label}
              value={f.value}
              fieldKey={f.key}
              onEdit={onEdit}
              status={f.value !== null && f.value !== undefined && String(f.value).trim() ? 'ok' : 'missing'}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Unmapped fields panel
// ─────────────────────────────────────────────────────────────
function UnmappedPanel({ unmapped }: { unmapped: Record<string, unknown> }) {
  const entries = Object.entries(unmapped)
  if (entries.length === 0) return null
  return (
    <div style={{ background:'#fffbeb', border:'1px solid #fbbf24', borderRadius:8, padding:10, marginBottom:10 }}>
      <div style={{ fontSize:11, fontWeight:600, color:AMBER, marginBottom:6 }}>
        ⚠ {entries.length} field(s) found in file but not mapped to the standard form.
        They are preserved in raw data.
      </div>
      {entries.slice(0,8).map(([k, v]) => (
        <div key={k} style={{ fontSize:10, color:'#78350f', padding:'2px 0', borderBottom:'1px solid #fde68a' }}>
          <strong>"{k}"</strong> = {String(v)}
        </div>
      ))}
      {entries.length > 8 && <div style={{ fontSize:10, color:AMBER }}>+ {entries.length - 8} more…</div>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Types of section field definitions (for display)
// ─────────────────────────────────────────────────────────────
const PREVIEW_SECTIONS = [
  { title:'Child Identity', fields:[
    { key:'school_id', label:'School ID' }, { key:'full_name', label:'Name' },
    { key:'date_of_birth', label:'Date of Birth' }, { key:'admission_date', label:'Admission Date' },
    { key:'sex', label:'Sex' }, { key:'religion', label:'Religion' },
    { key:'mother_tongue', label:'Mother Tongue' }, { key:'present_class', label:'Class' },
    { key:'aadhar_no', label:'Aadhar No.' },
  ]},
  { title:'Father', fields:[
    { key:'father_name', label:'Name' }, { key:'father_age', label:'Age' },
    { key:'father_status', label:'Status' }, { key:'father_education', label:'Education' },
    { key:'father_occupation', label:'Occupation' }, { key:'father_nature_of_work', label:'Nature of Work' },
    { key:'father_earnings', label:'Earnings' }, { key:'father_habits', label:'Habits' },
    { key:'father_health', label:'Health' }, { key:'father_origin', label:'Place of Origin' },
    { key:'father_dv', label:'Domestic Violence' },
  ]},
  { title:'Mother', fields:[
    { key:'mother_name', label:'Name' }, { key:'mother_age', label:'Age' },
    { key:'mother_status', label:'Status' }, { key:'mother_education', label:'Education' },
    { key:'mother_occupation', label:'Occupation' }, { key:'mother_nature_of_work', label:'Nature of Work' },
    { key:'mother_earnings', label:'Earnings' }, { key:'mother_habits', label:'Habits' },
    { key:'mother_health', label:'Health' }, { key:'mother_origin', label:'Place of Origin' },
    { key:'family_planning_op', label:'Family Planning Op.' },
  ]},
  { title:'Financial & Living', fields:[
    { key:'avg_monthly_income', label:'Avg Monthly Income' }, { key:'num_dependents', label:'Dependents' },
    { key:'savings', label:'Savings/PF' }, { key:'debts', label:'Debts' },
    { key:'govt_support', label:'Govt/NGO Support' }, { key:'area_type', label:'Area Type' },
    { key:'house_size', label:'House Size' }, { key:'rent_per_month', label:'Rent/Month' },
    { key:'sanitation', label:'Sanitation' }, { key:'water_source', label:'Water Source' },
  ]},
  { title:'Child Profile', fields:[
    { key:'height_cm', label:'Height (cm)' }, { key:'weight_kg', label:'Weight (kg)' },
    { key:'child_health', label:'Health' }, { key:'meals_per_day', label:'Meals/Day' },
    { key:'food_type', label:'Food Type' }, { key:'medical_help_from', label:'Medical Help' },
    { key:'interests', label:'Interests' }, { key:'preschool', label:'Preschool' },
    { key:'special_remarks', label:'Special Remarks' },
    { key:'conclusion', label:'Conclusion/Remarks' },
  ]},
  { title:'Contact & Address', fields:[
    { key:'address_line1', label:'Address' }, { key:'contact_phone', label:'Phone' },
    { key:'reported_by', label:'Reported By' }, { key:'verified_by', label:'Verified By' },
  ]},
]

// ─────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────
export default function ImportPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [files, setFiles] = useState<File[]>([])
  const [childType, setChildType] = useState<ChildType>('shishu_student')
  const [parsing, setParsing] = useState(false)
  const [results, setResults] = useState<ImportResult[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  // Duplicate decisions: index → 'skip' | 'add' | 'merge'
  const [decisions, setDecisions] = useState<Record<number, 'skip'|'add'|'merge'>>({})
  const [duplicateInfo, setDuplicateInfo] = useState<Record<number, { id: string; full_name: string; school_id: string }>>({})
  const [checkingDups, setCheckingDups] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 })
  const [importSummary, setImportSummary] = useState<{
    inserted: number; merged: number; skipped: number; errors: string[]
  } | null>(null)

  // ── Step 1: Upload ─────────────────────────────────────────
  const onDrop = useCallback((accepted: File[]) => {
    setFiles(prev => [...prev, ...accepted])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    disabled: parsing
  })

  async function handleParse() {
    if (files.length === 0) { toast.error('Please select files'); return }
    setParsing(true)
    try {
      const all: ImportResult[] = []
      for (const file of files) {
        const fileResults = await importFile(file)
        fileResults.forEach(r => { r.child.child_type = childType })
        all.push(...fileResults)
      }
      if (all.length === 0) { toast.error('No records found in files'); return }
      setResults(all)
      setCurrentIdx(0)
      setStep(1)
      toast.success(`Extracted ${all.length} record(s) from ${files.length} file(s)`)
    } catch (err) {
      toast.error('Parse failed: ' + String(err))
    } finally {
      setParsing(false)
    }
  }

  // ── Step 2→3: Check duplicates ─────────────────────────────
  async function handleCheckDups() {
    setCheckingDups(true)
    const dups: Record<number, { id:string; full_name:string; school_id:string }> = {}
    const dec: Record<number, 'skip'|'add'|'merge'> = {}

    for (let i = 0; i < results.length; i++) {
      const r = results[i]
      try {
        const { found, match } = await checkDuplicate(r.child, supabase)
        if (found && match) {
          dups[i] = match
          dec[i] = 'skip' // default
        } else {
          dec[i] = 'add'
        }
      } catch {
        dec[i] = 'add'
      }
    }
    setDuplicateInfo(dups)
    setDecisions(dec)
    setCheckingDups(false)
    setStep(2)
  }

  // ── Step 4: Import ─────────────────────────────────────────
  async function handleImport() {
    setImporting(true)
    const summary = { inserted: 0, merged: 0, skipped: 0, errors: [] as string[] }
    setImportProgress({ done: 0, total: results.length })

    for (let i = 0; i < results.length; i++) {
      const result = results[i]
      const decision = decisions[i] || 'add'

      try {
        if (decision === 'skip') {
          summary.skipped++
        } else if (decision === 'merge') {
          // Merge: update existing child's missing fields
          const existingId = duplicateInfo[i]?.id
          if (existingId) {
            const patch: Record<string, unknown> = {}
            Object.entries(result.child).forEach(([k, v]) => {
              if (v !== null && v !== undefined && String(v).trim()) patch[k] = v
            })
            await supabase.from('children').update(patch).eq('id', existingId)
            // Add followups to existing child
            for (const fu of result.followups) {
              const fuRecord = { ...fu, child_id: existingId, id: crypto.randomUUID(),
                created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
              await supabase.from('annual_followups').upsert(fuRecord, { onConflict: 'child_id,year_label', ignoreDuplicates: true })
            }
            // Add siblings
            for (const sib of result.siblings) {
              await supabase.from('siblings').insert({ ...sib, child_id: existingId, id: crypto.randomUUID(), created_at: new Date().toISOString() })
            }
            summary.merged++
          }
        } else {
          // Add new child
          const childId = crypto.randomUUID()
          const childRecord: Child = {
            ...result.child,
            id: childId,
            school_id: result.child.school_id || `IMPORT-${Date.now()}-${i}`,
            full_name: result.child.full_name || 'Unknown',
            father_status: result.child.father_status || 'Unknown',
            mother_status: result.child.mother_status || 'Unknown',
            father_dv: result.child.father_dv ?? false,
            child_type: childType,
            lifecycle_status: 'active',
            is_active: true,
            source_file: result.source_file,
            imported_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as Child

          const { error: childErr } = await supabase.from('children').insert(childRecord)
          if (childErr) throw new Error(childErr.message)

          await saveChildLocally(childRecord)

          // Insert siblings
          for (const sib of result.siblings) {
            if (!sib.name) continue
            await supabase.from('siblings').insert({
              ...sib, id: crypto.randomUUID(), child_id: childId, created_at: new Date().toISOString()
            })
          }

          // Insert followups
          for (const fu of result.followups) {
            const fuRecord: AnnualFollowup = {
              ...fu, id: crypto.randomUUID(), child_id: childId,
              created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
            } as AnnualFollowup
            await supabase.from('annual_followups').insert(fuRecord)
            await saveFollowupLocally(fuRecord)
          }

          summary.inserted++
        }
      } catch (err) {
        summary.errors.push(`Row ${i+1} (${result.child.full_name || 'Unknown'}): ${String(err)}`)
      }

      setImportProgress({ done: i+1, total: results.length })
    }

    setImportSummary(summary)
    setImporting(false)
    setStep(3)
    if (summary.inserted > 0 || summary.merged > 0) {
      toast.success(`Import complete: ${summary.inserted} added, ${summary.merged} merged, ${summary.skipped} skipped`)
    }
  }

  // ─────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────
  const current = results[currentIdx]

  return (
    <div style={{ fontFamily:"'DM Sans',system-ui,sans-serif", minHeight:'100vh', background:'#fff' }}>
      {/* Header */}
      <div style={{ background:G, color:'#fff', padding:'12px 14px', display:'flex', alignItems:'center', gap:10 }}>
        <button onClick={() => navigate('/')} style={{ background:'none', border:'none', color:'#fff', cursor:'pointer', padding:2 }}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <div style={{ fontWeight:700, fontSize:15 }}>Import from Excel / Word</div>
          <div style={{ fontSize:11, opacity:.8 }}>SSR forms and annual reports</div>
        </div>
      </div>

      <Steps current={step} />

      <div style={{ padding:'14px 14px 100px' }}>

        {/* ── STEP 0: UPLOAD ─────────────────────────────── */}
        {step === 0 && (
          <>
            <div style={{ background:'#e8f5e9', border:'0.5px solid #81c784', borderRadius:10, padding:10, marginBottom:14, fontSize:11, color:'#2e7d32' }}>
              Upload Excel (.xlsx) or Word (.docx) files. The system auto-detects the format and extracts all fields from the Social Survey Report structure.
            </div>

            {/* Child type selector */}
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:11, fontWeight:600, color:'#555', marginBottom:6 }}>Child Type</div>
              <div style={{ display:'flex', gap:8 }}>
                {([['shishu_student','Shishu Student'],['sponsored_external','Sponsored External'],['alumni','Alumni']] as const).map(([val, label]) => (
                  <button key={val} onClick={() => setChildType(val)}
                    style={{ flex:1, padding:'9px 6px', border:`2px solid ${childType===val ? G : '#ddd'}`,
                      borderRadius:8, background: childType===val ? '#e8f5e9' : '#fff',
                      color: childType===val ? G : '#666', fontSize:11, fontWeight:600,
                      cursor:'pointer', fontFamily:'inherit' }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Dropzone */}
            <div {...getRootProps()} style={{
              border: `2px dashed ${isDragActive ? G : '#ddd'}`,
              borderRadius:12, padding:'32px 20px', textAlign:'center',
              cursor: parsing ? 'not-allowed' : 'pointer',
              background: isDragActive ? '#f0faf6' : '#fafafa', marginBottom:14
            }}>
              <input {...getInputProps()} />
              <Upload size={32} color={isDragActive ? G : '#bbb'} style={{ margin:'0 auto 10px', display:'block' }} />
              <div style={{ fontSize:13, fontWeight:600, color:'#333', marginBottom:3 }}>
                {isDragActive ? 'Drop files here' : 'Drag & drop or tap to select'}
              </div>
              <div style={{ fontSize:11, color:'#999' }}>
                Supports .xlsx (vertical & list format) and .docx (SSR Word format)
              </div>
            </div>

            {/* File list */}
            {files.length > 0 && (
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:11, fontWeight:600, color:'#888', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:6 }}>
                  {files.length} file(s) selected
                </div>
                {files.map((f, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 10px',
                    background:'#f9f9f9', borderRadius:8, marginBottom:4 }}>
                    {f.name.endsWith('.docx') ? <FileText size={14} color={G} /> : <FileSpreadsheet size={14} color={G} />}
                    <span style={{ flex:1, fontSize:12, color:'#333' }}>{f.name}</span>
                    <span style={{ fontSize:11, color:'#999' }}>{(f.size/1024).toFixed(0)} KB</span>
                    <button onClick={() => setFiles(p => p.filter((_,j)=>j!==i))}
                      style={{ background:'none', border:'none', cursor:'pointer', color:'#e24b4a', padding:2 }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button onClick={handleParse} disabled={parsing || files.length===0}
              style={{ width:'100%', padding:'13px', background: files.length>0 ? G : '#e0e0e0',
                color: files.length>0 ? '#fff' : '#999', border:'none', borderRadius:10,
                fontSize:14, fontWeight:700, cursor: files.length>0 ? 'pointer' : 'not-allowed',
                fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
              {parsing && <Loader2 size={16} style={{ animation:'spin 1s linear infinite' }} />}
              {parsing ? 'Extracting data…' : `Extract Data from ${files.length||''} file(s) →`}
            </button>
          </>
        )}

        {/* ── STEP 1: PREVIEW ────────────────────────────── */}
        {step === 1 && current && (
          <>
            {/* Navigation */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
              <button onClick={() => setCurrentIdx(i => Math.max(0,i-1))} disabled={currentIdx===0}
                style={{ padding:'6px 10px', background:'#f0f0f0', border:'none', borderRadius:7, cursor:'pointer', fontFamily:'inherit' }}>
                ← Prev
              </button>
              <span style={{ fontSize:12, color:'#666' }}>
                Record {currentIdx+1} of {results.length}
              </span>
              <button onClick={() => setCurrentIdx(i => Math.min(results.length-1, i+1))} disabled={currentIdx===results.length-1}
                style={{ padding:'6px 10px', background:'#f0f0f0', border:'none', borderRadius:7, cursor:'pointer', fontFamily:'inherit' }}>
                Next →
              </button>
            </div>

            {/* Errors */}
            {current.errors.length > 0 && (
              <div style={{ background:'#fef2f2', border:'0.5px solid #fca5a5', borderRadius:8, padding:10, marginBottom:10 }}>
                {current.errors.map((e: ImportError, i: number) => (
                  <div key={i} style={{ fontSize:11, color:RED, display:'flex', gap:6, alignItems:'flex-start' }}>
                    <AlertCircle size={12} style={{ marginTop:1, flexShrink:0 }} />
                    <span><strong>{e.field}:</strong> {e.message}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Warnings */}
            {current.warnings.length > 0 && (
              <div style={{ background:'#fffbeb', border:'0.5px solid #fbbf24', borderRadius:8, padding:10, marginBottom:10 }}>
                {current.warnings.map((w: ImportWarning, i: number) => (
                  <div key={i} style={{ fontSize:11, color:AMBER, display:'flex', gap:6 }}>
                    <AlertTriangle size={12} style={{ marginTop:1, flexShrink:0 }} />
                    <span><strong>{w.field}:</strong> {w.message}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Editable field note */}
            <div style={{ fontSize:11, color:'#888', background:'#f9f9f9', borderRadius:7,
              padding:'6px 10px', marginBottom:10, display:'flex', alignItems:'center', gap:6 }}>
              ✎ <span>Tap any field to edit before importing. Red fields are missing — fill them in now.</span>
            </div>

            {/* Field preview sections — all editable */}
            {PREVIEW_SECTIONS.map(sec => (
              <PreviewSection
                key={sec.title}
                title={sec.title}
                onEdit={(key, val) => {
                  setResults(prev => prev.map((r, i) =>
                    i === currentIdx
                      ? { ...r, child: { ...r.child, [key]: val } }
                      : r
                  ))
                }}
                fields={sec.fields.map(f => ({
                  ...f,
                  value: (results[currentIdx].child as Record<string, unknown>)[f.key]
                }))}
              />
            ))}

            {/* Siblings */}
            {current.siblings.length > 0 && (
              <div style={{ marginBottom:10, border:'1px solid #e8e8e8', borderRadius:8, overflow:'hidden' }}>
                <div style={{ padding:'8px 10px', background:'#f5f5f5', fontSize:11, fontWeight:600, color:'#444' }}>
                  Siblings ({current.siblings.length})
                </div>
                <div style={{ padding:8 }}>
                  {current.siblings.map((s, i) => (
                    <div key={i} style={{ padding:'5px 0', borderBottom:'0.5px solid #f0f0f0', fontSize:11, color:'#444' }}>
                      {s.name} · {s.age} · {s.sex} · {s.education || '—'}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Followup years */}
            {current.followups.length > 0 && (
              <div style={{ marginBottom:10, border:'1px solid #e8e8e8', borderRadius:8, overflow:'hidden' }}>
                <div style={{ padding:'8px 10px', background:'#f5f5f5', fontSize:11, fontWeight:600, color:'#444' }}>
                  Annual Followups ({current.followups.length} year(s))
                </div>
                <div style={{ padding:8 }}>
                  {current.followups.map((f, i) => (
                    <div key={i} style={{ padding:'4px 0', borderBottom:'0.5px solid #f0f0f0', fontSize:11, color:'#444' }}>
                      📅 {f.year_label} — {f.present_class ? `Class: ${f.present_class}` : ''} {f.special_remarks ? `· ${String(f.special_remarks).slice(0,50)}…` : ''}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Unmapped */}
            <UnmappedPanel unmapped={current.unmapped_fields} />

            <button onClick={handleCheckDups} disabled={checkingDups}
              style={{ width:'100%', padding:'13px', background:G, color:'#fff', border:'none',
                borderRadius:10, fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
                display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
              {checkingDups && <Loader2 size={16} style={{ animation:'spin 1s linear infinite' }} />}
              {checkingDups ? 'Checking for duplicates…' : 'Check Duplicates & Continue →'}
            </button>
          </>
        )}

        {/* ── STEP 2: DUPLICATE DECISIONS ────────────────── */}
        {step === 2 && (
          <>
            <div style={{ fontSize:12, color:'#555', marginBottom:12 }}>
              Review detected duplicates. Choose what to do for each record.
            </div>

            {results.map((r, i) => {
              const dup = duplicateInfo[i]
              const dec = decisions[i]
              return (
                <div key={i} style={{
                  background: dup ? '#fffbeb' : '#f0faf6',
                  border: `1px solid ${dup ? '#fbbf24' : '#86efac'}`,
                  borderRadius:10, padding:'10px 12px', marginBottom:8
                }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:600, color:'#111' }}>
                        {r.child.full_name || '—'} <span style={{ fontSize:11, color:'#888' }}>(ID: {r.child.school_id || 'none'})</span>
                      </div>
                      {dup && (
                        <div style={{ fontSize:11, color:AMBER, display:'flex', gap:4, alignItems:'center', marginTop:2 }}>
                          <AlertTriangle size={11} />
                          Matches existing: <strong>{dup.full_name}</strong> (ID: {dup.school_id})
                        </div>
                      )}
                      {!dup && (
                        <div style={{ fontSize:11, color:G, display:'flex', gap:4, alignItems:'center', marginTop:2 }}>
                          <CheckCircle size={11} />
                          No duplicate found — will be added as new
                        </div>
                      )}
                    </div>
                  </div>

                  {dup && (
                    <div style={{ display:'flex', gap:6, marginTop:4 }}>
                      {[
                        ['skip', 'Skip', SkipForward],
                        ['merge', 'Merge', GitMerge],
                        ['add', 'Add Anyway', Plus],
                      ].map(([val, label, Icon]: any) => (
                        <button key={val} onClick={() => setDecisions(d => ({ ...d, [i]: val }))}
                          style={{ flex:1, padding:'6px 4px', border:`2px solid ${dec===val ? G : '#ddd'}`,
                            borderRadius:7, background: dec===val ? '#e8f5e9' : '#fff',
                            color: dec===val ? G : '#666', fontSize:11, fontWeight:600,
                            cursor:'pointer', fontFamily:'inherit', display:'flex',
                            alignItems:'center', justifyContent:'center', gap:4 }}>
                          <Icon size={12} /> {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}

            <div style={{ marginTop:14, padding:'10px 12px', background:'#f5f5f5', borderRadius:8, fontSize:11, color:'#666', marginBottom:14 }}>
              <strong>Skip</strong> — ignore this file's record<br/>
              <strong>Merge</strong> — update missing fields in existing child, add new followup years<br/>
              <strong>Add Anyway</strong> — create as new record (may cause duplicate)
            </div>

            <button onClick={() => setStep(3)}
              style={{ width:'100%', padding:'13px', background:G, color:'#fff', border:'none',
                borderRadius:10, fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
              Confirm & Import →
            </button>
          </>
        )}

        {/* ── STEP 3: IMPORT ─────────────────────────────── */}
        {step === 3 && !importSummary && (
          <>
            <div style={{ background:'#e8f5e9', border:'0.5px solid #81c784', borderRadius:10, padding:12, marginBottom:14, fontSize:12, color:'#2e7d32' }}>
              Ready to import {results.length} record(s). This will save to the database. Review decisions before confirming.
            </div>

            {results.map((r, i) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'7px 10px',
                background:'#fafafa', borderRadius:8, marginBottom:4, fontSize:12, alignItems:'center' }}>
                <span style={{ color:'#333' }}>{r.child.full_name || '—'}</span>
                <span style={{
                  fontSize:10, padding:'2px 8px', borderRadius:10, fontWeight:600,
                  background: decisions[i]==='skip' ? '#f0f0f0' : decisions[i]==='merge' ? '#e3f2fd' : '#e8f5e9',
                  color: decisions[i]==='skip' ? '#888' : decisions[i]==='merge' ? '#1565c0' : G
                }}>
                  {decisions[i] === 'skip' ? 'Skip' : decisions[i] === 'merge' ? 'Merge' : 'Add New'}
                </span>
              </div>
            ))}

            {importing && (
              <div style={{ textAlign:'center', padding:'20px 0' }}>
                <Loader2 size={28} color={G} style={{ animation:'spin 1s linear infinite', display:'block', margin:'0 auto 10px' }} />
                <div style={{ fontSize:13, fontWeight:600, color:G }}>
                  Importing {importProgress.done}/{importProgress.total}…
                </div>
                <div style={{ height:6, background:'#e5e5e5', borderRadius:3, maxWidth:200, margin:'10px auto 0', overflow:'hidden' }}>
                  <div style={{ height:'100%', background:G, borderRadius:3,
                    width:`${importProgress.total > 0 ? (importProgress.done/importProgress.total)*100 : 0}%`,
                    transition:'width .3s' }} />
                </div>
              </div>
            )}

            {!importing && (
              <button onClick={handleImport}
                style={{ width:'100%', padding:'13px', background:G, color:'#fff', border:'none',
                  borderRadius:10, fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit', marginTop:14 }}>
                ✓ Confirm Import
              </button>
            )}
          </>
        )}

        {/* ── IMPORT DONE ─────────────────────────────────── */}
        {step === 3 && importSummary && (
          <div style={{ textAlign:'center', paddingTop:20 }}>
            <div style={{ fontSize:48, marginBottom:12 }}>
              {importSummary.errors.length === 0 ? '✅' : '⚠️'}
            </div>
            <div style={{ fontSize:17, fontWeight:700, color:G, marginBottom:16 }}>Import Complete</div>
            <div style={{ background:'#f0faf6', borderRadius:12, padding:16, maxWidth:280, margin:'0 auto 20px' }}>
              {[
                ['Records added', importSummary.inserted, G],
                ['Records merged', importSummary.merged, '#1565c0'],
                ['Records skipped', importSummary.skipped, '#888'],
              ].map(([l, v, c]) => (
                <div key={l as string} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0',
                  borderBottom:'0.5px solid #ddd', fontSize:13 }}>
                  <span style={{ color:'#555' }}>{l as string}</span>
                  <span style={{ fontWeight:700, color: c as string }}>{v as number}</span>
                </div>
              ))}
            </div>

            {importSummary.errors.length > 0 && (
              <div style={{ background:'#fef2f2', borderRadius:10, padding:12, marginBottom:16, textAlign:'left', maxWidth:340, margin:'0 auto 16px' }}>
                <div style={{ fontSize:12, fontWeight:600, color:RED, marginBottom:6 }}>Errors ({importSummary.errors.length})</div>
                {importSummary.errors.map((e: ImportError, i: number) => (
                  <div key={i} style={{ fontSize:11, color:RED, padding:'2px 0' }}>{e}</div>
                ))}
              </div>
            )}

            <button onClick={() => navigate('/children')}
              style={{ padding:'12px 28px', background:G, color:'#fff', border:'none',
                borderRadius:10, fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
              View All Children →
            </button>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }`}</style>
    </div>
  )
}