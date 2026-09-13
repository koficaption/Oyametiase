# Church of Pentecost — Oyame Tiase Assembly

Local assembly management system for **The Church of Pentecost, Oyame Tiase Assembly**.

This is a **single local assembly** application. The Presiding Elder is the highest local authority. It is not a multi-branch church platform, school system, or generic CRM.

The software exists so the Presiding Elder and assembly officers can see the health of the local church without drowning in paper, while still delegating day-to-day work to the Secretary, Treasurer, and department leaders.

## Features

- Role-based access: Presiding Elder, Secretary, Treasurer, Department Leader, Worker, Member
- Member register with system-generated member IDs (`COP-OTA-0001`) and soft-archive
- Confidential pastoral fields stored separately from the directory
- Visitors and new-convert follow-up
- Attendance for Sunday, midweek, department, and special programs, including walk-in visitors
- Departments, configurable worker positions, programs, and announcements
- Privacy-aware prayer requests
- Welfare cases for authorized officers
- Tithes, offerings, expenses, receipts, and finance reports
- PDF and Excel exports
- In-app notifications with Realtime
- Audit log for the Presiding Elder
- Member portal
- Light, dark, and system themes

## Technology stack

- Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui
- Supabase Auth, PostgreSQL, Row Level Security, Storage, Realtime
- Zod validation
- Vercel for frontend hosting

## Architecture

See:

- `docs/ARCHITECTURE.md`
- `docs/PERMISSIONS.md`
- `docs/RLS.md`

Folder layout:

```
src/app            Pages and route handlers
src/actions        Server Actions (validated + authorized)
src/components     UI, layout, dashboards
src/lib            Supabase clients, auth, reports, queries
src/types          Domain types and the permission matrix
supabase/migrations    Schema, RLS, storage
```

## User roles

| Role | Responsibility |
| --- | --- |
| Presiding Elder | Oversight, users, settings, audit, permitted finance reports |
| Secretary | Members, visitors, attendance, programs, administrative reports |
| Treasurer | Income, expenses, receipts, finance reports |
| Department Leader | Own department only |
| Worker | Assigned operational work |
| Member | Personal portal only |

The Secretary does not automatically receive finance access. The Treasurer does not receive private prayer requests or user management. A Youth leader cannot query Women’s Ministry records by changing a URL.

## Installation

```bash
pnpm install
cp .env.example .env.local
```

Fill `.env.local` with your Supabase project values. Never commit real secrets.

## Environment variables

| Name | Where | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser + server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser + server | Publishable / anon key |
| `NEXT_PUBLIC_SITE_URL` | Server | Auth redirect origin |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Invites and password resets |
| `SEED_DEV_DATA` | Development only | Must stay `false` in production |

The service-role key must never be prefixed with `NEXT_PUBLIC_`.

## Supabase setup

1. Create a Supabase project.
2. Install the [Supabase CLI](https://supabase.com/docs/guides/cli).
3. Link the project: `supabase link --project-ref <ref>`.
4. Apply migrations:

```bash
supabase db push
```

If you apply SQL with `psql` from an IPv4-only host, use the Session pooler URL from the Supabase dashboard (`aws-*-*.pooler.supabase.com:5432`). The direct `db.<ref>.supabase.co:5432` host is IPv6-only and will fail with `Network is unreachable`.

5. Enable Email auth in the Supabase dashboard.
6. Set the Site URL to your Vercel domain and add `/auth/callback` to redirect URLs.
7. Confirm Storage buckets from `supabase/migrations/20260913000003_storage_and_views.sql`.
8. Confirm RLS is enabled on every `public` table.
9. Add `SUPABASE_SERVICE_ROLE_KEY` (the `sb_secret_...` or legacy `service_role` key) for officer invites and admin password resets. The publishable key is not enough for those Admin APIs.

## Database migration

Migrations are ordered:

1. Schema and default assembly (`The Church of Pentecost` / `Oyame Tiase Assembly`)
2. RLS helpers and policies
3. Storage buckets and directory view
4. Confidential member fields
5. Audit RPC

Do not skip files. They are incremental.

## Seed data

`supabase/seed.sql` contains **fictional development data** only.

```bash
supabase db reset   # local development
```

Do **not** run the seed against production. Sample people, money, and welfare cases are labelled `DEV DATA`.

After auth users exist, the Presiding Elder invites officers from **Users**. Recommended first production user: the Presiding Elder.

Development login emails (only after you create matching Auth users yourself):

- `elder@oyametiase.local` — Presiding Elder portal
- `secretary@oyametiase.local` — Secretary portal
- `treasurer@oyametiase.local` — Treasurer portal
- `womens.leader@oyametiase.local` — Women's Ministry portal
- `mens.leader@oyametiase.local` — Men's Ministry portal
- `youth.leader@oyametiase.local` — Youth Ministry portal
- `children.leader@oyametiase.local` — Children's Ministry portal
- `member@oyametiase.local` — Member portal

Use a strong unique password. This repository never ships a production password.

## Local development

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Testing

```bash
pnpm test
pnpm lint
```

Tests cover the permission matrix, validation, attendance uniqueness, prayer privacy, login payloads, and RLS source guarantees. Live RLS integration tests require a linked Supabase project.

## Deployment

### Vercel

1. Import the GitHub repository.
2. Framework preset: Next.js.
3. Add the environment variables above to Production, Preview, and Development.
4. Deploy.

### Supabase

1. Apply migrations to the production project.
2. Do not apply `seed.sql`.
3. Create the first Presiding Elder user in Supabase Auth.
4. Set `raw_app_meta_data.role_slug` to `presiding_elder` for that user, or insert the matching `profiles` row.
5. Confirm Storage policies and email templates.

Production checklist:

- [ ] Environment variables set in Vercel
- [ ] Migrations applied
- [ ] RLS enabled
- [ ] Storage policies present
- [ ] Auth redirects configured
- [ ] No development seed data
- [ ] Service-role key only on the server

## Security

- Authorization is enforced in the UI, Server Actions, and PostgreSQL RLS
- Roles live on `profiles`, never in editable `user_metadata`
- Private prayer requests stay private even from other administrators
- Finance and welfare tables are role-gated
- Documents use private buckets
- Audit log is Presiding Elder only
- Soft-archive is used instead of destroying pastoral history

## License

Private assembly software for Oyame Tiase Assembly.
