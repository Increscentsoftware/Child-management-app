// ============================================================
// SHISHU MANDIR — Core TypeScript Types
// ============================================================

export type Role = 'field_worker' | 'supervisor' | 'admin'
export type FatherStatus = 'Alive' | 'Dead' | 'Abandoned' | 'Unknown'
export type MotherStatus = 'Alive' | 'Dead' | 'Abandoned' | 'Unknown'
export type Sex = 'Male' | 'Female' | 'Other'
export type Category = 'Category I' | 'Category II' | 'Category III' | 'Category IV'

export interface SocialWorker {
  id: string
  full_name: string
  employee_id?: string
  role: Role
  phone?: string
  area_assigned?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Child {
  id: string
  school_id: string
  admission_date?: string
  full_name: string
  date_of_birth?: string
  sex?: Sex
  religion?: string
  mother_tongue?: string
  present_class?: string
  category?: Category
  aadhar_no?: string
  normal_or_special?: string
  photo_url?: string

  // Father
  father_name?: string
  father_age?: string
  father_aadhar?: string
  father_mobile?: string
  father_status: FatherStatus
  father_occupation?: string
  father_earnings?: string
  father_education?: string
  father_habits?: string
  father_health?: string
  father_dv: boolean
  father_extramarital?: boolean
  father_origin?: string

  // Mother
  mother_name?: string
  mother_age?: string
  mother_aadhar?: string
  mother_mobile?: string
  mother_status: MotherStatus
  mother_occupation?: string
  mother_earnings?: string
  mother_education?: string
  mother_habits?: string
  mother_health?: string
  mother_dv?: boolean
  mother_extramarital?: boolean
  mother_origin?: string
  family_planning_op?: boolean

  // Family background
  year_of_marriage?: string
  marriage_type?: string

  // Sibling
  sibling_name?: string
  sibling_age?: string
  sibling_sex?: string
  sibling_education?: string
  sibling_sm_support?: boolean

  // Financial
  avg_income_father?: string
  avg_income_mother?: string
  other_income?: string
  num_dependents?: string
  debts?: string
  savings?: string

  // Living
  area?: string
  house_size?: string
  house_roof?: string
  house_floor?: string
  house_ownership?: string
  rent_per_month?: string
  advance_paid?: string
  vehicles?: string

  // Child health
  height_cm?: string
  weight_kg?: string
  child_health?: string
  meals_per_day?: string
  food_type?: string
  medical_help_from?: string

  // Life skills
  mother_life_skills?: boolean
  father_life_skills?: boolean

  special_remarks?: string
  source_file?: string
  created_by?: string
  created_at: string
  updated_at: string
  last_followup_date?: string
  is_active: boolean

  // Joined
  followups?: AnnualFollowup[]
  change_log?: ChangeLogEntry[]
}

export interface AnnualFollowup {
  id: string
  child_id: string
  year_label: string
  visit_date?: string
  present_class?: string
  child_height?: string
  child_weight?: string
  child_health?: string
  father_status?: string
  father_occupation?: string
  father_earnings?: string
  father_habits?: string
  father_health?: string
  father_dv?: boolean
  mother_status?: string
  mother_occupation?: string
  mother_earnings?: string
  mother_health?: string
  sibling_age?: string
  sibling_education?: string
  rent_per_month?: string
  num_dependents?: string
  debts?: string
  mother_life_skills?: boolean
  father_life_skills?: boolean
  photo_url?: string
  special_remarks?: string
  recorded_by?: string
  recorded_by_name?: string
  verified_by?: string
  created_at: string
  updated_at: string
}

export interface ChangeLogEntry {
  id: string
  child_id: string
  child_name: string
  field_name: string
  old_value?: string
  new_value?: string
  changed_by?: string
  changed_by_name?: string
  followup_id?: string
  followup_year?: string
  changed_at: string
}

export interface SyncQueueItem {
  id: string
  operation: 'INSERT' | 'UPDATE' | 'DELETE'
  table_name: string
  record_id: string
  payload: Record<string, unknown>
  created_at: string
  synced_at?: string
  error?: string
  retry_count: number
}

// Dashboard stats
export interface DashboardStats {
  total: number
  fatherAlive: number
  fatherDeceased: number
  fatherAbandoned: number
  fatherUnknown: number
  dvReported: number
  fatherAlcoholic: number
  followupDue: number
  pendingSync: number
  categoryBreakdown: Record<string, number>
}

// Filter state
export interface ChildFilter {
  search: string
  fatherStatus: string
  dvReported: boolean | null
  category: string
  followupDue: boolean | null
  area: string
}

// Form types for Add/Edit
export type ChildFormData = Omit<Child, 'id' | 'created_at' | 'updated_at' | 'is_active' | 'followups' | 'change_log'>
export type FollowupFormData = Omit<AnnualFollowup, 'id' | 'child_id' | 'created_at' | 'updated_at'>
