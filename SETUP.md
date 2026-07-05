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
16. [`supabase/migrations/0016_trust_compliance.sql`](./supabase/migrations/0016_trust_compliance.sql)
17. [`supabase/migrations/0017_reward_ledger_delete_guard.sql`](./supabase/migrations/0017_reward_ledger_delete_guard.sql)
18. [`supabase/migrations/0018_ask_ai_mentor_mission.sql`](./supabase/migrations/0018_ask_ai_mentor_mission.sql)
19. [`supabase/migrations/0019_bot_settings.sql`](./supabase/migrations/0019_bot_settings.sql)

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

Tiers and reward rates are exact per §23's Captain Network Roadmap table:
Scout (5, 2%) → Captain (25, 4%) → Commander (100, 6%) → Elite Captain
(250+, 10%). The threshold counts **verified** referred members (a broker
UID verified — real trading activity), not raw signups, matching the
Captain Leaderboard's own "ranks verified users" rule — `/dashboard/captain`
shows both an invited count and a verified count so the distinction is
visible. Below 5 verified referrals there's no tier and no Captain Reward
accrues yet. Captain Code V1 is intentionally lightweight (branch volume
and estimated-reward fields are a V2 Captain Dashboard feature, §17.2).
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
   `TELEGRAM_BOT_TOKEN` and `TELEGRAM_BOT_USERNAME` — **or** set them from
   `/admin/settings` instead (QA-A2, migration `0019`'s `bot_settings`
   table). An admin-set value there always overrides the env vars, without a
   redeploy; the token is write-only in the admin UI (never displayed again
   after saving). `TELEGRAM_WEBHOOK_SECRET` stays env-var-only either way.
2. Set `TELEGRAM_WEBHOOK_SECRET` to a long random string, then register the
   webhook (once, after deploying):
   ```bash
   curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
     -d "url=$NEXT_PUBLIC_APP_URL/api/telegram/webhook" \
     -d "secret_token=$TELEGRAM_WEBHOOK_SECRET"
   ```
3. Commands: `/start`, `/help`, `/brokers`, `/profile`, `/rank`, `/mission`,
   `/signal`, `/mentor` (deep-links to Mentor Heister, added in QA-A2).

All bot interactions are logged to `bot_events`; every webhook request must
carry the matching `X-Telegram-Bot-Api-Secret-Token` header or it's rejected.

### Telegram Login (M13, additive sign-in)

An **additional** sign-in method for members who already linked Telegram via
the flow above — never a replacement for, or a new path around, Supabase
email/password auth, and it never creates an account. If Telegram's widget
payload doesn't resolve to an existing `telegram_links` row, the sign-in is
rejected with a message pointing the user back to email login (or signup).

The widget renders on `/login` and the landing page whenever both
`TELEGRAM_BOT_TOKEN` and `TELEGRAM_BOT_USERNAME` are set — no extra env vars
needed. One extra one-time setup step beyond the bot config above:

