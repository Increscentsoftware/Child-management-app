import { useState } from 'react'
import { X, Search } from 'lucide-react'
import type { AdvancedFilter } from '@/types/analytics'

interface AdvancedSearchProps {
  onSearch: (filters: AdvancedFilter) => void
  onClose: () => void
}

export default function AdvancedSearch({ onSearch, onClose }: AdvancedSearchProps) {
  const [filters, setFilters] = useState<AdvancedFilter>({})

  const updateFilter = <K extends keyof AdvancedFilter>(key: K, value: AdvancedFilter[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const handleSearch = () => {
    onSearch(filters)
    onClose()
  }

  const clearFilters = () => {
    setFilters({})
  }

  const inputStyle = {
    width: '100%', padding: '7px 10px', border: '1px solid #e5e5e5',
    borderRadius: 8, fontSize: 13, fontFamily: 'inherit'
  }

  const labelStyle = { fontSize: 11, color: '#666', display: 'block', marginBottom: 4 }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'flex-end', zIndex: 100
    }} onClick={onClose}>
      <div style={{
        background: '#fff', width: '100%', maxHeight: '85vh',
        borderRadius: '16px 16px 0 0', overflow: 'hidden',
        fontFamily: "'DM Sans', sans-serif"
      }} onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div style={{
          background: '#1a6b4a', color: '#fff', padding: '12px 14px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>Advanced Search</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{ padding: '14px', overflowY: 'auto', maxHeight: 'calc(85vh - 120px)' }}>
          
          {/* Demographics */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#1a6b4a', marginBottom: 8 }}>Demographics</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={labelStyle}>Sex</label>
                <select style={inputStyle} value={filters.sex || ''} onChange={e => updateFilter('sex', e.target.value as any)}>
                  <option value="">All</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Class</label>
                <input style={inputStyle} placeholder="e.g. 5th" value={filters.class?.[0] || ''} 
                  onChange={e => updateFilter('class', e.target.value ? [e.target.value] : undefined)} />
              </div>
            </div>
          </div>

          {/* Parent Status */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#1a6b4a', marginBottom: 8 }}>Parent Status</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={labelStyle}>Father Status</label>
                <select style={inputStyle} value={filters.fatherStatus?.[0] || ''} 
                  onChange={e => updateFilter('fatherStatus', e.target.value ? [e.target.value] : undefined)}>
                  <option value="">All</option>
                  <option value="Alive">Alive</option>
                  <option value="Dead">Deceased</option>
                  <option value="Abandoned">Abandoned</option>
                  <option value="Unknown">Unknown</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Mother Status</label>
                <select style={inputStyle} value={filters.motherStatus?.[0] || ''} 
                  onChange={e => updateFilter('motherStatus', e.target.value ? [e.target.value] : undefined)}>
                  <option value="">All</option>
                  <option value="Alive">Alive</option>
                  <option value="Dead">Deceased</option>
                  <option value="Abandoned">Abandoned</option>
                </select>
              </div>
            </div>
            <div style={{ marginTop: 10, display: 'flex', gap: 10 }}>
              <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={filters.bothParentsAlive || false} 
                  onChange={e => updateFilter('bothParentsAlive', e.target.checked || undefined)} />
                Both parents alive
              </label>
              <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={filters.singleParent || false} 
                  onChange={e => updateFilter('singleParent', e.target.checked || undefined)} />
                Single parent
              </label>
              <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={filters.orphan || false} 
                  onChange={e => updateFilter('orphan', e.target.checked || undefined)} />
                Orphan
              </label>
            </div>
          </div>

          {/* Family Situation */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#1a6b4a', marginBottom: 8 }}>Family Situation</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={filters.domesticViolence || false} 
                  onChange={e => updateFilter('domesticViolence', e.target.checked || undefined)} />
                Domestic violence
              </label>
              <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={filters.hasSiblings || false} 
                  onChange={e => updateFilter('hasSiblings', e.target.checked || undefined)} />
                Has siblings
              </label>
              <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={filters.siblingsInSchool || false} 
                  onChange={e => updateFilter('siblingsInSchool', e.target.checked || undefined)} />
                Siblings in school
              </label>
            </div>
          </div>

          {/* Area */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Area / Village</label>
            <input style={inputStyle} placeholder="e.g. K.R.Puram" value={filters.area?.[0] || ''} 
              onChange={e => updateFilter('area', e.target.value ? [e.target.value] : undefined)} />
          </div>

          {/* Admission Year */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#1a6b4a', marginBottom: 8 }}>Admission Year Range</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={labelStyle}>From</label>
                <input type="number" style={inputStyle} placeholder="2020" 
                  value={filters.admissionYearRange?.from || ''} 
                  onChange={e => updateFilter('admissionYearRange', { 
                    ...filters.admissionYearRange, 
                    from: e.target.value ? Number(e.target.value) : undefined 
                  } as any)} />
              </div>
              <div>
                <label style={labelStyle}>To</label>
                <input type="number" style={inputStyle} placeholder="2025" 
                  value={filters.admissionYearRange?.to || ''} 
                  onChange={e => updateFilter('admissionYearRange', { 
                    ...filters.admissionYearRange, 
                    to: e.target.value ? Number(e.target.value) : undefined 
                  } as any)} />
              </div>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div style={{
          borderTop: '1px solid #e5e5e5', padding: '12px 14px',
          display: 'flex', gap: 8, background: '#fafafa'
        }}>
          <button onClick={clearFilters} style={{
            flex: 1, padding: 10, background: 'transparent', color: '#666',
            border: '1px solid #ddd', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit'
          }}>
            Clear
          </button>
          <button onClick={handleSearch} style={{
            flex: 2, padding: 10, background: '#1a6b4a', color: '#fff',
            border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
          }}>
            <Search size={14} /> Apply Filters
          </button>
        </div>
      </div>
    </div>
  )
}
