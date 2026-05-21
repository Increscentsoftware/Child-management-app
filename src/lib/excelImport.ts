import * as XLSX from 'xlsx'
import type { Child, AnnualFollowup, FatherStatus, MotherStatus } from '@/types'

// Column label to field mapping (matches your existing Excel format)
const FIELD_MAP: Record<string, keyof Child> = {
  'school id'             : 'school_id',
  'admission date'        : 'admission_date',
  'date of admission'     : 'admission_date',
  "child's name"          : 'full_name',
  'name of the child'     : 'full_name',
  'full name'             : 'full_name',
  'date of birth'         : 'date_of_birth',
  'dob'                   : 'date_of_birth',
  'sex'                   : 'sex',
  'gender'                : 'sex',
  'religion'              : 'religion',
  'mother tongue'         : 'mother_tongue',
  'present class'         : 'present_class',
  'class'                 : 'present_class',
  'category'              : 'category',
  'aadhar no'             : 'aadhar_no',
  'normal / special'      : 'normal_or_special',

  "father's name"         : 'father_name',
  'father name'           : 'father_name',
  'father status'         : 'father_status',
  'father nature of work' : 'father_occupation',
  'father occupation'     : 'father_occupation',
  'father habits'         : 'father_habits',
  'father health'         : 'father_health',
  'father dv'             : 'father_dv',
  'domestic violence (f)' : 'father_dv',
  'father income'         : 'father_earnings',
  'father avg income'     : 'father_earnings',
  'father earnings'       : 'father_earnings',

  "mother's name"         : 'mother_name',
  'mother name'           : 'mother_name',
  'mother status'         : 'mother_status',
  'mother nature of work' : 'mother_occupation',
  'mother occupation'     : 'mother_occupation',
  'mother habits'         : 'mother_habits',
  'mother health'         : 'mother_health',
  'mother dv'             : 'mother_dv',
  'domestic violence (m)' : 'mother_dv',
  'mother income'         : 'mother_earnings',
  'mother avg income'     : 'mother_earnings',
  'mother earnings'       : 'mother_earnings',

  'sibling name'          : 'sibling_name',
  'sibling age'           : 'sibling_age',
  'sibling sex'           : 'sibling_sex',
  'sibling education'     : 'sibling_education',

  'no of dependents'      : 'num_dependents',
  'number of dependents'  : 'num_dependents',
  'debts'                 : 'debts',
  'area'                  : 'area',
  'slum / village'        : 'area',
  'rent'                  : 'rent_per_month',
  'advance'               : 'advance_paid',
  'special remarks'       : 'special_remarks',
  'remarks'               : 'special_remarks',
}

// Year columns to detect (On Admission + annual follow-ups)
const YEAR_PATTERN = /^(on admission|\d{4}[-–]\d{2,4}|\d{4}-\d{2})$/i

export interface ImportResult {
  children: Child[]
  followups: AnnualFollowup[]
  errors: string[]
  total: number
  imported: number
}

export async function importExcelFile(file: File): Promise<ImportResult> {
  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true })
  const errors: string[] = []
  const children: Child[] = []
  const followups: AnnualFollowup[] = []

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName]
    const rows: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' })

    if (rows.length < 2) continue

    // Find header row (row with 'field' or 'particulars' or school id)
    let headerRowIdx = 0
    for (let i = 0; i < Math.min(5, rows.length); i++) {
      const rowLower = rows[i].map(c => String(c).toLowerCase())
      if (rowLower.some(c => c.includes('field') || c.includes('particular') || c.includes('school id') || c.includes("child's name"))) {
        headerRowIdx = i
        break
      }
    }

    const headers = rows[headerRowIdx].map(h => String(h).trim())
    const dataRows = rows.slice(headerRowIdx + 1)

    // Detect format: wide (one column per year) vs. tall (one row per child)
    const yearCols: { label: string; colIdx: number }[] = []
    headers.forEach((h, i) => {
      if (YEAR_PATTERN.test(h.trim())) {
        yearCols.push({ label: h.trim(), colIdx: i })
      }
    })

    if (yearCols.length > 0) {
      // WIDE FORMAT: SSR-style — rows are fields, columns are years
      const fieldCol = 0
      const child = buildChildFromWide(rows, headerRowIdx, yearCols, file.name, errors)
      if (child) {
        children.push(child)
        // Each year column = one follow-up
        for (const yc of yearCols) {
          const fu = buildFollowupFromWide(rows, headerRowIdx, yc, child.id, errors)
          if (fu) followups.push(fu)
        }
      }
    } else {
      // TALL FORMAT: one row per child (Excel report style)
      for (const row of dataRows) {
        if (row.every(c => !c)) continue
        const child = buildChildFromTall(headers, row, file.name, errors)
        if (child) children.push(child)
      }
    }
  }

  return {
    children,
    followups,
    errors,
    total: children.length,
    imported: children.length
  }
}

