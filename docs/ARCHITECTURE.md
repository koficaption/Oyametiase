# Architecture — Church of Pentecost, Oyame Tease Assembly

This document describes the production architecture for the **Oyame Tease Assembly Management System**. It is a **single local assembly** system. The Presiding Elder is the highest local authority. Multi-branch church administration is intentionally not implemented.

## 1. Purpose

Digitally manage the day-to-day life of one Church of Pentecost local assembly:

- Members, visitors, new-convert follow-up
- Attendance for services, department meetings, and special programs
- Departments, officers, and workers
- Programs, announcements, prayer requests
- Tithes, offerings, expenses, receipts
- Welfare cases, documents, reports
- Notifications and an administrative audit trail

## 2. Organizational model

```
The Church of Pentecost
 └── Oyame Tease Assembly          ← this software instance
      └── Presiding Elder          ← highest local authority
           └── Assembly officers / workers
                └── Departments / ministries
                     └── Members
```

The database includes an `assemblies` row and `assembly_id` on operational tables so a future district or multi-assembly expansion is possible. The application itself is single-assembly: there is no branch switcher, no cross-assembly admin, and no tenant marketplace.

## 3. Technology stack

| Layer | Choice |
| --- | --- |
| Frontend | Next.js App Router (React Server Components + Server Actions) |
| UI | Tailwind CSS + shadcn/ui, light / dark / system |
| Auth | Supabase Auth (email + password, password recovery) |
| Database | PostgreSQL on Supabase |
| Authorization | PostgreSQL RLS + `app_private` SECURITY DEFINER helpers + server-side role checks |
| Storage | Supabase Storage (private buckets, signed URLs) |
| Realtime | Supabase Realtime for in-app notifications |
| Validation | Zod on every mutation |
| Reports | Server-generated PDF (jsPDF) and Excel (ExcelJS) |
| Hosting | Vercel (frontend) + Supabase (backend) |

## 4. Project structure

```
src/
  app/                 App Router pages, layouts, error surfaces
    (auth)/            Login, password recovery
    (app)/             Authenticated assembly application
    auth/callback/     Supabase auth code exchange
  actions/             Server Actions (validated, permission-checked)
  components/
    layout/            Sidebar, header, mobile nav
    dashboards/        Role-specific dashboards
    shared/            Tables, empty states, filters, confirmations
    ui/                shadcn primitives
  lib/
    supabase/          Browser, server, admin, proxy clients
    auth/              Session, roles, permission matrix
    validations/       Zod schemas
    reports/           PDF / Excel exporters
    notifications/     Notification helpers
  types/               Domain and database types
supabase/
  migrations/          Schema, RLS, storage
  seed.sql             Development reference + sample records
```

## 5. Request path

1. `src/proxy.ts` refreshes the Supabase session cookie via `getClaims()` and redirects unauthenticated users away from `/app`.
2. Server Components and Server Actions create a request-scoped Supabase client from cookies.
3. Every mutation validates input with Zod, then checks the caller’s role **on the server**.
4. PostgreSQL RLS is the last line of defense. A Department Leader cannot read another department’s private records by changing a URL or calling the Data API directly.
5. Sensitive writes emit `audit_logs` rows through `app_private.log_audit`.

The browser never receives the service-role key. `SUPABASE_SERVICE_ROLE_KEY` is server-only and used only for admin invite/reset flows.

## 6. Identity model

- `auth.users` — credentials (Supabase Auth)
- `profiles` — login account, role, active flag, linked member
- `members` — pastoral / membership record (exists whether or not the person has a login)
- `workers` — officer/worker appointments against configurable `positions`

Roles are stored on `profiles.role_slug`, **not** in `raw_user_meta_data`. User-editable JWT metadata is never used for authorization.

## 7. Role model

| Role | Intent |
| --- | --- |
| `presiding_elder` | Assembly authority: oversight, approvals, users, settings, audit, permitted finance reports |
| `secretary` | Membership, visitors, attendance, programs, announcements, administrative reports |
| `treasurer` | Income, expenses, receipts, financial reports |
| `department_leader` | Own department members, attendance, activities, reports |
| `worker` | Assigned operational tasks; limited records |
| `member` | Personal portal only |

Delegation is first-class: the Presiding Elder does not have to perform every clerical task. The Secretary and Treasurer own their modules. Department leaders cannot see other departments.

## 8. Security principles

- RLS enabled on every `public` table
- Helper functions live in `app_private` with fixed `search_path`
- Views that expose data use `security_invoker = true`
- Prayer requests are filtered by privacy level, not by “has an admin account”
- Finance, welfare, emergency contacts, and notes are treated as sensitive
- Soft-archive (`archived_at`) instead of hard delete for pastoral records
- Private storage buckets; downloads via short-lived signed URLs
- Friendly errors only — no raw SQL or stack traces in the UI

## 9. Performance

- Server-side filtered / paginated queries (never load the full membership table into the browser)
- Indexes on foreign keys, status, dates, and search columns
- `pg_trgm` for member/visitor name search
- Image optimization through `next/image` + signed or public assembly assets

## 10. Environments

Development seed data is **opt-in** (`SEED_DEV_DATA=true`) and clearly labelled. Production must not auto-load sample members, fake money, or demo passwords.
