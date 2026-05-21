import * as XLSX from 'xlsx'
import type {
  Child,
  AnnualFollowup,
  FatherStatus,
  MotherStatus,
} from '@/types'

// ============================================================
// TYPES
// ============================================================

export interface ImportResult {
  children: Child[]
  followups: AnnualFollowup[]
  errors: string[]
  total: number
  imported: number
}

// ============================================================
// MAIN IMPORT
// ============================================================

export async function importExcelFile(
  file: File
): Promise<ImportResult> {

  const buffer =
    await file.arrayBuffer()

  const workbook = XLSX.read(
    buffer,
    {
      type: 'array',
      cellDates: true,
    }
  )

  const children: Child[] = []

  const followups:
    AnnualFollowup[] = []

  const errors: string[] = []

  for (const sheetName of workbook.SheetNames) {

    const sheet =
      workbook.Sheets[sheetName]

    const rows: string[][] =
      XLSX.utils.sheet_to_json(
        sheet,
        {
          header: 1,
          raw: false,
          defval: '',
        }
      )

    if (!rows.length) continue

    // ========================================================
    // FIND YEAR COLUMNS
    // ========================================================

    const yearCols: {
      label: string
      colIdx: number
    }[] = []

    for (
      let r = 0;
      r < Math.min(5, rows.length);
      r++
    ) {

      for (
        let c = 1;
        c < rows[r].length;
        c++
      ) {

        const value = String(
          rows[r][c] || ''
        )
          .trim()

        if (!value) continue

        if (
          value
            .toLowerCase()
            .includes('admission')
        ) {

          yearCols.push({
            label: value,
            colIdx: c,
          })
        }

        else if (
          /\d{4}\s*[-/]\s*\d{2,4}/
            .test(value)
        ) {

          yearCols.push({
            label: value,
            colIdx: c,
          })
        }
      }
    }

    console.log(
      'YEAR COLS',
      yearCols
    )

    if (!yearCols.length) {
      errors.push(
        `${sheetName}: No year columns found`
      )

      continue
    }

    const child =
      buildChildFromWide(
        rows,
        yearCols,
        file.name,
        errors
      )

    if (!child) continue

    children.push(child)

    // ========================================================
    // FOLLOWUPS
    // ========================================================

    for (const yc of yearCols) {

      if (
        yc.label
          .toLowerCase()
          .includes('admission')
      ) {
        continue
      }

      const fu =
        buildFollowupFromWide(
          rows,
          yc,
          child.id
        )

      if (fu) {
        followups.push(fu)
      }
    }
  }

  return {
    children,
    followups,
    errors,
    total: children.length,
    imported: children.length,
  }
}

// ============================================================
// BUILD CHILD
// ============================================================

function buildChildFromWide(
  rows: string[][],
  yearCols: {
    label: string
    colIdx: number
  }[],
  sourceFile: string,
  errors: string[]
): Child | null {

  const admissionCol =
    yearCols.find(y =>
      y.label
        .toLowerCase()
        .includes('admission')
    ) || yearCols[0]

  const child: Partial<Child> = {

    id: crypto.randomUUID(),

    source_file: sourceFile,

    imported_at:
      new Date().toISOString(),

    is_active: true,

    father_dv: false,

    mother_dv: false,

    father_extramarital: false,

    mother_extramarital: false,

    father_status: 'Alive',

    mother_status: 'Alive',

    created_at:
      new Date().toISOString(),

    updated_at:
      new Date().toISOString(),
  }

  let currentSection = 'child'

  for (
    let r = 0;
    r < rows.length;
    r++
  ) {

    const rawLabel = String(
      rows[r][0] || ''
    ).trim()

    const label = rawLabel
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim()

    let value = String(
      rows[r][admissionCol.colIdx] || ''
    ).trim()

    // ========================================================
    // FALLBACK SEARCH
    // ========================================================

    if (!value) {

      for (
        let c = admissionCol.colIdx + 1;
        c < rows[r].length;
        c++
      ) {

        const alt = String(
          rows[r][c] || ''
        ).trim()

        if (alt) {
          value = alt
          break
        }
      }
    }

    if (!label) continue

    console.log(
      'ROW:',
      r,
      'LABEL:',
      label,
      'VALUE:',
      value
    )

    // ========================================================
    // SECTION DETECTION
    // ========================================================

    if (label === 'father') {
      currentSection = 'father'
      continue
    }

    if (label === 'mother') {
      currentSection = 'mother'
      continue
    }

    if (
      label.includes('siblings')
    ) {
      currentSection = 'sibling'
      continue
    }

    if (
      label.includes('financial')
    ) {
      currentSection = 'financial'
      continue
    }

    if (
      label.includes(
        'living conditions'
      )
    ) {
      currentSection = 'living'
      continue
    }

    // ========================================================
    // CHILD
    // ========================================================

    if (
      label.includes('school id')
    ) {
      child.school_id = value
    }

    else if (
      label.includes(
        'name of the child'
      )
    ) {
      child.full_name = value
    }

    else if (
      label === 'date'
    ) {
      child.admission_date =
        value
    }

    else if (
      label.includes(
        'date of birth'
      )
    ) {
      child.date_of_birth =
        value
    }

    else if (
      label === 'sex'
    ) {
      child.sex = value as
        | 'Male'
        | 'Female'
        | 'Other'
    }

    else if (
      label.includes(
        'present class'
      )
    ) {
      child.present_class =
        value
    }

    // ========================================================
    // FATHER
    // ========================================================

    else if (
      currentSection ===
      'father'
    ) {

      if (
        label.includes('dead') ||
        label.includes('alive')
      ) {

        child.father_status =
          value as FatherStatus
      }

      else if (
        label.includes(
          'nature of work'
        )
      ) {

        child.father_occupation =
          value
      }

      else if (
        label.includes('habit')
      ) {

        child.father_habits =
          value
      }

      else if (
        label.includes(
          'domestic violence'
        )
      ) {

        child.father_dv =
          value
            .toLowerCase()
            .includes('yes')
      }

      else if (
        label.includes('health')
      ) {

        child.father_health =
          value
      }
    }

    // ========================================================
    // MOTHER
    // ========================================================

    else if (
      currentSection ===
      'mother'
    ) {

      if (
        label.includes('dead') ||
        label.includes('alive')
      ) {

        child.mother_status =
          value as MotherStatus
      }

      else if (
        label.includes(
          'nature of work'
        )
      ) {

        child.mother_occupation =
          value
      }

      else if (
        label.includes('habit')
      ) {

        child.mother_habits =
          value
      }

      else if (
        label.includes(
          'domestic violence'
        )
      ) {

        child.mother_dv =
          value
            .toLowerCase()
            .includes('yes')
      }

      else if (
        label.includes('health')
      ) {

        child.mother_health =
          value
      }
    }

    // ========================================================
    // FINANCIAL
    // ========================================================

    else if (
      currentSection ===
      'financial'
    ) {

      if (
        label.includes(
          'income father'
        )
      ) {

        child.avg_income_father =
          value
      }

      else if (
        label.includes(
          'income mother'
        )
      ) {

        child.avg_income_mother =
          value
      }

      else if (
        label.includes(
          'other income'
        )
      ) {

        child.other_income =
          value
      }

      else if (
        label.includes(
          'dependents'
        )
      ) {

        child.num_dependents =
          value
      }

      else if (
        label.includes('debt')
      ) {

        child.debts = value
      }
    }
  }

  // ========================================================
  // VALIDATION
  // ========================================================

  if (
    !child.school_id ||
    !child.full_name
  ) {

    errors.push(
      `Skipped file ${sourceFile} — missing child name or school ID`
    )

    return null
  }

  return child as Child
}

