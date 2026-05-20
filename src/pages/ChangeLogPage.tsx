import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '@/lib/db'
import type { ChangeLogEntry } from '@/types'
import { ArrowLeft, TrendingUp } from 'lucide-react'

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'status', label: 'Status changes' },
  { id: 'income', label: 'Income changes' },
  { id: 'health', label: 'Health changes' },
  { id: 'dv', label: 'DV changes' },
]

export default function ChangeLogPage() {
  const navigate = useNavigate()
  const [logs, setLogs] = useState<ChangeLogEntry[]>([])
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    db.change_log.orderBy('changed_at').reverse().limit(200).toArray().then(setLogs)
  }, [])

  const filtered = logs.filter(l => {
    if (filter === 'all') return true
    if (filter === 'status') return l.field_name.toLowerCase().includes('status')
    if (filter === 'income') return l.field_name.toLowerCase().includes('income')
    if (filter === 'health') return l.field_name.toLowerCase().includes('health')
    if (filter === 'dv') return l.field_name.toLowerCase().includes('violence') || l.field_name.toLowerCase().includes('dv')
    return true
  })

  // Group by child + year
  const grouped: Record<string, ChangeLogEntry[]> = {}
  filtered.forEach(l => {
    const key = `${l.child_name} — ${l.followup_year || 'Unknown year'}`
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(l)
  })

  const dotColor = (field: string) => {
    if (field.toLowerCase().includes('status')) return '#e24b4a'
    if (field.toLowerCase().includes('income') || field.toLowerCase().includes('earnings')) return '#ef9f27'
    if (field.toLowerCase().includes('health')) return '#ef9f27'
    if (field.toLowerCase().includes('violence')) return '#e24b4a'
    return '#1a6b4a'
  }

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {/* Topbar */}
      <div style={{ background: '#1a6b4a', color: '#fff', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 2 }}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>Change Log</div>
          <div style={{ fontSize: 11, opacity: 0.8 }}>Field-level audit trail</div>
        </div>
      </div>

      <div style={{ padding: '10px 14px 80px' }}>
        <div style={{ fontSize: 11, color: '#888', marginBottom: 12, lineHeight: 1.6 }}>
          Every field update made during follow-ups is recorded here with timestamp, social worker name, and what changed.
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14, overflowX: 'auto' }}>
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)} style={{
              whiteSpace: 'nowrap', padding: '4px 12px', borderRadius: 20, fontSize: 11,
              border: '0.5px solid', cursor: 'pointer', fontFamily: 'inherit',
              background: filter === f.id ? '#1a6b4a' : '#fff',
              color: filter === f.id ? '#fff' : '#666',
              borderColor: filter === f.id ? '#1a6b4a' : '#ddd'
            }}>{f.label}</button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#999', fontSize: 13 }}>
            <TrendingUp size={32} color="#ddd" style={{ margin: '0 auto 12px', display: 'block' }} />
            No changes logged yet. Changes will appear here after follow-ups are saved.
          </div>
        ) : (
          Object.entries(grouped).map(([groupKey, groupLogs]) => (
            <div key={groupKey} style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                {groupKey}
              </div>
              {groupLogs.map(l => (
                <div key={l.id} style={{ display: 'flex', gap: 9, marginBottom: 9, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: dotColor(l.field_name), flexShrink: 0, marginTop: 4
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: '#111', fontWeight: 500 }}>
                      <strong>{l.field_name}</strong> changed
                    </div>
                    <div style={{
                      display: 'flex', gap: 6, alignItems: 'center', fontSize: 11, margin: '3px 0',
                      background: '#e1f5ee', border: '0.5px solid #9fe1cb', borderRadius: 7, padding: '4px 9px', flexWrap: 'wrap'
                    }}>
                      <span style={{ color: '#a32d2d', textDecoration: 'line-through' }}>{l.old_value || '—'}</span>
                      <span style={{ color: '#888' }}>→</span>
                      <span style={{ color: '#3b6d11', fontWeight: 600 }}>{l.new_value}</span>
                    </div>
                    <div style={{ fontSize: 10, color: '#999' }}>
                      By {l.changed_by_name || '—'} · {new Date(l.changed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