1. Message [@BotFather](https://t.me/BotFather) with `/setdomain` and give it
   your deployed domain (e.g. `your-app.vercel.app`) — the Login Widget
   silently refuses to render on any domain not registered this way.

How it works: `components/auth/TelegramLoginButton.tsx` renders Telegram's
official widget in `data-auth-url` (redirect) mode, pointing at
`GET /api/auth/telegram`. That route (`lib/telegram-login.ts` +
`app/api/auth/telegram/route.ts`) verifies the payload's HMAC-SHA256 hash
(keyed by `SHA256(bot token)`, per [Telegram's own spec](https://core.telegram.org/widgets/login#checking-authorization))
and rejects anything older than 24h, looks up the matching `telegram_links`
row, then mints a one-time magic link server-side via the Supabase admin API
and immediately redeems it against the request's cookie-bound client — the
resulting session is issued exactly the same way the email/password path
issues one (no custom session/cookie scheme). Successful logins are recorded
in `audit_logs` (action `auth.telegram_login`).

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
- **Captain** reward = a percentage of `backend_commission`, scaled by the
  referring captain's current tier rate (`lib/captain.ts`'s `getCaptainTier`),
  only when the matched member was referred by a captain (§23, added in M11).
- Leaderboard/campaign allocations aren't computed here — a leaderboard
  payout is a separate, periodic, admin-triggered action, and campaign has no
  recipient system until the V2 Campaign Engine.

New entries land as `pending`. Admins bulk-select rows on `/admin/rewards` to
**Approve** (`pending` → `approved`) then **Mark paid** (`approved` → `paid`);
both actions write an `audit_logs` row. Members see their own totals and line
items on `/dashboard/rewards` — public framing only ("trading fee reward"),
never the backend commission rate itself.

`reward_ledger` is append-only like `heist_points_ledger`: migration `0009`
guards UPDATE (only `status`/`approved_*`/`paid_*` may change), and migration
`0017` closes the gap found in a blueprint compliance audit by guarding
DELETE too — no caller, including the service role, can delete a reward
ledger row; a correction is always a new row.

### Trust & Compliance Layer

Migration `0016` adds `donation_ledger` (publicly readable via `using (true)`
RLS — a transparency report is meant for anyone, signed in or not; writes are
admin-only through `/admin/donations`). Every required Trust & Compliance
page from §15/§24.1 is published and linked from the `/trust` hub (and the
site footer):

| Page | Route | Notes |
| --- | --- | --- |
| Risk Disclaimer | `/risk` | Pre-existing (M0/M1) |
| Affiliate Disclosure | `/affiliate-disclosure` | New (M12) |
| Reward Policy | `/reward-policy` | New (M12) |
| Signal Archive | `/dashboard/signals` | Pre-existing (M9) — member-only, not a standalone legal page |
| Donation Ledger | `/donation-ledger` | New (M12) — DB-backed, reads `donation_ledger` |
| Transparency Report | `/transparency-report` | New (M12) — placeholder until the first full month of live activity |
| Terms & Privacy | `/terms`, `/privacy` | Pre-existing (M0/M1) |
| AI Data Consent | `/ai-data-consent` | New (M12) — linked from `AiConsentGate.tsx` |

`audit_logs` now covers every admin mutation endpoint: broker UID
verification, user plan/role changes, character config edits, Genesis CSV
export, and donation ledger entries, in addition to the reward/mission/
signal/commission actions already logged from earlier milestones. The
trends/leaderboard cron routes only log when a **signed-in admin** manually
triggers them — the routine cron-triggered runs are expected/automatic and
would just be noise in an audit trail meant to record deliberate admin
action.

**Elite pricing** stays "Coming Soon" (not the blueprint's pitched
$99/month) — an accepted, documented divergence: Elite's advertised
features (Bot Template Builder, an Elite-exclusive leaderboard) aren't built
yet, and charging for an incomplete tier would contradict the compliance
copy rule below. Revisit once those features ship.

**Public Copy Rule** (§24.1) — a full-codebase audit found no violations.
Use "AI-assisted trading intelligence," "Verified broker reward,"
"Risk-managed signal," "Trading discipline," "Transparent leaderboard,"
"Mission-based community," "Genesis eligibility." Avoid "guaranteed
profit," "passive income," "no loss," "fixed return," "managed account,"
"token promise," "NFT speculation." The one borderline string in the
codebase — `CaptainCodeCard.tsx`'s "not MLM, not passive income, and not an
investment return" — is a negated disclaimer (it explicitly *disclaims*
those terms, matching §23's own required framing), not a violation.

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

---

## Launch QA Checklist (§15 MVP V1 Acceptance Criteria)

Every line of the blueprint's §15 acceptance list, mapped to the shipped
feature/file. **PASS** = verified by reading the code; **NEEDS MANUAL
VERIFICATION** = requires a live, Supabase-connected environment (a running
Telegram bot, a real broker webhook, etc.) that isn't available from a
code-only review — verify these against a real deployment before calling
MVP V1 launched.

| Criterion | Status | Where |
| --- | --- | --- |
| User can register/login with Telegram | PASS (code) / NEEDS MANUAL VERIFICATION (live bot + BotFather domain) | `/login` + landing page, `app/api/auth/telegram/route.ts` (M13) — additive to email/password, only for already-linked accounts (see below) |
| Telegram Bot can onboard users | PASS (code) / NEEDS MANUAL VERIFICATION (live bot) | `app/api/telegram/webhook/route.ts`, `lib/telegram.ts` — needs a real `TELEGRAM_BOT_TOKEN` + webhook to confirm end-to-end |
| User can access dashboard | PASS | `/dashboard`, gated by `createClient()` + Supabase Auth session |
| User can open broker referral link | PASS | `/dashboard/brokers`, `brokers.referral_base_url` |
| User can submit broker UID | PASS | `POST /api/broker-accounts/submit-uid` |
| Admin can verify UID | PASS | `PATCH /api/admin/broker-accounts/[id]/verify`, now audit-logged (M12) |
| Admin can import commission/volume data | PASS | `/admin/commissions`, `POST /api/admin/commissions/commit` |
| User can see safe reward status | PASS | `/dashboard/rewards` — public framing only, no backend commission rate exposed |
| Admin can create signal | **Accepted divergence** (documented since M0/M1) | Signals are member-requested + AI-generated (`POST /api/signals/generate`), not admin-curated — a deliberate architecture choice recorded in `WORKING_PLAN.md`'s accepted-divergences list, not a gap |
| User can see signal and archive | PASS | `/dashboard/signals` (current + archive), `/dashboard/request` |
| GPT Mentor can explain signal and position sizing | PASS | `lib/mentor.ts` (`chat`, `position_size` functions), `/dashboard/ai-mentor` |
| User can complete missions | PASS | `/dashboard/missions`, `claim_mission` RPC |
| Heist Points are logged correctly | PASS | `heist_points_ledger`, `append_heist_points` RPC (atomic, advisory-locked) |
| Heister Rank is calculated | PASS | `heister_ranks`, computed from lifetime points |
| Leaderboard V1 works | PASS | `/dashboard/leaderboard`, `lib/leaderboard.ts`, 6-hour Vercel Cron recompute |
| Genesis eligibility tracker works | PASS | `/dashboard/genesis`, `lib/genesis.ts`'s sticky pull-based checklist |
| The Playmaker appears in landing, bot, dashboard, and missions | PARTIAL | `character_configs` (configurable via `/admin/character`) renders in the Telegram bot's `/start` intro (`lib/telegram-commands.ts`), the dashboard note (`app/dashboard/page.tsx`), and the AI signal note prefix (`app/api/signals/generate/route.ts`) — **not** wired into the marketing landing page or the missions page specifically; those two integration points remain open follow-up work, not a blocker for MVP V1 |
| Trust pages are published | PASS | `/trust` hub + all 8 pages in the table above (M12) |
| Audit logs capture admin actions | PASS | `audit_logs` + `writeAuditLog()`; backfilled in M12 to cover every admin mutation endpoint (broker verify, user update, character config, Genesis export, plus the pre-existing mission/reward/signal/commission/donation actions) |
| No MVP-excluded features are accidentally shipped | PASS | No V2-scoped features (fraud engine, Campaign Engine, Stripe billing, multi-language) are present in the codebase |

### M13 · Telegram Login

Blueprint §15 lists Telegram login as an acceptance criterion; `WORKING_PLAN.md`
scoped it as **M13 (issue #26), P2/deferred** — a separate milestone from the
Telegram *bot* linking shipped in M7 — and it has now shipped (see the
"Telegram Login" section above). `/login` and the landing page both render
the widget once the bot is configured; email/password remains fully
functional and primary, and Telegram Login only ever signs in an account
that already linked Telegram via M7 — it never registers a new one.