// ============================================================
// FOLLOWUPS
// ============================================================

function buildFollowupFromWide(
  rows: string[][],
  yearCol: {
    label: string
    colIdx: number
  },
  childId: string
): AnnualFollowup | null {

  const fu:
    Partial<AnnualFollowup> = {

    id: crypto.randomUUID(),

    child_id: childId,

    year_label:
      yearCol.label,

    created_at:
      new Date().toISOString(),

    updated_at:
      new Date().toISOString(),
  }

  for (
    let r = 0;
    r < rows.length;
    r++
  ) {

    const label = String(
      rows[r][0] || ''
    )
      .toLowerCase()
      .trim()

    const value = String(
      rows[r][yearCol.colIdx] || ''
    ).trim()

    if (!label || !value)
      continue

    if (
      label.includes(
        'present class'
      )
    ) {
      fu.present_class =
        value
    }

    else if (
      label.includes(
        'father'
      ) &&
      (
        label.includes(
          'alive'
        ) ||
        label.includes(
          'dead'
        )
      )
    ) {

      fu.father_status =
        value as FatherStatus
    }

    else if (
      label.includes(
        'mother'
      ) &&
      (
        label.includes(
          'alive'
        ) ||
        label.includes(
          'dead'
        )
      )
    ) {

      fu.mother_status =
        value as MotherStatus
    }

    else if (
      label.includes(
        'remark'
      )
    ) {

      fu.special_remarks =
        value
    }
  }

  return fu as AnnualFollowup
}

// ============================================================
// CHANGE LOG
// ============================================================

export function detectChanges(
  childId: string,
  childName: string,
  oldData: Partial<Child>,
  newData: Partial<AnnualFollowup>,
  swName: string,
  followupId: string,
  yearLabel: string
) {

  const changes: any[] = []

  const fields = [
    [
      'father_status',
      'father_status',
      'Father status',
    ],

    [
      'mother_status',
      'mother_status',
      'Mother status',
    ],

    [
      'present_class',
      'present_class',
      'Class',
    ],
  ]

  for (const [
    fuKey,
    childKey,
    label,
  ] of fields) {

    const oldVal = String(
      oldData[
        childKey as keyof Child
      ] ?? ''
    )

    const newVal = String(
      newData[
        fuKey as keyof AnnualFollowup
      ] ?? ''
    )

    if (
      newVal &&
      oldVal !== newVal
    ) {

      changes.push({
        id: crypto.randomUUID(),

        child_id: childId,

        child_name: childName,

        field_name: label,

        old_value:
          oldVal || '—',

        new_value: newVal,

        changed_by_name:
          swName,

        followup_id:
          followupId,

        followup_year:
          yearLabel,

        changed_at:
          new Date().toISOString(),
      })
    }
  }

  return changes
}