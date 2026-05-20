-- ============================================================
-- CREATE SOCIAL WORKER USERS FOR TESTING
-- Run this in Supabase SQL Editor after running the schema
-- ============================================================

-- Social Worker 1: Field Worker
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated',
  'authenticated',
  'narasimha@shishumandir.org',
  crypt('worker123', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  NOW(),
  NOW(),
  '',
  ''
);

INSERT INTO social_workers (id, full_name, employee_id, role, phone, area_assigned, is_active)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Narasimhamurthy R.V.',
  'SW_NRV_001',
  'field_worker',
  '9876543210',
  'K.R.Puram, Bangalore',
  true
);

-- Social Worker 2: Supervisor
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '22222222-2222-2222-2222-222222222222',
  'authenticated',
  'authenticated',
  'raghu@shishumandir.org',
  crypt('supervisor123', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  NOW(),
  NOW(),
  '',
  ''
);

INSERT INTO social_workers (id, full_name, employee_id, role, phone, area_assigned, is_active)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  'Raghu K.S.',
  'SW_RKS_002',
  'supervisor',
  '9876543211',
  'All Areas',
  true
);

-- Social Worker 3: Admin
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '33333333-3333-3333-3333-333333333333',
  'authenticated',
  'authenticated',
  'admin@shishumandir.org',
  crypt('admin123', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  NOW(),
  NOW(),
  '',
  ''
);

INSERT INTO social_workers (id, full_name, employee_id, role, phone, is_active)
VALUES (
  '33333333-3333-3333-3333-333333333333',
  'Admin User',
  'SW_ADMIN',
  'admin',
  '9876543212',
  true
);

-- ============================================================
-- LOGIN CREDENTIALS
-- ============================================================
-- Field Worker:
--   Email: narasimha@shishumandir.org
--   Password: worker123

-- Supervisor:
--   Email: raghu@shishumandir.org
--   Password: supervisor123

-- Admin:
--   Email: admin@shishumandir.org
--   Password: admin123
