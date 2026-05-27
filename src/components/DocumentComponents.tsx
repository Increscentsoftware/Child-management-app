// components/DocumentUpload.tsx
/**
 * Document Upload Component
 * Allows users to upload documents during admission or follow-up
 */

import { useEffect, useState } from 'react'
import { uploadDocument, DocumentType, DocumentCategory, listChildDocuments, getDocumentUrl, deleteDocument } from '@/lib/Storage'
import { Camera, Upload, X, Download, Trash2, FileText, Image as ImageIcon } from 'lucide-react'
import toast from 'react-hot-toast'

interface DocumentUploadProps {
  childId: string
  category: DocumentCategory
  yearLabel?: string
  onSuccess?: (path: string, url: string) => void
  documentType?: DocumentType
}

export function DocumentUpload({
  childId,
  category,
  yearLabel,
  onSuccess,
  documentType = 'other'
}: DocumentUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string>('')

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setSelectedFile(file)

    // Show preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setPreview(event.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file')
      return
    }

    setUploading(true)
    try {
      const result = await uploadDocument({
        childId,
        category,
        file: selectedFile,
        documentType,
        yearLabel
      })

      if (result) {
        toast.success('Document uploaded successfully')
        setSelectedFile(null)
        setPreview('')
        onSuccess?.(result.path, result.url)
      }
    } finally {
      setUploading(false)
    }
  }

  const handleCancel = () => {
    setSelectedFile(null)
    setPreview('')
  }

  if (selectedFile) {
    return (
      <div style={{
        border: '1px solid #e5e5e5',
        borderRadius: 12,
        padding: 16,
        backgroundColor: '#f9f9f9'
      }}>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
            Selected file: <strong>{selectedFile.name}</strong>
          </div>
          <div style={{ fontSize: 11, color: '#999' }}>
            Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
          </div>
        </div>

        {preview && (
          <div style={{
            marginBottom: 12,
            borderRadius: 8,
            overflow: 'hidden',
            maxHeight: 200,
            maxWidth: 200
          }}>
            <img src={preview} alt="preview" style={{ maxWidth: '100%' }} />
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleUpload}
            disabled={uploading}
            style={{
              flex: 1,
              padding: 10,
              background: uploading ? '#5dcaa5' : '#1a6b4a',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: uploading ? 'not-allowed' : 'pointer',
              fontSize: 13,
              fontWeight: 600,
              fontFamily: 'inherit'
            }}
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
          <button
            onClick={handleCancel}
            disabled={uploading}
            style={{
              padding: 10,
              background: '#f5f5f5',
              color: '#666',
              border: '1px solid #e5e5e5',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 13,
              fontFamily: 'inherit'
            }}
          >
            <X size={16} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      onClick={() => document.getElementById(`upload-${childId}`)?.click()}
      style={{
        border: '2px dashed #ddd',
        borderRadius: 12,
        padding: 20,
        textAlign: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s',
        backgroundColor: '#fafafa'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#1a6b4a'
        e.currentTarget.style.backgroundColor = '#f0faf6'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#ddd'
        e.currentTarget.style.backgroundColor = '#fafafa'
      }}
    >
      <input
        id={`upload-${childId}`}
        type="file"
        hidden
        onChange={handleFileSelect}
        accept="image/*,.pdf,.doc,.docx"
      />
      <Upload size={24} color="#999" style={{ marginBottom: 8, display: 'block' }} />
      <div style={{ fontSize: 13, color: '#333', fontWeight: 500 }}>
        Click to upload document
      </div>
      <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
        PDF, images, or Word documents (max 50MB)
      </div>
    </div>
  )
}

interface DocumentsListProps {
  childId: string
  category?: DocumentCategory
}

export function DocumentsList({ childId, category }: DocumentsListProps) {
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    loadDocuments()
  }, [childId, category])

  const loadDocuments = async () => {
    setLoading(true)
    try {
      const docs = await listChildDocuments(childId, category)
      setDocuments(docs)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (name: string) => {
    try {
      const url = getDocumentUrl(`${childId}/${name}`)
      const a = document.createElement('a')
      a.href = url
      a.download = name
      a.click()
    } catch (error) {
      console.error('Download failed:', error)
    }
  }

  const handleDelete = async (name: string) => {
    if (!confirm('Delete this document?')) return

    setDeleting(name)
    try {
      const success = await deleteDocument(`${childId}/${name}`)
      if (success) {
        setDocuments(docs => docs.filter(d => d.name !== name))
      }
    } finally {
      setDeleting(null)
    }
  }

  if (loading) {
    return <div style={{ padding: 16, color: '#999' }}>Loading documents...</div>
  }

  if (documents.length === 0) {
    return <div style={{ padding: 16, color: '#999' }}>No documents uploaded yet</div>
  }

  return (
    <div>
      {documents.map((file) => {
        const isImage = file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)
        const isPdf = file.name.endsWith('.pdf')

        return (
          <div
            key={file.name}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: 12,
              borderBottom: '1px solid #f0f0f0',
              backgroundColor: '#fff'
            }}
          >
            {/* Icon */}
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isImage ? '#f0faf6' : isPdf ? '#fee2e2' : '#f5f5f5'
            }}>
              {isImage ? (
                <ImageIcon size={20} color="#1a6b4a" />
              ) : (
                <FileText size={20} color={isPdf ? '#dc2626' : '#666'} />
              )}
            </div>

            {/* File info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 13,
                fontWeight: 500,
                color: '#111',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {file.name}
              </div>
              <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                {file.metadata?.size
                  ? `${(file.metadata.size / 1024 / 1024).toFixed(2)} MB`
                  : 'Size unknown'}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => handleDownload(file.name)}
                style={{
                  padding: 8,
                  background: '#f5f5f5',
                  border: '1px solid #e5e5e5',
                  borderRadius: 6,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#1a6b4a'
                }}
                title="Download"
              >
                <Download size={16} />
              </button>
              <button
                onClick={() => handleDelete(file.name)}
                disabled={deleting === file.name}
                style={{
                  padding: 8,
                  background: '#fee2e2',
                  border: '1px solid #f09595',
                  borderRadius: 6,
                  cursor: deleting === file.name ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#dc2626',
                  opacity: deleting === file.name ? 0.6 : 1
                }}
                title="Delete"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}