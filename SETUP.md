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
6. [`supabase/migrations/0006_fix_admin_review.sql`](./supabase/migrations/0006_fix_admin_review.sql)
7. [`supabase/migrations/0007_trend_updates.sql`](./supabase/migrations/0007_trend_updates.sql)
8. [`supabase/migrations/0008_broker_station.sql`](./supabase/migrations/0008_broker_station.sql)
9. [`supabase/migrations/0009_reward_ledger.sql`](./supabase/migrations/0009_reward_ledger.sql)
10. [`supabase/migrations/0010_character_configs.sql`](./supabase/migrations/0010_character_configs.sql)
11. [`supabase/migrations/0011_telegram.sql`](./supabase/migrations/0011_telegram.sql)
12. [`supabase/migrations/0012_missions_points_rank.sql`](./supabase/migrations/0012_missions_points_rank.sql)
13. [`supabase/migrations/0013_signal_engine_v2.sql`](./supabase/migrations/0013_signal_engine_v2.sql)
14. [`supabase/migrations/0014_mentor_journal.sql`](./supabase/migrations/0014_mentor_journal.sql)
15. [`supabase/migrations/0015_leaderboard_captain_genesis.sql`](./supabase/migrations/0015_leaderboard_captain_genesis.sql)

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
| `CRON_SECRET` | long random string | Recommended — protects the payment/trend-update/leaderboard crons |
| `NEXT_PUBLIC_MENTORING_LINK` | your Telegram/Zoom/Discord link | Optional — "Join session" target on `/dashboard/mentoring` |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` | Public — used to build deep links in bot messages |
| `TELEGRAM_BOT_TOKEN` | your bot token from @BotFather | **Secret** — server only |
| `TELEGRAM_BOT_USERNAME` | your bot's username (no `@`) | Public — used to build the `/start` deep link |
| `TELEGRAM_WEBHOOK_SECRET` | long random string | **Secret** — Telegram echoes this back on every webhook call; the route rejects requests where it doesn't match |

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

### Daily trend updates & mentoring

`/dashboard/trends` shows a short AI-written daily briefing per market
(crypto/forex/commodity). A Vercel Cron (`/api/trends/generate`, daily at
06:05 UTC — see `vercel.json`) generates them; admins can also trigger a
manual "Generate today's updates" refresh from the page. Requires
`CRON_SECRET` (or an admin session) the same way the payment cron does.

`/dashboard/mentoring` is a static weekly schedule (`data/mentoring.ts`) —
Basic unlocks the Friday session, Pro/Elite unlock every weekday. Edit that
file to adjust days/topics, and set `NEXT_PUBLIC_MENTORING_LINK` to your real
session link.

### Leaderboard, Captain Network, Genesis Pass

Migration `0015` adds `leaderboard_entries`, `referral_codes`,
`captain_networks`, `genesis_eligibility`, `profiles.genesis_joined_at`, and
widens `profiles.role` to include `captain` — **admin-assignable only**
(issue #24), same class of privilege as `admin`.

`/dashboard/leaderboard` shows 5 boards (Volume, Reward, Discipline,
Captain, Points — §22). Volume/Reward/Captain require a `verified` broker
UID; Discipline and Points are open to any signed-in member. A Vercel Cron
(`/api/leaderboard/recompute`, every 6 hours — see `vercel.json`) recomputes
and replaces the stored snapshot; admins can also trigger it manually the
same way the trends cron works. The Discipline board applies the blueprint's
weighted formula (40% volume / 25% active days / 20% journal / 10% reward /
5% community) — the one board meant to reward well-rounded activity rather
than a single raw metric.

Admins promote a member to `captain` from `/admin/users` — that action
immediately generates their referral code (`getOrCreateReferralCode` in
`lib/captain.ts`); demoting a captain away deactivates their code so old
signup links stop attributing to them. `/dashboard/captain` shows the
shareable link (`/signup?ref=<code>`) to captains, or a locked "ask an
admin" message to everyone else. Referral attribution happens at signup
time via a `handle_new_user()` trigger extension — the signup form passes
the `ref` query param through `auth.signUp()`'s user metadata (normalized
to lowercase/trimmed, both client-side and again in the trigger), and the
trigger creates a `captain_networks` row if the code is valid.

Tiers and reward rates are exact per issue #24's acceptance criteria:
Scout (5 referrals, 2%) → Captain (25, 4%) → Commander (100, 6%) → Elite
Captain (250+, 10%) — below 5 referrals there's no tier and no Captain
Reward accrues yet. Captain Code V1 is intentionally lightweight; full
verification-gated tiering is a V2 Captain Dashboard feature (§17.2).
Captain Reward (a % of the backend commission on a referred member's
matched trades, scaled by the captain's current tier, never proportional
to the referred member's own reward — not MLM, §23) is computed in
`lib/rewards.ts` alongside the existing member/donation/operation buckets.

`/dashboard/genesis` is a pull-based eligibility checklist (§12.7): Telegram
linked, profile completed, broker UID submitted, broker UID verified, ≥1,500
Heist Points, and joined the Genesis campaign (a one-click self-service
opt-in). The first time all six are met, a sticky `reservation_id` is
minted — it's never revoked even if a later balance change would otherwise
fail one requirement. Off-chain only; no NFT minting in MVP. Admins export
eligible members as CSV from `/admin/genesis`.

### Broker Station & UID verification

`/dashboard/broker` lists the partner brokers seeded by `0008_broker_station.sql`
(Bitget, KuCoin, BingX). A member opens the referral link, then submits their
broker UID; the row starts as `submitted`. Update the placeholder
`referral_base_url` values in that migration (or via the SQL Editor) to your
real partner referral links before launch.

Admins review submissions on `/admin/broker-accounts` and move each account
through `under_review` -> `verified` / `rejected` / `duplicate` / `inactive`.
Members can freely edit their UID while `submitted`, and resubmitting after a
`rejected` verdict flips the status back to `submitted`; every other
transition is admin-only (enforced by a DB trigger, not just the UI). A
verified broker account is the eligibility gate for the reward engine and
leaderboard.

### The Playmaker (character layer)

`character_configs` holds Market Heist's brand persona — copy, avatar,
dashboard note, signal prefix, and bot intro — so it can change without a
deploy. Admins edit the active persona on `/admin/character`; the seeded row
is **The Playmaker** (migration `0010`). Only one row is expected to be
`is_active` at a time — the app reads "the active config" (e.g. the dashboard
overview's Playmaker Note card); toggling a second row active is an admin
mistake to avoid, not something the schema blocks.

### Telegram Bot + identity linking

Auth stays Supabase email/password — Telegram is an acquisition and
notification channel, not a login replacement. A member links Telegram from
`/dashboard/account` ("Link Telegram" under the Telegram section): the
dashboard requests a short-lived one-time code, deep-links to
`https://t.me/<bot>?start=<code>`, and the bot's `/start` handler consumes
the code to create a `telegram_links` row.

