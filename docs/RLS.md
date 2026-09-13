# Supabase RLS strategy

## Rules

1. Enable RLS on every table in `public`.
2. Put privileged helpers in `app_private`, not `public`.
3. Mark helpers `SECURITY DEFINER` with `SET search_path = pg_catalog, app_private, public`.
4. Never authorize from `auth.jwt() -> user_metadata` (user-editable). Roles come from `profiles.role_slug`.
5. `UPDATE` policies require a matching `SELECT` policy or updates silently affect 0 rows.
6. Views use `WITH (security_invoker = true)`.
7. Storage policies mirror table ACLs. Private documents are never in a public bucket.

## Helper functions (`app_private`)

| Function | Purpose |
| --- | --- |
| `current_profile()` | Active profile for `auth.uid()` |
| `role_slug()` | Caller’s role |
| `has_role(text[])` | Role check |
| `is_admin()` | Presiding Elder |
| `is_secretary()` | Secretary |
| `is_finance()` | Treasurer |
| `is_leadership()` | PE or Secretary |
| `member_id()` | Linked member |
| `leads_department(uuid)` | Department leader or assistant |
| `in_department(uuid)` | Membership in department |
| `can_read_member(uuid)` | Directory / profile visibility |
| `can_read_prayer(prayer_requests)` | Privacy-level gate |
| `can_read_finance()` | PE (read) or Treasurer |
| `can_write_finance()` | Treasurer only |
| `can_read_welfare()` | PE, Secretary, Welfare department leaders |
| `log_audit(...)` | Insert audit row |

## Policy pattern (example)

```sql
CREATE POLICY members_select ON public.members
  FOR SELECT TO authenticated
  USING (archived_at IS NULL AND app_private.can_read_member(id));

CREATE POLICY financial_transactions_select ON public.financial_transactions
  FOR SELECT TO authenticated
  USING (app_private.can_read_finance());

CREATE POLICY financial_transactions_write ON public.financial_transactions
  FOR ALL TO authenticated
  USING (app_private.can_write_finance())
  WITH CHECK (app_private.can_write_finance());
```

`anon` has no table grants beyond what Supabase Auth needs. Ordinary members authenticate before they see anything except the login screen.

## Storage

| Bucket | Access |
| --- | --- |
| `member-photos` | Authenticated read of non-sensitive photos; upload by leadership |
| `event-media` | Authenticated read; write by leadership / department organizers |
| `announcement-media` | Authenticated read; write by announcement publishers |
| `assembly-assets` | Authenticated read; write by Presiding Elder |
| `documents` | Category ACL |
| `finance-documents` | Finance readers / writers only |
| `welfare-documents` | Welfare-authorized only |
| `member-documents` | Leadership + the member themselves |

Uploads validate MIME type and size in Server Actions before the storage call.
