export interface FormField {
  id: string
  field_name: string
  field_label: string
  field_type: string
  field_options?: string[]
  is_required?: boolean
  section: string
  placeholder?: string
}

export const CHILD_FORM_SCHEMA: FormField[] = [

  // GENERAL

  {
    id: '1',
    field_name: 'school_id',
    field_label: 'School ID',
    field_type: 'text',
    is_required: true,
    section: 'general'
  },

  {
    id: '2',
    field_name: 'full_name',
    field_label: 'Child Name',
    field_type: 'text',
    is_required: true,
    section: 'general'
  },

  {
    id: '3',
    field_name: 'admission_date',
    field_label: 'Admission Date',
    field_type: 'date',
    section: 'general'
  },

  {
    id: '4',
    field_name: 'date_of_birth',
    field_label: 'Date of Birth',
    field_type: 'date',
    section: 'general'
  },

  {
    id: '5',
    field_name: 'sex',
    field_label: 'Gender',
    field_type: 'select',
    field_options: ['Male', 'Female'],
    section: 'general'
  },

  {
    id: '6',
    field_name: 'religion',
    field_label: 'Religion',
    field_type: 'text',
    section: 'general'
  },

  {
    id: '7',
    field_name: 'mother_tongue',
    field_label: 'Mother Tongue',
    field_type: 'text',
    section: 'general'
  },

  {
    id: '8',
    field_name: 'present_class',
    field_label: 'Present Class',
    field_type: 'text',
    section: 'general'
  },

  {
    id: '9',
    field_name: 'category',
    field_label: 'Category',
    field_type: 'text',
    section: 'general'
  },

  {
    id: '10',
    field_name: 'aadhar_no',
    field_label: 'Aadhar Number',
    field_type: 'text',
    section: 'general'
  },

  // FATHER

  {
    id: '11',
    field_name: 'father_name',
    field_label: 'Father Name',
    field_type: 'text',
    section: 'father'
  },

  {
    id: '12',
    field_name: 'father_age',
    field_label: 'Father Age',
    field_type: 'number',
    section: 'father'
  },

  {
    id: '13',
    field_name: 'father_mobile',
    field_label: 'Father Mobile',
    field_type: 'text',
    section: 'father'
  },

  {
    id: '14',
    field_name: 'father_status',
    field_label: 'Father Status',
    field_type: 'select',
    field_options: ['Alive', 'Dead', 'Abandoned'],
    section: 'father'
  },

  {
    id: '15',
    field_name: 'father_occupation',
    field_label: 'Father Occupation',
    field_type: 'text',
    section: 'father'
  },

  {
    id: '16',
    field_name: 'father_education',
    field_label: 'Father Education',
    field_type: 'text',
    section: 'father'
  },

  {
    id: '17',
    field_name: 'father_habits',
    field_label: 'Father Habits',
    field_type: 'text',
    section: 'father'
  },

  // MOTHER

  {
    id: '18',
    field_name: 'mother_name',
    field_label: 'Mother Name',
    field_type: 'text',
    section: 'mother'
  },

  {
    id: '19',
    field_name: 'mother_age',
    field_label: 'Mother Age',
    field_type: 'number',
    section: 'mother'
  },

  {
    id: '20',
    field_name: 'mother_mobile',
    field_label: 'Mother Mobile',
    field_type: 'text',
    section: 'mother'
  },

  {
    id: '21',
    field_name: 'mother_occupation',
    field_label: 'Mother Occupation',
    field_type: 'text',
    section: 'mother'
  },

  {
    id: '22',
    field_name: 'mother_education',
    field_label: 'Mother Education',
    field_type: 'text',
    section: 'mother'
  },

  // FINANCIAL

  {
    id: '23',
    field_name: 'avg_income_father',
    field_label: 'Father Income',
    field_type: 'text',
    section: 'financial'
  },

  {
    id: '24',
    field_name: 'avg_income_mother',
    field_label: 'Mother Income',
    field_type: 'text',
    section: 'financial'
  },

  {
    id: '25',
    field_name: 'debts',
    field_label: 'Debts',
    field_type: 'textarea',
    section: 'financial'
  },

  // HEALTH

  {
    id: '26',
    field_name: 'height_cm',
    field_label: 'Height',
    field_type: 'text',
    section: 'health'
  },

  {
    id: '27',
    field_name: 'weight_kg',
    field_label: 'Weight',
    field_type: 'text',
    section: 'health'
  },

  {
    id: '28',
    field_name: 'child_health',
    field_label: 'Child Health',
    field_type: 'textarea',
    section: 'health'
  },

  // REMARKS

  {
    id: '29',
    field_name: 'special_remarks',
    field_label: 'Social Worker Remarks',
    field_type: 'textarea',
    section: 'remarks'
  }
]