To wire up the bot:

1. Create a bot with [@BotFather](https://t.me/BotFather); set
   `TELEGRAM_BOT_TOKEN` and `TELEGRAM_BOT_USERNAME`.
2. Set `TELEGRAM_WEBHOOK_SECRET` to a long random string, then register the
   webhook (once, after deploying):
   ```bash
   curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
     -d "url=$NEXT_PUBLIC_APP_URL/api/telegram/webhook" \
     -d "secret_token=$TELEGRAM_WEBHOOK_SECRET"
   ```
3. Commands: `/start`, `/help`, `/brokers`, `/profile`, `/rank`, `/mission`,
   `/signal`.

All bot interactions are logged to `bot_events`; every webhook request must
carry the matching `X-Telegram-Bot-Api-Secret-Token` header or it's rejected.

### Missions, Heist Points, Heister Rank

`/dashboard/missions` lists the mission catalog (migration `0012`, seeded per
the MVP V1 Final Build Module Decision doc — First Contact, Enter The
Hideout, Enter The Station, Broker Infiltration, Verified Raider, Signal
Intercept, Recruit Heister, Risk Calibration). Every dashboard page load
calls `syncMissionCompletions()` (`lib/missions.ts`), which checks each active
mission's trigger condition for the signed-in user and marks any
newly-satisfied one `completed` — this is pull-based (checked on page load),
not wired into every mutation site across earlier milestones (broker verify,
signal create, etc.).

A completed mission isn't paid out automatically — the member taps **Claim**
(`POST /api/missions/:id/claim`), which is what actually writes to
`heist_points_ledger` (append-only, DB-enforced — same guard-trigger pattern
as `reward_ledger`). Heister Rank is derived from the point total via
`heister_ranks.min_points` thresholds; Genesis Heister has no point threshold
(`min_points` is null) — it's campaign-assigned only, tied into Genesis Pass
eligibility (M11).

"Recruit Heister" can't complete yet — it depends on referral attribution
(captain/leaderboard system, M11) that doesn't exist. "Risk Calibration"
completes when a member picks a risk profile (Conservative/Moderate/
Aggressive) on the missions page, backed by a new `profiles.risk_profile`
column.

Admins manage the catalog and adjust points manually (with a required
reason, audit-logged) on `/admin/missions`.

### Signal Engine v2 + Signal Archive

Migration `0013` widens `signals` to the full 8-state lifecycle
(`pending/active/hit_tp1/hit_tp2/hit_tp3/invalidated/expired/manual_closed`)
and adds `invalidation`/`tp1`/`tp2`/`tp3`/`risk_level`/`setup_reason`/`ai_note`.
The non-negotiable rule: every signal is archived, including losses and
invalidated calls — a member can no longer delete a signal, only transition
its status, and a guard trigger blocks any updater (member or admin) from
rewriting entry/stop/tp*/rationale after the fact.

`/dashboard/signals` filters by status (All / Active / Wins / Losses /
Closed) — the archive is a filtered view over the same table, not a separate
one. Members self-track outcomes via `SignalActions`; admins can force a
transition on `/admin/signals`. Either path writes a `signal_updates` row
(lifecycle history) alongside the status change.

The active Playmaker persona's `signal_prefix` (migration `0010`) is
prepended to each generated signal's `ai_note`.

### Mentor Heister (GPT Mentor) + Trade Journal

Migration `0014` adds `trade_journals` (a member's private, self-logged trade
history — freely editable, not a business ledger) and `ai_chat_sessions`
(append-only, DB-guard-triggered like `reward_ledger`/`heist_points_ledger` —
every Mentor call's token usage is logged here for future cost-visibility
dashboards, §17.4/V2). Also adds `profiles.ai_consent_at`, a self-service
field (same class as `risk_profile`) recording when a member accepted the
AI Data consent gate.

`/dashboard/ai-mentor` is Pro+ only (locked with an upgrade CTA on Basic) and
gated behind the AI Data consent gate (`AiConsentGate`, covering AI Data /
Journal Data / Broker Activity Data / Reward Data usage — the full
consent-page copy ships with M12's Trust pages). Once past both gates:

- **Chat** — free-form questions plus quick actions (explain my latest
  signal, suggest a broker route, summarize my journal, am I overtrading)
  that inject server-fetched context into the prompt.
- **Position size calculator** — pure deterministic math, no LLM call (zero
  token cost, instant).
- **Paper bot template** — describes a backtest/paper-tracking rule set in
  plain language; the system prompt hard-bans auto-execution code or live
  broker wiring.
- **Trade review** — triggered per-entry from `/dashboard/journal`, reviews
  a single journaled trade for discipline feedback.

All four map to `POST /api/mentor/{chat,position-size,bot-template,trade-review}`,
each re-checking the Pro+ + consent gate server-side and logging to
`ai_chat_sessions` via the service role (members have no direct
insert/update/delete access to that table).

`/dashboard/journal` is open to every plan: log a trade (pair, direction,
entry/exit, size, outcome, whether you followed your plan, notes), see a
discipline score (% of trades where you followed your own plan) and an
overtrading banner (more than 5 trades logged on one UTC day). Trades are
edited/deleted directly via the browser client under RLS — no admin
mediation needed since this is personal data, not a shared ledger.

### Reward ledger (commission import)

Admins import a broker's commission report on `/admin/commissions`: pick the
broker + a period label (e.g. `2026-07`), upload a CSV with columns `uid,
volume, fees, backend_commission`, **Preview** to see how many rows match a
`verified` broker account, then **Commit import**. Committing stores the raw
rows (`commission_imports` / `commission_rows`) and splits each matched row's
figures into `reward_ledger` entries:

- **Member** reward = the member's own `fees` × their plan's reward rate
  (`lib/rewards.ts` — Basic/Pro/Elite rates from blueprint §5, tune there).
- **Donation** / **Operation** = a fixed percentage of `backend_commission`
  (also in `lib/rewards.ts`). These have no individual recipient.
- Captain/leaderboard/campaign allocations aren't computed yet — there's no
  captain network or leaderboard to credit until a later milestone.

New entries land as `pending`. Admins bulk-select rows on `/admin/rewards` to
**Approve** (`pending` → `approved`) then **Mark paid** (`approved` → `paid`);
both actions write an `audit_logs` row. Members see their own totals and line
items on `/dashboard/rewards` — public framing only ("trading fee reward"),
never the backend commission rate itself.

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
