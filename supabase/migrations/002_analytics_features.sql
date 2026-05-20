-- ============================================================
-- SHISHU MANDIR V2 - Enhanced Schema with Analytics
-- Additional tables for gifts, performance tracking, custom dashboards
-- ============================================================

-- Add to existing schema (run after 001_initial_schema.sql)

-- ============================================================
-- ACADEMIC PERFORMANCE TRACKING
-- ============================================================
CREATE TABLE academic_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  academic_year TEXT NOT NULL,
  class_name TEXT,
  term TEXT CHECK (term IN ('Term 1', 'Term 2', 'Term 3', 'Annual')),
  
  -- Subjects
  english_marks NUMERIC(5,2),
  math_marks NUMERIC(5,2),
  science_marks NUMERIC(5,2),
  social_marks NUMERIC(5,2),
  language_marks NUMERIC(5,2),
  overall_percentage NUMERIC(5,2),
  grade TEXT,
  rank_in_class INTEGER,
  total_students INTEGER,
  
  -- Performance indicators
  attendance_percentage NUMERIC(5,2),
  behavior_rating TEXT CHECK (behavior_rating IN ('Excellent', 'Good', 'Average', 'Needs Improvement')),
  teacher_remarks TEXT,
  
  -- Flags for analysis
  significant_drop BOOLEAN DEFAULT false,
  significant_improvement BOOLEAN DEFAULT false,
  needs_attention BOOLEAN DEFAULT false,
  
  recorded_by UUID REFERENCES social_workers(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_performance_child ON academic_performance(child_id);
CREATE INDEX idx_performance_year ON academic_performance(academic_year);
CREATE INDEX idx_performance_drop ON academic_performance(significant_drop) WHERE significant_drop = true;

-- ============================================================
-- GIFTS & ASSISTANCE TRACKING
-- ============================================================
CREATE TABLE gifts_assistance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  gift_type TEXT NOT NULL CHECK (gift_type IN (
    'Diwali Gift', 'Birthday Gift', 'Christmas Gift', 'Educational Material',
    'Uniform', 'Shoes', 'Books', 'School Bag', 'Sports Equipment',
    'Medical Assistance', 'Food Support', 'Financial Aid', 'Other'
  )),
  item_description TEXT,
  value_amount NUMERIC(10,2),
  given_date DATE NOT NULL,
  given_by TEXT,
  occasion TEXT,
  remarks TEXT,
  photo_url TEXT,
  
  created_by UUID REFERENCES social_workers(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gifts_child ON gifts_assistance(child_id);
CREATE INDEX idx_gifts_date ON gifts_assistance(given_date DESC);
CREATE INDEX idx_gifts_type ON gifts_assistance(gift_type);

-- ============================================================
-- LIFE EVENTS (for correlation analysis)
-- ============================================================
CREATE TABLE life_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  event_date DATE NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'Father Passed Away', 'Mother Passed Away', 'Sibling Passed Away',
    'Parent Divorce', 'Parent Remarriage', 'Change of Residence',
    'Change of School', 'Health Crisis', 'Family Crisis',
    'Violence at Home', 'Parent Lost Job', 'Parent Imprisoned',
    'Other Trauma', 'Positive Event'
  )),
  description TEXT,
  impact_level TEXT CHECK (impact_level IN ('High', 'Medium', 'Low')),
  
  -- For correlation with performance
  correlated_with_performance BOOLEAN DEFAULT false,
  
  recorded_by UUID REFERENCES social_workers(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_child ON life_events(child_id);
CREATE INDEX idx_events_date ON life_events(event_date DESC);
CREATE INDEX idx_events_type ON life_events(event_type);

-- ============================================================
-- CUSTOM DASHBOARDS (for admin)
-- ============================================================
CREATE TABLE custom_dashboards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dashboard_name TEXT NOT NULL,
  created_by UUID REFERENCES social_workers(id),
  is_default BOOLEAN DEFAULT false,
  layout_config JSONB NOT NULL,  -- Stores widget positions, types, filters
  
  -- Sharing
  visible_to_roles TEXT[] DEFAULT ARRAY['admin'],
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DASHBOARD WIDGETS CONFIGURATION
-- ============================================================
CREATE TABLE dashboard_widgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dashboard_id UUID REFERENCES custom_dashboards(id) ON DELETE CASCADE,
  widget_type TEXT NOT NULL CHECK (widget_type IN (
    'admission_by_year', 'father_status_pie', 'gifts_summary',
    'performance_trends', 'dv_statistics', 'sibling_education',
    'class_distribution', 'category_breakdown', 'area_wise',
    'health_overview', 'financial_status', 'custom_filter'
  )),
  widget_title TEXT NOT NULL,
  config JSONB NOT NULL,  -- Chart type, filters, grouping
  position_x INTEGER,
  position_y INTEGER,
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- USER MANAGEMENT (enhanced)
-- ============================================================
ALTER TABLE social_workers ADD COLUMN IF NOT EXISTS can_edit_children BOOLEAN DEFAULT true;
ALTER TABLE social_workers ADD COLUMN IF NOT EXISTS can_view_analytics BOOLEAN DEFAULT false;
ALTER TABLE social_workers ADD COLUMN IF NOT EXISTS can_manage_users BOOLEAN DEFAULT false;
ALTER TABLE social_workers ADD COLUMN IF NOT EXISTS can_export_data BOOLEAN DEFAULT false;
ALTER TABLE social_workers ADD COLUMN IF NOT EXISTS assigned_areas TEXT[];
ALTER TABLE social_workers ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

-- ============================================================
-- GOOGLE DRIVE SYNC LOG
-- ============================================================
CREATE TABLE google_drive_sync_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sync_type TEXT CHECK (sync_type IN ('backup', 'export', 'import')),
  file_id TEXT,  -- Google Drive file ID
  file_name TEXT,
  drive_folder_id TEXT,
  status TEXT CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  records_count INTEGER,
  error_message TEXT,
  initiated_by UUID REFERENCES social_workers(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ============================================================
-- ADVANCED ANALYTICS VIEWS
-- ============================================================

-- Admissions by year
CREATE OR REPLACE VIEW admissions_by_year AS
SELECT 
  EXTRACT(YEAR FROM admission_date) as year,
  COUNT(*) as total_admissions,
  COUNT(*) FILTER (WHERE sex = 'Male') as male_count,
  COUNT(*) FILTER (WHERE sex = 'Female') as female_count,
  COUNT(*) FILTER (WHERE father_status = 'Dead') as father_deceased,
  COUNT(*) FILTER (WHERE father_dv = true) as dv_cases
FROM children
WHERE admission_date IS NOT NULL AND is_active = true
GROUP BY EXTRACT(YEAR FROM admission_date)
ORDER BY year DESC;

-- Performance correlation with life events
CREATE OR REPLACE VIEW performance_event_correlation AS
SELECT 
  c.id as child_id,
  c.full_name,
  c.school_id,
  ap.academic_year,
  ap.overall_percentage,
  ap.significant_drop,
  le.event_type,
  le.event_date,
  le.impact_level,
  ABS(EXTRACT(EPOCH FROM (le.event_date - ap.created_at::date)) / 86400) as days_between
FROM academic_performance ap
JOIN children c ON ap.child_id = c.id
LEFT JOIN life_events le ON le.child_id = c.id
WHERE ap.significant_drop = true
  AND ABS(EXTRACT(EPOCH FROM (le.event_date - ap.created_at::date)) / 86400) < 180
ORDER BY days_between;

-- Class-wise performance summary
CREATE OR REPLACE VIEW class_performance_summary AS
SELECT 
  present_class,
  COUNT(*) as total_students,
  ROUND(AVG(CAST(
    (SELECT ap.overall_percentage 
     FROM academic_performance ap 
     WHERE ap.child_id = children.id 
     ORDER BY ap.created_at DESC LIMIT 1) 
  AS NUMERIC)), 2) as avg_percentage,
  COUNT(*) FILTER (WHERE father_status = 'Alive') as father_alive_count,
  COUNT(*) FILTER (WHERE father_status = 'Dead') as father_deceased_count,
  COUNT(*) FILTER (WHERE mother_status = 'Alive') as mother_alive_count
FROM children
WHERE is_active = true AND present_class IS NOT NULL
GROUP BY present_class
ORDER BY present_class;

-- Sibling education analysis
CREATE OR REPLACE VIEW sibling_education_analysis AS
SELECT 
  COUNT(*) as total_with_siblings,
  COUNT(*) FILTER (WHERE sibling_education LIKE '%School%' OR sibling_education LIKE '%Standard%') as siblings_in_school,
  COUNT(*) FILTER (WHERE sibling_education LIKE '%College%') as siblings_in_college,
  COUNT(*) FILTER (WHERE sibling_education = 'At Home' OR sibling_education LIKE '%Not%') as siblings_not_studying,
  COUNT(*) FILTER (WHERE sibling_sm_support = true) as siblings_sm_supported
FROM children
WHERE sibling_name IS NOT NULL AND is_active = true;

-- ============================================================
-- INDEXES FOR ANALYTICS PERFORMANCE
-- ============================================================
CREATE INDEX idx_children_admission_year ON children(EXTRACT(YEAR FROM admission_date));
CREATE INDEX idx_children_class ON children(present_class) WHERE is_active = true;
CREATE INDEX idx_children_composite ON children(father_status, mother_status, is_active);

-- ============================================================
-- FUNCTIONS FOR DASHBOARD DATA
-- ============================================================

-- Get admission trends (last 5 years)
CREATE OR REPLACE FUNCTION get_admission_trends()
RETURNS TABLE (
  year INTEGER,
  total INTEGER,
  male INTEGER,
  female INTEGER,
  father_deceased INTEGER,
  mother_deceased INTEGER,
  both_parents_alive INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    EXTRACT(YEAR FROM admission_date)::INTEGER as year,
    COUNT(*)::INTEGER as total,
    COUNT(*) FILTER (WHERE sex = 'Male')::INTEGER as male,
    COUNT(*) FILTER (WHERE sex = 'Female')::INTEGER as female,
    COUNT(*) FILTER (WHERE father_status = 'Dead')::INTEGER as father_deceased,
    COUNT(*) FILTER (WHERE mother_status = 'Dead')::INTEGER as mother_deceased,
    COUNT(*) FILTER (WHERE father_status = 'Alive' AND mother_status = 'Alive')::INTEGER as both_parents_alive
  FROM children
  WHERE admission_date IS NOT NULL 
    AND EXTRACT(YEAR FROM admission_date) >= EXTRACT(YEAR FROM CURRENT_DATE) - 5
    AND is_active = true
  GROUP BY EXTRACT(YEAR FROM admission_date)
  ORDER BY year DESC;
END;
$$ LANGUAGE plpgsql;

-- Get performance drop reasons
CREATE OR REPLACE FUNCTION analyze_performance_drops(p_child_id UUID)
RETURNS TABLE (
  possible_reason TEXT,
  event_date DATE,
  performance_date DATE,
  performance_drop NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    le.event_type as possible_reason,
    le.event_date,
    ap.created_at::DATE as performance_date,
    (LAG(ap.overall_percentage) OVER (ORDER BY ap.created_at) - ap.overall_percentage) as performance_drop
  FROM academic_performance ap
  LEFT JOIN life_events le ON le.child_id = ap.child_id 
    AND le.event_date BETWEEN (ap.created_at::DATE - INTERVAL '6 months') AND ap.created_at::DATE
  WHERE ap.child_id = p_child_id
    AND ap.significant_drop = true
  ORDER BY ap.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- RLS POLICIES UPDATE
-- ============================================================

-- Admin can manage everything
CREATE POLICY "admin_all_performance" ON academic_performance
  FOR ALL USING (
    EXISTS (SELECT 1 FROM social_workers WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "workers_read_performance" ON academic_performance
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "workers_insert_performance" ON academic_performance
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Similar for gifts
CREATE POLICY "admin_all_gifts" ON gifts_assistance
  FOR ALL USING (
    EXISTS (SELECT 1 FROM social_workers WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "workers_view_gifts" ON gifts_assistance
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "workers_add_gifts" ON gifts_assistance
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Life events
CREATE POLICY "all_life_events" ON life_events
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Custom dashboards - admin only
CREATE POLICY "admin_dashboards" ON custom_dashboards
  FOR ALL USING (
    EXISTS (SELECT 1 FROM social_workers WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "view_shared_dashboards" ON custom_dashboards
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      auth.uid() = created_by OR
      (SELECT role FROM social_workers WHERE id = auth.uid()) = ANY(visible_to_roles)
    )
  );
