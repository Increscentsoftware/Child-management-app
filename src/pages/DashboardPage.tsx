import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/lib/store'
import {
  Users, BookOpen, Trophy, Gift, AlertTriangle, Wine, GraduationCap,
  Menu, X, Search, TrendingUp, Heart, Home, Briefcase, LogOut,
  Settings, FileText, PlusCircle, Upload, Shield
} from 'lucide-react'
import toast from 'react-hot-toast'

interface AnalyticsStats {
  total_children: number
  active_children: number
  past_students: number
  external_students: number
  college_students: number
  
  // Academic
  top_academic_performers: any[]
  
  // Sports
  top_sports_performers: any[]
  
  // Gifts
  children_received_gifts: number
  children_no_gifts: number
  
  // Health & Nutrition
  avg_height: number
  avg_weight: number
  underweight_count: number
  malnourished_count: number
  
  // Education
  by_class: Record<string, number>
  by_education: Record<string, number>
  
  // Parental
  father_alive: number
  father_deceased: number
  father_abandoned: number
  mother_alive: number
  working_parents: number
  
  // Family
  single_parent: number
  both_parents_alive: number
  
  // Category
  by_category: Record<string, number>
  
  // DV Cases
  dv_cases: number
  
  // Life Skills
  life_skills_trained: number
  
  // Financial
  avg_income: number
  families_in_debt: number
  
  // Special Needs
  special_needs_count: number
}

// Stat Card Component
function MetricCard({ 
  title, 
  value, 
  subtitle,
  icon: Icon, 
  color, 
  bgColor 
}: any) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: '14px',
      padding: '18px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      border: '1px solid #f0f0f0',
      transition: 'all 0.3s ease'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.12)'
      e.currentTarget.style.transform = 'translateY(-4px)'
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'
      e.currentTarget.style.transform = 'translateY(0)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{
          width: 44,
          height: 44,
          borderRadius: '10px',
          background: bgColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Icon size={22} color={color} />
        </div>
      </div>
      <div style={{ fontSize: 11, color: '#666', marginTop: 12, marginBottom: 4, fontWeight: 500 }}>
        {title}
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color: '#111', marginBottom: 4 }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      {subtitle && (
        <div style={{ fontSize: 11, color: '#999' }}>{subtitle}</div>
      )}
    </div>
  )
}

// Progress Bar Component
function ProgressMetric({ label, value, total, color }: any) {
  const percentage = (value / total) * 100
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: '#666', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#111' }}>{value} ({Math.round(percentage)}%)</span>
      </div>
      <div style={{
        height: 8,
        background: '#f0f0f0',
        borderRadius: 4,
        overflow: 'hidden'
      }}>
        <div style={{
          height: '100%',
          width: `${percentage}%`,
          background: color,
          transition: 'width 0.5s ease'
        }} />
      </div>
    </div>
  )
}

// Top Performers Component
function TopPerformers({ title, performers, color, icon: Icon }: any) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: '14px',
      padding: '20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      border: '1px solid #f0f0f0'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <div style={{ width: 32, height: 32, borderRadius: '8px', background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={18} color={color} />
        </div>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: '#111', margin: 0 }}>{title}</h3>
      </div>
      {performers && performers.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {performers.slice(0, 5).map((performer: any, idx: number) => (
            <div key={idx} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              paddingBottom: 10,
              borderBottom: idx < Math.min(4, performers.length - 1) ? '1px solid #f0f0f0' : 'none'
            }}>
              <div style={{
                width: 28,
                height: 28,
                borderRadius: '6px',
                background: color,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 700
              }}>
                #{idx + 1}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#111' }}>{performer.name}</div>
                <div style={{ fontSize: 11, color: '#999' }}>{performer.subtitle}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 12, color: '#999', textAlign: 'center', padding: '20px 0' }}>
          No data yet
        </div>
      )}
    </div>
  )
}

