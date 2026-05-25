// src/lib/excelImport.ts
// Handles: .xlsx vertical (form format), .xlsx horizontal (list), .docx (SSR format)
// Produces accurate Child + Siblings + AnnualFollowup records

import * as XLSX from 'xlsx'
import type { Child, AnnualFollowup, Sibling, ImportResult, FatherStatus, MotherStatus, Sex, ChildType } from '@/types'

// ── Field alias map ───────────────────────────────────────────
// Every known Excel label → DB field name
const FIELD_ALIASES: Record<string, string> = {
  // Identity
  'school id number': 'school_id', 'school id': 'school_id', 'id number': 'school_id',
  'sl.no': 'school_id', 'serial no': 'school_id', 's.no': 'school_id',
  'adm. no.': 'school_id', 'adm no': 'school_id', 'admission no': 'school_id',
  'reg no': 'school_id', 'registration no': 'school_id',
  'name of the child': 'full_name', 'child name': 'full_name', 'name': 'full_name',
  "child's name": 'full_name', 'student name': 'full_name', 'beneficiary name': 'full_name',
  'date of house visit:': 'admission_date', 'date of house visit': 'admission_date',
  'year of joining shishu mandir': 'admission_date', 'admission date': 'admission_date',
  'joining date': 'admission_date', 'date': 'admission_date',
  'date of birth': 'date_of_birth', 'dob': 'date_of_birth', 'birth date': 'date_of_birth',
  'sex': 'sex', 'gender': 'sex', 'boy/girl': 'sex',
  'class': 'present_class', 'present class': 'present_class', 'current class': 'present_class',
  'standard': 'present_class', 'std': 'present_class',
  'religion': 'religion',
  'mother tongue': 'mother_tongue', 'language': 'mother_tongue',
  'aadhar no. of the child': 'aadhar_no', 'aadhar no': 'aadhar_no', 'aadhar no.': 'aadhar_no',
  'child aadhar': 'aadhar_no', 'aadhaar no': 'aadhar_no', 'uid': 'aadhar_no',
  'normal/ special child': 'normal_or_special', 'normal/special': 'normal_or_special',
  'category': 'category',

  // Father
  'father name': 'father_name', "father's name": 'father_name', 'name of father': 'father_name',
  'dead or abandoned  or alive ': 'father_status', 'dead or abandoned  or alive': 'father_status',
  'dead or abandoned or alive': 'father_status', 'father status': 'father_status',
  "father's status": 'father_status', 'father alive/dead': 'father_status',
  'father age': 'father_age',
  'father aadhar': 'father_aadhar', "father's aadhar": 'father_aadhar',
  'father mobile': 'father_mobile', 'father contact': 'father_mobile',
  'nature of work': 'father_nature_of_work',
  'occupation': 'father_occupation', 'father occupation': 'father_occupation',
  "father's occupation": 'father_occupation',
  'earning': 'father_earnings', 'earnings': 'father_earnings',
  'monthly income': 'father_earnings', 'father earnings': 'father_earnings',
  'father income': 'father_earnings', "father's income": 'father_earnings',
  'education': 'father_education', 'father education': 'father_education',
  'educational qualification': 'father_education',
  'habits ': 'father_habits', 'habits': 'father_habits', 'father habits': 'father_habits',
  'health': 'father_health', 'father health': 'father_health',
  'domestic violence': 'father_dv', 'dv': 'father_dv', 'father dv': 'father_dv',
  'extramarital relationships': 'father_extramarital', 'extra-marital': 'father_extramarital',
  'place of origin': 'father_origin', 'father origin': 'father_origin', 'native place': 'father_origin',

  // Mother
  'mother name': 'mother_name', "mother's name": 'mother_name', 'name of mother': 'mother_name',
  'mother status': 'mother_status', 'mother alive/dead': 'mother_status',
  "mother's status": 'mother_status',
  'mother age': 'mother_age',
  'mother aadhar': 'mother_aadhar',
  'mother mobile': 'mother_mobile', 'mother contact': 'mother_mobile',
  'mother occupation': 'mother_occupation', "mother's occupation": 'mother_occupation',
  'type of work': 'mother_nature_of_work', 'mother nature of work': 'mother_nature_of_work',
  'mother earnings': 'mother_earnings', 'mother income': 'mother_earnings',
  'mother education': 'mother_education',
  'mother habits': 'mother_habits', 'mother health': 'mother_health',
  'mother dv': 'mother_dv',
  'family planning operation done': 'family_planning_op',
  'family planning operation performed': 'family_planning_op',
  'family planning': 'family_planning_op',
  'mother origin': 'mother_origin',

  // Family
  'marital status and year of marriage': 'year_of_marriage',
  'year of marriage': 'year_of_marriage', 'marriage year': 'year_of_marriage',
  'marriage arranged or own choice': 'marriage_type', 'type of marriage': 'marriage_type',

  // Financial
  'average monthly income': 'avg_monthly_income',
  'average monthly income of father': 'avg_monthly_income',
  'average monthly income father': 'avg_monthly_income',
  'average monthly income mother': 'avg_monthly_income',
  'avg. monthly income': 'avg_monthly_income',
  'support from government, church, ngo': 'govt_support', 'support from government': 'govt_support',
  'number of dependents (including spouse)': 'num_dependents',
  'no. of dependents (including spouse)': 'num_dependents',
  'no. of dependents': 'num_dependents', 'number of dependents': 'num_dependents',
  'dependents': 'num_dependents',
  'savings, pf, pension': 'savings', 'savings / pf': 'savings', 'savings': 'savings',
  'debts with purpose': 'debts', 'debts (reasons)': 'debts', 'debts': 'debts',
  'any other income': 'other_income', 'other income': 'other_income',

  // Living
  'kind of area, slum / village': 'area_type', 'kind of area': 'area_type',
  'slum / village': 'area_type', 'area': 'area_type', 'location': 'area_type',
  'slum / village , size of the house': 'house_size', 'slum / village, size of the house': 'house_size',
  'slum/village, size of the house': 'house_size', 'slum / village size of the house': 'house_size',
  'size of the house, no. of rooms': 'house_size', 'size of the house': 'house_size', 'house size': 'house_size',
  'condition of window, door, walls, roof, floor': 'house_condition', 'house condition': 'house_condition',
  'roof( rcc/sheet)': 'house_roof', 'roof (rcc/sheet)': 'house_roof', 'roof': 'house_roof', 'type of roof': 'house_roof',
  'flooring (cement/tiles/granite)': 'house_floor', 'flooring': 'house_floor', 'floor': 'house_floor', 'type of floor': 'house_floor',
  'kitchen, fire place, what stove': 'kitchen_type', 'kitchen': 'kitchen_type',
  'bathing place': 'bathing_place',
  'furniture and sleeping arrangement': 'furniture', 'furniture': 'furniture',
  'inherited, bought, given by govt.': 'house_ownership',
  'ownership: bought, given by govt.': 'house_ownership', 'ownership: bought, given by govt': 'house_ownership',
  'ownership: rented': 'house_ownership', 'ownership: owned': 'house_ownership',
  'ownership': 'house_ownership', 'own / rented': 'house_ownership',
  'rent / lease amount, if rent advance': 'rent_per_month',
  'rent, if advance / lease': 'rent_per_month', 'rent, if advance / lease:': 'rent_per_month',
  'rent per month': 'rent_per_month', 'rent': 'rent_per_month',
  'advance paid': 'advance_paid',
  'sanitation of the house': 'sanitation', 'sanitation': 'sanitation',
  'water, common tap.... metres away': 'water_source', 'water source': 'water_source',
  'own vehicles:': 'vehicles', 'own vehicles': 'vehicles', 'vehicles': 'vehicles',

  // Child health
  'height': 'height_cm', 'height (cm)': 'height_cm',
  'weight': 'weight_kg', 'weight (kg)': 'weight_kg',
  'any health issues': 'child_health', 'child health': 'child_health', 'health condition': 'child_health',
  'no. of meals per day': 'meals_per_day', 'meals per day': 'meals_per_day',
  'what kind of food': 'food_type', 'type of food': 'food_type',
  'from where is medical help usually taken': 'medical_help_from', 'medical help from': 'medical_help_from',
  'interests, leisure time occupation': 'interests', 'interests': 'interests',
  'preschool care': 'preschool',
  'reason for discontinuing previous school': 'prev_school_reason',

  // Remarks
  'special remarks:': 'special_remarks', 'special remarks': 'special_remarks',
  'remarks': 'special_remarks', 'observations': 'special_remarks',
  'conclusion:': 'conclusion', 'conclusion': 'conclusion',
  'financial assistance received': 'special_remarks', 'financial assistance': 'govt_support',
  'shishu mandir support or remark': 'special_remarks', 'shishu mandir support or remarks': 'special_remarks',
  'shishu mandir support': 'special_remarks',

  // Life skills
  'life skill training attended': 'mother_life_skills',
  'mother attended life skills program': 'mother_life_skills',
  'father attended life skills program': 'father_life_skills',
  'new skill learnt': 'mother_life_skills',

  // Contact
  'address': 'address_line1', 'address:': 'address_line1',
  'contact no': 'contact_phone', 'contact no.': 'contact_phone',
  'mobile no.': 'contact_phone', 'mobile no': 'contact_phone',

  // Social worker
  'reported by': 'reported_by', 'social worker name': 'reported_by',
  'name of the social worker': 'reported_by',
  'verified by': 'verified_by', 'verified by:': 'verified_by',

  // Followup
  'visit date': 'visit_date', 'date of visit': 'visit_date',
  'photo': 'photo_url',
}

