import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'
import { importExcelFile } from '@/lib/excelImport'
import { saveChildLocally, saveFollowupLocally, saveChangeLogLocally } from '@/lib/db'
import type { Child, AnnualFollowup, ChangeLogEntry } from '@/types'
import { ArrowLeft, Upload, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react'

export default function ImportPage() {
  const navigate = useNavigate()
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<{ total: number; imported: number; errors: string[] } | null>(null)

  const onDrop = async (files: File[]) => {
    if (files.length === 0) return
    setImporting(true)
    setProgress(0)
    setResult(null)

    let totalChildren: Child[] = []
    let totalFollowups: AnnualFollowup[] = []
    let allErrors: string[] = []

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        setProgress(Math.round(((i + 1) / files.length) * 100))
        const res = await importExcelFile(file)
        totalChildren = [...totalChildren, ...res.children]
        totalFollowups = [...totalFollowups, ...res.followups]
        allErrors = [...allErrors, ...res.errors]
      }

      // Save all children to IndexedDB (will queue for Supabase sync)
      for (const child of totalChildren) {
        await saveChildLocally(child)
      }

      // Save all followups
      for (const fu of totalFollowups) {
        await saveFollowupLocally(fu)
      }

      setResult({ total: totalChildren.length, imported: totalChildren.length, errors: allErrors })
      toast.success(`Imported ${totalChildren.length} children from ${files.length} file(s)!`)
    } catch (err) {
      toast.error('Import failed: ' + String(err))
      console.error(err)
    } finally {
      setImporting(false)
      setProgress(0)
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
    disabled: importing
  })

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div style={{ background: '#1a6b4a', color: '#fff', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 2 }}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>Import from Excel</div>
          <div style={{ fontSize: 11, opacity: 0.8 }}>Bulk upload existing records</div>
        </div>
      </div>

      <div style={{ padding: '14px 14px 80px' }}>
        <div style={{ background: '#e1f5ee', border: '0.5px solid #5dcaa5', borderRadius: 10, padding: '10px 12px', marginBottom: 14, fontSize: 11, color: '#085041' }}>
          Upload the existing social worker Excel files (.xlsx). The system will automatically map all fields including On Admission data and annual follow-up columns.
        </div>

        {/* Dropzone */}
        <div
          {...getRootProps()}
          style={{
            border: isDragActive ? '2px dashed #1a6b4a' : '2px dashed #ddd',
            borderRadius: 12,
            padding: '32px 20px',
            textAlign: 'center',
            cursor: importing ? 'not-allowed' : 'pointer',
            background: isDragActive ? '#f0faf6' : '#fafafa',
            transition: 'all 0.2s',
            marginBottom: 14
          }}
        >
          <input {...getInputProps()} />
          <Upload size={36} color={isDragActive ? '#1a6b4a' : '#999'} style={{ margin: '0 auto 12px', display: 'block' }} />
          {importing ? (
            <>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1a6b4a', marginBottom: 6 }}>
                Importing… {progress}%
              </div>
              <div style={{ height: 6, background: '#e5e5e5', borderRadius: 3, overflow: 'hidden', maxWidth: 200, margin: '0 auto' }}>
                <div style={{ height: '100%', background: '#1a6b4a', width: `${progress}%`, transition: 'width 0.3s' }} />
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#111', marginBottom: 4 }}>
                {isDragActive ? 'Drop files here' : 'Select .xlsx files or drag & drop'}
              </div>
              <div style={{ fontSize: 12, color: '#888' }}>
                Supports the standard Shishu Mandir follow-up report format
              </div>
            </>
          )}
        </div>

        {/* Success result */}
        {result && result.imported > 0 && (
          <div style={{ background: '#eaf3de', border: '0.5px solid #97c459', borderRadius: 10, padding: '12px', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <CheckCircle size={18} color="#3b6d11" />
              <div style={{ fontSize: 14, fontWeight: 600, color: '#3b6d11' }}>Import Complete</div>
            </div>
            <div style={{ fontSize: 12, color: '#3b6d11', lineHeight: 1.6 }}>
              ✓ {result.imported} child records imported<br />
              ✓ Records queued for Supabase sync when online<br />
              {result.errors.length > 0 && `⚠ ${result.errors.length} row(s) skipped (missing required fields)`}
            </div>
            <button onClick={() => navigate('/children')} style={{
              marginTop: 10, padding: '8px 14px', background: '#3b6d11', color: '#fff',
              border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit'
            }}>
              View imported children →
            </button>
          </div>
        )}

        {/* Errors */}
        {result && result.errors.length > 0 && (
          <div style={{ background: '#fcebeb', border: '0.5px solid #f09595', borderRadius: 10, padding: '12px', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <AlertCircle size={16} color="#a32d2d" />
              <div style={{ fontSize: 13, fontWeight: 600, color: '#a32d2d' }}>Import warnings ({result.errors.length})</div>
            </div>
            <div style={{ fontSize: 11, color: '#a32d2d', maxHeight: 120, overflowY: 'auto' }}>
              {result.errors.slice(0, 10).map((e, i) => (
                <div key={i} style={{ padding: '3px 0', borderBottom: '0.5px solid #f5c4c4' }}>{e}</div>
              ))}
              {result.errors.length > 10 && <div style={{ padding: '3px 0', fontStyle: 'italic' }}>+ {result.errors.length - 10} more…</div>}
            </div>
          </div>
        )}

        {/* Field mapping info */}
        <div style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
          Fields Auto-Mapped from Excel
        </div>
        <div style={{ background: '#f9f9f9', borderRadius: 10, padding: '12px', marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: '#666', lineHeight: 2 }}>
            School ID · Admission Date · Child Name · DOB · Sex · Class · Religion · Mother Tongue · Aadhar No.
            <br />
            <strong>Father:</strong> Name · Status · Age · Aadhar · Mobile · Occupation · Earnings · Education · Habits · Health · DV · Extramarital · Origin
            <br />
            <strong>Mother:</strong> Name · Status · Age · Aadhar · Mobile · Occupation · Earnings · Education · Habits · Health · DV · Origin
            <br />
            <strong>Sibling:</strong> Name · Age · Sex · Education · SM Support
            <br />
            <strong>Financial:</strong> Dependents · Debts · Savings · Other Income
            <br />
            <strong>Living:</strong> Area · House Size · Roof · Floor · Ownership · Rent · Advance · Vehicles
            <br />
            <strong>Child Health:</strong> Height · Weight · Health · Meals · Food Type · Medical Help
            <br />
            <strong>Life Skills:</strong> Mother Attended · Father Attended
            <br />
            <strong>Remarks:</strong> Special Remarks · Social Worker Name · Verified By
            <br /><br />
            <strong>Annual Follow-ups:</strong> Detects "On Admission" + year columns (2019-20, 2020-21, etc.) and maps each to a follow-up entry with all updated fields.
          </div>
        </div>

        <div style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
          Duplicate Detection
        </div>
        <div style={{ background: '#f9f9f9', borderRadius: 10, padding: '12px' }}>
          <div style={{ fontSize: 11, color: '#666', lineHeight: 1.6 }}>
            Records with the same School ID will be merged. New yearly columns from the same Excel will be added as new follow-up entries rather than overwriting existing data.
          </div>
        </div>

        <div style={{ marginTop: 14, fontSize: 11, color: '#999', textAlign: 'center' }}>
          <FileSpreadsheet size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
          Imported records will sync to Supabase when device is online
        </div>
      </div>
    </div>
  )
}
