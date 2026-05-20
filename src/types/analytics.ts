// Enhanced types for analytics features

export interface AcademicPerformance {
  id: string
  child_id: string
  academic_year: string
  class_name?: string
  term: 'Term 1' | 'Term 2' | 'Term 3' | 'Annual'
  english_marks?: number
  math_marks?: number
  science_marks?: number
  social_marks?: number
  language_marks?: number
  overall_percentage?: number
  grade?: string
  rank_in_class?: number
  total_students?: number
  attendance_percentage?: number
  behavior_rating?: 'Excellent' | 'Good' | 'Average' | 'Needs Improvement'
  teacher_remarks?: string
  significant_drop: boolean
  significant_improvement: boolean
  needs_attention: boolean
  recorded_by?: string
  created_at: string
  updated_at: string
}

export interface GiftAssistance {
  id: string
  child_id: string
  gift_type: 'Diwali Gift' | 'Birthday Gift' | 'Christmas Gift' | 'Educational Material' |
    'Uniform' | 'Shoes' | 'Books' | 'School Bag' | 'Sports Equipment' |
    'Medical Assistance' | 'Food Support' | 'Financial Aid' | 'Other'
  item_description?: string
  value_amount?: number
  given_date: string
  given_by?: string
  occasion?: string
  remarks?: string
  photo_url?: string
  created_by?: string
  created_at: string
}

export interface LifeEvent {
  id: string
  child_id: string
  event_date: string
  event_type: 'Father Passed Away' | 'Mother Passed Away' | 'Sibling Passed Away' |
    'Parent Divorce' | 'Parent Remarriage' | 'Change of Residence' |
    'Change of School' | 'Health Crisis' | 'Family Crisis' |
    'Violence at Home' | 'Parent Lost Job' | 'Parent Imprisoned' |
    'Other Trauma' | 'Positive Event'
  description?: string
  impact_level: 'High' | 'Medium' | 'Low'
  correlated_with_performance: boolean
  recorded_by?: string
  created_at: string
}

export interface CustomDashboard {
  id: string
  dashboard_name: string
  created_by?: string
  is_default: boolean
  layout_config: DashboardLayoutConfig
  visible_to_roles: string[]
  created_at: string
  updated_at: string
}

export interface DashboardLayoutConfig {
  widgets: DashboardWidget[]
  columns: number
  theme?: string
}

export interface DashboardWidget {
  id: string
  widget_type: WidgetType
  widget_title: string
  config: WidgetConfig
  position_x: number
  position_y: number
  width: number
  height: number
}

export type WidgetType =
  | 'admission_by_year'
  | 'father_status_pie'
  | 'gifts_summary'
  | 'performance_trends'
  | 'dv_statistics'
  | 'sibling_education'
  | 'class_distribution'
  | 'category_breakdown'
  | 'area_wise'
  | 'health_overview'
  | 'financial_status'
  | 'custom_filter'

export interface WidgetConfig {
  chart_type?: 'bar' | 'line' | 'pie' | 'table' | 'stat'
  filters?: Record<string, unknown>
  group_by?: string
  time_range?: string
  comparison?: boolean
}

export interface AnalyticsData {
  admissionTrends: AdmissionTrend[]
  performanceCorrelations: PerformanceCorrelation[]
  classPerformance: ClassPerformance[]
  siblingEducation: SiblingEducationStats
  giftsSummary: GiftsSummary
}

export interface AdmissionTrend {
  year: number
  total: number
  male: number
  female: number
  father_deceased: number
  mother_deceased: number
  both_parents_alive: number
}

export interface PerformanceCorrelation {
  child_id: string
  child_name: string
  school_id: string
  academic_year: string
  overall_percentage: number
  significant_drop: boolean
  event_type?: string
  event_date?: string
  impact_level?: string
  days_between?: number
}

export interface ClassPerformance {
  present_class: string
  total_students: number
  avg_percentage: number
  father_alive_count: number
  father_deceased_count: number
  mother_alive_count: number
}

export interface SiblingEducationStats {
  total_with_siblings: number
  siblings_in_school: number
  siblings_in_college: number
  siblings_not_studying: number
  siblings_sm_supported: number
}

export interface GiftsSummary {
  total_gifts: number
  total_value: number
  by_type: Record<string, number>
  by_year: Record<string, number>
  recent_gifts: GiftAssistance[]
}

// Advanced search/filter interface
export interface AdvancedFilter {
  // Demographics
  sex?: 'Male' | 'Female' | 'Other'
  ageRange?: { min: number; max: number }
  class?: string[]
  category?: string[]
  area?: string[]
  
  // Parent status
  fatherStatus?: string[]
  motherStatus?: string[]
  bothParentsAlive?: boolean
  singleParent?: boolean
  orphan?: boolean
  
  // Family situation
  hasSiblings?: boolean
  siblingsInSchool?: boolean
  domesticViolence?: boolean
  fatherHabits?: string[]
  
  // Performance
  performanceRange?: { min: number; max: number }
  needsAttention?: boolean
  significantDrop?: boolean
  
  // Gifts
  receivedGifts?: boolean
  giftType?: string[]
  giftDateRange?: { from: string; to: string }
  
  // Life events
  hasLifeEvents?: boolean
  eventTypes?: string[]
  
  // Admission
  admissionYearRange?: { from: number; to: number }
}

export interface SearchResult {
  children: Child[]
  total: number
  filters_applied: AdvancedFilter
  aggregations: {
    by_class: Record<string, number>
    by_area: Record<string, number>
    by_father_status: Record<string, number>
    avg_performance?: number
  }
}

// Google Drive integration
export interface GoogleDriveConfig {
  enabled: boolean
  folder_id: string
  auto_backup: boolean
  backup_frequency: 'daily' | 'weekly' | 'monthly'
  last_sync?: string
}

export interface GoogleDriveSyncLog {
  id: string
  sync_type: 'backup' | 'export' | 'import'
  file_id?: string
  file_name?: string
  drive_folder_id?: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  records_count?: number
  error_message?: string
  initiated_by?: string
  created_at: string
  completed_at?: string
}
