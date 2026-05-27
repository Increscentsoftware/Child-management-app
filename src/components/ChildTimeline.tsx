import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { db } from '@/lib/db'
import type { Child, AnnualFollowup, ChangeLogEntry } from '@/types'
import { ArrowLeft, Calendar, User, TrendingUp, TrendingDown, AlertCircle, FileText, Award, BookOpen, Activity, Plus, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface ProgressReport {
  id: string
  child_id: string
  report_type: 'academic' | 'behavioral' | 'achievement' | 'health' | 'other'
  title: string
  description: string
  grade?: string
  subject?: string
  marks_obtained?: number
  total_marks?: number
  rank?: number
  teacher_name: string
  teacher_id?: string
  report_date: string
  academic_year: string
  term?: 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'Half-Yearly' | 'Annual'
  attachments?: string[]
  created_at: string
  updated_at: string
}

interface TimelineEvent {
  id: string
  type: 'admission' | 'followup' | 'change' | 'progress' | 'achievement'
  date: string
  title: string
  description?: string
  metadata?: any
  icon: any
  color: string
  expandable?: boolean
  changes?: ChangeLogEntry[]
  followup?: AnnualFollowup
  progress?: ProgressReport
}

function ImpactBadge({ level }: { level: 'critical' | 'high' | 'medium' | 'low' }) {
  const config = {
    critical: { bg: '#fcebeb', color: '#a32d2d', label: '🔴 Critical' },
    high: { bg: '#faeeda', color: '#854f0b', label: '🟠 High Impact' },
    medium: { bg: '#e6f1fb', color: '#185fa5', label: '🟡 Medium' },
    low: { bg: '#eaf3de', color: '#3b6d11', label: '🟢 Low' }
  }
  const c = config[level]
  return (
    <span style={{
      fontSize: 9,
      padding: '2px 8px',
      borderRadius: 10,
      background: c.bg,
      color: c.color,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.03em'
    }}>
      {c.label}
    </span>
  )
}

function TimelineCard({ event, expanded, onToggle }: { 
  event: TimelineEvent
  expanded: boolean
  onToggle: () => void 
}) {
  const Icon = event.icon

  return (
    <div style={{
      background: '#fff',
      borderRadius: 12,
      border: '1px solid #e5e5e5',
      marginBottom: 12,
      overflow: 'hidden'
    }}>
      {/* Card Header */}
      <div 
        onClick={event.expandable ? onToggle : undefined}
        style={{
          padding: '12px 14px',
          cursor: event.expandable ? 'pointer' : 'default',
          borderBottom: expanded ? '1px solid #f0f0f0' : 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          {/* Icon */}
          <div style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: event.color + '20',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Icon size={18} color={event.color} />
          </div>

          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>
                {event.title}
              </div>
              {event.expandable && (
                <div style={{ marginLeft: 8, color: '#999' }}>
                  {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              )}
            </div>

            <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>
              <Calendar size={10} style={{ display: 'inline', marginRight: 4 }} />
              {new Date(event.date).toLocaleDateString('en-IN', { 
                day: 'numeric', 
                month: 'short', 
                year: 'numeric',
                weekday: 'short'
              })}
              {event.metadata?.recordedBy && (
                <>
                  <User size={10} style={{ display: 'inline', marginLeft: 8, marginRight: 4 }} />
                  {event.metadata.recordedBy}
                </>
              )}
            </div>

            {!expanded && event.description && (
              <div style={{ 
                fontSize: 12, 
                color: '#666', 
                marginTop: 6,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical'
              }}>
                {event.description}
              </div>
            )}

            {/* Impact badges for changes */}
            {!expanded && event.changes && event.changes.length > 0 && (
              <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10, color: '#888' }}>
                  {event.changes.length} change{event.changes.length > 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div style={{ padding: '14px', background: '#f9f9f9' }}>
          {/* Full Description */}
          {event.description && (
            <div style={{
              fontSize: 13,
              color: '#444',
              lineHeight: 1.6,
              marginBottom: 14,
              padding: '10px 12px',
              background: '#fff',
              borderRadius: 8,
              border: '1px solid #e5e5e5'
            }}>
              {event.description}
            </div>
          )}

          {/* Follow-up Details */}
          {event.followup && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 8, textTransform: 'uppercase' }}>
                Follow-up Summary
              </div>
              <div style={{ background: '#fff', borderRadius: 8, padding: '10px 12px', border: '1px solid #e5e5e5' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
                  {event.followup.present_class && (
                    <div>
                      <span style={{ color: '#888' }}>Class:</span>{' '}
                      <span style={{ fontWeight: 600 }}>{event.followup.present_class}</span>
                    </div>
                  )}
                  {event.followup.father_status && (
                    <div>
                      <span style={{ color: '#888' }}>Father Status:</span>{' '}
                      <span style={{ fontWeight: 600 }}>{event.followup.father_status}</span>
                    </div>
                  )}
                  {event.followup.father_earnings && (
                    <div>
                      <span style={{ color: '#888' }}>Father Income:</span>{' '}
                      <span style={{ fontWeight: 600 }}>{event.followup.father_earnings}</span>
                    </div>
                  )}
                  {event.followup.mother_earnings && (
                    <div>
                      <span style={{ color: '#888' }}>Mother Income:</span>{' '}
                      <span style={{ fontWeight: 600 }}>{event.followup.mother_earnings}</span>
                    </div>
                  )}
                  {event.followup.child_height && (
                    <div>
                      <span style={{ color: '#888' }}>Height:</span>{' '}
                      <span style={{ fontWeight: 600 }}>{event.followup.child_height} cm</span>
                    </div>
                  )}
                  {event.followup.child_weight && (
                    <div>
                      <span style={{ color: '#888' }}>Weight:</span>{' '}
                      <span style={{ fontWeight: 600 }}>{event.followup.child_weight} kg</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Progress Report Details */}
          {event.progress && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 8, textTransform: 'uppercase' }}>
                Performance Details
              </div>
              <div style={{ background: '#fff', borderRadius: 8, padding: '10px 12px', border: '1px solid #e5e5e5' }}>
                {event.progress.subject && (
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ fontSize: 11, color: '#888' }}>Subject:</span>{' '}
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{event.progress.subject}</span>
                  </div>
                )}
                {event.progress.marks_obtained !== undefined && (
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ fontSize: 11, color: '#888' }}>Score:</span>{' '}
                    <span style={{ fontSize: 16, fontWeight: 700, color: '#1a6b4a' }}>
                      {event.progress.marks_obtained}/{event.progress.total_marks}
                    </span>
                    {event.progress.total_marks && (
                      <span style={{ fontSize: 11, color: '#888', marginLeft: 6 }}>
                        ({((event.progress.marks_obtained / event.progress.total_marks) * 100).toFixed(1)}%)
                      </span>
                    )}
                  </div>
                )}
                {event.progress.grade && (
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ fontSize: 11, color: '#888' }}>Grade:</span>{' '}
                    <span style={{ 
                      fontSize: 14, 
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 6,
                      background: event.progress.grade === 'A+' || event.progress.grade === 'A' ? '#eaf3de' : 
                                  event.progress.grade === 'B' ? '#e6f1fb' : '#faeeda',
                      color: event.progress.grade === 'A+' || event.progress.grade === 'A' ? '#3b6d11' : 
                             event.progress.grade === 'B' ? '#185fa5' : '#854f0b'
                    }}>
                      {event.progress.grade}
                    </span>
                  </div>
                )}
                {event.progress.rank && (
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ fontSize: 11, color: '#888' }}>Class Rank:</span>{' '}
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#1a6b4a' }}>
                      #{event.progress.rank}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Detailed Changes */}
          {event.changes && event.changes.length > 0 && (
            <div>
              <div style={{ 
                fontSize: 11, 
                fontWeight: 600, 
                color: '#888', 
                marginBottom: 8, 
                textTransform: 'uppercase',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>Field Changes ({event.changes.length})</span>
                {event.changes.some(c => isHighImpact(c.field_name)) && (
                  <ImpactBadge level={getImpactLevel(event.changes)} />
                )}
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {event.changes.map(change => (
                  <div 
                    key={change.id} 
                    style={{
                      background: '#fff',
                      border: '1px solid #e5e5e5',
                      borderRadius: 8,
                      padding: '10px 12px',
                      borderLeft: `3px solid ${getChangeColor(change.field_name)}`
                    }}
                  >
                    <div style={{ 
                      fontSize: 12, 
                      fontWeight: 600, 
                      color: '#111', 
                      marginBottom: 6,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span>{change.field_name}</span>
                      {isHighImpact(change.field_name) && (
                        <span style={{ fontSize: 9, color: '#e24b4a' }}>⚠ High Impact</span>
                      )}
                    </div>
                    
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 12,
                      padding: '6px 10px',
                      background: '#f9f9f9',
                      borderRadius: 6
                    }}>
                      <div style={{ 
                        flex: 1,
                        color: '#a32d2d',
                        textDecoration: 'line-through',
                        fontWeight: 500
                      }}>
                        {change.old_value || '—'}
                      </div>
                      
                      <TrendingUp size={14} color="#888" />
                      
                      <div style={{ 
                        flex: 1,
                        color: '#3b6d11',
                        fontWeight: 600
                      }}>
                        {change.new_value}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Helper functions
function isHighImpact(fieldName: string): boolean {
  const highImpactFields = [
    'father_status', 'mother_status', 'father_dv', 'mother_dv',
    'father_health', 'mother_health', 'child_health',
    'category', 'present_class'
  ]
  return highImpactFields.some(f => fieldName.toLowerCase().includes(f.toLowerCase()))
}

function getImpactLevel(changes: ChangeLogEntry[]): 'critical' | 'high' | 'medium' | 'low' {
  const criticalFields = ['father_status', 'mother_status', 'father_dv', 'mother_dv']
  const highFields = ['father_health', 'mother_health', 'child_health', 'category']
  
  if (changes.some(c => criticalFields.some(f => c.field_name.toLowerCase().includes(f)))) {
    return 'critical'
  }
  if (changes.some(c => highFields.some(f => c.field_name.toLowerCase().includes(f)))) {
    return 'high'
  }
  if (changes.length > 5) return 'medium'
  return 'low'
}

function getChangeColor(fieldName: string): string {
  if (fieldName.toLowerCase().includes('status')) return '#e24b4a'
  if (fieldName.toLowerCase().includes('dv') || fieldName.toLowerCase().includes('violence')) return '#e24b4a'
  if (fieldName.toLowerCase().includes('health')) return '#ef9f27'
  if (fieldName.toLowerCase().includes('income') || fieldName.toLowerCase().includes('earnings')) return '#1a6b4a'
  if (fieldName.toLowerCase().includes('class')) return '#185fa5'
  return '#888'
}

export default function TimelinePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [child, setChild] = useState<Child | null>(null)
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<'all' | 'followups' | 'changes' | 'progress'>('all')

  useEffect(() => {
    if (!id) return
    loadTimeline()
  }, [id])

  const loadTimeline = async () => {
    if (!id) return
    
    try {
      // Load child
      const childData = await db.children.get(id)
      if (!childData) return
      setChild(childData)

      // Load follow-ups
      const followups = await db.followups.where('child_id').equals(id).sortBy('visit_date')
      
      // Load change log
      const changes = await db.change_log.where('child_id').equals(id).sortBy('changed_at')
      
      // Load progress reports from Supabase
      const { data: progressReports } = await supabase
        .from('progress_reports')
        .select('*')
        .eq('child_id', id)
        .order('report_date', { ascending: false })

      // Build timeline events
      const timelineEvents: TimelineEvent[] = []

      // Add admission event
      if (childData.admission_date) {
        timelineEvents.push({
          id: 'admission',
          type: 'admission',
          date: childData.admission_date,
          title: '🎓 Child Admitted to Shishu Mandir',
          description: `${childData.full_name} joined the program. Category: ${childData.category}. Class: ${childData.present_class}.`,
          icon: BookOpen,
          color: '#1a6b4a',
          expandable: false
        })
      }

      // Group changes by follow-up
      const changesByFollowup = changes.reduce((acc, change) => {
        const key = change.followup_id || 'standalone'
        if (!acc[key]) acc[key] = []
        acc[key].push(change)
        return acc
      }, {} as Record<string, ChangeLogEntry[]>)

      // Add follow-up events with their changes
      followups.forEach(fu => {
        const fuChanges = changesByFollowup[fu.id] || []
        timelineEvents.push({
          id: `followup-${fu.id}`,
          type: 'followup',
          date: fu.visit_date || fu.created_at || new Date().toISOString(),
          title: `📋 Annual Follow-up: ${fu.year_label}`,
          description: fu.special_remarks || 'Annual follow-up conducted. Family situation and child progress reviewed.',
          metadata: {
            recordedBy: fu.recorded_by_name
          },
          icon: FileText,
          color: '#185fa5',
          expandable: true,
          changes: fuChanges,
          followup: fu
        })
      })

      // Add standalone changes (not part of follow-ups)
      const standaloneChanges = changesByFollowup['standalone'] || []
      if (standaloneChanges.length > 0) {
        // Group by date
        const changesByDate = standaloneChanges.reduce((acc, change) => {
          const date = change.changed_at.slice(0, 10)
          if (!acc[date]) acc[date] = []
          acc[date].push(change)
          return acc
        }, {} as Record<string, ChangeLogEntry[]>)

        Object.entries(changesByDate).forEach(([date, dateChanges]) => {
          timelineEvents.push({
            id: `changes-${date}`,
            type: 'change',
            date: date,
            title: '✏️ Record Updated',
            description: `${dateChanges.length} field${dateChanges.length > 1 ? 's' : ''} updated in child record.`,
            metadata: {
              recordedBy: dateChanges[0].changed_by_name
            },
            icon: Activity,
            color: '#ef9f27',
            expandable: true,
            changes: dateChanges
          })
        })
      }

      // Add progress reports
      if (progressReports && progressReports.length > 0) {
        progressReports.forEach((report: any) => {
          const icons = {
            academic: BookOpen,
            behavioral: Activity,
            achievement: Award,
            health: Activity,
            other: FileText
          }
          
          const colors = {
            academic: '#185fa5',
            behavioral: '#ef9f27',
            achievement: '#f59e0b',
            health: '#dc2626',
            other: '#888'
          }

          const typeLabels = {
            academic: '📚 Academic Report',
            behavioral: '👤 Behavioral Assessment',
            achievement: '🏆 Achievement',
            health: '🏥 Health Update',
            other: '📝 Progress Update'
          }

          timelineEvents.push({
            id: `progress-${report.id}`,
            type: 'progress',
            date: report.report_date,
            title: typeLabels[report.report_type as keyof typeof typeLabels] || report.title,
            description: report.description,
            metadata: {
              recordedBy: report.teacher_name
            },
            icon: icons[report.report_type as keyof typeof icons] || FileText,
            color: colors[report.report_type as keyof typeof colors] || '#888',
            expandable: true,
            progress: report
          })
        })
      }

      // Sort by date (newest first)
      timelineEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

      setEvents(timelineEvents)
    } catch (error) {
      console.error('Error loading timeline:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleExpand = (eventId: string) => {
    setExpandedEvents(prev => {
      const next = new Set(prev)
      if (next.has(eventId)) {
        next.delete(eventId)
      } else {
        next.add(eventId)
      }
      return next
    })
  }

  const filteredEvents = events.filter(e => {
    if (filter === 'all') return true
    if (filter === 'followups') return e.type === 'followup'
    if (filter === 'changes') return e.type === 'change'
    if (filter === 'progress') return e.type === 'progress'
    return true
  })

  if (loading) {
    return (
      <div style={{ 
        fontFamily: "'DM Sans', sans-serif",
        padding: 24,
        textAlign: 'center',
        color: '#888'
      }}>
        Loading timeline...
      </div>
    )
  }

  if (!child) {
    return (
      <div style={{ 
        fontFamily: "'DM Sans', sans-serif",
        padding: 24,
        textAlign: 'center',
        color: '#888'
      }}>
        Child not found
      </div>
    )
  }

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", minHeight: '100vh', background: '#f5f5f5' }}>
      {/* Header */}
      <div style={{
        background: '#1a6b4a',
        color: '#fff',
        padding: '14px',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <button
            onClick={() => navigate(`/children/${id}`)}
            style={{
              background: 'none',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              padding: 2,
              display: 'flex'
            }}
          >
            <ArrowLeft size={20} />
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 16 }}>{child.full_name}</div>
            <div style={{ fontSize: 11, opacity: 0.9 }}>Complete Timeline</div>
          </div>
          <button
            onClick={() => navigate(`/children/${id}/progress/add`)}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: '#fff',
              padding: '6px 12px',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <Plus size={14} /> Progress
          </button>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
          {[
            { id: 'all', label: 'All Events', count: events.length },
            { id: 'followups', label: 'Follow-ups', count: events.filter(e => e.type === 'followup').length },
            { id: 'progress', label: 'Progress', count: events.filter(e => e.type === 'progress').length },
            { id: 'changes', label: 'Changes', count: events.filter(e => e.type === 'change').length }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as any)}
              style={{
                whiteSpace: 'nowrap',
                padding: '5px 12px',
                borderRadius: 20,
                fontSize: 11,
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                background: filter === f.id ? '#fff' : 'rgba(255,255,255,0.2)',
                color: filter === f.id ? '#1a6b4a' : '#fff',
                fontWeight: filter === f.id ? 600 : 400
              }}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div style={{ padding: '14px 14px 100px' }}>
        {filteredEvents.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: '#999'
          }}>
            <Calendar size={48} color="#ddd" style={{ margin: '0 auto 12px', display: 'block' }} />
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>No events yet</div>
            <div style={{ fontSize: 12 }}>Timeline will show follow-ups, changes, and progress reports</div>
          </div>
        ) : (
          <div>
            {filteredEvents.map(event => (
              <TimelineCard
                key={event.id}
                event={event}
                expanded={expandedEvents.has(event.id)}
                onToggle={() => toggleExpand(event.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}