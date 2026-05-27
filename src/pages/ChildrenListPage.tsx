// src/pages/ChildrenListPage.tsx
// Reads from Supabase (source of truth), caches to Dexie for offline
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { db } from '@/lib/db'
import type { Child } from '@/types'
import { Search, Plus, Filter, Loader2, RefreshCw } from 'lucide-react'

const G = '#1a6b4a'

const FILTERS = [
  { id: 'all',       label: 'All' },
  { id: 'dv',        label: 'DV Cases' },
  { id: 'abandoned', label: 'Father Abandoned' },
  { id: 'deceased',  label: 'Father Deceased' },
  { id: 'alcoholic', label: 'Alcoholic' },
]

function Tag({ value, type }: { value: string; type: 'r'|'g'|'a'|'b'|'p' }) {
  const c = { r:['#fcebeb','#a32d2d'], g:['#eaf3de','#3b6d11'], a:['#faeeda','#854f0b'], b:['#e6f1fb','#185fa5'], p:['#eeedfe','#3c3489'] }[type]
  return <span style={{ fontSize:10, padding:'2px 7px', borderRadius:9, background:c[0], color:c[1], whiteSpace:'nowrap' }}>{value}</span>
}

function ChildCard({ child }: { child: Child }) {
  const navigate = useNavigate()
  const initials = child.full_name.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase()
  const palettes = ['#9fe1cb:#085041','#f5c4b3:#993c1d','#b5d4f4:#0c447c','#ced4f6:#3c3489','#f5d4b3:#855030']
  const [bg, fg] = palettes[child.full_name.charCodeAt(0) % palettes.length].split(':')

  return (
    <div onClick={() => navigate(`/children/${child.id}`)}
      style={{ display:'flex', alignItems:'center', gap:11, padding:'11px 14px',
        borderBottom:'0.5px solid #f0f0f0', cursor:'pointer', background:'#fff', transition:'background .15s' }}
      onMouseEnter={e => (e.currentTarget.style.background='#f9f9f9')}
      onMouseLeave={e => (e.currentTarget.style.background='#fff')}>
      <div style={{ width:42, height:42, borderRadius:'50%', background:bg, color:fg,
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:13, fontWeight:600, flexShrink:0, overflow:'hidden' }}>
        {child.photo_url
          ? <img src={child.photo_url} alt="" style={{ width:42, height:42, objectFit:'cover', borderRadius:'50%' }}/>
          : initials}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:14, fontWeight:600, color:'#111' }}>{child.full_name}</div>
        <div style={{ fontSize:11, color:'#888', marginTop:1 }}>
          {[child.school_id, child.present_class, child.area_type || child.address_city].filter(Boolean).join(' · ')}
        </div>
        <div style={{ display:'flex', gap:4, marginTop:4, flexWrap:'wrap' as const }}>
          <Tag value={`Father: ${child.father_status}`} type={child.father_status==='Alive'?'g':child.father_status==='Abandoned'?'a':'r'}/>
          {child.father_dv && <Tag value="DV" type="r"/>}
          {child.child_type && child.child_type !== 'shishu_student' &&
            <Tag value={child.child_type === 'sponsored_external' ? 'Sponsored' : 'Alumni'} type="b"/>}
          {child.present_class && <Tag value={child.present_class} type="p"/>}
        </div>
      </div>
      <span style={{ color:'#ccc', fontSize:18 }}>›</span>
    </div>
  )
}