// Section headers to skip — not data fields
const SECTION_HEADERS = new Set([
  'i. general information about the child',
  'ii. information about the parents', 'information about the parents',
  'iii. family background', 'family background',
  'iv. financial situation', 'financial situation',
  'v. living conditions and house condition', 'living conditions and house condition',
  'vi. information about the child',
  'vii. special remarks and observations', 'special remarks and observations',
  'father', 'mother', 'siblings', 'sibling', 'parents',
  'other family members in the house', 'grandparents/ uncles/aunts/etc.',
  'relationship between the parents', 'medium',
  'living conditions and house condition', 'financial situation',
  'general information about the child',
])

// Direct DB field keys written by blank-row parser — pass through as-is
const DIRECT_DB_FIELDS = new Set([
  'special_remarks', 'conclusion', 'contact_phone', 'address_line1', 'address_line2',
  'category', 'mother_life_skills', 'father_life_skills', 'reported_by', 'verified_by',
])

function resolveField(rawLabel: string): string | null {
  // Direct DB field names (written by blank-row parser) — pass through immediately
  if (DIRECT_DB_FIELDS.has(rawLabel)) return rawLabel

  const key = rawLabel.toLowerCase().trim().replace(/\s+/g, ' ')

  // Skip section headers
  if (SECTION_HEADERS.has(key)) return 'SKIP'

  // Exact alias match
  if (FIELD_ALIASES[key]) return FIELD_ALIASES[key]

  // StartsWith partial matches for long/variable labels
  if (key.startsWith('financial assistance received')) return 'special_remarks'
  if (key.startsWith('new skill learnt')) return 'mother_life_skills'
  if (key.startsWith('address:')) return 'address_line1'
  if (key.startsWith('contact no')) return 'contact_phone'
  if (key.startsWith('mobile no')) return 'contact_phone'
  if (key.startsWith('verified by')) return 'verified_by'
  if (key.startsWith('reported by')) return 'reported_by'
  if (key.startsWith('shishu mandir support')) return 'special_remarks'
  if (key.startsWith('any other income')) return 'other_income'
  if (key.startsWith('slum / village') || key.startsWith('slum/village')) return 'house_size'
  if (key.startsWith('ownership:')) return 'house_ownership'

  return null
}

