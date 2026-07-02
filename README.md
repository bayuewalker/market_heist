# Market Heist

Market Heist AI — a tactical AI analyst & assistant for traders. Marketing site
plus a member dashboard where "Mentor Heister" (AI) generates trading signals.

## Stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript
- Tailwind CSS v4, Framer Motion, lucide-react
- [Supabase](https://supabase.com) — Auth + Postgres (RLS)
- [NVIDIA](https://build.nvidia.com) OpenAI-compatible API for signal generation
- Deployed on [Vercel](https://vercel.com)

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in real values
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Configuration

See **[SETUP.md](./SETUP.md)** for the three one-time steps: run the SQL schema in
Supabase, set environment variables in Vercel, and deploy.

## Routes

- `/` — marketing landing page
- `/signup`, `/login` — Supabase email/password auth
- `/dashboard` — protected member area
  - Overview, Signals, Request signal, Account (membership)
- `POST /api/signals/generate` — server route that calls NVIDIA and stores the signal

## Project structure

- `app/` — routes (landing, `(auth)`, `dashboard`, `api`), layout, global styles
- `components/` — landing sections, `ui/` primitives, `auth/`, `dashboard/`
- `lib/supabase/` — browser/server clients, middleware, types
- `lib/nvidia.ts` — signal generation helper
- `data/` — static content arrays for the landing page
- `supabase/migrations/` — database schema
