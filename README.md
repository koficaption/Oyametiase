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

The live site is a **Vercel** app talking to your **Supabase** project. Do not run `supabase/seed.sql` on production.

### 1. Put the code on GitHub

Merge this branch into `main` (or connect Vercel to this branch). Vercel deploys on every push once the project is linked.

### 2. Create / open the Vercel project

In [Vercel](https://vercel.com):

1. **Add New… → Project** and import `koficaption/Oyametiase`.
2. Framework preset: **Next.js**.
3. Root directory: repository root.
4. Add environment variables (Production, Preview, and Development):

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | publishable / anon key |
| `NEXT_PUBLIC_SITE_URL` | `https://your-app.vercel.app` (or your custom domain) |
| `SUPABASE_SERVICE_ROLE_KEY` | service-role / `sb_secret_...` key (server only) |
| `SEED_DEV_DATA` | `false` |

5. Deploy. The first URL looks like `https://oyametiase-….vercel.app`.

Or from your laptop after `npx vercel login`:

```bash
npx vercel link
npx vercel env pull
npx vercel --prod
```

### 3. Point Supabase Auth at the live URL

In Supabase → Authentication → URL configuration:

- **Site URL**: `https://your-app.vercel.app`
- **Redirect URLs**: `https://your-app.vercel.app/auth/callback` and `https://your-app.vercel.app/**`

### 4. Apply database migrations on the live project

If this Supabase project already has the earlier migrations, apply any new ones (`supabase db push` or `psql` with the session pooler). Do **not** load `seed.sql` into production.

### 5. Create the first live Presiding Elder

Use a real email (not `@oyametiase.local`). Either:

- Register on the live site, then approve that person in **Users & approvals** and assign system role **Presiding Elder**, or
- Invite them from Users once you already have a PE account.

Then add the Secretary, Treasurer, and ministry leaders the same way.

### 6. Optional custom domain

Vercel → Project → Settings → Domains → add `assembly.yourchurch.org` (or similar), then set `NEXT_PUBLIC_SITE_URL` and the Supabase Site URL to that domain.

Production checklist:

- [ ] Environment variables set in Vercel
- [ ] `NEXT_PUBLIC_SITE_URL` is the live https URL
- [ ] Migrations applied
- [ ] RLS enabled
- [ ] Auth Site URL + `/auth/callback` configured
- [ ] No development seed data
- [ ] Service-role key only on the server
- [ ] First Presiding Elder can sign in and open Users & approvals

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
