import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import { performAdvancedSearch } from '@/lib/analytics'
import type { Child } from '@/types'
import type { AdvancedFilter } from '@/types/analytics'
import { Search, ChevronRight, Plus, Filter } from 'lucide-react'
import AdvancedSearch from '@/components/AdvancedSearch'

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'dv', label: 'DV Reported' },
  { id: 'abandoned', label: 'Father Abandoned' },
  { id: 'deceased', label: 'Father Deceased' },
  { id: 'alcoholic', label: 'Alcoholic' },
]

function StatusTag({ value, type }: { value: string; type: 'r' | 'g' | 'a' | 'b' | 'p' }) {
  const colors = {
    r: { bg: '#fcebeb', color: '#a32d2d' },
    g: { bg: '#eaf3de', color: '#3b6d11' },
    a: { bg: '#faeeda', color: '#854f0b' },
    b: { bg: '#e6f1fb', color: '#185fa5' },
    p: { bg: '#eeedfe', color: '#3c3489' },
  }
  const c = colors[type]
  return (
    <span style={{
      fontSize: 10, padding: '2px 7px', borderRadius: 9,
      background: c.bg, color: c.color, whiteSpace: 'nowrap'
    }}>{value}</span>
  )
}

function ChildCard({ child }: { child: Child }) {
  const navigate = useNavigate()
  const initials = child.full_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  const avatarColors = ['#9fe1cb:#085041', '#f5c4b3:#993c1d', '#b5d4f4:#0c447c', '#ced4f6:#3c3489', '#f5d4b3:#855030']
  const ci = child.full_name.charCodeAt(0) % avatarColors.length
  const [bg, fg] = avatarColors[ci].split(':')

  return (
    <div onClick={() => navigate(`/children/${child.id}`)} style={{
      display: 'flex', alignItems: 'center', gap: 11, padding: '11px 14px',
      borderBottom: '0.5px solid #f0f0f0', cursor: 'pointer', background: '#fff',
      transition: 'background 0.15s'
    }}
      onMouseEnter={e => (e.currentTarget.style.background = '#f9f9f9')}
      onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
    >
      <div style={{
        width: 42, height: 42, borderRadius: '50%', background: bg, color: fg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 600, flexShrink: 0
      }}>{initials}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>{child.full_name}</div>
        <div style={{ fontSize: 11, color: '#888', marginTop: 1 }}>
          {[child.school_id, child.area, child.present_class].filter(Boolean).join(' · ')}
        </div>
        <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
          <StatusTag value={`Father ${child.father_status}`} type={
            child.father_status === 'Alive' ? 'g' :
            child.father_status === 'Abandoned' ? 'a' : 'r'
          }/>
          {child.father_dv && <StatusTag value="DV Reported" type="r"/>}
          {child.father_habits && child.father_habits !== 'None' &&
            <StatusTag value={child.father_habits} type="a"/>}
          {child.present_class && <StatusTag value={child.present_class} type="b"/>}
        </div>
      </div>
      <ChevronRight size={16} color="#ccc" />
    </div>
  )
}

export default function ChildrenListPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false)
  const [advancedResults, setAdvancedResults] = useState<Child[] | null>(null)

  const children = useLiveQuery(() =>
    db.children.where('is_active').equals(1).sortBy('full_name')
  ) ?? []

  const handleAdvancedSearch = async (filters: AdvancedFilter) => {
    const results = await performAdvancedSearch(filters)
    setAdvancedResults(results.children)
  }

  const dataSource = advancedResults || children

  const filtered = dataSource.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      c.full_name.toLowerCase().includes(q) ||
      c.school_id?.toLowerCase().includes(q) ||
      c.area?.toLowerCase().includes(q) ||
      c.father_name?.toLowerCase().includes(q)

    const matchFilter =
      activeFilter === 'all' ? true :
      activeFilter === 'dv' ? c.father_dv :
      activeFilter === 'abandoned' ? c.father_status === 'Abandoned' :
      activeFilter === 'deceased' ? c.father_status === 'Dead' :
      activeFilter === 'alcoholic' ? (c.father_habits?.toLowerCase().includes('alcohol') || c.father_habits?.toLowerCase().includes('drink')) :
      true

    return matchSearch && matchFilter
  })

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div style={{ background: '#1a6b4a', color: '#fff', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontWeight: 600, fontSize: 15 }}>Children ({filtered.length})</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setShowAdvancedSearch(true)} style={{
            background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff',
            borderRadius: 8, padding: '5px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12
          }}>
            <Filter size={13} /> Filters
          </button>
          <button onClick={() => navigate('/children/add')} style={{
            background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff',
            borderRadius: 8, padding: '5px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12
          }}>
            <Plus size={13} /> Add
          </button>
        </div>
      </div>

      <div style={{ padding: '10px 14px 0' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #e5e5e5',
          borderRadius: 10, padding: '8px 12px', background: '#f9f9f9'
        }}>
          <Search size={14} color="#999" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, ID, area…"
            style={{ border: 'none', outline: 'none', flex: 1, fontSize: 13, background: 'transparent', fontFamily: 'inherit', color: '#111' }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, padding: '8px 14px', overflowX: 'auto' }}>
        {FILTERS.map(f => (
          <button key={f.id} onClick={() => { setActiveFilter(f.id); setAdvancedResults(null) }} style={{
            whiteSpace: 'nowrap', padding: '4px 12px', borderRadius: 20, fontSize: 11,
            border: '0.5px solid', cursor: 'pointer', fontFamily: 'inherit',
            background: activeFilter === f.id ? '#1a6b4a' : '#fff',
            color: activeFilter === f.id ? '#fff' : '#666',
            borderColor: activeFilter === f.id ? '#1a6b4a' : '#ddd'
          }}>{f.label}{f.id === 'all' ? ` (${children.length})` : ''}</button>
        ))}
        {advancedResults && (
          <button onClick={() => setAdvancedResults(null)} style={{
            whiteSpace: 'nowrap', padding: '4px 12px', borderRadius: 20, fontSize: 11,
            border: '0.5px solid #e24b4a', cursor: 'pointer', fontFamily: 'inherit',
            background: '#fcebeb', color: '#a32d2d'
          }}>Clear Advanced ({advancedResults.length})</button>
        )}
      </div>

      <div style={{ paddingBottom: 80 }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#999', fontSize: 13 }}>
            No children found. {search ? 'Try a different search.' : ''}
          </div>
        ) : (
          filtered.map(c => <ChildCard key={c.id} child={c} />)
        )}
      </div>

      {showAdvancedSearch && (
        <AdvancedSearch
          onSearch={handleAdvancedSearch}
          onClose={() => setShowAdvancedSearch(false)}
        />
      )}
    </div>
  )
}
