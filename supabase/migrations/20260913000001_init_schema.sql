-- Oyame Tiase Assembly Management System
-- Phase 2: normalized schema for a single local assembly.
-- assembly_id is present for future district expansion; this app is single-assembly.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC;
GRANT USAGE ON SCHEMA app_private TO postgres, service_role, authenticated, anon;

-- ---------------------------------------------------------------------------
-- Utility
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.current_assembly_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT id FROM public.assemblies ORDER BY created_at ASC LIMIT 1;
$$;

-- ---------------------------------------------------------------------------
-- Assembly (single row in this deployment)
-- ---------------------------------------------------------------------------

CREATE TABLE public.assemblies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_name text NOT NULL DEFAULT 'The Church of Pentecost',
  assembly_name text NOT NULL DEFAULT 'Oyame Tiase Assembly',
  logo_url text,
  phone text,
  email citext,
  address text,
  location text,
  service_times jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER assemblies_updated_at
  BEFORE UPDATE ON public.assemblies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Roles / positions (positions are configurable; roles are system)
-- ---------------------------------------------------------------------------

CREATE TABLE public.roles (
  slug text PRIMARY KEY,
  name text NOT NULL,
  description text,
  is_system boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 100
);

INSERT INTO public.roles (slug, name, description, sort_order) VALUES
  ('presiding_elder', 'Presiding Elder', 'Highest local assembly authority', 10),
  ('secretary', 'Assembly Secretary', 'Membership, attendance, programs, reports', 20),
  ('treasurer', 'Treasurer / Finance Officer', 'Tithes, offerings, expenses, receipts', 30),
  ('department_leader', 'Department Leader', 'Scoped to assigned department(s)', 40),
  ('worker', 'Worker / Officer', 'Assigned operational responsibilities', 50),
  ('member', 'Member', 'Member portal access only', 60);

CREATE TABLE public.positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assembly_id uuid NOT NULL REFERENCES public.assemblies (id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assembly_id, slug)
);

CREATE TRIGGER positions_updated_at
  BEFORE UPDATE ON public.positions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Departments
-- ---------------------------------------------------------------------------

CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assembly_id uuid NOT NULL REFERENCES public.assemblies (id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  meeting_day text,
  meeting_time time,
  is_active boolean NOT NULL DEFAULT true,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assembly_id, slug)
);

CREATE TRIGGER departments_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX departments_assembly_idx ON public.departments (assembly_id, is_active);

-- ---------------------------------------------------------------------------
-- Members
-- ---------------------------------------------------------------------------

CREATE TYPE public.gender AS ENUM ('male', 'female');
CREATE TYPE public.marital_status AS ENUM (
  'single', 'married', 'widowed', 'divorced', 'separated', 'other'
);
CREATE TYPE public.membership_status AS ENUM (
  'active', 'inactive', 'visitor', 'new_convert', 'transferred', 'deceased', 'other'
);
CREATE TYPE public.baptism_status AS ENUM ('baptized', 'not_baptized', 'unknown');

CREATE SEQUENCE public.member_code_seq START 1;

CREATE TABLE public.members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assembly_id uuid NOT NULL REFERENCES public.assemblies (id) ON DELETE CASCADE,
  member_code text NOT NULL,
  first_name text NOT NULL,
  middle_name text,
  last_name text NOT NULL,
  gender public.gender NOT NULL,
  date_of_birth date,
  phone text,
  email citext,
  residential_address text,
  photo_url text,
  occupation text,
  marital_status public.marital_status,
  date_joined date,
  membership_status public.membership_status NOT NULL DEFAULT 'active',
  baptism_status public.baptism_status NOT NULL DEFAULT 'unknown',
  baptism_date date,
  primary_department_id uuid REFERENCES public.departments (id) ON DELETE SET NULL,
  previous_assembly text,
  transfer_notes text,
  emergency_contact_name text,
  emergency_relationship text,
  emergency_phone text,
  notes text,
  archived_at timestamptz,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assembly_id, member_code)
);

