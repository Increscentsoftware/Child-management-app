-- ============================================================
-- SHISHU MANDIR - Complete Database Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- SOCIAL WORKERS (maps to Supabase Auth users)
-- ============================================================
CREATE TABLE social_workers (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  employee_id TEXT UNIQUE,
  role TEXT NOT NULL DEFAULT 'field_worker' CHECK (role IN ('field_worker', 'supervisor', 'admin')),
  phone TEXT,
  area_assigned TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CHILDREN (core record — always reflects LATEST state)
-- ============================================================
CREATE TABLE children (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id TEXT UNIQUE NOT NULL,              -- e.g. "613", "435-2016-20"
  admission_date DATE,
  full_name TEXT NOT NULL,
  date_of_birth DATE,
  sex TEXT CHECK (sex IN ('Male', 'Female', 'Other')),
  religion TEXT,
  mother_tongue TEXT,
  present_class TEXT,
  category TEXT CHECK (category IN ('Category I','Category II','Category III','Category IV')),
  aadhar_no TEXT,
  normal_or_special TEXT DEFAULT 'Normal',
  photo_url TEXT,                              -- Supabase Storage URL

  -- Father details (current / latest)
  father_name TEXT,
  father_age TEXT,
  father_aadhar TEXT,
  father_mobile TEXT,
  father_status TEXT DEFAULT 'Alive' CHECK (father_status IN ('Alive','Dead','Abandoned','Unknown')),
  father_occupation TEXT,
  father_earnings TEXT,
  father_education TEXT,
  father_habits TEXT,
  father_health TEXT,
  father_dv BOOLEAN DEFAULT false,
  father_extramarital BOOLEAN DEFAULT false,
  father_origin TEXT,

  -- Mother details (current / latest)
  mother_name TEXT,
  mother_age TEXT,
  mother_aadhar TEXT,
  mother_mobile TEXT,
  mother_status TEXT DEFAULT 'Alive' CHECK (mother_status IN ('Alive','Dead','Abandoned','Unknown')),
  mother_occupation TEXT,
  mother_earnings TEXT,
  mother_education TEXT,
  mother_habits TEXT,
  mother_health TEXT,
  mother_dv BOOLEAN DEFAULT false,
  mother_extramarital BOOLEAN DEFAULT false,
  mother_origin TEXT,
  family_planning_op BOOLEAN DEFAULT false,

  -- Family background
  year_of_marriage TEXT,
  marriage_type TEXT,

  -- Sibling (first sibling — add sibling table for multiple)
  sibling_name TEXT,
  sibling_age TEXT,
  sibling_sex TEXT,
  sibling_education TEXT,
  sibling_sm_support BOOLEAN DEFAULT false,

  -- Financial
  avg_income_father TEXT,
  avg_income_mother TEXT,
  other_income TEXT,
  num_dependents TEXT,
  debts TEXT,
  savings TEXT,

  -- Living conditions
  area TEXT,
  house_size TEXT,
  house_roof TEXT,
  house_floor TEXT,
  house_ownership TEXT,
  rent_per_month TEXT,
  advance_paid TEXT,
  vehicles TEXT,

  -- Child health
  height_cm TEXT,
  weight_kg TEXT,
  child_health TEXT,
  meals_per_day TEXT,
  food_type TEXT,
  medical_help_from TEXT,
  no_of_meals TEXT,

  -- Life skills training
  mother_life_skills BOOLEAN DEFAULT false,
  father_life_skills BOOLEAN DEFAULT false,

  -- Special remarks / conclusion
  special_remarks TEXT,

  -- Source file (for import tracking)
  source_file TEXT,
  imported_at TIMESTAMPTZ,

  -- Meta
  created_by UUID REFERENCES social_workers(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_followup_date DATE,
  last_followup_by UUID REFERENCES social_workers(id),
  is_active BOOLEAN DEFAULT true
);

-- ============================================================
-- ANNUAL FOLLOW-UPS (one row per year per child)
-- ============================================================
CREATE TABLE annual_followups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  year_label TEXT NOT NULL,                    -- e.g. "2024-25", "On Admission"
  visit_date DATE,

  -- Child state at time of follow-up (snapshot)
  present_class TEXT,
  child_height TEXT,
  child_weight TEXT,
  child_health TEXT,

  -- Father state at follow-up
  father_status TEXT,
  father_occupation TEXT,
  father_earnings TEXT,
  father_habits TEXT,
  father_health TEXT,
  father_dv BOOLEAN,

  -- Mother state at follow-up
  mother_status TEXT,
  mother_occupation TEXT,
  mother_earnings TEXT,
  mother_health TEXT,

  -- Sibling
  sibling_age TEXT,
  sibling_education TEXT,

  -- Financial
  rent_per_month TEXT,
  num_dependents TEXT,
  debts TEXT,

  -- Life skills
  mother_life_skills BOOLEAN,
  father_life_skills BOOLEAN,

  -- Photos at follow-up
  photo_url TEXT,

  -- Remarks
  special_remarks TEXT,

  -- Social worker
  recorded_by UUID REFERENCES social_workers(id),
  recorded_by_name TEXT,                       -- denormalised for offline use
  verified_by TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CHANGE LOG (field-level audit trail)
-- ============================================================
CREATE TABLE change_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  child_name TEXT NOT NULL,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by UUID REFERENCES social_workers(id),
  changed_by_name TEXT,
  followup_id UUID REFERENCES annual_followups(id),
  followup_year TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SYNC QUEUE (offline-first: records created offline)
-- ============================================================
CREATE TABLE sync_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  operation TEXT NOT NULL CHECK (operation IN ('INSERT','UPDATE','DELETE')),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ,
  error TEXT,
  retry_count INT DEFAULT 0
);

-- ============================================================
-- PHOTOS (Supabase Storage references)
-- ============================================================
CREATE TABLE child_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  followup_id UUID REFERENCES annual_followups(id),
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  taken_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by UUID REFERENCES social_workers(id)
);