function buildChildFromWide(
  rows: string[][],
  headerRowIdx: number,
  yearCols: { label: string; colIdx: number }[],
  sourceFile: string,
  errors: string[]
): Child | null {
  // Use the LAST (most recent) year column as the current record
  const latestCol = yearCols[yearCols.length - 1]
  const fieldMap: Record<string, string> = {}

  for (let r = headerRowIdx + 1; r < rows.length; r++) {
    const fieldLabel = String(rows[r][0] || '').trim().toLowerCase()
    const value = String(rows[r][latestCol.colIdx] || '').trim()
    if (fieldLabel) fieldMap[fieldLabel] = value
  }

  const child: Partial<Child> = {
    id: crypto.randomUUID(),
    source_file: sourceFile,
    imported_at: new Date().toISOString(),
    is_active: true,
    father_dv: false,
    father_status: 'Alive',
    mother_status: 'Alive',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  for (const [label, value] of Object.entries(fieldMap)) {
    const key = matchField(label)
    if (key && value) {
      if (key === 'father_dv' || key === 'mother_dv') {
        (child as Record<string, unknown>)[key] = value.toLowerCase().includes('yes')
      } else {
        (child as Record<string, unknown>)[key] = value
      }
    }
  }

  if (!child.full_name && !child.school_id) {
    errors.push(`Skipped row in wide format — no name or school ID found`)
    return null
  }

  return child as Child
}

function buildFollowupFromWide(
  rows: string[][],
  headerRowIdx: number,
  yearCol: { label: string; colIdx: number },
  childId: string,
  _errors: string[]
): AnnualFollowup | null {
  const fu: Partial<AnnualFollowup> = {
    id: crypto.randomUUID(),
    child_id: childId,
    year_label: yearCol.label,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  for (let r = headerRowIdx + 1; r < rows.length; r++) {
    const fieldLabel = String(rows[r][0] || '').trim().toLowerCase()
    const value = String(rows[r][yearCol.colIdx] || '').trim()
    if (!fieldLabel || !value) continue

    if (fieldLabel.includes('class')) fu.present_class = value
    else if (fieldLabel.includes('father') && fieldLabel.includes('status')) fu.father_status = value as FatherStatus
    else if (fieldLabel.includes('father') && fieldLabel.includes('work')) fu.father_occupation = value
    else if (fieldLabel.includes('father') && fieldLabel.includes('earn')) fu.father_earnings = value
    else if (fieldLabel.includes('father') && fieldLabel.includes('habit')) fu.father_habits = value
    else if (fieldLabel.includes('father') && fieldLabel.includes('health')) fu.father_health = value
    else if (fieldLabel.includes('father') && fieldLabel.includes('dv')) fu.father_dv = value.toLowerCase().includes('yes')
    else if (fieldLabel.includes('mother') && fieldLabel.includes('status')) fu.mother_status = value as MotherStatus
    else if (fieldLabel.includes('mother') && fieldLabel.includes('work')) fu.mother_occupation = value
    else if (fieldLabel.includes('mother') && fieldLabel.includes('earn')) fu.mother_earnings = value
    else if (fieldLabel.includes('mother') && fieldLabel.includes('health')) fu.mother_health = value
    else if (fieldLabel.includes('remark')) fu.special_remarks = value
    else if (fieldLabel.includes('social worker') || fieldLabel.includes('sw name')) fu.recorded_by_name = value
    else if (fieldLabel.includes('rent')) fu.rent_per_month = value
    else if (fieldLabel.includes('dependent')) fu.num_dependents = value
    else if (fieldLabel.includes('debt')) fu.debts = value
  }

  return fu as AnnualFollowup
}

function buildChildFromTall(
  headers: string[],
  row: string[],
  sourceFile: string,
  errors: string[]
): Child | null {
  const child: Partial<Child> = {
    id: crypto.randomUUID(),
    source_file: sourceFile,
    is_active: true,
    father_dv: false,
    father_status: 'Alive',
    mother_status: 'Alive',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  headers.forEach((h, i) => {
    const value = String(row[i] || '').trim()
    if (!value) return
    const key = matchField(h.toLowerCase())
    if (key) {
      if (key === 'father_dv' || key === 'mother_dv') {
        (child as Record<string, unknown>)[key] = value.toLowerCase().includes('yes')
      } else {
        (child as Record<string, unknown>)[key] = value
      }
    }
  })

  if (!child.full_name && !child.school_id) {
    errors.push(`Skipped row — no name or ID in row: ${row.slice(0, 3).join(', ')}`)
    return null
  }

  return child as Child
}

function matchField(label: string): keyof Child | null {
  const cleaned = label.trim().toLowerCase().replace(/[^a-z0-9 /()]/g, '')
  if (FIELD_MAP[cleaned]) return FIELD_MAP[cleaned]
  // Fuzzy match
  for (const [key, field] of Object.entries(FIELD_MAP)) {
    if (cleaned.includes(key) || key.includes(cleaned)) return field
  }
  return null
}

// Detect what changed between old child and new followup data, return change log entries
export function detectChanges(
  childId: string,
  childName: string,
  oldData: Partial<Child>,
  newData: Partial<AnnualFollowup>,
  swName: string,
  followupId: string,
  yearLabel: string
) {
  const changes: Array<{
    id: string
    child_id: string
    child_name: string
    field_name: string
    old_value: string
    new_value: string
    changed_by_name: string
    followup_id: string
    followup_year: string
    changed_at: string
  }> = []

  const WATCH: Array<[keyof AnnualFollowup, keyof Child, string]> = [
    ['father_status', 'father_status', 'Father status'],
    ['father_health', 'father_health', 'Father health'],
    ['father_habits', 'father_habits', 'Father habits'],
    ['father_earnings', 'father_earnings', 'Father income'],
    ['father_occupation', 'father_occupation', 'Father occupation'],
    ['father_dv', 'father_dv', 'Domestic violence (Father)'],
    ['mother_status', 'mother_status', 'Mother status'],
    ['mother_health', 'mother_health', 'Mother health'],
    ['mother_occupation', 'mother_occupation', 'Mother occupation'],
    ['mother_earnings', 'mother_earnings', 'Mother income'],
    ['present_class', 'present_class', 'Child class'],
    ['num_dependents', 'num_dependents', 'No. of dependents'],
    ['debts', 'debts', 'Debts'],
    ['rent_per_month', 'rent_per_month', 'Rent'],
  ]

  for (const [fuKey, childKey, label] of WATCH) {
    const oldVal = String(oldData[childKey] ?? '')
    const newVal = String(newData[fuKey] ?? '')
    if (newVal && oldVal !== newVal) {
      changes.push({
        id: crypto.randomUUID(),
        child_id: childId,
        child_name: childName,
        field_name: label,
        old_value: oldVal || '—',
        new_value: newVal,
        changed_by_name: swName,
        followup_id: followupId,
        followup_year: yearLabel,
        changed_at: new Date().toISOString(),
      })
    }
  }

  return changes
}
