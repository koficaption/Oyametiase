-- Privileged helpers live in app_private. Roles are read from profiles, never user_metadata.

CREATE OR REPLACE FUNCTION app_private.current_profile()
RETURNS public.profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT p.*
  FROM public.profiles p
  WHERE p.id = auth.uid()
    AND p.is_active = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION app_private.role_slug()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT (app_private.current_profile()).role_slug;
$$;

CREATE OR REPLACE FUNCTION app_private.has_role(allowed text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT COALESCE(app_private.role_slug() = ANY (allowed), false);
$$;

CREATE OR REPLACE FUNCTION app_private.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT app_private.has_role(ARRAY['presiding_elder']);
$$;

CREATE OR REPLACE FUNCTION app_private.is_leadership()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT app_private.has_role(ARRAY['presiding_elder', 'secretary']);
$$;

CREATE OR REPLACE FUNCTION app_private.member_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT (app_private.current_profile()).member_id;
$$;

CREATE OR REPLACE FUNCTION app_private.leads_department(dept uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.departments d
    WHERE d.id = dept
      AND d.archived_at IS NULL
      AND (
        d.leader_id = app_private.member_id()
        OR d.assistant_leader_id = app_private.member_id()
      )
  );
$$;

CREATE OR REPLACE FUNCTION app_private.in_department(dept uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.department_members dm
    WHERE dm.department_id = dept
      AND dm.member_id = app_private.member_id()
  );
$$;

CREATE OR REPLACE FUNCTION app_private.led_department_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT d.id
  FROM public.departments d
  WHERE d.archived_at IS NULL
    AND (
      d.leader_id = app_private.member_id()
      OR d.assistant_leader_id = app_private.member_id()
    );
$$;

CREATE OR REPLACE FUNCTION app_private.is_welfare_officer()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.departments d
    WHERE d.slug = 'welfare'
      AND d.archived_at IS NULL
      AND (
        d.leader_id = app_private.member_id()
        OR d.assistant_leader_id = app_private.member_id()
      )
  );
$$;