-- ============================================================
-- INDEXES for fast queries
-- ============================================================
CREATE INDEX idx_children_school_id ON children(school_id);
CREATE INDEX idx_children_father_status ON children(father_status);
CREATE INDEX idx_children_father_dv ON children(father_dv);
CREATE INDEX idx_children_area ON children(area);
CREATE INDEX idx_children_active ON children(is_active);
CREATE INDEX idx_children_updated ON children(updated_at DESC);
CREATE INDEX idx_followups_child ON annual_followups(child_id);
CREATE INDEX idx_followups_year ON annual_followups(year_label);
CREATE INDEX idx_changelog_child ON change_log(child_id);
CREATE INDEX idx_changelog_changed_at ON change_log(changed_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE social_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE annual_followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_queue ENABLE ROW LEVEL SECURITY;

-- Social workers can see their own profile; admins see all
CREATE POLICY "sw_own_profile" ON social_workers
  FOR ALL USING (id = auth.uid() OR EXISTS (
    SELECT 1 FROM social_workers WHERE id = auth.uid() AND role IN ('admin','supervisor')
  ));

-- All authenticated workers can read children
CREATE POLICY "children_read" ON children
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Workers can insert children
CREATE POLICY "children_insert" ON children
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Workers can update only; admins can do anything
CREATE POLICY "children_update" ON children
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Follow-ups: all authenticated
CREATE POLICY "followups_all" ON annual_followups
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Change log: read only for all, insert by system
CREATE POLICY "changelog_read" ON change_log
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "changelog_insert" ON change_log
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Photos
CREATE POLICY "photos_all" ON child_photos
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Sync queue: own records only
CREATE POLICY "sync_own" ON sync_queue
  FOR ALL USING (auth.uid() IS NOT NULL);

-- ============================================================
-- UPDATED_AT trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_children_updated BEFORE UPDATE ON children
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_followups_updated BEFORE UPDATE ON annual_followups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- STORAGE BUCKET (run separately in Supabase dashboard or CLI)
-- ============================================================
-- INSERT INTO storage.buckets (id, name, public) VALUES ('child-photos', 'child-photos', false);
-- CREATE POLICY "auth_upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'child-photos' AND auth.uid() IS NOT NULL);
-- CREATE POLICY "auth_read"   ON storage.objects FOR SELECT USING (bucket_id = 'child-photos' AND auth.uid() IS NOT NULL);
