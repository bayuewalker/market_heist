# Market Heist — Backend & Dashboard Setup

The app is a **Next.js (App Router)** frontend + dashboard, deployed on **Vercel**,
backed by **Supabase** (Auth + Postgres) with AI signals generated server-side via
**NVIDIA**'s OpenAI-compatible API.

There are **3 one-time steps** to make the dashboard live.

---

## 1. Run the database schema in Supabase

Open your Supabase project → **SQL Editor** → **New query**, then run these
migrations **in order**:

1. [`supabase/migrations/0001_init.sql`](./supabase/migrations/0001_init.sql)
2. [`supabase/migrations/0002_restrict_plan_changes.sql`](./supabase/migrations/0002_restrict_plan_changes.sql)
3. [`supabase/migrations/0003_payments.sql`](./supabase/migrations/0003_payments.sql)
4. [`supabase/migrations/0004_harden_payments.sql`](./supabase/migrations/0004_harden_payments.sql)
5. [`supabase/migrations/0005_admin_role.sql`](./supabase/migrations/0005_admin_role.sql)

`0001` creates the `plans`, `profiles`, and `signals` tables, Row Level Security
policies (each user only sees their own data), a trigger that auto-creates a
profile on sign-up, and seeds the Basic / Pro / Elite plans. `0002`/`0003` lock
down plan changes so a plan can only change server-side after a **verified
on-chain payment**, and add the `payments` table + `profiles.plan_expires_at`.

### Auth settings

In **Authentication → Providers → Email**, decide on email confirmation:

- **Confirmations ON** (default): after sign-up users must click a link in their
  email before they can log in.
- **Confirmations OFF**: users are logged in immediately after sign-up (handy for
  testing).

In **Authentication → URL Configuration**, add your site + Vercel preview URLs to
**Redirect URLs** (e.g. `https://your-app.vercel.app/**`). This also enables the
**password reset** flow, which redirects to `/reset-password` (open the reset
email in the same browser you requested it from).

> Real-time prices for signals come from Binance's public market-data endpoint
> (no key needed) for crypto pairs; forex/commodity pairs stay directional.

---

## 2. Set environment variables in Vercel

In the Vercel project → **Settings → Environment Variables**, add:

| Name | Value | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://tcrerqdfvpbbyshvsaqm.supabase.co` | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your Supabase **anon / publishable** key | Public, safe in the browser |
| `SUPABASE_SERVICE_ROLE_KEY` | your Supabase **service_role** key | **Secret** — used to confirm payments; never `NEXT_PUBLIC_` |
| `NVIDIA_API_KEY` | your `nvapi-...` key | **Secret** — server only |
| `NVIDIA_MODEL` | `meta/llama-3.3-70b-instruct` | Optional (default) |
| `PAYMENT_TRON_ADDRESS` | your TRON **USDT (TRC20)** wallet address | Where members send USDT |
| `TRONGRID_API_KEY` | TronGrid API key | Optional (raises rate limits) |
| `CRON_SECRET` | long random string | Recommended — protects the payment cron |

Find the Supabase keys in **Project Settings → API**. After saving, **redeploy**.

### Payments (USDT on TRON / TRC20)

Members pay by sending **USDT (TRC20)** to `PAYMENT_TRON_ADDRESS`. Each order
gets a unique amount so the server can match the incoming transfer on-chain (via
TronGrid) and extend the member's plan (`plan_expires_at`). No third-party
gateway holds funds — USDT lands directly in your wallet.

- Billing is **pay-per-period** (30 days / annual); no card-style auto-renew.
- The client polls `/api/payments/status` while the user is on the billing page;
  an hourly Vercel Cron (`/api/payments/check`, see `vercel.json`) sweeps any it
  missed. Set `CRON_SECRET` so Vercel Cron can authenticate.

> Only the **anon** key goes in the browser. `SUPABASE_SERVICE_ROLE_KEY` is used
> **server-only** (payment confirmation, admin actions) and must never be
> exposed to the client. Signals are inserted as the logged-in user, protected
> by RLS.

### Admin panel

`/admin` (linked from the dashboard sidebar for admins) lets you view overview
stats and manage every user's plan/role, and browse all signals and payments.
It's gated by `profiles.role = 'admin'`, enforced by both a server-side check
and RLS (`is_admin()` in `0005_admin_role.sql`).

No one is an admin by default. Promote your first admin directly in the SQL
Editor:

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

After that, admins can promote/demote other users from `/admin/users` (you
can't demote yourself, to avoid locking everyone out).

---

## 3. Deploy

Push to the connected branch (or click **Redeploy** in Vercel). That's it.

- Landing page: `/`
- Sign up / Log in: `/signup`, `/login`
- Dashboard (protected): `/dashboard`

---

## How the AI signal flow works

1. A logged-in user submits a pair on `/dashboard/request`.
2. `POST /api/signals/generate` (server, Node runtime) verifies the session,
   checks the plan's **daily signal limit**, then calls NVIDIA (`llama-3.3-70b`)
   with a constrained "Mentor Heister" prompt.
3. The parsed signal (bias / entry / target / stop / confidence / rationale) is
   stored in `signals` for that user and returned to the UI.

The prompt is explicitly risk-aware and never promises profit.

---

## Local development

```bash
npm install
cp .env.example .env.local   # fill in real values
npm run dev
```

`.env.local` is gitignored. Without valid Supabase/NVIDIA values the marketing
pages still render, but auth and signal generation require real keys.

---

## Ops & monitoring

- **Errors**: `app/error.tsx` and `app/global-error.tsx` give a graceful
  fallback UI instead of a blank crash screen; unhandled errors are still
  logged to the Vercel Functions/Runtime logs by default (**Vercel →
  Observability**) with no extra setup.
- **Deeper error tracking (optional)**: for stack traces, alerting, and
  release tracking, add [Sentry](https://sentry.io) (`@sentry/nextjs`) or a
  similar tool. Not wired up yet — add it when you have a DSN.
- **Uptime**: point an external uptime monitor (e.g. UptimeRobot, Better
  Uptime) at `https://<your-domain>/` to get alerted if the site goes down.
- **Key rotation**: if any secret (`SUPABASE_SERVICE_ROLE_KEY`, `NVIDIA_API_KEY`,
  `CRON_SECRET`, Supabase access tokens used for admin setup) is ever shared
  outside Vercel's environment variables (chat, screenshots, etc.), rotate it
  immediately in Supabase/NVIDIA and update Vercel.
- **Backups**: Supabase takes automatic daily backups on paid plans; on the
  free tier, periodically export critical tables (`profiles`, `payments`,
  `signals`) via the SQL Editor or `pg_dump` if you need your own copy.
