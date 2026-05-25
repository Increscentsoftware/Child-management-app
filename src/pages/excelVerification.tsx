// src/pages/admin/ExcelDataViewer.tsx
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, FileSpreadsheet } from 'lucide-react'

export default function ExcelDataViewer() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [child, setChild] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    loadChild()
  }, [id])

  const loadChild = async () => {
    try {
      const { data, error } = await supabase
        .from('children')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      setChild(data)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div style={{ padding: 24 }}>Loading...</div>

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", minHeight: '100vh', background: '#f5f5f5' }}>
      {/* Header */}
      <div style={{ 
        background: '#1a6b4a', 
        color: '#fff', 
        padding: '14px 16px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: '#fff',
              padding: 8,
              borderRadius: 8,
              cursor: 'pointer'
            }}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div style={{ fontWeight: 600, fontSize: 18 }}>Excel Data Viewer</div>
            <div style={{ fontSize: 12, opacity: 0.9 }}>{child?.full_name}</div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: 16 }}>
        {/* Database Fields */}
        <div style={{ 
          background: '#fff', 
          borderRadius: 12, 
          padding: 20,
          marginBottom: 16,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
            Database Fields (Extracted)
          </h3>
          <div style={{ fontSize: 13 }}>
            <div style={{ padding: '6px 0', borderBottom: '1px solid #f0f0f0' }}>
              <strong>School ID:</strong> {child?.school_id}
            </div>
            <div style={{ padding: '6px 0', borderBottom: '1px solid #f0f0f0' }}>
              <strong>Full Name:</strong> {child?.full_name}
            </div>
            <div style={{ padding: '6px 0', borderBottom: '1px solid #f0f0f0' }}>
              <strong>Class:</strong> {child?.present_class || '—'}
            </div>
            <div style={{ padding: '6px 0', borderBottom: '1px solid #f0f0f0' }}>
              <strong>Category:</strong> {child?.category || '—'}
            </div>
            <div style={{ padding: '6px 0', borderBottom: '1px solid #f0f0f0' }}>
              <strong>Sex:</strong> {child?.sex || '—'}
            </div>
          </div>
        </div>

        {/* ALL Excel Data */}
        <div style={{ 
          background: '#fff', 
          borderRadius: 12, 
          padding: 20,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <FileSpreadsheet size={20} color="#1a6b4a" />
            <h3 style={{ fontSize: 16, fontWeight: 600 }}>
              Complete Excel Data ({Object.keys(child?.data_json || {}).length} fields)
            </h3>
          </div>
          
          {child?.data_json ? (
            <div style={{ maxHeight: 500, overflow: 'auto' }}>
              <table style={{ width: '100%', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f5f5f5' }}>
                    <th style={{ 
                      padding: '8px 12px', 
                      textAlign: 'left',
                      borderBottom: '2px solid #e5e5e5',
                      fontWeight: 600
                    }}>
                      Excel Column Name
                    </th>
                    <th style={{ 
                      padding: '8px 12px', 
                      textAlign: 'left',
                      borderBottom: '2px solid #e5e5e5',
                      fontWeight: 600
                    }}>
                      Value
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(child.data_json)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([key, value], idx) => (
                      <tr 
                        key={idx}
                        style={{ 
                          borderBottom: '1px solid #f0f0f0',
                          background: idx % 2 === 0 ? '#fff' : '#fafafa'
                        }}
                      >
                        <td style={{ 
                          padding: '8px 12px',
                          color: '#666',
                          fontWeight: 500,
                          maxWidth: 300
                        }}>
                          {key}
                        </td>
                        <td style={{ 
                          padding: '8px 12px',
                          color: '#111',
                          wordBreak: 'break-word'
                        }}>
                          {String(value)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ 
              textAlign: 'center', 
              padding: 40, 
              color: '#999' 
            }}>
              No Excel data available for this child
            </div>
          )}
        </div>

        {/* JSON View (for developers) */}
        <details style={{ marginTop: 16 }}>
          <summary style={{ 
            cursor: 'pointer', 
            fontSize: 13, 
            fontWeight: 600,
            padding: 12,
            background: '#f5f5f5',
            borderRadius: 8
          }}>
            View Raw JSON Data
          </summary>
          <pre style={{ 
            background: '#1e1e1e', 
            color: '#d4d4d4',
            padding: 16,
            borderRadius: 8,
            overflow: 'auto',
            fontSize: 12,
            marginTop: 8
          }}>
            {JSON.stringify(child?.data_json, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  )
}