CREATE OR REPLACE FUNCTION app_private.is_prayer_team()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.departments d
    WHERE d.slug IN ('prayer', 'prayer-ministry')
      AND d.archived_at IS NULL
      AND (
        d.leader_id = app_private.member_id()
        OR d.assistant_leader_id = app_private.member_id()
        OR EXISTS (
          SELECT 1 FROM public.department_members dm
          WHERE dm.department_id = d.id AND dm.member_id = app_private.member_id()
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION app_private.can_read_member(target uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT
    CASE
      WHEN app_private.has_role(ARRAY['presiding_elder', 'secretary']) THEN true
      WHEN app_private.member_id() = target THEN true
      WHEN app_private.has_role(ARRAY['department_leader']) THEN EXISTS (
        SELECT 1
        FROM public.department_members dm
        WHERE dm.member_id = target
          AND dm.department_id IN (SELECT app_private.led_department_ids())
      )
      WHEN app_private.has_role(ARRAY['treasurer']) THEN EXISTS (
        SELECT 1 FROM public.members m WHERE m.id = target AND m.archived_at IS NULL
      )
      ELSE false
    END;
$$;

CREATE OR REPLACE FUNCTION app_private.can_read_finance()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT app_private.has_role(ARRAY['presiding_elder', 'treasurer']);
$$;

CREATE OR REPLACE FUNCTION app_private.can_write_finance()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT app_private.has_role(ARRAY['treasurer']);
$$;

CREATE OR REPLACE FUNCTION app_private.can_read_welfare()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT app_private.has_role(ARRAY['presiding_elder', 'secretary'])
      OR app_private.is_welfare_officer();
$$;

CREATE OR REPLACE FUNCTION app_private.can_read_prayer(req public.prayer_requests)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT
    CASE
      WHEN req.submitted_by = auth.uid() THEN true
      WHEN req.member_id IS NOT NULL AND req.member_id = app_private.member_id() THEN true
      WHEN req.privacy_level = 'private' THEN false
      WHEN req.privacy_level = 'presiding_elder' THEN app_private.is_admin()
      WHEN req.privacy_level = 'authorized_leaders' THEN app_private.is_leadership()
      WHEN req.privacy_level = 'prayer_team' THEN
        app_private.is_admin() OR app_private.is_prayer_team()
      ELSE false
    END;
$$;

CREATE OR REPLACE FUNCTION app_private.can_read_document(doc public.documents)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT
    CASE
      WHEN app_private.is_admin() THEN true
      WHEN doc.visibility = 'presiding_elder' THEN app_private.is_admin()
      WHEN doc.visibility = 'finance' THEN app_private.can_read_finance()
      WHEN doc.visibility = 'leadership' THEN app_private.is_leadership()
      WHEN doc.visibility = 'officers' THEN app_private.has_role(
        ARRAY['presiding_elder', 'secretary', 'treasurer', 'department_leader', 'worker']
      )
      WHEN doc.visibility = 'members' THEN auth.uid() IS NOT NULL
      WHEN doc.visibility = 'department' THEN
        app_private.leads_department(doc.department_id)
        OR app_private.in_department(doc.department_id)
        OR app_private.is_leadership()
      WHEN doc.related_member_id IS NOT NULL AND doc.related_member_id = app_private.member_id() THEN true
      ELSE false
    END;
$$;

CREATE OR REPLACE FUNCTION app_private.log_audit(
  p_action text,
  p_module text,
  p_record_id text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  INSERT INTO public.audit_logs (assembly_id, user_id, action, module, record_id, metadata)
  VALUES (
    (SELECT id FROM public.assemblies ORDER BY created_at ASC LIMIT 1),
    auth.uid(),
    p_action,
    p_module,
    p_record_id,
    COALESCE(p_metadata, '{}'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION app_private.current_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.role_slug() TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.has_role(text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.is_leadership() TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.member_id() TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.leads_department(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.in_department(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.led_department_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.is_welfare_officer() TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.is_prayer_team() TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.can_read_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.can_read_finance() TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.can_write_finance() TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.can_read_welfare() TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.can_read_prayer(public.prayer_requests) TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.can_read_document(public.documents) TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.log_audit(text, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_assembly_id() TO authenticated, anon;

-- ---------------------------------------------------------------------------
-- Enable RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.assemblies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitor_followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_followup_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prayer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.welfare_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_activities ENABLE ROW LEVEL SECURITY;

-- Assemblies
CREATE POLICY assemblies_select ON public.assemblies
  FOR SELECT TO authenticated USING (true);
CREATE POLICY assemblies_update ON public.assemblies
  FOR UPDATE TO authenticated
  USING (app_private.is_admin())
  WITH CHECK (app_private.is_admin());

-- Roles / positions
CREATE POLICY roles_select ON public.roles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY positions_select ON public.positions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY positions_write ON public.positions
  FOR ALL TO authenticated
  USING (app_private.is_admin())
  WITH CHECK (app_private.is_admin());

-- Profiles
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR app_private.is_admin() OR app_private.is_leadership());
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR app_private.is_admin())
  WITH CHECK (id = auth.uid() OR app_private.is_admin());
CREATE POLICY profiles_insert_admin ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (app_private.is_admin());

-- Members
CREATE POLICY members_select ON public.members
  FOR SELECT TO authenticated
  USING (app_private.can_read_member(id));
CREATE POLICY members_write ON public.members
  FOR ALL TO authenticated
  USING (app_private.is_leadership())
  WITH CHECK (app_private.is_leadership());

-- Departments
CREATE POLICY departments_select ON public.departments
  FOR SELECT TO authenticated
  USING (archived_at IS NULL);
CREATE POLICY departments_write ON public.departments
  FOR ALL TO authenticated
  USING (app_private.is_leadership())
  WITH CHECK (app_private.is_leadership());

CREATE POLICY department_members_select ON public.department_members
  FOR SELECT TO authenticated
  USING (
    app_private.is_leadership()
    OR app_private.leads_department(department_id)
    OR member_id = app_private.member_id()
  );
CREATE POLICY department_members_write ON public.department_members
  FOR ALL TO authenticated
  USING (app_private.is_leadership() OR app_private.leads_department(department_id))
  WITH CHECK (app_private.is_leadership() OR app_private.leads_department(department_id));

-- Workers
CREATE POLICY workers_select ON public.workers
  FOR SELECT TO authenticated
  USING (app_private.is_leadership() OR member_id = app_private.member_id());
CREATE POLICY workers_write ON public.workers
  FOR ALL TO authenticated
  USING (app_private.is_leadership())
  WITH CHECK (app_private.is_leadership());

-- Services
CREATE POLICY services_select ON public.services
  FOR SELECT TO authenticated USING (true);
CREATE POLICY services_write ON public.services
  FOR ALL TO authenticated
  USING (app_private.is_leadership())
  WITH CHECK (app_private.is_leadership());

-- Events
CREATE POLICY events_select ON public.events
  FOR SELECT TO authenticated
  USING (
    archived_at IS NULL
    AND (
      department_id IS NULL
      OR app_private.is_leadership()
      OR app_private.leads_department(department_id)
      OR app_private.in_department(department_id)
      OR status IN ('scheduled', 'completed')
    )
  );
CREATE POLICY events_write ON public.events
  FOR ALL TO authenticated
  USING (
    app_private.is_leadership()
    OR (department_id IS NOT NULL AND app_private.leads_department(department_id))
  )
  WITH CHECK (
    app_private.is_leadership()
    OR (department_id IS NOT NULL AND app_private.leads_department(department_id))
  );

-- Visitors
CREATE POLICY visitors_select ON public.visitors
  FOR SELECT TO authenticated
  USING (
    app_private.is_leadership()
    OR assigned_to = app_private.member_id()
  );
CREATE POLICY visitors_write ON public.visitors
  FOR ALL TO authenticated
  USING (app_private.is_leadership() OR assigned_to = app_private.member_id())
  WITH CHECK (app_private.is_leadership() OR assigned_to = app_private.member_id());

CREATE POLICY visitor_followups_select ON public.visitor_followups
  FOR SELECT TO authenticated
  USING (
    app_private.is_leadership()
    OR EXISTS (
      SELECT 1 FROM public.visitors v
      WHERE v.id = visitor_id AND v.assigned_to = app_private.member_id()
    )
  );
CREATE POLICY visitor_followups_write ON public.visitor_followups
  FOR ALL TO authenticated
  USING (
    app_private.is_leadership()
    OR EXISTS (
      SELECT 1 FROM public.visitors v
      WHERE v.id = visitor_id AND v.assigned_to = app_private.member_id()
    )
  )
  WITH CHECK (
    app_private.is_leadership()
    OR EXISTS (
      SELECT 1 FROM public.visitors v
      WHERE v.id = visitor_id AND v.assigned_to = app_private.member_id()
    )
  );

-- Attendance
CREATE POLICY attendance_select ON public.attendance
  FOR SELECT TO authenticated
  USING (
    app_private.is_leadership()
    OR member_id = app_private.member_id()
    OR (department_id IS NOT NULL AND app_private.leads_department(department_id))
  );
CREATE POLICY attendance_write ON public.attendance
  FOR ALL TO authenticated
  USING (
    app_private.is_leadership()
    OR (department_id IS NOT NULL AND app_private.leads_department(department_id))
  )
  WITH CHECK (
    app_private.is_leadership()
    OR (department_id IS NOT NULL AND app_private.leads_department(department_id))
  );

-- Member follow-ups
CREATE POLICY member_followups_select ON public.member_followups
  FOR SELECT TO authenticated
  USING (
    app_private.is_leadership()
    OR assigned_to = app_private.member_id()
    OR member_id = app_private.member_id()
  );
CREATE POLICY member_followups_write ON public.member_followups
  FOR ALL TO authenticated
  USING (app_private.is_leadership() OR assigned_to = app_private.member_id())
  WITH CHECK (app_private.is_leadership() OR assigned_to = app_private.member_id());

CREATE POLICY member_followup_attempts_all ON public.member_followup_attempts
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.member_followups f
      WHERE f.id = followup_id
        AND (
          app_private.is_leadership()
          OR f.assigned_to = app_private.member_id()
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.member_followups f
      WHERE f.id = followup_id
        AND (
          app_private.is_leadership()
          OR f.assigned_to = app_private.member_id()
        )
    )
  );

-- Announcements
CREATE POLICY announcements_select ON public.announcements
  FOR SELECT TO authenticated
  USING (
    archived_at IS NULL
    AND (published_at IS NULL OR published_at <= now())
    AND (expires_at IS NULL OR expires_at >= now() OR app_private.is_leadership())
  );
CREATE POLICY announcements_write ON public.announcements
  FOR ALL TO authenticated
  USING (
    app_private.is_leadership()
    OR (department_id IS NOT NULL AND app_private.leads_department(department_id))
  )
  WITH CHECK (
    app_private.is_leadership()
    OR (department_id IS NOT NULL AND app_private.leads_department(department_id))
  );

-- Prayer — privacy is the gate, not "is admin"
CREATE POLICY prayer_select ON public.prayer_requests
  FOR SELECT TO authenticated
  USING (app_private.can_read_prayer(prayer_requests));
CREATE POLICY prayer_insert ON public.prayer_requests
  FOR INSERT TO authenticated
  WITH CHECK (submitted_by = auth.uid());
CREATE POLICY prayer_update ON public.prayer_requests
  FOR UPDATE TO authenticated
  USING (
    submitted_by = auth.uid()
    OR (
      privacy_level <> 'private'
      AND (
        (privacy_level = 'presiding_elder' AND app_private.is_admin())
        OR (privacy_level = 'authorized_leaders' AND app_private.is_leadership())
        OR (privacy_level = 'prayer_team' AND (app_private.is_admin() OR app_private.is_prayer_team()))
      )
    )
  )
  WITH CHECK (
    submitted_by = auth.uid()
    OR app_private.is_admin()
    OR app_private.is_leadership()
    OR app_private.is_prayer_team()
  );

-- Welfare
CREATE POLICY welfare_select ON public.welfare_cases
  FOR SELECT TO authenticated
  USING (app_private.can_read_welfare());
CREATE POLICY welfare_write ON public.welfare_cases
  FOR ALL TO authenticated
  USING (app_private.can_read_welfare())
  WITH CHECK (app_private.can_read_welfare());

-- Finance
CREATE POLICY financial_categories_select ON public.financial_categories
  FOR SELECT TO authenticated
  USING (app_private.can_read_finance());
CREATE POLICY financial_categories_write ON public.financial_categories
  FOR ALL TO authenticated
  USING (app_private.can_write_finance() OR app_private.is_admin())
  WITH CHECK (app_private.can_write_finance() OR app_private.is_admin());

CREATE POLICY financial_transactions_select ON public.financial_transactions
  FOR SELECT TO authenticated
  USING (app_private.can_read_finance());
CREATE POLICY financial_transactions_insert ON public.financial_transactions
  FOR INSERT TO authenticated
  WITH CHECK (app_private.can_write_finance());
CREATE POLICY financial_transactions_update ON public.financial_transactions
  FOR UPDATE TO authenticated
  USING (app_private.can_write_finance())
  WITH CHECK (app_private.can_write_finance());
CREATE POLICY financial_transactions_delete ON public.financial_transactions
  FOR DELETE TO authenticated
  USING (app_private.can_write_finance());

-- Documents
CREATE POLICY documents_select ON public.documents
  FOR SELECT TO authenticated
  USING (app_private.can_read_document(documents));
CREATE POLICY documents_write ON public.documents
  FOR ALL TO authenticated
  USING (
    app_private.is_leadership()
    OR (category = 'financial' AND app_private.can_write_finance())
  )
  WITH CHECK (
    app_private.is_leadership()
    OR (category = 'financial' AND app_private.can_write_finance())
  );

-- Notifications
CREATE POLICY notifications_select ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY notifications_update ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE POLICY notifications_insert ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (app_private.is_leadership() OR user_id = auth.uid());

-- Audit
CREATE POLICY audit_select ON public.audit_logs
  FOR SELECT TO authenticated
  USING (app_private.is_admin());
CREATE POLICY audit_insert ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Settings
CREATE POLICY settings_select ON public.system_settings
  FOR SELECT TO authenticated
  USING (true);
CREATE POLICY settings_write ON public.system_settings
  FOR ALL TO authenticated
  USING (app_private.is_admin())
  WITH CHECK (app_private.is_admin());

-- Department reports / activities
CREATE POLICY department_reports_select ON public.department_reports
  FOR SELECT TO authenticated
  USING (
    app_private.is_leadership()
    OR app_private.leads_department(department_id)
  );
CREATE POLICY department_reports_write ON public.department_reports
  FOR ALL TO authenticated
  USING (
    app_private.is_leadership()
    OR app_private.leads_department(department_id)
  )
  WITH CHECK (
    app_private.is_leadership()
    OR app_private.leads_department(department_id)
  );

CREATE POLICY department_activities_select ON public.department_activities
  FOR SELECT TO authenticated
  USING (
    app_private.is_leadership()
    OR app_private.leads_department(department_id)
    OR app_private.in_department(department_id)
  );
CREATE POLICY department_activities_write ON public.department_activities
  FOR ALL TO authenticated
  USING (
    app_private.is_leadership()
    OR app_private.leads_department(department_id)
  )
  WITH CHECK (
    app_private.is_leadership()
    OR app_private.leads_department(department_id)
  );

-- New profile from auth signup (service role / trigger uses security definer)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  assembly uuid;
  assigned_role text;
BEGIN
  SELECT id INTO assembly FROM public.assemblies ORDER BY created_at ASC LIMIT 1;
  assigned_role := COALESCE(NEW.raw_app_meta_data->>'role_slug', 'member');
  IF assigned_role NOT IN (
    'presiding_elder', 'secretary', 'treasurer', 'department_leader', 'worker', 'member'
  ) THEN
    assigned_role := 'member';
  END IF;

  INSERT INTO public.profiles (id, assembly_id, role_slug, full_name, email, is_active, invited_at)
  VALUES (
    NEW.id,
    assembly,
    assigned_role,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    true,
    now()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Ordinary members cannot escalate their own role
CREATE OR REPLACE FUNCTION app_private.prevent_role_self_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.role_slug IS DISTINCT FROM OLD.role_slug
     AND NOT app_private.is_admin()
     AND auth.uid() IS NOT NULL
     AND current_setting('role', true) <> 'service_role' THEN
    RAISE EXCEPTION 'Only the Presiding Elder can change user roles';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_prevent_role_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION app_private.prevent_role_self_escalation();