export default function ChildrenListPage() {
  const navigate = useNavigate()
  const [children, setChildren] = useState<Child[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [syncing, setSyncing] = useState(false)

  const loadChildren = useCallback(async (showSyncing = false) => {
    if (showSyncing) setSyncing(true)
    else setLoading(true)
    try {
      // Try Supabase first (source of truth)
      const { data, error } = await supabase
        .from('children')
        .select('*')
        .eq('is_active', true)
        .order('full_name', { ascending: true })

      if (!error && data && data.length > 0) {
        setChildren(data)
        // Sync to local IndexedDB cache
        await db.children.bulkPut(data)
      } else {
        // Offline fallback — use local cache
        const local = await db.children.filter(c => !!c.is_active).sortBy('full_name')
        setChildren(local)
      }
    } catch {
      // Network error — use local cache
      const local = await db.children.filter(c => !!c.is_active).sortBy('full_name')
      setChildren(local)
    } finally {
      setLoading(false)
      setSyncing(false)
    }
  }, [])

  useEffect(() => { loadChildren() }, [loadChildren])

  const filtered = children.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      c.full_name.toLowerCase().includes(q) ||
      (c.school_id?.toLowerCase() || '').includes(q) ||
      (c.father_name?.toLowerCase() || '').includes(q) ||
      (c.mother_name?.toLowerCase() || '').includes(q)

    const matchFilter =
      activeFilter === 'all'       ? true :
      activeFilter === 'dv'        ? (c.father_dv || !!c.mother_dv) :
      activeFilter === 'abandoned' ? c.father_status === 'Abandoned' :
      activeFilter === 'deceased'  ? c.father_status === 'Dead' :
      activeFilter === 'alcoholic' ? (c.father_habits?.toLowerCase().includes('alcohol') || c.father_habits?.toLowerCase().includes('drink') || false) :
      true

    return matchSearch && matchFilter
  })

  // Group stats for filter pills
  const dvCount       = children.filter(c => c.father_dv || !!c.mother_dv).length
  const abandonedCount = children.filter(c => c.father_status === 'Abandoned').length
  const deceasedCount  = children.filter(c => c.father_status === 'Dead').length
  const alcoholicCount = children.filter(c => c.father_habits?.toLowerCase().includes('alcohol') || c.father_habits?.toLowerCase().includes('drink')).length

  const filterCounts: Record<string,number> = {
    all: children.length, dv: dvCount, abandoned: abandonedCount,
    deceased: deceasedCount, alcoholic: alcoholicCount
  }

  return (
    <div style={{ fontFamily:"'DM Sans',system-ui,sans-serif" }}>

      {/* Header */}
      <div style={{ background:G, color:'#fff', padding:'12px 14px',
        display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ fontWeight:600, fontSize:15 }}>
          Children {!loading && `(${children.length})`}
          {loading && <Loader2 size={14} style={{ display:'inline', marginLeft:8, animation:'spin 1s linear infinite' }}/>}
        </div>
        <div style={{ display:'flex', gap:6 }}>
          <button onClick={() => loadChildren(true)} disabled={syncing}
            style={{ background:'rgba(255,255,255,.2)', border:'none', color:'#fff',
              borderRadius:8, padding:'5px 10px', cursor:'pointer',
              display:'flex', alignItems:'center', gap:4, fontSize:12 }}>
            <RefreshCw size={13} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }}/> Refresh
          </button>
          <button onClick={() => navigate('/children/add')}
            style={{ background:'rgba(255,255,255,.2)', border:'none', color:'#fff',
              borderRadius:8, padding:'5px 10px', cursor:'pointer',
              display:'flex', alignItems:'center', gap:4, fontSize:12 }}>
            <Plus size={13}/> Add
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{ padding:'10px 14px 0' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, border:'1px solid #e5e5e5',
          borderRadius:10, padding:'8px 12px', background:'#f9f9f9' }}>
          <Search size={14} color="#999"/>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, ID, father name…"
            style={{ border:'none', outline:'none', flex:1, fontSize:13,
              background:'transparent', fontFamily:'inherit', color:'#111' }}/>
          {search && (
            <button onClick={() => setSearch('')}
              style={{ background:'none', border:'none', cursor:'pointer', color:'#999', padding:0 }}>✕</button>
          )}
        </div>
      </div>

      {/* Filter pills */}
      <div style={{ display:'flex', gap:6, padding:'8px 14px', overflowX:'auto', scrollbarWidth:'none' as const }}>
        {FILTERS.map(f => (
          <button key={f.id} onClick={() => setActiveFilter(f.id)}
            style={{ whiteSpace:'nowrap', padding:'4px 12px', borderRadius:20, fontSize:11,
              border:'0.5px solid', cursor:'pointer', fontFamily:'inherit',
              background: activeFilter===f.id ? G : '#fff',
              color: activeFilter===f.id ? '#fff' : '#666',
              borderColor: activeFilter===f.id ? G : '#ddd' }}>
            {f.label} ({filterCounts[f.id]})
          </button>
        ))}
      </div>

      {/* List */}
      <div style={{ paddingBottom:80 }}>
        {loading ? (
          <div style={{ textAlign:'center', padding:'48px 20px', color:'#999' }}>
            <Loader2 size={24} style={{ display:'block', margin:'0 auto 12px', animation:'spin 1s linear infinite' }}/>
            <div style={{ fontSize:13 }}>Loading children from database…</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:'center', padding:'48px 20px', color:'#bbb' }}>
            <div style={{ fontSize:32, marginBottom:10 }}>👥</div>
            <div style={{ fontSize:14, fontWeight:600, color:'#888', marginBottom:6 }}>
              {children.length === 0 ? 'No children in database yet' : 'No results match your search'}
            </div>
            <div style={{ fontSize:12, color:'#bbb' }}>
              {children.length === 0
                ? 'Add a child manually or import from Excel'
                : 'Try a different search term or filter'}
            </div>
            {children.length === 0 && (
              <div style={{ display:'flex', gap:10, justifyContent:'center', marginTop:16 }}>
                <button onClick={() => navigate('/children/add')}
                  style={{ padding:'9px 18px', background:G, color:'#fff', border:'none',
                    borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer' }}>
                  + Add Child
                </button>
                <button onClick={() => navigate('/import')}
                  style={{ padding:'9px 18px', background:'#f0f0f0', color:'#555', border:'none',
                    borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer' }}>
                  Import Excel
                </button>
              </div>
            )}
          </div>
        ) : (
          filtered.map(c => <ChildCard key={c.id} child={c}/>)
        )}
      </div>

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}