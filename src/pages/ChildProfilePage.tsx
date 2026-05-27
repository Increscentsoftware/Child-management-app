import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { db, deleteChildLocally } from '@/lib/db'
import { useAppStore } from '@/lib/store'
import type { Child, AnnualFollowup, ChangeLogEntry } from '@/types'
import toast from 'react-hot-toast'
import { 
  ArrowLeft, Plus, AlertTriangle, Calendar, TrendingUp, 
  FileText, CheckCircle, Clock, Bell, Edit2, Trash2, Download, Eye, X, Upload, File
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

function Tag({ v, t }: { v: string; t: 'r'|'g'|'a'|'b'|'p'|'t' }) {
  const c={r:['#fcebeb','#a32d2d'],g:['#eaf3de','#3b6d11'],a:['#faeeda','#854f0b'],b:['#e6f1fb','#185fa5'],p:['#eeedfe','#3c3489'],t:['#e1f5ee','#085041']}[t]
  return <span style={{fontSize:10,padding:'2px 7px',borderRadius:9,background:c[0],color:c[1],whiteSpace:'nowrap'}}>{v}</span>
}

function Row({ k, v, updated }: { k: string; v?: string | boolean | null; updated?: boolean }) {
  if (!v && v !== false) return null
  const display = typeof v === 'boolean' ? (v ? 'Yes' : 'No') : v
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '0.5px solid #f0f0f0', fontSize: 12, alignItems: 'flex-start', gap: 8 }}>
      <span style={{ color: '#888', width: '45%', flexShrink: 0, fontSize: 11 }}>{k}</span>
      <span style={{ fontWeight: 500, color: updated ? '#0f6e56' : '#111', textAlign: 'right', flex: 1 }}>
        {display} {updated && <span style={{ fontSize: 9, color: '#0f6e56' }}>↑ latest</span>}
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

interface DocumentFile {
  id: string
  child_id: string
  type: 'photo' | 'progress_card' | 'certificate' | 'aadhar' | 'birth_cert' | 'sponsor_letter' | 'other'
  file_url: string
  file_name: string
  notes?: string
  uploaded_by?: string
  uploaded_at: string
}

interface RiskIndicator {
  label: string
  level: 'high' | 'medium' | 'low'
  description: string
  note?: string
}

interface ActionItem {
  id: string
  task: string
  priority: 'urgent' | 'high' | 'normal'
  dueDate?: string
  completed: boolean
}