export default function AnalyticsDashboard() {
  const navigate = useNavigate()
  const { user, logout } = useAppStore()
  const [stats, setStats] = useState<AnalyticsStats>({
    total_children: 0,
    active_children: 0,
    past_students: 0,
    external_students: 0,
    college_students: 0,
    top_academic_performers: [],
    top_sports_performers: [],
    children_received_gifts: 0,
    children_no_gifts: 0,
    avg_height: 0,
    avg_weight: 0,
    underweight_count: 0,
    malnourished_count: 0,
    by_class: {},
    by_education: {},
    father_alive: 0,
    father_deceased: 0,
    father_abandoned: 0,
    mother_alive: 0,
    working_parents: 0,
    single_parent: 0,
    both_parents_alive: 0,
    by_category: {},
    dv_cases: 0,
    life_skills_trained: 0,
    avg_income: 0,
    families_in_debt: 0,
    special_needs_count: 0
  })
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    loadAnalytics()
  }, [user])

  const loadAnalytics = async () => {
    try {
      const { data: children, error } = await supabase
        .from('children')
        .select('*')

      if (error) throw error

      const total = children?.length || 0
      const active = children?.filter(c => c.is_active)?.length || 0

      let pastStudents = 0, externalStudents = 0, collegeStudents = 0
      let totalHeight = 0, totalWeight = 0
      let underweight = 0, malnourished = 0, heightCount = 0, weightCount = 0
      let fatherAlive = 0, fatherDeceased = 0, fatherAbandoned = 0
      let motherAlive = 0, workingParents = 0, singleParent = 0, bothParents = 0
      let dvCases = 0, lifeSkills = 0, totalIncome = 0, inDebt = 0, specialNeeds = 0

      const byClass: Record<string, number> = {}
      const byCategory: Record<string, number> = {}
      const byEducation: Record<string, number> = {}

      children?.forEach((c: any) => {
        // Student status — check child_type, lifecycle_status, and imported data_json
        const ct = String(c.child_type || '')
        const ls = String(c.lifecycle_status || '').toLowerCase()
        const ds = String(c.data_json?.student_status || '')
        if (ct === 'alumni' || ls.includes('past') || ds.toLowerCase().includes('past')) pastStudents++
        if (ct === 'sponsored_external' || ds.toLowerCase() === 'external') externalStudents++
        if (ls.includes('college') || ds.toLowerCase() === 'college') collegeStudents++

        // Health — fields stored as strings, must parse
        const h = parseFloat(c.height_cm || '0')
        const w = parseFloat(c.weight_kg || '0')
        if (h > 0) { totalHeight += h; heightCount++ }
        if (w > 0) { totalWeight += w; weightCount++ }
        if (h > 0 && w > 0) {
          const bmi = w / ((h / 100) ** 2)
          if (bmi < 18.5) underweight++
        }
        if (w > 0 && w < 30) malnourished++

        // Parents
        if (c.father_status === 'Alive') fatherAlive++
        else if (c.father_status === 'Dead') fatherDeceased++
        else if (c.father_status === 'Abandoned') fatherAbandoned++
        if (c.mother_status === 'Alive') motherAlive++
        if ((c.father_occupation && c.father_occupation !== 'Unemployed') ||
            (c.mother_occupation && c.mother_occupation !== 'Unemployed')) workingParents++
        if (c.father_status !== 'Alive' || c.mother_status !== 'Alive') singleParent++
        if (c.father_status === 'Alive' && c.mother_status === 'Alive') bothParents++

        // DV & life skills
        if (c.father_dv || c.mother_dv) dvCases++
        if (c.mother_life_skills || c.father_life_skills) lifeSkills++

        // Financial — prefer follow-up earnings, fall back to admission avg
        const fi = parseFloat(c.father_earnings || c.avg_income_father || '0')
        const mi = parseFloat(c.mother_earnings || c.avg_income_mother || '0')
        totalIncome += fi + mi
        if (c.debts && String(c.debts).trim() !== '') inDebt++

        if (c.normal_or_special === 'Special') specialNeeds++

        if (c.present_class) byClass[c.present_class] = (byClass[c.present_class] || 0) + 1
        if (c.category) byCategory[c.category] = (byCategory[c.category] || 0) + 1
        if (c.father_education) byEducation[c.father_education] = (byEducation[c.father_education] || 0) + 1
      })

      // Top academics: active children sorted by highest class
      const classLevel = (cls: string): number => {
        const m = cls.match(/(\d+)/)
        return m ? parseInt(m[1]) : (cls.toLowerCase().includes('prep') ? 0 : -1)
      }
      const topAcademic = [...(children || [])]
        .filter(c => c.present_class && c.is_active)
        .sort((a, b) => classLevel(b.present_class) - classLevel(a.present_class))
        .slice(0, 5)
        .map(c => ({ name: c.full_name, subtitle: `${c.present_class} · ID: ${c.school_id}` }))

      setStats({
        total_children: total,
        active_children: active,
        past_students: pastStudents,
        external_students: externalStudents,
        college_students: collegeStudents,
        top_academic_performers: topAcademic,
        top_sports_performers: [],
        children_received_gifts: 0,
        children_no_gifts: 0,
        avg_height: heightCount > 0 ? totalHeight / heightCount : 0,
        avg_weight: weightCount > 0 ? totalWeight / weightCount : 0,
        underweight_count: underweight,
        malnourished_count: malnourished,
        by_class: byClass,
        by_education: byEducation,
        father_alive: fatherAlive,
        father_deceased: fatherDeceased,
        father_abandoned: fatherAbandoned,
        mother_alive: motherAlive,
        working_parents: workingParents,
        single_parent: singleParent,
        both_parents_alive: bothParents,
        by_category: byCategory,
        dv_cases: dvCases,
        life_skills_trained: lifeSkills,
        avg_income: total > 0 ? totalIncome / total : 0,
        families_in_debt: inDebt,
        special_needs_count: specialNeeds
      })
    } catch (error) {
      console.error('Error loading analytics:', error)
      toast.error('Failed to load analytics')
    } finally {
      setLoading(false)
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

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", minHeight: '100vh', background: '#f8f9fc' }}>
      {/* Header */}
      <div style={{ 
        background: 'linear-gradient(135deg, #1a6b4a 0%, #0f5a3f 100%)',
        color: '#fff', 
        padding: '20px 24px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, marginBottom: 4 }}>
              📊 Shishu Mandir Analytics Dashboard
            </h1>
            <p style={{ fontSize: 13, opacity: 0.9, margin: 0 }}>
              Comprehensive insights on every child's journey
            </p>
          </div>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: '#fff',
              padding: '10px 12px',
              borderRadius: 8,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Menu */}
      {menuOpen && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50 }} onClick={() => setMenuOpen(false)} />
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
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 0
          }}>
            {/* User profile */}
            <div style={{ padding: '4px 0 20px', borderBottom: '1px solid #f0f0f0', marginBottom: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#e1f5ee', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                <Users size={22} color="#1a6b4a" />
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>{user?.full_name || 'User'}</div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 2, textTransform: 'capitalize' }}>{user?.role === 'admin' ? 'Administrator' : user?.role?.replace('_', ' ') || 'Staff'}</div>
            </div>

            {/* Main nav */}
            <nav style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button onClick={() => { navigate('/children'); setMenuOpen(false) }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#f5f5f5', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500, color: '#111', textAlign: 'left', fontFamily: 'inherit' }}>
                <Users size={18} /> View All Children
              </button>
              <button onClick={() => { navigate('/children/add'); setMenuOpen(false) }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#1a6b4a', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#fff', textAlign: 'left', fontFamily: 'inherit' }}>
                <PlusCircle size={18} /> Add New Child
              </button>
              <button onClick={() => { navigate('/import'); setMenuOpen(false) }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#f5f5f5', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500, color: '#111', textAlign: 'left', fontFamily: 'inherit' }}>
                <Upload size={18} /> Import Excel
              </button>

              {/* Admin section */}
              {isAdmin && (
                <>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#999', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '14px 4px 6px' }}>Admin</div>
                  <button onClick={() => { navigate('/admin/users'); setMenuOpen(false) }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#f5f5f5', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500, color: '#111', textAlign: 'left', fontFamily: 'inherit' }}>
                    <Shield size={18} /> User Management
                  </button>
                  <button onClick={() => { navigate('/admin/form-fields'); setMenuOpen(false) }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#f5f5f5', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500, color: '#111', textAlign: 'left', fontFamily: 'inherit' }}>
                    <Settings size={18} /> Form Fields
                  </button>
                </>
              )}

              <div style={{ borderTop: '1px solid #f0f0f0', marginTop: 8, paddingTop: 8 }}>
                <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#fee2e2', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500, color: '#dc2626', textAlign: 'left', fontFamily: 'inherit', width: '100%' }}>
                  <LogOut size={18} /> Logout
                </button>
              </div>
            </nav>
          </div>
        </>
      )}

      {/* Content */}
      <div style={{ padding: '24px 16px 100px' }}>
        {/* Overview Metrics */}
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#111', marginBottom: 14, marginTop: 0 }}>📈 Overview</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
            <MetricCard title="Total Children" value={stats.total_children} icon={Users} color="#1a6b4a" bgColor="#e1f5ee" />
            <MetricCard title="Active Students" value={stats.active_children} icon={GraduationCap} color="#0891b2" bgColor="#e0f2fe" />
            <MetricCard title="Past Students" value={stats.past_students} icon={BookOpen} color="#7c3aed" bgColor="#f3e8ff" />
            <MetricCard title="College Bound" value={stats.college_students} icon={Trophy} color="#dc2626" bgColor="#fee2e2" />
            <MetricCard title="External Students" value={stats.external_students} icon={Home} color="#ea580c" bgColor="#fed7aa" />
            <MetricCard title="Special Needs" value={stats.special_needs_count} icon={Heart} color="#ec4899" bgColor="#ffe0f0" />
          </div>
        </div>

        {/* Academics */}
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#111', marginBottom: 14, marginTop: 0 }}>🎓 Academics</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <div style={{ background: '#fff', borderRadius: '14px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid #f0f0f0' }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14, marginTop: 0, color: '#111' }}>Class Distribution</h3>
              {Object.entries(stats.by_class).length > 0
                ? Object.entries(stats.by_class)
                    .sort((a, b) => {
                      const n = (s: string) => { const m = s.match(/(\d+)/); return m ? parseInt(m[1]) : 0 }
                      return n(b[0]) - n(a[0])
                    })
                    .slice(0, 6)
                    .map(([cls, count]: any) => (
                      <ProgressMetric key={cls} label={cls} value={count} total={stats.total_children} color="#1a6b4a" />
                    ))
                : <div style={{ fontSize: 12, color: '#999', padding: '12px 0' }}>No class data yet</div>
              }
            </div>
            <TopPerformers title="🏆 Top Class (Senior-most Active)" performers={stats.top_academic_performers} color="#1a6b4a" icon={Trophy} />
          </div>
        </div>

        {/* Health & Wellness */}
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#111', marginBottom: 14, marginTop: 0 }}>🏥 Health & Nutrition</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <MetricCard title="Avg Height" value={`${stats.avg_height.toFixed(1)} cm`} icon={Users} color="#3b82f6" bgColor="#eff6ff" />
            <MetricCard title="Avg Weight" value={`${stats.avg_weight.toFixed(1)} kg`} icon={Heart} color="#ef4444" bgColor="#fee2e2" />
            <MetricCard title="Underweight" value={stats.underweight_count} subtitle={`${((stats.underweight_count / stats.total_children) * 100).toFixed(1)}% of total`} icon={AlertTriangle} color="#ea580c" bgColor="#fed7aa" />
            <MetricCard title="Malnourished" value={stats.malnourished_count} subtitle={`Need attention`} icon={Heart} color="#dc2626" bgColor="#fee2e2" />

          </div>
        </div>

        {/* Family Status */}
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#111', marginBottom: 14, marginTop: 0 }}>👨‍👩‍👧‍👦 Family Status</h2>
          <div style={{ background: '#fff', borderRadius: '14px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid #f0f0f0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
              <div>
                <ProgressMetric label="Both Parents Alive" value={stats.both_parents_alive} total={stats.total_children} color="#10b981" />
                <ProgressMetric label="Single Parent" value={stats.single_parent} total={stats.total_children} color="#f59e0b" />
              </div>
              <div>
                <ProgressMetric label="Father Alive" value={stats.father_alive} total={stats.total_children} color="#3b82f6" />
                <ProgressMetric label="Father Deceased" value={stats.father_deceased} total={stats.total_children} color="#ef4444" />
                <ProgressMetric label="Father Abandoned" value={stats.father_abandoned} total={stats.total_children} color="#8b5cf6" />
              </div>
              <div>
                <ProgressMetric label="Mother Alive" value={stats.mother_alive} total={stats.total_children} color="#ec4899" />
                <ProgressMetric label="Working Parents" value={stats.working_parents} total={stats.total_children} color="#1a6b4a" />
              </div>
            </div>
          </div>
        </div>

        {/* Category & Risk */}
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#111', marginBottom: 14, marginTop: 0 }}>⚠️ Risk & Category</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <div style={{ background: '#fff', borderRadius: '14px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid #f0f0f0' }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14, margin: 0, color: '#111' }}>Category Distribution</h3>
              {Object.entries(stats.by_category).map(([cat, count]: any) => (
                <ProgressMetric key={cat} label={cat} value={count} total={stats.total_children} color={cat === 'Category I' ? '#dc2626' : cat === 'Category II' ? '#ea580c' : '#10b981'} />
              ))}
            </div>

            <div style={{ background: '#fff', borderRadius: '14px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid #f0f0f0' }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14, margin: 0, color: '#111' }}>Risk Indicators</h3>
              <ProgressMetric label="DV Cases" value={stats.dv_cases} total={stats.total_children} color="#dc2626" />
              <ProgressMetric label="Families in Debt" value={stats.families_in_debt} total={stats.total_children} color="#ea580c" />
              <ProgressMetric label="Life Skills Trained" value={stats.life_skills_trained} total={stats.total_children} color="#10b981" />
            </div>

            <MetricCard title="Avg Family Income" value={`₹${stats.avg_income.toLocaleString()}`} subtitle="Per month" icon={Briefcase} color="#1a6b4a" bgColor="#e1f5ee" />
          </div>
        </div>

        {/* Education Distribution */}
        <div style={{ background: '#fff', borderRadius: '14px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid #f0f0f0' }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#111', marginBottom: 14, marginTop: 0 }}>📚 Education Levels</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 }}>
            {Object.entries(stats.by_education).slice(0, 6).map(([edu, count]: any) => (
              <MetricCard key={edu} title={edu} value={count} icon={BookOpen} color="#3b82f6" bgColor="#eff6ff" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}