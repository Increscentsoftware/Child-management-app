import { Calendar, Gift, TrendingDown, TrendingUp, AlertTriangle, BookOpen } from 'lucide-react'
import type { AnnualFollowup, ChangeLogEntry } from '@/types'

interface TimelineEvent {
  date: string
  type: 'followup' | 'performance' | 'gift' | 'incident' | 'change'
  title: string
  description: string
  icon: React.ReactNode
  color: string
}

interface ChildTimelineProps {
  followups: AnnualFollowup[]
  changelog: ChangeLogEntry[]
  gifts?: any[]
  performance?: any[]
  incidents?: any[]
}

export default function ChildTimeline({
  followups,
  changelog,
  gifts = [],
  performance = [],
  incidents = []
}: ChildTimelineProps) {
  
  const events: TimelineEvent[] = [
    ...followups.map(fu => ({
      date: fu.visit_date || fu.created_at,
      type: 'followup' as const,
      title: `Follow-up: ${fu.year_label}`,
      description: `By ${fu.recorded_by_name || '—'} · ${fu.special_remarks?.slice(0, 60) || 'Annual visit'}`,
      icon: <Calendar size={14} />,
      color: '#1a6b4a'
    })),
    ...changelog.map(c => ({
      date: c.changed_at,
      type: 'change' as const,
      title: `${c.field_name} changed`,
      description: `${c.old_value} → ${c.new_value}`,
      icon: <AlertTriangle size={14} />,
      color: c.field_name.toLowerCase().includes('status') ? '#e24b4a' : '#ef9f27'
    })),
    ...gifts.map(g => ({
      date: g.given_date,
      type: 'gift' as const,
      title: g.gift_type,
      description: g.item_description || `Given by ${g.given_by || '—'}`,
      icon: <Gift size={14} />,
      color: '#5dcaa5'
    })),
    ...performance.map(p => ({
      date: p.created_at,
      type: 'performance' as const,
      title: `${p.term} ${p.academic_year}`,
      description: `${p.overall_percentage}% · ${p.significant_drop ? 'Drop detected' : p.significant_improvement ? 'Improved' : 'Stable'}`,
      icon: p.significant_drop ? <TrendingDown size={14} /> : <TrendingUp size={14} />,
      color: p.significant_drop ? '#e24b4a' : '#3b6d11'
    })),
    ...incidents.map(i => ({
      date: i.event_date,
      type: 'incident' as const,
      title: i.event_type,
      description: i.description || `Impact: ${i.impact_level}`,
      icon: <AlertTriangle size={14} />,
      color: i.impact_level === 'High' ? '#e24b4a' : i.impact_level === 'Medium' ? '#ef9f27' : '#999'
    }))
  ]

  // Sort by date descending
  const sorted = events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  if (sorted.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 30, color: '#999', fontSize: 12 }}>
        <BookOpen size={28} color="#ddd" style={{ margin: '0 auto 8px', display: 'block' }} />
        No timeline events yet
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', paddingLeft: 24 }}>
      {/* Vertical line */}
      <div style={{
        position: 'absolute', left: 8, top: 0, bottom: 0,
        width: 2, background: '#e5e5e5'
      }} />

      {sorted.map((event, i) => (
        <div key={i} style={{ position: 'relative', marginBottom: 14, paddingBottom: 14, borderBottom: i < sorted.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
          {/* Dot */}
          <div style={{
            position: 'absolute', left: -21, top: 2,
            width: 20, height: 20, borderRadius: '50%',
            background: event.color, display: 'flex',
            alignItems: 'center', justifyContent: 'center', color: '#fff'
          }}>
            {event.icon}
          </div>

          {/* Content */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#111', marginBottom: 2 }}>
              {event.title}
            </div>
            <div style={{ fontSize: 11, color: '#666', lineHeight: 1.5 }}>
              {event.description}
            </div>
            <div style={{ fontSize: 10, color: '#999', marginTop: 3 }}>
              {new Date(event.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