// Modal Components
function DeleteConfirmModal({ 
  child, 
  onConfirm, 
  onCancel, 
  isLoading 
}: { 
  child: Child
  onConfirm: () => void
  onCancel: () => void
  isLoading: boolean
}) {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 12,
        padding: 20,
        maxWidth: 400,
        width: '90%'
      }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a', marginBottom: 8 }}>
            Delete Child Record?
          </div>
          <div style={{ fontSize: 13, color: '#666', lineHeight: 1.6 }}>
            Are you sure you want to delete <strong>{child.full_name}</strong>? This action cannot be undone. All follow-ups and documents will also be deleted.
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button
            onClick={onCancel}
            disabled={isLoading}
            style={{
              padding: 10,
              background: '#f5f5f5',
              border: '1px solid #e5e5e5',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              color: '#1a1a1a',
              fontFamily: 'inherit'
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            style={{
              padding: 10,
              background: '#dc2626',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              opacity: isLoading ? 0.7 : 1
            }}
          >
            {isLoading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

function DocumentUploadModal({
  childId,
  onSuccess,
  onClose
}: {
  childId: string
  onSuccess: (doc: DocumentFile) => void
  onClose: () => void
}) {
  const { user } = useAppStore()
  const [docType, setDocType] = useState<DocumentFile['type']>('other')
  const [notes, setNotes] = useState('')
  const [uploading, setUploading] = useState(false)

  const docTypes = [
    { id: 'photo', label: 'Photo' },
    { id: 'progress_card', label: 'Progress Card' },
    { id: 'certificate', label: 'Certificate' },
    { id: 'aadhar', label: 'Aadhar Card' },
    { id: 'birth_cert', label: 'Birth Certificate' },
    { id: 'sponsor_letter', label: 'Sponsor Letter' },
    { id: 'other', label: 'Other' }
  ]

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const path = `documents/${childId}/${Date.now()}_${file.name}`
      const { error: uploadError } = await supabase.storage
        .from('child-documents')
        .upload(path, file)

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('child-documents')
        .getPublicUrl(path)

      const docId = crypto.randomUUID()

      await supabase.from('documents').insert({
        id: docId,
        child_id: childId,
        doc_type: docType,
        file_name: file.name,
        storage_path: path,
        public_url: urlData.publicUrl,
        file_size_kb: Math.round(file.size / 1024),
        notes: notes || null,
        uploaded_at: new Date().toISOString()
      })

      const doc: DocumentFile = {
        id: docId,
        child_id: childId,
        type: docType as DocumentFile['type'],
        file_url: urlData.publicUrl,
        file_name: file.name,
        notes: notes || undefined,
        uploaded_by: user?.full_name,
        uploaded_at: new Date().toISOString()
      }

      onSuccess(doc)
      toast.success('Document uploaded successfully')
      onClose()
    } catch (error) {
      toast.error('Failed to upload document')
      console.error(error)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: 14
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 12,
        padding: 20,
        maxWidth: 500,
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a' }}>
            Upload Document
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 24,
              cursor: 'pointer',
              color: '#999',
              padding: 0
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, color: '#666', display: 'block', marginBottom: 6, fontWeight: 600 }}>
            Document Type *
          </label>
          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value as DocumentFile['type'])}
            style={{
              width: '100%',
              padding: '8px 10px',
              border: '1px solid #e5e5e5',
              borderRadius: 8,
              fontSize: 13,
              fontFamily: 'inherit',
              color: '#1a1a1a'
            }}
          >
            {docTypes.map(t => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, color: '#666', display: 'block', marginBottom: 6, fontWeight: 600 }}>
            Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes about this document..."
            style={{
              width: '100%',
              padding: '8px 10px',
              border: '1px solid #e5e5e5',
              borderRadius: 8,
              fontSize: 13,
              fontFamily: 'inherit',
              color: '#1a1a1a',
              resize: 'vertical',
              minHeight: 60,
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div
          style={{
            border: '2px dashed #ddd',
            borderRadius: 10,
            padding: 20,
            textAlign: 'center',
            marginBottom: 14,
            cursor: uploading ? 'not-allowed' : 'pointer'
          }}
          onClick={() => !uploading && document.getElementById('doc-upload')?.click()}
        >
          <Upload size={32} color="#999" style={{ margin: '0 auto 8px', display: 'block' }} />
          <div style={{ fontSize: 13, color: '#1a1a1a', marginBottom: 4 }}>
            Click to select file
          </div>
          <div style={{ fontSize: 11, color: '#999' }}>
            PDF, Images, or other documents
          </div>
          <input
            type="file"
            onChange={handleFileSelect}
            disabled={uploading}
            style={{ display: 'none' }}
            id="doc-upload"
          />
          <div style={{ fontSize: 13, color: uploading ? '#999' : '#1a6b4a', fontWeight: 600, marginTop: 12 }}>
            {uploading ? 'Uploading...' : 'Click here or drag file'}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button
            onClick={onClose}
            disabled={uploading}
            style={{
              padding: 10,
              background: '#f5f5f5',
              border: '1px solid #e5e5e5',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: uploading ? 'not-allowed' : 'pointer',
              color: '#1a1a1a',
              fontFamily: 'inherit'
            }}
          >
            Cancel
          </button>
          <button
            style={{
              padding: 10,
              background: '#1a6b4a',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit'
            }}
            onClick={() => document.getElementById('doc-upload')?.click()}
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : 'Select File'}
          </button>
        </div>
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
  const [actionItems, setActionItems] = useState<ActionItem[]>([])
  const [documents, setDocuments] = useState<DocumentFile[]>([])
  
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showDocUploadModal, setShowDocUploadModal] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    if (!id) return

    // Child: prefer Supabase, fall back to IndexedDB
    supabase.from('children').select('*').eq('id', id).single().then(({ data }) => {
      if (data) setChild(data as Child)
      else db.children.get(id).then(c => { if (c) setChild(c) })
    })

    // Followups: merge Supabase + IndexedDB (dedup by id)
    Promise.all([
      supabase.from('annual_followups').select('*').eq('child_id', id).order('created_at', { ascending: false }),
      db.followups.where('child_id').equals(id).reverse().sortBy('created_at')
    ]).then(([{ data: remote }, local]) => {
      const remoteData = (remote || []) as AnnualFollowup[]
      const localData  = (local  || []) as AnnualFollowup[]
      const seen = new Set(remoteData.map(f => f.id))
      const merged = [...remoteData, ...localData.filter(f => !seen.has(f.id))]
      merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      setFollowups(merged)
    })

    // Changelog: merge Supabase + IndexedDB (dedup by id)
    Promise.all([
      supabase.from('change_log').select('*').eq('child_id', id).order('changed_at', { ascending: false }),
      db.change_log.where('child_id').equals(id).reverse().sortBy('changed_at')
    ]).then(([{ data: remote }, local]) => {
      const remoteData = (remote || []) as ChangeLogEntry[]
      const localData  = (local  || []) as ChangeLogEntry[]
      const seen = new Set(remoteData.map(c => c.id))
      const merged = [...remoteData, ...localData.filter(c => !seen.has(c.id))]
      merged.sort((a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime())
      setChangelog(merged)
    })

    loadDocuments(id)
  }, [id])

  useEffect(() => {
    if (!child) return
    const items: ActionItem[] = []
    if (child.father_dv || child.mother_dv) {
      items.push({ id: '1', task: 'Schedule safety assessment visit', priority: 'urgent', dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), completed: false })
    }
    if (child.father_habits?.includes('Alcoholic')) {
      items.push({ id: '2', task: 'Refer father to de-addiction counseling', priority: 'high', dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), completed: false })
    }
    if (child.debts && child.debts.length > 10) {
      items.push({ id: '3', task: 'Financial counseling and debt management plan', priority: 'high', completed: false })
    }
    if (child.last_followup_date) {
      const daysSince = Math.floor((Date.now() - new Date(child.last_followup_date).getTime()) / (1000 * 60 * 60 * 24))
      if (daysSince > 330) {
        items.push({ id: '4', task: 'Annual follow-up visit overdue', priority: 'urgent', dueDate: new Date().toISOString().slice(0, 10), completed: false })
      }
    }
    setActionItems(items)
  }, [child])

  const loadDocuments = async (childId: string) => {
    const { data } = await supabase
      .from('documents')
      .select('*')
      .eq('child_id', childId)
      .order('uploaded_at', { ascending: false })
    if (data) {
      setDocuments(data.map(d => ({
        id: d.id,
        child_id: d.child_id,
        type: d.doc_type as DocumentFile['type'],
        file_url: d.public_url,
        file_name: d.file_name,
        notes: d.notes,
        uploaded_at: d.uploaded_at
      })))
    }
  }

  const calculateRiskIndicators = (child: Child): RiskIndicator[] => {
    const risks: RiskIndicator[] = []
    
    if (child.father_dv || child.mother_dv) {
      risks.push({
        label: 'Domestic Violence',
        level: 'high',
        description: 'Active DV situation requires immediate intervention'
      })
    }
    
    if (child.father_habits?.includes('Alcoholic')) {
      risks.push({
        label: 'Substance Abuse',
        level: child.father_dv ? 'high' : 'medium',
        description: 'Father has alcoholism issues'
      })
    }
    
    const fatherIncome = parseFloat(child.father_earnings || '0')
    const motherIncome = parseFloat(child.mother_earnings || '0')
    const totalIncome = fatherIncome + motherIncome
    const dependents = parseInt(child.num_dependents || '0')
    if (dependents > 0 && totalIncome / dependents < 2000) {
      risks.push({
        label: 'Financial Crisis',
        level: 'high',
        description: `Very low income per dependent (₹${Math.round(totalIncome / dependents)}/month)`,
        note: `Father ₹${fatherIncome.toLocaleString('en-IN')} + Mother ₹${motherIncome.toLocaleString('en-IN')} = ₹${totalIncome.toLocaleString('en-IN')} ÷ ${dependents} dependents = ₹${Math.round(totalIncome / dependents).toLocaleString('en-IN')}/person/month`
      })
    }
    
    if (child.father_status === 'Dead' || child.father_status === 'Abandoned') {
      risks.push({
        label: 'Single Parent Family',
        level: 'medium',
        description: child.father_status === 'Dead' ? 'Father deceased' : 'Father abandoned family'
      })
    }
    
    if (child.debts && child.debts.length > 20) {
      risks.push({
        label: 'Debt Burden',
        level: 'medium',
        description: 'Family has significant debts'
      })
    }
    
    return risks
  }

  const handleDelete = async () => {
    if (!child || !id) return
    
    setDeleteLoading(true)
    try {
      // Delete from Supabase
      await supabase
        .from('children')
        .delete()
        .eq('id', id)

      // Delete from local DB
      await deleteChildLocally(id)

      toast.success('Child record deleted successfully')
      navigate('/children')
    } catch (error) {
      toast.error('Failed to delete child record')
      console.error(error)
    } finally {
      setDeleteLoading(false)
      setShowDeleteModal(false)
    }
  }

  if (!child) return <div style={{ padding: 24, color: '#888' }}>Loading…</div>

  const initials = child.full_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  const latestFollowup = followups[0]
  const admissionYear = child.admission_date ? new Date(child.admission_date).getFullYear() : null
  const currentYear = new Date().getFullYear()
  const yearsInProgram = admissionYear ? currentYear - admissionYear : null
  const riskIndicators = calculateRiskIndicators(child)
  const daysSinceFollowup = child.last_followup_date 
    ? Math.floor((Date.now() - new Date(child.last_followup_date).getTime()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {/* Header with Edit/Delete Buttons */}
      <div style={{ background: '#1a6b4a', padding: '14px', color: '#fff', display: 'flex', gap: 11, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 11, alignItems: 'center', flex: 1, minWidth: 0 }}>
          <button onClick={() => navigate('/children')} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 2, display: 'flex', flexShrink: 0 }}>
            <ArrowLeft size={20} />
          </button>
          <div style={{ width: 50, height: 50, borderRadius: '50%', background: '#9fe1cb', color: '#085041', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, flexShrink: 0, overflow: 'hidden' }}>
            {child.photo_url
              ? <img src={child.photo_url} alt="" style={{ width: 50, height: 50, borderRadius: '50%', objectFit: 'cover' }} />
              : initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{child.full_name}</div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>
              ID: {child.school_id}
              {yearsInProgram && ` · ${yearsInProgram} years in program`}
            </div>
            <div style={{ display: 'flex', gap: 4, marginTop: 5, flexWrap: 'wrap' }}>
              {child.sex && <Tag v={child.sex} t="b" />}
              {child.present_class && <Tag v={child.present_class} t="p" />}
              {child.category && <Tag v={child.category} t="t" />}
            </div>
          </div>
        </div>

        {/* Edit & Delete Buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => navigate(`/children/${id}/edit`)}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: '1px solid rgba(255,255,255,0.3)',
              color: '#fff',
              padding: '8px 12px',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontFamily: 'inherit'
            }}
          >
            <Edit2 size={14} />
            Edit
          </button>
          <button
            onClick={() => setShowDeleteModal(true)}
            style={{
              background: '#dc2626',
              border: 'none',
              color: '#fff',
              padding: '8px 12px',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontFamily: 'inherit',
              hover: 'opacity(0.9)'
            }}
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      </div>

      {/* View Tabs - Now with Documents */}
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
          { id: 'timeline', label: 'Timeline', icon: <Calendar size={14} /> },
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
        {/* Risk Indicators */}
        {riskIndicators.length > 0 && view !== 'documents' && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertTriangle size={14} />
              RISK INDICATORS ({riskIndicators.length})
            </div>
            {riskIndicators.map((risk, idx) => (
              <div key={idx} style={{
                background: risk.level === 'high' ? '#fcebeb' : '#faeeda',
                border: `1px solid ${risk.level === 'high' ? '#f09595' : '#ef9f27'}`,
                borderRadius: 10,
                padding: '8px 11px',
                marginBottom: 8,
                display: 'flex',
                gap: 8,
                alignItems: 'flex-start'
              }}>
                <AlertTriangle size={14} color={risk.level === 'high' ? '#a32d2d' : '#854f0b'} style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    fontSize: 12, 
                    fontWeight: 600, 
                    color: risk.level === 'high' ? '#a32d2d' : '#854f0b',
                    marginBottom: 2
                  }}>
                    {risk.label}
                    <span style={{ 
                      marginLeft: 6,
                      fontSize: 9,
                      padding: '1px 5px',
                      borderRadius: 4,
                      background: risk.level === 'high' ? '#a32d2d' : '#854f0b',
                      color: '#fff',
                      textTransform: 'uppercase'
                    }}>
                      {risk.level}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: risk.level === 'high' ? '#a32d2d' : '#854f0b', opacity: 0.9 }}>
                    {risk.description}
                  </div>
                  {risk.note && (
                    <div style={{ fontSize: 10, color: risk.level === 'high' ? '#a32d2d' : '#854f0b', opacity: 0.65, marginTop: 4, fontStyle: 'italic' }}>
                      {risk.note}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Action Items */}
        {view === 'overview' && actionItems.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Bell size={14} />
              ACTION ITEMS ({actionItems.filter(a => !a.completed).length} pending)
            </div>
            {actionItems.map(item => (
              <div key={item.id} style={{
                background: '#fff',
                border: item.priority === 'urgent' ? '2px solid #e24b4a' : '1px solid #e5e5e5',
                borderRadius: 10,
                padding: '10px 12px',
                marginBottom: 8,
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
                opacity: item.completed ? 0.5 : 1
              }}>
                <button
                  onClick={() => {
                    setActionItems(prev => prev.map(a => 
                      a.id === item.id ? { ...a, completed: !a.completed } : a
                    ))
                  }}
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    border: '2px solid #1a6b4a',
                    background: item.completed ? '#1a6b4a' : '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    flexShrink: 0,
                    marginTop: 2,
                    padding: 0
                  }}
                >
                  {item.completed && <CheckCircle size={12} color="#fff" />}
                </button>
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    fontSize: 12, 
                    fontWeight: 600, 
                    color: '#111',
                    textDecoration: item.completed ? 'line-through' : 'none',
                    marginBottom: 4
                  }}>
                    {item.task}
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: 9,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: item.priority === 'urgent' ? '#e24b4a' : item.priority === 'high' ? '#ef9f27' : '#999',
                      color: '#fff',
                      textTransform: 'uppercase',
                      fontWeight: 600
                    }}>
                      {item.priority}
                    </span>
                    {item.dueDate && (
                      <span style={{ fontSize: 10, color: '#666', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Clock size={10} /> Due: {new Date(item.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
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
                background: daysSinceFollowup && daysSinceFollowup > 365 ? 'linear-gradient(135deg, #dc2626, #b91c1c)' : 'linear-gradient(135deg, #22c55e, #16a34a)', 
                borderRadius: 10, 
                padding: '12px',
                color: '#fff',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: 24, fontWeight: 700 }}>
                  {daysSinceFollowup ? Math.floor(daysSinceFollowup / 30) : 'N/A'}
                </div>
                <div style={{ fontSize: 10, opacity: 0.9 }}>Months since visit</div>
              </div>
            </div>

            <Section title="General information" icon={<FileText size={12} />}>
              <Row k="Date of birth" v={child.date_of_birth} />
              <Row k="Religion" v={child.religion} />
              <Row k="Mother tongue" v={child.mother_tongue} />
              <Row k="Aadhar no." v={child.aadhar_no} />
              <Row k="Normal / special" v={child.normal_or_special} />
              <Row k="Area / Village" v={child.area} />
              <Row k="Contact" v={child.father_mobile || child.mother_mobile} />
            </Section>

            <Section 
              title="Father's details" 
              badge={changelog.filter(l => l.field_name.toLowerCase().includes('father')).length > 0 
                ? `${changelog.filter(l => l.field_name.toLowerCase().includes('father')).length} changes` 
                : undefined}
            >
              <Row k="Name" v={child.father_name} />
              <Row k="Status" v={child.father_status} />
              <Row k="Age" v={child.father_age} />
              <Row k="Mobile" v={child.father_mobile} />
              <Row k="Education" v={child.father_education} />
              <Row k="Occupation" v={child.father_occupation} />
              <Row k="Monthly income" v={child.father_earnings} />
              <Row k="Habits" v={child.father_habits} />
              <Row k="Health" v={child.father_health} />
              <Row k="Domestic violence" v={child.father_dv ? 'Yes' : 'No'} />
            </Section>

            <Section title="Mother's details">
              <Row k="Name" v={child.mother_name} />
              <Row k="Status" v={child.mother_status} />
              <Row k="Age" v={child.mother_age} />
              <Row k="Mobile" v={child.mother_mobile} />
              <Row k="Education" v={child.mother_education} />
              <Row k="Occupation" v={child.mother_occupation} />
              <Row k="Monthly income" v={child.mother_earnings} />
              <Row k="Health" v={child.mother_health} />
            </Section>

            <Section title="Financial situation">
              <Row k="Father's income" v={child.avg_income_father || child.father_earnings} />
              <Row k="Mother's income" v={child.avg_income_mother || child.mother_earnings} />
              <Row k="Other income" v={child.other_income} />
              <Row k="No. of dependents" v={child.num_dependents} />
              <Row k="Debts" v={child.debts} />
              <Row k="Savings / PF" v={child.savings} />
            </Section>

            <Section title="Living conditions">
              <Row k="House size" v={child.house_size} />
              <Row k="Ownership" v={child.house_ownership} />
              <Row k="Rent / month" v={child.rent_per_month} />
              <Row k="Vehicles" v={child.vehicles} />
            </Section>

            {child.special_remarks && (
              <Section title="Special remarks">
                <div style={{ fontSize: 12, color: '#444', padding: '8px 0', lineHeight: 1.6 }}>{child.special_remarks}</div>
              </Section>
            )}
          </>
        )}

        {/* DOCUMENTS VIEW */}
        {view === 'documents' && (
          <div>
            <button
              onClick={() => setShowDocUploadModal(true)}
              style={{
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
                gap: 8,
                fontFamily: 'inherit',
                marginBottom: 14
              }}
            >
              <Upload size={16} />
              Upload Document
            </button>

            {documents.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: 40, 
                background: '#f9f9f9',
                borderRadius: 12,
                color: '#999'
              }}>
                <File size={48} color="#ddd" style={{ margin: '0 auto 16px', display: 'block' }} />
                <div style={{ fontSize: 14, fontWeight: 600, color: '#666', marginBottom: 8 }}>
                  No documents yet
                </div>
                <div style={{ fontSize: 12, color: '#999' }}>
                  Upload photos, certificates, and other documents
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
                {documents.map(doc => (
                  <div key={doc.id} style={{
                    background: '#fff',
                    border: '1px solid #e5e5e5',
                    borderRadius: 10,
                    padding: 12,
                    textAlign: 'center'
                  }}>
                    <File size={32} color="#1a6b4a" style={{ margin: '0 auto 8px', display: 'block' }} />
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#1a1a1a', marginBottom: 4 }}>
                      {doc.file_name.substring(0, 20)}...
                    </div>
                    <div style={{ fontSize: 10, color: '#666', marginBottom: 8 }}>
                      {doc.type.replace('_', ' ')}
                    </div>
                    <button
                      onClick={() => window.open(doc.file_url, '_blank')}
                      style={{
                        width: '100%',
                        padding: '6px',
                        background: '#e1f5ee',
                        color: '#1a6b4a',
                        border: 'none',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4
                      }}
                    >
                      <Eye size={12} />
                      View
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TIMELINE VIEW */}
        {view === 'timeline' && (
          <div>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 14, lineHeight: 1.6 }}>
              Complete history of all changes and follow-ups for this child.
            </div>

            {/* Admission */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ 
                  width: 32, 
                  height: 32, 
                  borderRadius: '50%', 
                  background: '#1a6b4a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 700
                }}>
                  ✓
                </div>
                {followups.length > 0 && (
                  <div style={{ width: 2, flex: 1, background: '#e5e5e5', minHeight: 40 }} />
                )}
              </div>
              <div style={{ flex: 1, paddingBottom: 10 }}>
                <div style={{ 
                  background: '#e1f5ee', 
                  border: '2px solid #1a6b4a',
                  borderRadius: 10,
                  padding: 12
                }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1a6b4a', marginBottom: 4 }}>
                    🏫 Admission to Program
                  </div>
                  <div style={{ fontSize: 11, color: '#666' }}>
                    {child.admission_date ? new Date(child.admission_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Date unknown'}
                  </div>
                  <div style={{ fontSize: 11, color: '#666', marginTop: 6 }}>
                    Category: {child.category} · Class: {child.present_class}
                  </div>
                </div>
              </div>
            </div>

            {/* Follow-ups */}
            {followups.map((fu, index) => {
              const changes = changelog.filter(c => c.followup_id === fu.id)
              const hasChanges = changes.length > 0
              
              return (
                <div key={fu.id} style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ 
                      width: 32, 
                      height: 32, 
                      borderRadius: '50%', 
                      background: hasChanges ? '#ef9f27' : '#0891b2',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: 12,
                      fontWeight: 700
                    }}>
                      {followups.length - index}
                    </div>
                    {index < followups.length - 1 && (
                      <div style={{ width: 2, flex: 1, background: '#e5e5e5', minHeight: 40 }} />
                    )}
                  </div>
                  <div style={{ flex: 1, paddingBottom: 10 }}>
                    <div style={{ 
                      background: '#fff', 
                      border: hasChanges ? '2px solid #faeeda' : '1px solid #e5e5e5',
                      borderRadius: 10,
                      padding: 12
                    }}>
                      <div style={{ 
                        fontSize: 13, 
                        fontWeight: 600, 
                        color: hasChanges ? '#854f0b' : '#0891b2',
                        marginBottom: 4,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span>📅 {fu.year_label}</span>
                        {hasChanges && (
                          <span style={{ 
                            fontSize: 9, 
                            background: '#faeeda', 
                            color: '#854f0b',
                            padding: '2px 6px',
                            borderRadius: 6
                          }}>
                            {changes.length} changes
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: '#666', marginBottom: 8 }}>
                        Visit: {fu.visit_date || fu.created_at?.slice(0, 10)} · By: {fu.recorded_by_name}
                      </div>
                      
                      {changes.map(c => (
                        <div key={c.id} style={{ 
                          fontSize: 11, 
                          padding: '4px 8px',
                          background: '#f9f9f9',
                          borderRadius: 6,
                          marginBottom: 4,
                          display: 'flex',
                          gap: 6
                        }}>
                          <span style={{ fontWeight: 600 }}>{c.field_name}:</span>
                          <span style={{ color: '#a32d2d', textDecoration: 'line-through' }}>
                            {c.old_value || '—'}
                          </span>
                          <span>→</span>
                          <span style={{ color: '#3b6d11', fontWeight: 600 }}>
                            {c.new_value}
                          </span>
                        </div>
                      ))}
                      
                      {fu.special_remarks && (
                        <div style={{ 
                          fontSize: 11, 
                          color: '#666', 
                          fontStyle: 'italic',
                          marginTop: 8,
                          padding: '6px 8px',
                          background: '#f9f9f9',
                          borderRadius: 6
                        }}>
                          "{fu.special_remarks}"
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* COMPARISON VIEW */}
        {view === 'comparison' && (
          <div>
            <div style={{ 
              fontSize: 11, 
              color: '#888', 
              marginBottom: 14, 
              lineHeight: 1.6 
            }}>
              {latestFollowup 
                ? 'Compare admission data with the most recent follow-up to see how things have changed.'
                : 'No follow-ups recorded yet. Add the first annual follow-up to start tracking changes.'}
            </div>

            {latestFollowup ? (
              <>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr', 
                  gap: 10,
                  marginBottom: 14
                }}>
                  <div style={{ textAlign: 'center', padding: 10, background: '#e1f5ee', borderRadius: 10 }}>
                    <div style={{ fontSize: 11, color: '#085041', fontWeight: 600 }}>On Admission</div>
                    <div style={{ fontSize: 10, color: '#666' }}>{child.admission_date}</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: 10, background: '#e6f1fb', borderRadius: 10 }}>
                    <div style={{ fontSize: 11, color: '#185fa5', fontWeight: 600 }}>Latest Follow-up</div>
                    <div style={{ fontSize: 10, color: '#666' }}>{latestFollowup.year_label}</div>
                  </div>
                </div>

                {[
                  { title: 'Father Status', before: child.father_status, after: latestFollowup.father_status, icon: '👨' },
                  { title: 'Father Occupation', before: child.father_occupation, after: latestFollowup.father_occupation, icon: '💼' },
                  { title: 'Father Income', before: child.father_earnings, after: latestFollowup.father_earnings, icon: '💰' },
                  { title: 'Father Habits', before: child.father_habits, after: latestFollowup.father_habits, icon: '🍺' },
                  { title: 'Mother Status', before: child.mother_status, after: latestFollowup.mother_status, icon: '👩' },
                  { title: 'Present Class', before: child.present_class, after: latestFollowup.present_class, icon: '📚' },
                  { title: 'Dependents', before: child.num_dependents, after: latestFollowup.num_dependents, icon: '👥' },
                  { title: 'Monthly Rent', before: child.rent_per_month, after: latestFollowup.rent_per_month, icon: '🏠' }
                ].filter(item => item.after && item.after !== item.before).map((item, i) => (
                  <div key={i} style={{ 
                    background: '#fff',
                    border: '1px solid #e5e5e5',
                    borderRadius: 10,
                    padding: 12,
                    marginBottom: 10
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>{item.icon}</span>
                      {item.title}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'center' }}>
                      <div style={{ 
                        padding: 8, 
                        background: '#e1f5ee', 
                        borderRadius: 8,
                        fontSize: 11,
                        textAlign: 'center'
                      }}>
                        {item.before || '—'}
                      </div>
                      <span style={{ fontSize: 16 }}>→</span>
                      <div style={{ 
                        padding: 8, 
                        background: '#e6f1fb', 
                        borderRadius: 8,
                        fontSize: 11,
                        fontWeight: 600,
                        textAlign: 'center'
                      }}>
                        {item.after || '—'}
                      </div>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <div style={{ 
                textAlign: 'center', 
                padding: 60, 
                background: '#f9f9f9',
                borderRadius: 12,
                color: '#999'
              }}>
                <TrendingUp size={48} color="#ddd" style={{ margin: '0 auto 16px', display: 'block' }} />
                <div style={{ fontSize: 14, fontWeight: 600, color: '#666', marginBottom: 8 }}>
                  No Follow-ups Yet
                </div>
                <div style={{ fontSize: 12, color: '#999', marginBottom: 20 }}>
                  Add the first annual follow-up to start<br />tracking changes over time
                </div>
                <button 
                  onClick={() => navigate(`/children/${child.id}/followup`)} 
                  style={{
                    padding: '10px 20px',
                    background: '#1a6b4a',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Add First Follow-up
                </button>
              </div>
            )}
          </div>
        )}

        {/* Add Follow-up Button */}
        {view !== 'documents' && (
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
        )}
      </div>

      {/* Modals */}
      {showDeleteModal && (
        <DeleteConfirmModal
          child={child}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteModal(false)}
          isLoading={deleteLoading}
        />
      )}

      {showDocUploadModal && (
        <DocumentUploadModal
          childId={id!}
          onSuccess={(doc) => {
            setDocuments([...documents, doc])
          }}
          onClose={() => setShowDocUploadModal(false)}
        />
      )}
    </div>
  )
}