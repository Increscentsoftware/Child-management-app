import { supabase } from './supabase'
import type { AdmissionTrend, ClassPerformance, SiblingEducationStats } from '@/types/analytics'

export async function getAdmissionTrends(): Promise<AdmissionTrend[]> {
  const { data, error } = await supabase.rpc('get_admission_trends')
  if (error) {
    console.error('Failed to fetch admission trends:', error)
    return []
  }
  return data || []
}

export async function getClassDistribution(): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('children')
    .select('present_class')
    .eq('is_active', true)

  if (error) return {}

  const distribution: Record<string, number> = {}
  data.forEach(child => {
    const cls = child.present_class || 'Unknown'
    distribution[cls] = (distribution[cls] || 0) + 1
  })

  return distribution
}

export async function getGiftsSummary(year?: number) {
  let query = supabase
    .from('gifts_assistance')
    .select('*')

  if (year) {
    query = query
      .gte('given_date', `${year}-01-01`)
      .lte('given_date', `${year}-12-31`)
  }

  const { data, error } = await query

  if (error) {
    return {
      total_gifts: 0,
      total_value: 0,
      by_type: {},
      by_year: {},
      recent_gifts: []
    }
  }

  const byType: Record<string, number> = {}
  const byYear: Record<string, number> = {}
  let totalValue = 0

  data.forEach(gift => {
    byType[gift.gift_type] = (byType[gift.gift_type] || 0) + 1
    const yr = new Date(gift.given_date).getFullYear()
    byYear[yr] = (byYear[yr] || 0) + 1
    totalValue += gift.value_amount || 0
  })

  return {
    total_gifts: data.length,
    total_value: totalValue,
    by_type: byType,
    by_year: byYear,
    recent_gifts: data.slice(0, 10)
  }
}

export async function getParentStatusBreakdown() {
  const { data, error } = await supabase
    .from('children')
    .select('father_status, mother_status')
    .eq('is_active', true)

  if (error) return { singleParent: 0, bothParentsAlive: 0, orphan: 0, fatherDeceased: 0, motherDeceased: 0 }

  let singleParent = 0
  let bothParentsAlive = 0
  let orphan = 0
  let fatherDeceased = 0
  let motherDeceased = 0

  data.forEach(child => {
    const fAlive = child.father_status === 'Alive'
    const mAlive = child.mother_status === 'Alive'

    if (fAlive && mAlive) bothParentsAlive++
    if (!fAlive && !mAlive) orphan++
    if (!fAlive && mAlive) singleParent++
    if (fAlive && !mAlive) singleParent++
    if (child.father_status === 'Dead') fatherDeceased++
    if (child.mother_status === 'Dead') motherDeceased++
  })

  return { singleParent, bothParentsAlive, orphan, fatherDeceased, motherDeceased }
}

export async function getYearlyAdmissions(): Promise<Record<number, number>> {
  const { data, error } = await supabase
    .from('children')
    .select('admission_date')
    .eq('is_active', true)
    .not('admission_date', 'is', null)

  if (error) return {}

  const byYear: Record<number, number> = {}
  data.forEach(child => {
    const year = new Date(child.admission_date).getFullYear()
    if (!isNaN(year)) {
      byYear[year] = (byYear[year] || 0) + 1
    }
  })

  return byYear
}

export async function performAdvancedSearch(filters: any) {
  let query = supabase
    .from('children')
    .select('*')
    .eq('is_active', true)

  // Apply filters dynamically
  if (filters.sex) query = query.eq('sex', filters.sex)
  if (filters.class?.length) query = query.in('present_class', filters.class)
  if (filters.fatherStatus?.length) query = query.in('father_status', filters.fatherStatus)
  if (filters.motherStatus?.length) query = query.in('mother_status', filters.motherStatus)
  if (filters.area?.length) query = query.in('area', filters.area)
  if (filters.domesticViolence) query = query.eq('father_dv', true)
  if (filters.bothParentsAlive) {
    query = query.eq('father_status', 'Alive').eq('mother_status', 'Alive')
  }
  if (filters.orphan) {
    query = query.neq('father_status', 'Alive').neq('mother_status', 'Alive')
  }

  const { data, error, count } = await query

  if (error) {
    console.error('Search failed:', error)
    return { children: [], total: 0, filters_applied: filters, aggregations: {} }
  }

  // Build aggregations
  const byClass: Record<string, number> = {}
  const byArea: Record<string, number> = {}
  const byFatherStatus: Record<string, number> = {}

  data.forEach(c => {
    const cls = c.present_class || 'Unknown'
    const area = c.area || 'Unknown'
    const fs = c.father_status || 'Unknown'

    byClass[cls] = (byClass[cls] || 0) + 1
    byArea[area] = (byArea[area] || 0) + 1
    byFatherStatus[fs] = (byFatherStatus[fs] || 0) + 1
  })

  return {
    children: data,
    total: count || data.length,
    filters_applied: filters,
    aggregations: {
      by_class: byClass,
      by_area: byArea,
      by_father_status: byFatherStatus
    }
  }
}
