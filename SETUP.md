# Market Heist — Backend & Dashboard Setup

The app is a **Next.js (App Router)** frontend + dashboard, deployed on **Vercel**,
backed by **Supabase** (Auth + Postgres) with AI signals generated server-side via
**NVIDIA**'s OpenAI-compatible API.

There are **3 one-time steps** to make the dashboard live.

---

## 1. Run the database schema in Supabase

Open your Supabase project → **SQL Editor** → **New query**, paste the contents of
[`supabase/migrations/0001_init.sql`](./supabase/migrations/0001_init.sql), and run it.

This creates the `plans`, `profiles`, and `signals` tables, Row Level Security
policies (each user only sees their own data), a trigger that auto-creates a
profile on sign-up, and seeds the Basic / Pro / Elite plans.

### Auth settings

In **Authentication → Providers → Email**, decide on email confirmation:

- **Confirmations ON** (default): after sign-up users must click a link in their
  email before they can log in.
- **Confirmations OFF**: users are logged in immediately after sign-up (handy for
  testing).

In **Authentication → URL Configuration**, add your site + Vercel preview URLs to
**Redirect URLs** (e.g. `https://your-app.vercel.app/**`).

---

## 2. Set environment variables in Vercel

In the Vercel project → **Settings → Environment Variables**, add:

| Name | Value | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://tcrerqdfvpbbyshvsaqm.supabase.co` | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your Supabase **anon / publishable** key | Public, safe in the browser |
| `NVIDIA_API_KEY` | your `nvapi-...` key | **Secret** — server only, never `NEXT_PUBLIC_` |
| `NVIDIA_MODEL` | `meta/llama-3.3-70b-instruct` | Optional (this is the default) |

Find the Supabase keys in **Project Settings → API**. After saving, **redeploy**.

> Only the **anon** key goes in the browser. The `service_role` key is not used by
> this app and must never be exposed. Signals are inserted as the logged-in user,
> protected by RLS.

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
