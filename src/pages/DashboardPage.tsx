import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/lib/store'
import { 
  Users, UserPlus, Settings, FileText, LogOut, Menu, X, 
  Search, TrendingUp, AlertCircle, Award, Heart
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Stats {
  total_children: number
  active_children: number
  by_category: Record<string, number>
  by_class: Record<string, number>
  by_sex: Record<string, number>
  father_status: Record<string, number>
  dv_cases: number
  father_alcoholic: number
}

interface Child {
  id: string
  school_id: string
  full_name: string
  present_class: string
  category: string
  sex: string
  father_status: string
  data_json: any
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user, logout } = useAppStore()
  const [stats, setStats] = useState<Stats>({
    total_children: 0,
    active_children: 0,
    by_category: {},
    by_class: {},
    by_sex: {},
    father_status: {},
    dv_cases: 0,
    father_alcoholic: 0
  })
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Child[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    loadStats()
  }, [user])

  const loadStats = async () => {
    try {
      // Get all children
      const { data: children, error } = await supabase
        .from('children')
        .select('*')

      if (error) throw error

      // Calculate stats
      const total = children?.length || 0
      const active = children?.filter(c => c.is_active)?.length || 0
      
      // By category
      const byCategory: Record<string, number> = {}
      children?.forEach(c => {
        const cat = c.category || 'Unknown'
        byCategory[cat] = (byCategory[cat] || 0) + 1
      })

      // By class
      const byClass: Record<string, number> = {}
      children?.forEach(c => {
        const cls = c.present_class || 'Unknown'
        byClass[cls] = (byClass[cls] || 0) + 1
      })

      // By sex
      const bySex: Record<string, number> = {}
      children?.forEach(c => {
        const sex = c.sex || 'Unknown'
        bySex[sex] = (bySex[sex] || 0) + 1
      })

      // Father status
      const fatherStatus: Record<string, number> = {}
      children?.forEach(c => {
        const status = c.father_status || 'Unknown'
        fatherStatus[status] = (fatherStatus[status] || 0) + 1
      })

      // DV cases
      const dvCases = children?.filter(c => 
        c.father_dv === true || c.mother_dv === true
      )?.length || 0

      // Father alcoholic
      const fatherAlcoholic = children?.filter(c => 
        c.father_habits && (
          c.father_habits.includes('Alcoholic') || 
          c.father_habits.includes('Drinking')
        )
      )?.length || 0

      setStats({
        total_children: total,
        active_children: active,
        by_category: byCategory,
        by_class: byClass,
        by_sex: bySex,
        father_status: fatherStatus,
        dv_cases: dvCases,
        father_alcoholic: fatherAlcoholic
      })
    } catch (error) {
      console.error('Error loading stats:', error)
      toast.error('Failed to load statistics')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setSearching(true)
    try {
      const { data, error } = await supabase
        .from('children')
        .select('*')
        .or(`full_name.ilike.%${query}%,school_id.ilike.%${query}%`)
        .limit(10)

      if (error) throw error
      setSearchResults(data || [])
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setSearching(false)
    }
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      logout()
      navigate('/login')
      toast.success('Logged out successfully')
    } catch (error) {
      toast.error('Failed to logout')
    }
  }

  const isAdmin = user?.role === 'admin'

  // Calculate percentages for pie chart
  const totalForPie = Object.values(stats.by_category).reduce((a, b) => a + b, 0)
  const categoryPercentages = Object.entries(stats.by_category).map(([key, value]) => ({
    label: key,
    value,
    percentage: totalForPie > 0 ? (value / totalForPie * 100) : 0,
    color: key === 'Category I' ? '#dc2626' : 
           key === 'Category II' ? '#ea580c' : 
           key === 'Category III' ? '#f59e0b' : '#10b981'
  }))

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", minHeight: '100vh', background: '#f5f5f5' }}>
      {/* Header */}
      <div style={{ 
        background: '#1a6b4a', 
        color: '#fff', 
        padding: '14px 16px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 18 }}>Analytics Dashboard</div>
            <div style={{ fontSize: 12, opacity: 0.9 }}>{user?.full_name || 'Admin User'}</div>
          </div>
          
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: '#fff',
              padding: 8,
              borderRadius: 8,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Search Bar */}
        <div style={{ position: 'relative' }}>
          <Search 
            size={18} 
            style={{ 
              position: 'absolute', 
              left: 12, 
              top: '50%', 
              transform: 'translateY(-50%)',
              color: '#888'
            }} 
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search children by name or ID..."
            style={{
              width: '100%',
              padding: '10px 12px 10px 40px',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              background: '#fff',
              boxSizing: 'border-box'
            }}
          />
          
          {/* Search Results Dropdown */}
          {searchQuery && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: 4,
              background: '#fff',
              borderRadius: 8,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              maxHeight: 300,
              overflowY: 'auto',
              zIndex: 20
            }}>
              {searching ? (
                <div style={{ padding: 16, textAlign: 'center', color: '#888' }}>
                  Searching...
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map(child => (
                  <div
                    key={child.id}
                    onClick={() => {
                      navigate(`/children/${child.id}`)
                      setSearchQuery('')
                      setSearchResults([])
                    }}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid #f0f0f0',
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f5f5f5'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{child.full_name}</div>
                    <div style={{ fontSize: 12, color: '#888' }}>
                      ID: {child.school_id} • {child.present_class} • {child.category}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: 16, textAlign: 'center', color: '#888' }}>
                  No results found
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sliding Menu */}
      {menuOpen && (
        <>
          <div 
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 50
            }}
            onClick={() => setMenuOpen(false)}
          />
          <div style={{
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            width: 280,
            background: '#fff',
            boxShadow: '-2px 0 8px rgba(0,0,0,0.1)',
            zIndex: 51,
            padding: 20,
            overflowY: 'auto'
          }}>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>
                {user?.full_name || 'Admin User'}
              </div>
              <div style={{ fontSize: 12, color: '#888' }}>
                {isAdmin ? 'Administrator' : 'User'}
              </div>
            </div>

            <nav style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                onClick={() => { navigate('/children'); setMenuOpen(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                  background: '#f5f5f5', border: 'none', borderRadius: 8, cursor: 'pointer',
                  fontSize: 14, fontWeight: 500, color: '#111', textAlign: 'left'
                }}
              >
                <Users size={18} />
                View All Children
              </button>

              <button
                onClick={() => { navigate('/children/add'); setMenuOpen(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                  background: '#1a6b4a', border: 'none', borderRadius: 8, cursor: 'pointer',
                  fontSize: 14, fontWeight: 600, color: '#fff', textAlign: 'left'
                }}
              >
                <UserPlus size={18} />
                Add New Child
              </button>

              <button
                onClick={() => { navigate('/import'); setMenuOpen(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                  background: '#f5f5f5', border: 'none', borderRadius: 8, cursor: 'pointer',
                  fontSize: 14, fontWeight: 500, color: '#111', textAlign: 'left'
                }}
              >
                <FileText size={18} />
                Import Excel
              </button>

              {isAdmin && (
                <>
                  <div style={{ height: 1, background: '#e5e5e5', margin: '12px 0' }} />
                  
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 4, marginLeft: 4 }}>
                    ADMIN
                  </div>

                  <button
                    onClick={() => { navigate('/admin/users'); setMenuOpen(false) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                      background: '#f5f5f5', border: 'none', borderRadius: 8, cursor: 'pointer',
                      fontSize: 14, fontWeight: 500, color: '#111', textAlign: 'left'
                    }}
                  >
                    <Users size={18} />
                    User Management
                  </button>

                  <button
                    onClick={() => { navigate('/admin/form-fields'); setMenuOpen(false) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                      background: '#f5f5f5', border: 'none', borderRadius: 8, cursor: 'pointer',
                      fontSize: 14, fontWeight: 500, color: '#111', textAlign: 'left'
                    }}
                  >
                    <Settings size={18} />
                    Form Fields
                  </button>
                </>
              )}

              <div style={{ height: 1, background: '#e5e5e5', margin: '12px 0' }} />

              <button
                onClick={handleLogout}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                  background: '#fee2e2', border: 'none', borderRadius: 8, cursor: 'pointer',
                  fontSize: 14, fontWeight: 500, color: '#dc2626', textAlign: 'left'
                }}
              >
                <LogOut size={18} />
                Logout
              </button>
            </nav>
          </div>
        </>
      )}

      {/* Main Content */}
      <div style={{ padding: '20px 16px 100px' }}>
        {/* Key Stats Cards */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
          gap: 12,
          marginBottom: 24
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #1a6b4a 0%, #15563c 100%)',
            borderRadius: 12,
            padding: 16,
            boxShadow: '0 2px 8px rgba(26,107,74,0.2)',
            color: '#fff'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Users size={20} opacity={0.8} />
              <TrendingUp size={16} opacity={0.6} />
            </div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>
              {loading ? '...' : stats.total_children}
            </div>
            <div style={{ fontSize: 11, opacity: 0.9, marginTop: 2 }}>
              Total Children
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
            borderRadius: 12,
            padding: 16,
            boxShadow: '0 2px 8px rgba(220,38,38,0.2)',
            color: '#fff'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <AlertCircle size={20} opacity={0.8} />
            </div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>
              {loading ? '...' : stats.dv_cases}
            </div>
            <div style={{ fontSize: 11, opacity: 0.9, marginTop: 2 }}>
              DV Cases
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
            borderRadius: 12,
            padding: 16,
            boxShadow: '0 2px 8px rgba(234,88,12,0.2)',
            color: '#fff'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Heart size={20} opacity={0.8} />
            </div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>
              {loading ? '...' : stats.father_alcoholic}
            </div>
            <div style={{ fontSize: 11, opacity: 0.9, marginTop: 2 }}>
              Father Alcoholic
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)',
            borderRadius: 12,
            padding: 16,
            boxShadow: '0 2px 8px rgba(8,145,178,0.2)',
            color: '#fff'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Award size={20} opacity={0.8} />
            </div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>
              {loading ? '...' : stats.active_children}
            </div>
            <div style={{ fontSize: 11, opacity: 0.9, marginTop: 2 }}>
              Active Students
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
          gap: 16,
          marginBottom: 24
        }}>
          {/* Category Pie Chart */}
          <div style={{ 
            background: '#fff', 
            borderRadius: 12, 
            padding: 20, 
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
          }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, color: '#111' }}>
              Children by Category
            </h3>
            
            {/* Simple Pie Chart */}
            <div style={{ position: 'relative', width: 200, height: 200, margin: '0 auto' }}>
              <svg viewBox="0 0 200 200" style={{ transform: 'rotate(-90deg)' }}>
                {categoryPercentages.map((cat, idx) => {
                  const prevPercentage = categoryPercentages
                    .slice(0, idx)
                    .reduce((sum, c) => sum + c.percentage, 0)
                  const circumference = 2 * Math.PI * 80
                  const offset = circumference - (cat.percentage / 100) * circumference
                  const rotation = (prevPercentage / 100) * 360

                  return (
                    <circle
                      key={cat.label}
                      cx="100"
                      cy="100"
                      r="80"
                      fill="none"
                      stroke={cat.color}
                      strokeWidth="40"
                      strokeDasharray={circumference}
                      strokeDashoffset={offset}
                      style={{
                        transformOrigin: 'center',
                        transform: `rotate(${rotation}deg)`
                      }}
                    />
                  )
                })}
              </svg>
            </div>

            {/* Legend */}
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {categoryPercentages.map(cat => (
                <div key={cat.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ 
                    width: 12, 
                    height: 12, 
                    borderRadius: 3, 
                    background: cat.color 
                  }} />
                  <span style={{ fontSize: 12, flex: 1 }}>{cat.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>
                    {cat.value} ({cat.percentage.toFixed(0)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Father Status Bar Chart */}
          <div style={{ 
            background: '#fff', 
            borderRadius: 12, 
            padding: 20, 
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
          }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, color: '#111' }}>
              Father Status Distribution
            </h3>
            
            <div style={{ 
              height: 200, 
              display: 'flex', 
              alignItems: 'flex-end', 
              gap: 12,
              padding: '0 10px'
            }}>
              {Object.entries(stats.father_status).map(([status, count]) => {
                const maxCount = Math.max(...Object.values(stats.father_status))
                const heightPercent = maxCount > 0 ? (count / maxCount) * 100 : 0

                return (
                  <div key={status} style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ 
                      fontSize: 11, 
                      fontWeight: 600, 
                      marginBottom: 4,
                      color: '#1a6b4a'
                    }}>
                      {count}
                    </div>
                    <div style={{ 
                      height: `${heightPercent}%`, 
                      minHeight: count > 0 ? 20 : 5,
                      background: 'linear-gradient(to top, #1a6b4a, #22c55e)', 
                      borderRadius: '6px 6px 0 0',
                      transition: 'height 0.3s ease'
                    }} />
                    <div style={{ 
                      fontSize: 10, 
                      color: '#666', 
                      marginTop: 6,
                      wordBreak: 'break-word'
                    }}>
                      {status}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Class Distribution & Gender */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
          gap: 16,
          marginBottom: 24
        }}>
          {/* Class Distribution */}
          <div style={{ 
            background: '#fff', 
            borderRadius: 12, 
            padding: 20, 
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
          }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, color: '#111' }}>
              Children by Class
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {Object.entries(stats.by_class)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 8)
                .map(([className, count]) => {
                  const maxCount = Math.max(...Object.values(stats.by_class))
                  const widthPercent = maxCount > 0 ? (count / maxCount) * 100 : 0

                  return (
                    <div key={className}>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        marginBottom: 4,
                        fontSize: 12
                      }}>
                        <span style={{ fontWeight: 500 }}>{className}</span>
                        <span style={{ fontWeight: 600, color: '#1a6b4a' }}>{count}</span>
                      </div>
                      <div style={{ 
                        width: '100%', 
                        height: 8, 
                        background: '#f0f0f0', 
                        borderRadius: 4,
                        overflow: 'hidden'
                      }}>
                        <div style={{ 
                          width: `${widthPercent}%`, 
                          height: '100%', 
                          background: 'linear-gradient(90deg, #1a6b4a, #22c55e)',
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>

          {/* Gender Distribution */}
          <div style={{ 
            background: '#fff', 
            borderRadius: 12, 
            padding: 20, 
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
          }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, color: '#111' }}>
              Gender Distribution
            </h3>
            
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              gap: 40,
              height: 200
            }}>
              {Object.entries(stats.by_sex).map(([sex, count]) => {
                const total = Object.values(stats.by_sex).reduce((a, b) => a + b, 0)
                const percentage = total > 0 ? (count / total * 100).toFixed(0) : 0

                return (
                  <div key={sex} style={{ textAlign: 'center' }}>
                    <div style={{
                      width: 100,
                      height: 100,
                      borderRadius: '50%',
                      background: sex === 'Female' ? 
                        'linear-gradient(135deg, #ec4899, #f97316)' : 
                        'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      marginBottom: 12
                    }}>
                      <div style={{ fontSize: 28, fontWeight: 700 }}>{count}</div>
                      <div style={{ fontSize: 11, opacity: 0.9 }}>{percentage}%</div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{sex}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
          gap: 12 
        }}>
          <button
            onClick={() => navigate('/children/add')}
            style={{
              background: '#1a6b4a',
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              padding: 16,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            <UserPlus size={24} />
            Add Child
          </button>

          <button
            onClick={() => navigate('/children')}
            style={{
              background: '#fff',
              color: '#111',
              border: '1px solid #e5e5e5',
              borderRadius: 12,
              padding: 16,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: 8
            }}
          >
            <Users size={24} />
            View All
          </button>

          <button
            onClick={() => navigate('/import')}
            style={{
              background: '#fff',
              color: '#111',
              border: '1px solid #e5e5e5',
              borderRadius: 12,
              padding: 16,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: 8
            }}
          >
            <FileText size={24} />
            Import Excel
          </button>

          {isAdmin && (
            <button
              onClick={() => navigate('/admin/users')}
              style={{
                background: '#fff',
                color: '#111',
                border: '1px solid #e5e5e5',
                borderRadius: 12,
                padding: 16,
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600,
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: 8
              }}
            >
              <Settings size={24} />
              Admin
            </button>
          )}
        </div>
      </div>
    </div>
  )
}