CREATE TRIGGER members_updated_at
  BEFORE UPDATE ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX members_name_trgm_idx ON public.members USING gin (
  (first_name || ' ' || coalesce(middle_name, '') || ' ' || last_name) gin_trgm_ops
);
CREATE INDEX members_status_idx ON public.members (assembly_id, membership_status) WHERE archived_at IS NULL;
CREATE INDEX members_department_idx ON public.members (primary_department_id) WHERE archived_at IS NULL;
CREATE INDEX members_gender_idx ON public.members (gender) WHERE archived_at IS NULL;
CREATE INDEX members_phone_idx ON public.members (phone);
CREATE INDEX members_email_idx ON public.members (email);

CREATE OR REPLACE FUNCTION public.assign_member_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.member_code IS NULL OR btrim(NEW.member_code) = '' THEN
    NEW.member_code := 'COP-OTA-' || lpad(nextval('public.member_code_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER members_assign_code
  BEFORE INSERT ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.assign_member_code();

-- ---------------------------------------------------------------------------
-- Profiles (login accounts)
-- ---------------------------------------------------------------------------

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  assembly_id uuid NOT NULL REFERENCES public.assemblies (id) ON DELETE CASCADE,
  member_id uuid REFERENCES public.members (id) ON DELETE SET NULL,
  role_slug text NOT NULL REFERENCES public.roles (slug),
  full_name text NOT NULL,
  email citext NOT NULL,
  phone text,
  avatar_url text,
  is_active boolean NOT NULL DEFAULT true,
  last_login_at timestamptz,
  invited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (member_id)
);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX profiles_role_idx ON public.profiles (role_slug);
CREATE INDEX profiles_assembly_idx ON public.profiles (assembly_id, is_active);

ALTER TABLE public.members
  ADD CONSTRAINT members_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles (id) ON DELETE SET NULL;
ALTER TABLE public.members
  ADD CONSTRAINT members_updated_by_fkey
  FOREIGN KEY (updated_by) REFERENCES public.profiles (id) ON DELETE SET NULL;

-- Department leaders (after profiles exist)
ALTER TABLE public.departments
  ADD COLUMN leader_id uuid REFERENCES public.members (id) ON DELETE SET NULL;
ALTER TABLE public.departments
  ADD COLUMN assistant_leader_id uuid REFERENCES public.members (id) ON DELETE SET NULL;

CREATE TABLE public.department_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid NOT NULL REFERENCES public.departments (id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.members (id) ON DELETE CASCADE,
  role_in_department text,
  joined_at date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (department_id, member_id)
);

CREATE INDEX department_members_member_idx ON public.department_members (member_id);

-- ---------------------------------------------------------------------------
-- Workers / officers
-- ---------------------------------------------------------------------------

CREATE TYPE public.worker_status AS ENUM ('active', 'inactive', 'ended');

CREATE TABLE public.workers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assembly_id uuid NOT NULL REFERENCES public.assemblies (id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.members (id) ON DELETE CASCADE,
  position_id uuid NOT NULL REFERENCES public.positions (id) ON DELETE RESTRICT,
  department_id uuid REFERENCES public.departments (id) ON DELETE SET NULL,
  start_date date NOT NULL DEFAULT current_date,
  end_date date,
  status public.worker_status NOT NULL DEFAULT 'active',
  contact_phone text,
  contact_email citext,
  notes text,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER workers_updated_at
  BEFORE UPDATE ON public.workers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX workers_member_idx ON public.workers (member_id);
CREATE INDEX workers_status_idx ON public.workers (assembly_id, status) WHERE archived_at IS NULL;

-- ---------------------------------------------------------------------------
-- Services & attendance
-- ---------------------------------------------------------------------------

CREATE TYPE public.attendance_status AS ENUM ('present', 'absent', 'excused');

CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assembly_id uuid NOT NULL REFERENCES public.assemblies (id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  default_day text,
  default_time time,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assembly_id, slug)
);

CREATE TRIGGER services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assembly_id uuid NOT NULL REFERENCES public.assemblies (id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  venue text,
  organizer_id uuid REFERENCES public.members (id) ON DELETE SET NULL,
  department_id uuid REFERENCES public.departments (id) ON DELETE SET NULL,
  banner_url text,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('draft', 'scheduled', 'completed', 'cancelled')),
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX events_starts_idx ON public.events (assembly_id, starts_at);
CREATE INDEX events_department_idx ON public.events (department_id);

CREATE TABLE public.visitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assembly_id uuid NOT NULL REFERENCES public.assemblies (id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text,
  email citext,
  location text,
  date_visited date NOT NULL DEFAULT current_date,
  service_id uuid REFERENCES public.services (id) ON DELETE SET NULL,
  how_heard text,
  prayer_request text,
  assigned_to uuid REFERENCES public.members (id) ON DELETE SET NULL,
  follow_up_status text NOT NULL DEFAULT 'new' CHECK (
    follow_up_status IN ('new', 'contacted', 'follow_up_scheduled', 'interested', 'joined', 'not_reachable', 'closed')
  ),
  converted_member_id uuid REFERENCES public.members (id) ON DELETE SET NULL,
  notes text,
  archived_at timestamptz,
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER visitors_updated_at
  BEFORE UPDATE ON public.visitors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX visitors_name_trgm_idx ON public.visitors USING gin (full_name gin_trgm_ops);
CREATE INDEX visitors_status_idx ON public.visitors (assembly_id, follow_up_status) WHERE archived_at IS NULL;
CREATE INDEX visitors_assigned_idx ON public.visitors (assigned_to);

CREATE TABLE public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assembly_id uuid NOT NULL REFERENCES public.assemblies (id) ON DELETE CASCADE,
  member_id uuid REFERENCES public.members (id) ON DELETE CASCADE,
  visitor_id uuid REFERENCES public.visitors (id) ON DELETE CASCADE,
  service_id uuid REFERENCES public.services (id) ON DELETE SET NULL,
  event_id uuid REFERENCES public.events (id) ON DELETE SET NULL,
  department_id uuid REFERENCES public.departments (id) ON DELETE SET NULL,
  attendance_date date NOT NULL,
  status public.attendance_status NOT NULL DEFAULT 'present',
  check_in_time timestamptz,
  recorded_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  notes text,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT attendance_subject_chk CHECK (
    (member_id IS NOT NULL AND visitor_id IS NULL)
    OR (member_id IS NULL AND visitor_id IS NOT NULL)
  )
);

CREATE TRIGGER attendance_updated_at
  BEFORE UPDATE ON public.attendance
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE UNIQUE INDEX attendance_member_unique
  ON public.attendance (member_id, attendance_date, coalesce(service_id, '00000000-0000-0000-0000-000000000000'::uuid), coalesce(event_id, '00000000-0000-0000-0000-000000000000'::uuid))
  WHERE member_id IS NOT NULL AND archived_at IS NULL;

CREATE UNIQUE INDEX attendance_visitor_unique
  ON public.attendance (visitor_id, attendance_date, coalesce(service_id, '00000000-0000-0000-0000-000000000000'::uuid), coalesce(event_id, '00000000-0000-0000-0000-000000000000'::uuid))
  WHERE visitor_id IS NOT NULL AND archived_at IS NULL;

CREATE INDEX attendance_date_idx ON public.attendance (assembly_id, attendance_date);
CREATE INDEX attendance_service_idx ON public.attendance (service_id, attendance_date);
CREATE INDEX attendance_department_idx ON public.attendance (department_id, attendance_date);

-- ---------------------------------------------------------------------------
-- Follow-ups
-- ---------------------------------------------------------------------------

CREATE TABLE public.visitor_followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id uuid NOT NULL REFERENCES public.visitors (id) ON DELETE CASCADE,
  follow_up_date date NOT NULL DEFAULT current_date,
  method text,
  notes text,
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX visitor_followups_visitor_idx ON public.visitor_followups (visitor_id, follow_up_date DESC);

CREATE TABLE public.member_followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assembly_id uuid NOT NULL REFERENCES public.assemblies (id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.members (id) ON DELETE CASCADE,
  follow_up_type text NOT NULL DEFAULT 'new_member' CHECK (
    follow_up_type IN ('new_member', 'new_convert', 'inactive', 'pastoral', 'other')
  ),
  assigned_to uuid REFERENCES public.members (id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'open' CHECK (
    status IN ('open', 'in_progress', 'needs_attention', 'completed', 'closed')
  ),
  progress text,
  notes text,
  started_on date NOT NULL DEFAULT current_date,
  next_contact_on date,
  archived_at timestamptz,
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER member_followups_updated_at
  BEFORE UPDATE ON public.member_followups
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX member_followups_status_idx ON public.member_followups (assembly_id, status) WHERE archived_at IS NULL;
CREATE INDEX member_followups_assigned_idx ON public.member_followups (assigned_to);

CREATE TABLE public.member_followup_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  followup_id uuid NOT NULL REFERENCES public.member_followups (id) ON DELETE CASCADE,
  attempt_date date NOT NULL DEFAULT current_date,
  method text,
  notes text,
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Announcements
-- ---------------------------------------------------------------------------

CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assembly_id uuid NOT NULL REFERENCES public.assemblies (id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  image_url text,
  category text NOT NULL DEFAULT 'general' CHECK (
    category IN ('general', 'program', 'department', 'emergency', 'reminder', 'information')
  ),
  audience text NOT NULL DEFAULT 'everyone' CHECK (
    audience IN ('everyone', 'members', 'youth', 'men', 'women', 'children', 'department', 'officers')
  ),
  department_id uuid REFERENCES public.departments (id) ON DELETE SET NULL,
  published_at timestamptz,
  expires_at timestamptz,
  author_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX announcements_published_idx ON public.announcements (assembly_id, published_at DESC);

-- ---------------------------------------------------------------------------
-- Prayer requests
-- ---------------------------------------------------------------------------

CREATE TYPE public.prayer_privacy AS ENUM (
  'private', 'presiding_elder', 'authorized_leaders', 'prayer_team'
);
CREATE TYPE public.prayer_status AS ENUM (
  'pending', 'praying', 'follow_up_required', 'answered', 'closed'
);

CREATE TABLE public.prayer_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assembly_id uuid NOT NULL REFERENCES public.assemblies (id) ON DELETE CASCADE,
  member_id uuid REFERENCES public.members (id) ON DELETE SET NULL,
  submitted_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  title text NOT NULL,
  request text NOT NULL,
  privacy_level public.prayer_privacy NOT NULL DEFAULT 'prayer_team',
  status public.prayer_status NOT NULL DEFAULT 'pending',
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER prayer_requests_updated_at
  BEFORE UPDATE ON public.prayer_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX prayer_requests_status_idx ON public.prayer_requests (assembly_id, status) WHERE archived_at IS NULL;

-- ---------------------------------------------------------------------------
-- Welfare
-- ---------------------------------------------------------------------------

CREATE TABLE public.welfare_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assembly_id uuid NOT NULL REFERENCES public.assemblies (id) ON DELETE CASCADE,
  member_id uuid REFERENCES public.members (id) ON DELETE SET NULL,
  category text NOT NULL CHECK (
    category IN ('medical', 'bereavement', 'emergency', 'food', 'other')
  ),
  description text NOT NULL,
  assistance_requested text,
  assistance_provided text,
  amount numeric(12, 2),
  currency text NOT NULL DEFAULT 'GHS',
  responsible_officer_id uuid REFERENCES public.members (id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'open' CHECK (
    status IN ('open', 'in_review', 'approved', 'provided', 'closed', 'declined')
  ),
  notes text,
  archived_at timestamptz,
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER welfare_cases_updated_at
  BEFORE UPDATE ON public.welfare_cases
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX welfare_cases_status_idx ON public.welfare_cases (assembly_id, status) WHERE archived_at IS NULL;

-- ---------------------------------------------------------------------------
-- Finance
-- ---------------------------------------------------------------------------

CREATE TYPE public.financial_type AS ENUM ('income', 'expense');
CREATE TYPE public.payment_method AS ENUM ('cash', 'mobile_money', 'bank', 'other');

CREATE TABLE public.financial_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assembly_id uuid NOT NULL REFERENCES public.assemblies (id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  type public.financial_type NOT NULL,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assembly_id, slug)
);

CREATE SEQUENCE public.transaction_code_seq START 1;

CREATE TABLE public.financial_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assembly_id uuid NOT NULL REFERENCES public.assemblies (id) ON DELETE CASCADE,
  transaction_code text NOT NULL,
  occurred_on date NOT NULL DEFAULT current_date,
  type public.financial_type NOT NULL,
  category_id uuid NOT NULL REFERENCES public.financial_categories (id) ON DELETE RESTRICT,
  amount numeric(12, 2) NOT NULL CHECK (amount > 0),
  description text,
  payment_method public.payment_method NOT NULL DEFAULT 'cash',
  reference text,
  recorded_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  document_path text,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assembly_id, transaction_code)
);

CREATE TRIGGER financial_transactions_updated_at
  BEFORE UPDATE ON public.financial_transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.assign_transaction_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.transaction_code IS NULL OR btrim(NEW.transaction_code) = '' THEN
    NEW.transaction_code := 'TXN-' || to_char(NEW.occurred_on, 'YYYYMM') || '-' ||
      lpad(nextval('public.transaction_code_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER financial_transactions_assign_code
  BEFORE INSERT ON public.financial_transactions
  FOR EACH ROW EXECUTE FUNCTION public.assign_transaction_code();

CREATE INDEX financial_transactions_date_idx ON public.financial_transactions (assembly_id, occurred_on DESC);
CREATE INDEX financial_transactions_type_idx ON public.financial_transactions (type, category_id);
CREATE INDEX financial_transactions_search_idx ON public.financial_transactions USING gin (description gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- Documents, notifications, audit, settings
-- ---------------------------------------------------------------------------

CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assembly_id uuid NOT NULL REFERENCES public.assemblies (id) ON DELETE CASCADE,
  title text NOT NULL,
  category text NOT NULL CHECK (
    category IN (
      'assembly_report', 'minutes', 'letter', 'financial',
      'member', 'program', 'administrative', 'other'
    )
  ),
  storage_path text NOT NULL,
  mime_type text,
  size_bytes bigint,
  visibility text NOT NULL DEFAULT 'leadership' CHECK (
    visibility IN ('presiding_elder', 'leadership', 'finance', 'officers', 'members', 'department')
  ),
  department_id uuid REFERENCES public.departments (id) ON DELETE SET NULL,
  related_member_id uuid REFERENCES public.members (id) ON DELETE SET NULL,
  uploaded_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assembly_id uuid NOT NULL REFERENCES public.assemblies (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  link text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX notifications_user_idx ON public.notifications (user_id, is_read, created_at DESC);

CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assembly_id uuid REFERENCES public.assemblies (id) ON DELETE SET NULL,
  user_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  action text NOT NULL,
  module text NOT NULL,
  record_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX audit_logs_created_idx ON public.audit_logs (created_at DESC);
CREATE INDEX audit_logs_module_idx ON public.audit_logs (module, action);
CREATE INDEX audit_logs_user_idx ON public.audit_logs (user_id);

CREATE TABLE public.system_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.department_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assembly_id uuid NOT NULL REFERENCES public.assemblies (id) ON DELETE CASCADE,
  department_id uuid NOT NULL REFERENCES public.departments (id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  period_start date,
  period_end date,
  submitted_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.department_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid NOT NULL REFERENCES public.departments (id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  activity_date date NOT NULL DEFAULT current_date,
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Default assembly + settings
-- ---------------------------------------------------------------------------

INSERT INTO public.assemblies (church_name, assembly_name, location, phone, service_times)
VALUES (
  'The Church of Pentecost',
  'Oyame Tiase Assembly',
  'Oyame Tiase',
  NULL,
  '[
    {"name":"Sunday Worship","day":"Sunday","time":"08:00"},
    {"name":"Midweek Service","day":"Wednesday","time":"18:00"}
  ]'::jsonb
);

INSERT INTO public.system_settings (key, value) VALUES
  ('notification_preferences', '{"in_app": true, "email": false}'::jsonb),
  ('member_code_prefix', '"COP-OTA"'::jsonb),
  ('currency', '"GHS"'::jsonb),
  ('seed_marker', '{"is_production_default": true}'::jsonb);