// ── Status normalizers ────────────────────────────────────────
function normalizeFatherStatus(v: string): FatherStatus {
  const s = v.toLowerCase().trim()
  if (['alive', 'living', 'yes', 'present'].includes(s)) return 'Alive'
  if (['dead', 'deceased', 'died', 'no', 'expired', 'death'].includes(s)) return 'Dead'
  if (['abandoned', 'left', 'absent', 'gone', 'separated'].includes(s)) return 'Abandoned'
  return 'Unknown'
}
function normalizeMotherStatus(v: string): MotherStatus { return normalizeFatherStatus(v) as MotherStatus }
function normalizeSex(v: string): Sex {
  const s = v.toLowerCase().trim()
  if (['male', 'm', 'boy', 'b'].includes(s)) return 'Male'
  if (['female', 'f', 'girl', 'g'].includes(s)) return 'Female'
  return 'Other'
}
function normalizeBoolean(v: unknown): boolean {
  if (typeof v === 'boolean') return v
  return ['yes', 'true', '1', 'y', 'done', 'attended', 'performed'].includes(String(v).toLowerCase().trim())
}
function parseDate(v: unknown): string | null {
  if (!v) return null
  const s = String(v).trim()
  const m = s.match(/(\d{1,2})[./\-](\d{1,2})[./\-](\d{4})/)
  if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`
  const m2 = s.match(/(\d{2})\.(\d{2})\.(\d{2})$/)
  if (m2) { const yr = parseInt(m2[3]) > 30 ? `19${m2[3]}` : `20${m2[3]}`; return `${yr}-${m2[2]}-${m2[1]}` }
  if (/^\d{4}$/.test(s)) return `${s}-01-01`
  const parsed = new Date(s)
  if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0]
  return null
}

function applyValue(obj: Record<string, unknown>, field: string, rawValue: unknown): void {
  if (rawValue === null || rawValue === undefined) return
  const s = String(rawValue).trim()
  if (!s || s === '_' || s === '-' || s.toLowerCase() === 'n/a') return

  const boolFields = ['father_dv','mother_dv','father_extramarital','mother_extramarital',
    'family_planning_op','mother_life_skills','father_life_skills']
  const dateFields = ['date_of_birth','admission_date','visit_date']

  if (boolFields.includes(field)) { obj[field] = normalizeBoolean(s); return }
  if (dateFields.includes(field)) { obj[field] = parseDate(s); return }
  if (field === 'father_status') { obj[field] = normalizeFatherStatus(s); return }
  if (field === 'mother_status') { obj[field] = normalizeMotherStatus(s); return }
  if (field === 'sex') { obj[field] = normalizeSex(s); return }

  // Height — extract from combined "Height 106 cm and weight 17 kg"
  if (field === 'height_cm') {
    const hm = s.match(/height\s*[:\-]?\s*(\d+\.?\d*)\s*cm/i) || s.match(/^(\d+\.?\d*)\s*cm/i) || s.match(/^(\d+\.?\d*)$/)
    if (hm) { obj['height_cm'] = hm[1]; return }
    const bothH = s.match(/height\s*(\d+)\s*cm.*weight\s*(\d+)\s*kg/i)
    if (bothH) { obj['height_cm'] = bothH[1]; obj['weight_kg'] = bothH[2]; return }
    obj['height_cm'] = s; return
  }
  if (field === 'weight_kg') {
    const wm = s.match(/weight\s*[:\-]?\s*(\d+\.?\d*)\s*kg/i) || s.match(/^(\d+\.?\d*)\s*kg/i) || s.match(/^(\d+\.?\d*)$/)
    if (wm) { obj['weight_kg'] = wm[1]; return }
    obj['weight_kg'] = s; return
  }

  // Ownership — may contain rent amount
  if (field === 'house_ownership') {
    const rentMatch = s.match(/rent\s*(?:rs\.?|₹)?\s*(\d[\d,]*)/i)
    const advMatch = s.match(/advance\s*(?:rs\.?|₹)?\s*(\d[\d,]*)/i)
    if (rentMatch) { obj['rent_per_month'] = rentMatch[1].replace(/,/g,''); obj['house_ownership'] = 'Rented'; return }
    if (advMatch) { obj['advance_paid'] = advMatch[1].replace(/,/g,''); return }
    if (s.toLowerCase().includes('rent')) { obj['house_ownership'] = 'Rented'; obj['rent_per_month'] = s; return }
    if (s.toLowerCase().includes('own') || s.toLowerCase().includes('bought')) { obj['house_ownership'] = 'Owned'; return }
    if (s.toLowerCase().includes('govt')) { obj['house_ownership'] = 'Govt Given'; return }
    obj['house_ownership'] = s; return
  }

  obj[field] = s
}

function emptyResult(sourceFile: string): ImportResult {
  return {
    child: { father_status: 'Unknown', mother_status: 'Unknown', father_dv: false, is_active: true },
    siblings: [], followups: [], errors: [], warnings: [],
    unmapped_fields: {}, source_file: sourceFile, detected_type: null
  }
}

// ── DOCX Parser ───────────────────────────────────────────────
export async function parseDocxFile(file: File): Promise<ImportResult> {
  const result = emptyResult(file.name)
  try {
    const mammoth = await import('mammoth')
    const buffer = await file.arrayBuffer()
    const { value: html } = await mammoth.convertToHtml({ arrayBuffer: buffer })
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const tables = doc.querySelectorAll('table')
    const child: Record<string, unknown> = { father_status: 'Unknown', mother_status: 'Unknown', father_dv: false, is_active: true }
    const siblings: Partial<Sibling>[] = []
    const unmapped: Record<string, unknown> = {}
    type Context = 'none'|'father'|'mother'|'sibling'|'family_bg'|'financial'|'living'|'child_profile'|'remarks'
    let ctx: Context = 'none'
    let curSibling: Record<string, unknown> = {}

    function detectSubSection(cells: string[]): Context | null {
      if (cells.length === 2) {
        const l = cells[1].toLowerCase().trim()
        if (l === 'father') return 'father'
        if (l === 'mother') return 'mother'
        if (l === 'siblings' || l === 'sibling') return 'sibling'
        if (l.includes('other family') || l.includes('grandparent')) return 'none'
        if (l === 'parents') return 'family_bg'
      }
      return null
    }

    function mapContextualField(label: string, value: string) {
      if (!value || value.trim() === '-' || value.trim() === '') return
      const l = label.toLowerCase().trim(); const v = value.trim()
      if (ctx === 'father') {
        const fatherMap: Record<string,string> = { 'name':'father_name','age':'father_age','educational qualification':'father_education','education':'father_education','occupation':'father_occupation','nature of work':'father_nature_of_work','earnings':'father_earnings','income':'father_earnings','habits':'father_habits','health':'father_health','place of origin':'father_origin','native place':'father_origin','aadhar no.':'father_aadhar','aadhar no':'father_aadhar','mobile no.':'father_mobile','mobile no':'father_mobile','contact no':'father_mobile','contact no.':'father_mobile' }
        if (fatherMap[l]) { applyValue(child, fatherMap[l], v); return }
        if (l.includes('domestic violence') || l === 'dv') { child.father_dv = normalizeBoolean(v); return }
        if (l.includes('extramarital')) { child.father_extramarital = normalizeBoolean(v); return }
      }
      if (ctx === 'mother') {
        const motherMap: Record<string,string> = { 'name':'mother_name','age':'mother_age','educational qualification':'mother_education','education':'mother_education','occupation':'mother_occupation','nature of work':'mother_nature_of_work','earnings':'mother_earnings','income':'mother_earnings','habits':'mother_habits','health':'mother_health','place of origin':'mother_origin','native place':'mother_origin','aadhar no.':'mother_aadhar','aadhar no':'mother_aadhar','mobile no.':'mother_mobile','mobile no':'mother_mobile','contact no':'mother_mobile','contact no.':'mother_mobile' }
        if (motherMap[l]) { applyValue(child, motherMap[l], v); return }
        if (l.includes('family planning')) { child.family_planning_op = normalizeBoolean(v); return }
        if (l.includes('domestic violence') || l === 'dv') { child.mother_dv = normalizeBoolean(v); return }
      }
      if (ctx === 'sibling') {
        if (l === 'name') { curSibling.name = v; return }
        if (l === 'age') { curSibling.age = v; return }
        if (l === 'sex') { curSibling.sex = v; return }
        if (l === 'educational qualification' || l === 'education') { curSibling.education = v; return }
        if (l === 'medium of instruction' || l === 'medium') { curSibling.medium_of_instruction = v; return }
        if (l === 'occupation') { curSibling.occupation = v; return }
        if (l === 'health') { curSibling.health = v; return }
        return
      }
      if (ctx === 'financial') {
        if (l.includes('average monthly income') || l.includes('average monthly')) { child.avg_monthly_income = v; return }
        if (l.includes('support from government') || l.includes('ngo')) { child.govt_support = v; return }
        if (l.includes('number of dependents') || l.includes('no. of dependents')) { child.num_dependents = v; return }
        if (l.includes('savings') || l.includes('pf')) { child.savings = v; return }
        if (l.includes('debts')) { child.debts = v; return }
        return
      }
      if (ctx === 'living') {
        if (l.includes('kind of area') || l.includes('slum')) { child.area_type = v; return }
        if (l.includes('sanitation')) { child.sanitation = v; return }
        if (l.includes('water')) { child.water_source = v; return }
        if (l.includes('size of the house') || l.includes('no. of rooms')) { child.house_size = v; return }
        if (l.includes('condition of window') || l.includes('walls, roof')) { child.house_condition = v; return }
        if (l.includes('kitchen') || l.includes('fire place')) { child.kitchen_type = v; return }
        if (l.includes('bathing')) { child.bathing_place = v; return }
        if (l.includes('furniture') || l.includes('sleeping')) { child.furniture = v; return }
        if (l.includes('inherited') || l.includes('bought')) { child.house_ownership = v; return }
        if (l.includes('rent') || l.includes('lease')) {
          const rentMatch = v.match(/rent\s*(?:rs\.?|₹)?\s*(\d[\d,]*)/i)
          const advMatch = v.match(/advance\s*(?:rs\.?|₹)?\s*(\d[\d,]*)/i)
          if (rentMatch) child.rent_per_month = rentMatch[1].replace(/,/g,'')
          if (advMatch) child.advance_paid = advMatch[1].replace(/,/g,'')
          if (!rentMatch && !advMatch) child.rent_per_month = v
          return
        }
        return
      }
      if (ctx === 'child_profile') {
        if (l.includes('height and weight') || l.includes('appearance')) { applyValue(child, 'height_cm', v); return }
        if (l === 'health' || l.includes('health issues')) { child.child_health = v; return }
        if (l.includes('relationship to father')) { child.relationship_father = v; return }
        if (l.includes('relationship with sibling')) { child.relationship_siblings = v; return }
        if (l.includes('interests') || l.includes('leisure')) { child.interests = v; return }
        if (l.includes('preschool')) { child.preschool = v; return }
        if (l.includes('reason for discontinuing')) { child.prev_school_reason = v; return }
        return
      }
      if (ctx === 'remarks') {
        if (l.includes('no. of meals') || l.includes('meals per day')) { child.meals_per_day = v; return }
        if (l.includes('what kind of food') || l.includes('kind of food')) { child.food_type = v; return }
        if (l.includes('medical help')) { child.medical_help_from = v; return }
        unmapped[label] = v; return
      }
      // Top-level
      const topLevel: Record<string,string> = { 'name of the child':'full_name','date of birth':'date_of_birth','sex':'sex','religion':'religion','mother tongue':'mother_tongue' }
      if (topLevel[l]) { applyValue(child, topLevel[l], v) } else { unmapped[label] = v }
    }

    if (tables.length > 0) {
      const rows = Array.from(tables[0].querySelectorAll('tr'))
      for (const row of rows) {
        const cells = Array.from(row.querySelectorAll('td')).map(td => td.textContent?.trim() || '').filter(c => c.length > 0)
        if (cells.length === 0) continue
        const fullText = cells.join(' ').toLowerCase()
        if (cells.length === 1) {
          if (fullText.includes('financial situation')) { ctx = 'financial'; continue }
          if (fullText.includes('living conditions')) { ctx = 'living'; continue }
          if (fullText.includes('information about the child')) { ctx = 'child_profile'; continue }
          if (fullText.includes('special remarks')) { ctx = 'remarks'; continue }
          if (fullText.startsWith('conclusion')) { child.conclusion = cells[0].replace(/^conclusion[:\s]*/i,'').trim() }
          continue
        }
        const subCtx = detectSubSection(cells)
        if (subCtx !== null) {
          if (ctx === 'sibling' && curSibling.name) { siblings.push({ ...curSibling, is_also_sm_student: false }); curSibling = {} }
          ctx = subCtx; continue
        }
        if (cells.length === 3) mapContextualField(cells[1], cells[2])
        else if (cells.length === 2) {
          if (!/^[\dIVXivx]+\.$/.test(cells[0].trim())) mapContextualField(cells[0], cells[1])
        }
      }
      if (ctx === 'sibling' && curSibling.name) siblings.push({ ...curSibling, is_also_sm_student: false })
    }

    // Extract conclusion + contact from paragraphs
    const paragraphs = Array.from(doc.querySelectorAll('p'))
    let conclusionParts: string[] = []
    let inConclusion = false
    for (const p of paragraphs) {
      const text = p.textContent?.trim() || ''
      if (!text) continue
      if (text.toLowerCase().startsWith('conclusion')) { inConclusion = true; const after = text.replace(/^conclusion[:\s]*/i,'').trim(); if (after) conclusionParts.push(after); continue }
      if (inConclusion) {
        if (text.toLowerCase().startsWith('address') || text.toLowerCase().startsWith('reported by') || /^#\d+/.test(text)) { inConclusion = false }
        else { if (text.length > 15) conclusionParts.push(text); continue }
      }
      if (/^#\d+/.test(text) || text.match(/layout|cross|nagar|bangalore|bengaluru/i)) { if (!child.address_line1) child.address_line1 = text; else if (!child.address_line2) child.address_line2 = text; continue }
      const phones = text.match(/\b\d{10}\b/g)
      if (phones && !child.contact_phone) child.contact_phone = phones[0]
      const repMatch = text.match(/reported\s+by[:\s]+([^\t\n]+)/i); if (repMatch) child.reported_by = repMatch[1].trim()
      const verMatch = text.match(/verified\s+by[:\s]+([^\t\n]+)/i); if (verMatch) child.verified_by = verMatch[1].trim()
    }
    if (conclusionParts.length > 0 && !child.conclusion) child.conclusion = conclusionParts.join(' ').trim()

    if (!child.full_name) result.errors.push({ field:'full_name', message:'Child name not found' })
    if (!child.school_id) result.warnings.push({ field:'school_id', message:'School ID not in document — enter manually' })

    result.child = child as Partial<Child>
    result.siblings = siblings
    result.unmapped_fields = unmapped
    result.detected_type = 'shishu_student'
  } catch (err) {
    result.errors.push({ field:'file', message:`Word parse failed: ${err instanceof Error ? err.message : String(err)}` })
  }
  return result
}

// ── XLSX Vertical Parser ──────────────────────────────────────
async function parseXlsxVertical(file: File): Promise<ImportResult> {
  const result = emptyResult(file.name)
  try {
    const buffer = await file.arrayBuffer()
    const wb = XLSX.read(buffer, { type:'array', cellDates:true, raw:false })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')

    // Build 2D grid
    const grid: (string | null)[][] = []
    for (let R = range.s.r; R <= range.e.r; R++) {
      const row: (string | null)[] = []
      for (let C = range.s.c; C <= range.e.c; C++) {
        const cell = ws[XLSX.utils.encode_cell({ r:R, c:C })]
        if (!cell) { row.push(null); continue }
        if (cell.v instanceof Date) row.push(cell.v.toISOString().split('T')[0])
        else row.push(cell.v !== null && cell.v !== undefined ? String(cell.v).trim() : null)
      }
      grid.push(row)
    }

    // Find header row — "On Admission" and year columns
    // Note: year labels may have spaces around dash e.g. "2019 -20" or "2020 - 21"
    const YEAR_RE = /\d{4}\s*[-–]\s*\d{2,4}/
    let headerRowIdx = -1
    const yearCols: { col:number; label:string }[] = []

    for (let i = 0; i < Math.min(15, grid.length); i++) {
      const row = grid[i]
      const hasAdmission = row.some(c => c?.toLowerCase().includes('on admission'))
      const hasYear = row.some(c => c && YEAR_RE.test(c))
      if (hasAdmission || hasYear) {
        headerRowIdx = i
        row.forEach((cell, ci) => {
          if (!cell) return
          const t = cell.trim()
          if (t.toLowerCase().includes('on admission')) yearCols.push({ col:ci, label:'On Admission' })
          else if (YEAR_RE.test(t)) yearCols.push({ col:ci, label:t })
        })
        break
      }
    }

    if (headerRowIdx === -1 || yearCols.length === 0) return parseXlsxSimpleKV(grid, file.name)

    const yearData: Record<string, Record<string,string>> = {}
    yearCols.forEach(yc => { yearData[yc.label] = {} })

    for (let i = headerRowIdx + 1; i < grid.length; i++) {
      const rawLabel = grid[i][0]
      const label = rawLabel ? rawLabel.trim() : ''

      if (!label) {
        // ── Blank-label rows: Special Remarks, Category, Contact, Address ──
        yearCols.forEach(yc => {
          const val = grid[i][yc.col]
          if (!val || !val.trim()) return
          const v = val.trim()

          // Special Remarks
          if (v.toLowerCase().startsWith('special remarks:')) {
            const text = v.replace(/^special remarks:\s*/i, '').trim()
            if (text) { yearData[yc.label]['special_remarks'] = text; yearData[yc.label]['conclusion'] = text }
            return
          }

          // Category
          const catMatch = v.match(/category[:\s]+([IVXivx\d]+)/i)
          if (catMatch) {
            const cat = catMatch[1].trim().toUpperCase()
            const catMap: Record<string,string> = { 'I':'Category I','II':'Category II','III':'Category III','IV':'Category IV' }
            for (const [k, mapped] of Object.entries(catMap)) {
              if (cat === k || cat.startsWith(k+' ')) { yearData[yc.label]['category'] = mapped; break }
            }
          }

          // Contact No
          const contactMatch = v.match(/contact\s*no[:\s]+(\d{10,})/i)
          if (contactMatch) { yearData[yc.label]['contact_phone'] = contactMatch[1]; return }

          // Address
          const addrMatch = v.match(/^address[:\s]+(.+)/i)
          if (addrMatch && addrMatch[1].trim().length > 3) { yearData[yc.label]['address_line1'] = addrMatch[1].trim(); return }

          // Life skills "Mother: yes  Father: no"
          if (v.toLowerCase().includes('mother:') && v.toLowerCase().includes('father:')) {
            yearData[yc.label]['mother_life_skills'] = /mother:\s*yes/i.test(v) ? 'yes' : 'no'
            yearData[yc.label]['father_life_skills'] = /father:\s*yes/i.test(v) ? 'yes' : 'no'
          }
        })
        continue
      }

      yearCols.forEach(yc => {
        const val = grid[i][yc.col]
        if (val && val !== '_' && val !== '-') yearData[yc.label][label] = val
      })
    }

    // Build child from "On Admission" column
    const baseData = yearData['On Admission'] || {}
    const child: Record<string,unknown> = { father_status:'Unknown', mother_status:'Unknown', father_dv:false, is_active:true }
    const unmapped: Record<string,unknown> = {}

    Object.entries(baseData).forEach(([label, value]) => {
      const field = resolveField(label)
      if (!field || field === 'SKIP') { if (label.trim() && !SECTION_HEADERS.has(label.toLowerCase())) unmapped[label] = value; return }
      applyValue(child, field, value)
    })

    result.child = child as Partial<Child>
    result.unmapped_fields = unmapped

    // Build followups from year columns
    for (const yc of yearCols) {
      if (yc.label === 'On Admission') continue
      const data = yearData[yc.label]
      if (!data || Object.keys(data).length === 0) continue
      const fu: Record<string,unknown> = { year_label:yc.label, created_at:new Date().toISOString(), updated_at:new Date().toISOString() }
      Object.entries(data).forEach(([label, value]) => {
        const field = resolveField(label)
        if (field && field !== 'SKIP') applyValue(fu, field, value)
      })
      result.followups.push(fu as Partial<AnnualFollowup>)
    }

    if (!child.full_name && !child.school_id) result.errors.push({ field:'full_name', message:'Could not find child name or ID' })
    result.detected_type = 'shishu_student'
  } catch (err) {
    result.errors.push({ field:'file', message:`Parse error: ${String(err)}` })
  }
  return result
}

function parseXlsxSimpleKV(grid: (string|null)[][], sourceFile: string): ImportResult {
  const result = emptyResult(sourceFile)
  const child: Record<string,unknown> = { father_status:'Unknown', mother_status:'Unknown', father_dv:false, is_active:true }
  const unmapped: Record<string,unknown> = {}
  grid.forEach(row => {
    if (!row[0] || !row[1]) return
    const field = resolveField(row[0])
    if (field && field !== 'SKIP') applyValue(child, field, row[1])
    else if (!field && row[0].trim()) unmapped[row[0]] = row[1]
  })
  result.child = child as Partial<Child>
  result.unmapped_fields = unmapped
  result.detected_type = 'shishu_student'
  return result
}

// ── XLSX Horizontal Parser ─────────────────────────────────────
async function parseXlsxHorizontal(file: File): Promise<ImportResult[]> {
  const results: ImportResult[] = []
  try {
    const buffer = await file.arrayBuffer()
    const wb = XLSX.read(buffer, { type:'array', cellDates:true, raw:false })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(ws, { defval:null, raw:false }) as Record<string,unknown>[]
    for (const row of rows) {
      const hasData = Object.values(row).some(v => v !== null && v !== undefined && String(v).trim() !== '')
      if (!hasData) continue
      const result = emptyResult(file.name)
      const child: Record<string,unknown> = { father_status:'Unknown', mother_status:'Unknown', father_dv:false, is_active:true }
      const unmapped: Record<string,unknown> = {}
      Object.entries(row).forEach(([label, value]) => {
        if (!value) return
        const field = resolveField(label)
        if (field && field !== 'SKIP') applyValue(child, field, value)
        else if (!field && label.trim()) unmapped[label] = value
      })
      if (!child.full_name && !child.school_id) continue
      result.child = child as Partial<Child>
      result.unmapped_fields = unmapped
      result.detected_type = 'shishu_student'
      results.push(result)
    }
  } catch (err) {
    results.push({ ...emptyResult(file.name), errors:[{ field:'file', message:`Parse error: ${String(err)}` }] })
  }
  return results
}

// ── Format detector ───────────────────────────────────────────
async function detectFormat(file: File): Promise<'vertical'|'horizontal'|'docx'> {
  if (file.name.toLowerCase().endsWith('.docx') || file.name.toLowerCase().endsWith('.doc')) return 'docx'
  try {
    const buffer = await file.arrayBuffer()
    const wb = XLSX.read(buffer, { type:'array', raw:false })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
    const YEAR_RE = /\d{4}\s*[-–]\s*\d{2,4}/
    for (let i = 0; i < Math.min(10, range.e.r); i++) {
      for (let c = range.s.c; c <= Math.min(range.e.c, 10); c++) {
        const cell = ws[XLSX.utils.encode_cell({ r:i, c })]
        if (!cell?.v) continue
        const v = String(cell.v)
        if (v.toLowerCase().includes('on admission') || YEAR_RE.test(v)) return 'vertical'
      }
    }
  } catch { /* ignore */ }
  return 'horizontal'
}

// ── Main entry point ──────────────────────────────────────────
export async function importFile(file: File): Promise<ImportResult[]> {
  const format = await detectFormat(file)
  if (format === 'docx') return [await parseDocxFile(file)]
  if (format === 'vertical') return [await parseXlsxVertical(file)]
  return parseXlsxHorizontal(file)
}

export async function checkDuplicate(
  child: Partial<Child>,
  supabase: ReturnType<typeof import('@supabase/supabase-js').createClient>
): Promise<{ found:boolean; match?:{ id:string; full_name:string; school_id:string } }> {
  if (child.school_id) {
    const { data } = await supabase.from('children').select('id, full_name, school_id').eq('school_id', child.school_id).maybeSingle()
    if (data) return { found:true, match:data }
  }
  if (child.full_name) {
    const { data } = await supabase.from('children').select('id, full_name, school_id').ilike('full_name', child.full_name.trim()).limit(1).maybeSingle()
    if (data) return { found:true, match:data }
  }
  return { found:false }
}

export function detectChanges(
  childId: string, childName: string,
  oldData: Record<string,unknown>, newData: Record<string,unknown>,
  changedByName: string, followupId?: string, followupYear?: string
): Array<{ id:string; child_id:string; child_name:string; field_name:string; old_value:string; new_value:string; changed_by_name:string; followup_id?:string; followup_year?:string; changed_at:string }> {
  const SKIP = new Set(['id','created_at','updated_at','data_json','imported_at','source_file'])
  const changes = []
  const allFields = new Set([...Object.keys(oldData||{}), ...Object.keys(newData||{})])
  for (const field of allFields) {
    if (SKIP.has(field)) continue
    const oldStr = oldData?.[field] !== null && oldData?.[field] !== undefined ? String(oldData[field]) : ''
    const newStr = newData?.[field] !== null && newData?.[field] !== undefined ? String(newData[field]) : ''
    if (!newStr || oldStr === newStr) continue
    changes.push({ id:crypto.randomUUID(), child_id:childId, child_name:childName, field_name:field, old_value:oldStr, new_value:newStr, changed_by_name:changedByName, followup_id:followupId, followup_year:followupYear, changed_at:new Date().toISOString() })
  }
  return changes
}