# MVP V1 Launch Readiness — QA Evidence

Tracks the P0/P1/P2 checklist from the **MVP V1 Audit Report — IT Revision
Test Checklist and Launch Readiness Decision** (2026-07-05), as scoped into
the launch-readiness working plan
([issue #44](https://github.com/bayuewalker/market_heist/issues/44)).

**How to use this doc:** every item is either **PASS (code)** — verified by
reading the code, no live infra needed — or **NEEDS LIVE VERIFICATION** —
requires a real deployed environment (a running Telegram bot registered with
`@BotFather`, real Supabase, a real TRON payment, live cron) that this repo
can't simulate. When you run a live check, flip its status to **PASS
(live)** or **FAIL (live)** and add a one-line note + date. Don't mark
**PASS (live)** without actually exercising the flow — a code-audit pass
doesn't imply the live path was ever hit end-to-end.

Decision gate (unchanged from the audit): **Closed Beta = GO once every P0
is PASS.** **Public Launch = WAIT until every P1 is also PASS** and
Telegram/payment/cron/monitoring are verified live.

---

## P0 — blocking before Closed Beta

### P0-01 · Security & secrets

| Check | Status | Evidence |
|---|---|---|
| No hardcoded secrets in repo | PASS (code) | No `SUPABASE_SERVICE_ROLE_KEY`, `NVIDIA_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TRONGRID_API_KEY`, or `CRON_SECRET` literal values found in tracked files (only referenced via `process.env.*`). |
| `.env.example` is placeholders only | PASS (code) | Confirmed placeholder values, no live keys. |
| Vercel Prod + Preview env vars present | NEEDS LIVE VERIFICATION | Check the Vercel dashboard directly — this repo can't read Vercel's env var store. |
| No service-role/NVIDIA/Telegram/cron/TronGrid keys in the client bundle | PASS (code) | `SUPABASE_SERVICE_ROLE_KEY` only read in `lib/supabase/admin.ts` (server-only module); `TELEGRAM_BOT_TOKEN`/`TELEGRAM_WEBHOOK_SECRET` only read in `lib/telegram.ts`/`lib/telegram-settings.ts` (server-only, `runtime = "nodejs"` routes); `NVIDIA_API_KEY` only in `lib/nvidia-client.ts`. None imported by a `"use client"` component. |
| Rotate any key ever shared in chat/logs/screenshots | **ACTION NEEDED** | A Supabase Management API personal access token (`sbp_...`) and the two test-account passwords (`test.admin@marketheist.test`, `test.member@marketheist.test`) were shared in plaintext chat during an earlier session for test-account setup. **Rotate the Management API token and both test passwords before public launch** if not already done. |

### P0-02 · Auth & role guard

| Check | Status | Evidence |
|---|---|---|
| Member signup → dashboard | PASS (code) | `AuthForm.tsx` → `supabase.auth.signUp` → redirect to `/dashboard`. |
| Logged-out redirected off `/dashboard` | PASS (code) | `lib/supabase/middleware.ts:41-46`. |
| Member blocked from `/admin` | PASS (code) | `app/admin/layout.tsx` calls `requireAdmin()` (`lib/admin.ts`), redirects non-admins to `/dashboard`. |
| Member blocked from admin API via raw HTTP | PASS (code) | Independently re-verified in QA-A5: all 15 routes under `app/api/admin/**` re-check `role === "admin"` server-side, not just RLS/layout. |
| Admin sees admin menus (incl. Settings) | PASS (code) | `components/admin/AdminNav.tsx` — Overview/Users/Broker accounts/Commissions/Rewards/Missions/Signals/Genesis Pass/Donations/Payments/Character/**Settings**. |
| Captain role assignable, no admin inheritance | PASS (code) | `app/api/admin/users/[id]/route.ts` — `captain` is a distinct role in the `ROLES`/CHECK-constraint union; RLS/guard trigger (migration `0006`, `0015`) blocks self-role-change and non-admin role writes. |
| Logout clears session (desktop + mobile) | PASS (code) | Fixed in PR #40 — logout button was missing from the mobile nav flyout; now present in both `DashboardNav.tsx` and `AdminNav.tsx`. |

### P0-03 · Supabase RLS isolation

| Check | Status | Evidence |
|---|---|---|
| Profile / signals / broker UID / rewards / journal / mission-claim isolation | PASS (code) | Confirmed in the full blueprint compliance audit (see PR #41-#43 discussion): every member-scoped table's select/update policy is `auth.uid() = user_id` (or equivalent), admin reads via `is_admin()`. |
| Admin-only records unreadable by members | PASS (code) | Same audit — no table regressed to a public `using(true)` policy that leaks a member/admin identifier. |
| `bot_settings` unreadable by any non-service-role client | PASS (code) | Migration `0019` — RLS enabled, **zero** select/insert/update policies defined for any role; only service-role (which bypasses RLS) ever touches it. |
| — | NEEDS LIVE VERIFICATION | Run the isolation checks with ≥2 real signed-in test users against the deployed Supabase project (not just policy-reading) — see Manual Test Script list below. |

### P0-04 · Telegram Login

| Check | Status | Evidence |
|---|---|---|
| Widget renders on deployed `/login` | NEEDS LIVE VERIFICATION | Requires a real `@BotFather`-registered domain. |
| BotFather domain accepts deployed domain | NEEDS LIVE VERIFICATION | Manual `@BotFather` `/setdomain` step, documented in `SETUP.md`. |
| Linked account logs in / unlinked account rejected, no new account created | PASS (code) | `app/api/auth/telegram/route.ts:49-56` — looks up `telegram_links`; if no match, `loginError("not_linked")`, no insert path exists. |
| Modified HMAC payload rejected | PASS (code) | `lib/telegram-login.ts` — HMAC-SHA256 over sorted params, keyed by `SHA256(bot token)`, timing-safe compare. |
| Session behavior == email/password | PASS (code) | Magic-link mint + redeem via `verifyOtp`, same `@supabase/ssr` cookie path as the password flow. |
| Login audit row written | PASS (code) | `writeAuditLog(admin, { action: "auth.telegram_login", ... })`. |
| Works whether token is set via env var or `/admin/settings` | PASS (code) | QA-A2 (PR #47) — `getTelegramBotConfig()` resolves DB-first, env-fallback; `verifyTelegramLoginPayload` takes the resolved token as a parameter. |
| Nonce/state binding (login-CSRF) | PASS (code) | `app/api/auth/telegram/nonce/route.ts` + `lib/safe-redirect.ts` — HttpOnly single-use cookie, timing-safe compare, deleted on every response path. |

### P0-05 · Telegram Bot onboarding

| Check | Status | Evidence |
|---|---|---|
| Webhook → deployed `/api/telegram/webhook` | NEEDS LIVE VERIFICATION | Requires `setWebhook` call against a real deployment (documented in `SETUP.md`). |
| Request without secret header rejected | PASS (code) | `verifyTelegramWebhookSecret()` checked first line of the handler, 401 on mismatch/missing. |
| `/start` onboarding copy, `/start <code>` links correct profile, expired/used code rejected | PASS (code) | `lib/telegram-commands.ts` `handleStart()`. |
| Dashboard link works | PASS (code) | `appUrl("/dashboard")` deep links, `NEXT_PUBLIC_APP_URL`-based. |
| `/help /brokers /profile /rank /mission /signal /mentor` return expected/gated content | PASS (code) | All 8 commands present in `handleTelegramCommand()`'s switch; `/mentor` added in QA-A2 (PR #47) deep-links to Mentor Heister. |
| Interactions logged to `bot_events` | PASS (code) | `app/api/telegram/webhook/route.ts:59-69` — every command (including unknown/error) writes a row. |
| — | NEEDS LIVE VERIFICATION | End-to-end run against a real bot: `/start`, link code consumption, all 8 commands, at least one triggered error path. |

### P0-06 · Broker Station & UID verification

| Check | Status | Evidence |
|---|---|---|
| Bitget/KuCoin/BingX cards, referral links | PASS (code) | `components/dashboard/BrokerCard.tsx`, seeded `brokers` rows (migration `0008`). |
| UID submit-once, duplicate blocked/flagged | PASS (code) | `POST /api/broker-accounts/submit-uid` + `duplicate` status in the CHECK constraint. |
| Admin status transitions (submitted→under_review→verified/rejected/duplicate/inactive) | PASS (code) | `PATCH /api/admin/broker-accounts/[id]/verify`. |
| Member sees updated status | PASS (code) | `/dashboard/broker` re-reads on load. |
| Audit log w/ actor/target/old/new/reason | PASS (code) | Re-confirmed in QA-A5. |
| — | NEEDS LIVE VERIFICATION | Real broker referral link click-through (partner-side, can't verify from this repo). |

### P0-07 · Payment & plan

| Check | Status | Evidence |
|---|---|---|
| Order creates unique expected amount, stays pending until verified | PASS (code) | `lib/payments.ts`, `app/api/payments/create/route.ts`. |
| Plan/expiry extends only after verified payment | PASS (code) | Migration `0002`/`0004` — guard trigger blocks client-side `plan_id`/`plan_expires_at` writes; only the payment-check route (service role) can set them. |
| Wrong amount doesn't activate; same tx can't double-activate | PASS (code) | `lib/tron.ts` amount-match + tx-hash uniqueness check. |
| `/api/payments/check` rejects without `CRON_SECRET`/admin session | PASS (code) | Confirmed in the route's auth guard. |
| — | NEEDS LIVE VERIFICATION | A real on-chain TRC20 USDT transfer, watched end-to-end through confirmation and plan activation. |

### P0-08 · Commission import & Reward Ledger

| Check | Status | Evidence |
|---|---|---|
| CSV preview matched/unmatched, verified-UID-only matching | PASS (code) | `lib/commissions.ts`, `POST /api/admin/commissions/preview`. |
| Commit creates import + ledger rows; duplicate broker/period/uid guarded | PASS (code) | `POST /api/admin/commissions/commit`. |
| Member reward = pending; captain reward only on valid attribution; donation/operation rows | PASS (code) | `lib/rewards.ts` `computeRewardAllocations()`. |
| Member view hides backend commission rate | PASS (code) | `/dashboard/rewards` renders only `amount`/`status`; re-confirmed no rate leak anywhere client-facing in the full compliance audit. |
| Approve + mark-paid audit-logged | PASS (code) | Confirmed in QA-A5. |
| Append-only, DB-enforced on both UPDATE and DELETE | PASS (code) | Migration `0009` (UPDATE guard) + migration `0017` (DELETE guard, added in this launch-readiness pass, PR #41) — now matches `heist_points_ledger`'s pattern exactly. |
| — | NEEDS LIVE VERIFICATION | A real commission CSV from a broker partner, run through preview → commit → approve → mark-paid. |

### P0-09 · AI Signal Engine

| Check | Status | Evidence |
|---|---|---|
| Full field/status set, plan limits, archive filters, immutable post-gen fields | PASS (code) | Migration `0013`; `guard_signals_immutable_fields()` trigger locks every column but `status` post-insert. |
| Lifecycle transitions + status-change history, atomic | PASS (code) | `record_signal_status_change()` RPC — status update + history insert in one transaction; confirmed still in place (not reverted) in the full compliance audit. |
| — | NEEDS LIVE VERIFICATION | A real NVIDIA API round-trip in production (not just local/preview) — confirm latency, error handling, and output quality on live traffic. |

### P0-10 · AI Mentor Heist

| Check | Status | Evidence |
|---|---|---|
| Dashboard entry visible; `/dashboard/ai-mentor` loads, redirects logged-out | PASS (code) | QA-A1 (PR #45) — Command Center "Ask Mentor Heister" card. |
| Consent gate before first use | PASS (code) | `AiConsentGate.tsx`, `profiles.ai_consent_at`, checked server-side in `lib/mentor.ts`. |
| Chat returns structured answer | PASS (code, prompt-enforced) | `lib/mentor.ts` system prompt mandates answer/risk-note/action/invalidation/position-size — **not** schema-validated server-side; a malformed AI response could in theory omit a piece. Accepted as a known soft spot, not a launch blocker. |
| Signal Room "Ask Mentor" passes signal context | PASS (code) | QA-A1 (PR #45) — `SignalCard` deep-links to `/dashboard/ai-mentor?signal=<id>`, owner-scoped fetch, auto-explain on open. |
| Position-size deterministic | PASS (code) | `calculatePositionSize()` — pure arithmetic, no AI call. |
| Trade review | PASS (code) | `POST /api/mentor/trade-review`. |
| Safe framing (no profit guarantees/execution) | PASS (code) | Confirmed via full compliance-copy grep — zero banned-phrase hits in Mentor output paths; system prompt explicitly bans them. Also confirmed (code search) that no trade-execution/order-placement API is reachable from any Mentor code path. |
| Usage limit enforced, session + token logged, NVIDIA key server-only, graceful failure | PASS (code) | `checkMentorAccess()` (Pro+ plan gate), `ai_chat_sessions` insert with `token_usage` on every call, key read only in `lib/nvidia-client.ts`. |
| "Consult the Mentor" mission completes after first use | PASS (code) | Migration `0018`, `use_ai_mentor` trigger in `lib/missions.ts`. |
| `/mentor` Telegram command opens it correctly | PASS (code) | QA-A2 (PR #47). |
| — | NEEDS LIVE VERIFICATION | A real end-to-end Mentor session in production — chat, position-size, trade-review, and the mission auto-completing on next dashboard load. |

### P0-11 · Admin panel & audit logs

| Check | Status | Evidence |
|---|---|---|
| List users, role update (self-demotion blocked), broker review, mission management (incl. create/delete), rewards approve/paid, Genesis export, character config edit, bot settings edit | PASS (code) | All 15 admin routes re-verified in QA-A5 — see table above. Mission create/delete shipped in PR #42; bot settings shipped in PR #47. |
| Every sensitive mutation audit-logged | PASS (code) | QA-A5: all 14 state-changing routes call `writeAuditLog`; the one non-logged route (`commissions/preview`) is a correct no-op (dry-run, zero DB writes). |
| — | Known nit (non-blocking) | `genesis/export` is a `GET` handler with a mutating side effect (sets `exported_at`). Correctly admin-gated and audit-logged — flagged as a REST-convention cleanup opportunity for later (P2), not a security or launch issue. |

---

## P1 — required before Public Launch

| Area | Status | Evidence |
|---|---|---|
| **The Playmaker** — landing asset, dashboard note, mission-page voice, bot persona, signal prefix, invalid-config safety | PASS (code) | QA-A3 (PR #46) closed the landing/missions gap; all five surfaces confirmed defensive (`.maybeSingle()` + optional chaining) — an inactive/missing config degrades gracefully everywhere. **NEEDS LIVE VERIFICATION**: visual check on the deployed site. |
| **Missions/Points/Rank** — list, trigger, claim, duplicate-claim guard, points ledger, rank update, admin adjustment w/ reason+audit | PASS (code) | `claim_mission()`/`append_heist_points()` RPCs, advisory-locked, unique `(user_id, mission_id)` constraint. Concurrency fix (Copilot-flagged during M8) reconfirmed still in place. |
| **Leaderboard & Captain** — 5 boards, verified-UID gating, weighted score formula, captain tiers/rates, cron + manual recompute | PASS (code) | `lib/leaderboard.ts` — real weighted computation (40/25/20/10/5), not a stub; Captain tiers exact match (Scout 5/2% → Elite Captain 250+/10%). **NEEDS LIVE VERIFICATION**: cron actually firing on schedule in production. |
| **Genesis eligibility** — checklist, sticky reservation ID, admin export, no on-chain minting | PASS (code) | `lib/genesis.ts` — confirmed off-chain only, zero NFT/mint code anywhere in the repo. |
| **Trust & compliance routes** — hub + all 7 pages, no rate leak, signal-archive framing | PASS (code) | `/trust` hub links all pages; full compliance-copy grep (all banned phrases) returned zero violations. |
| **Monitoring & ops** | See below | New in this pass. |

## P2 — post-Closed-Beta polish (backlog, not blocking)

Mobile dashboard UX polish · richer empty/loading states · admin CSV validation messages · signal-quality tone review · Mentor cost/token usage dashboard for admins · transparency-report automation · Playmaker content refresh without redeploy · converting `genesis/export` from GET to POST.

---

## Monitoring & Ops plan

Not yet implemented — this section documents the plan so it's actionable, not a claim that it's live.

| Item | Plan | Owner | Status |
|---|---|---|---|
| **Error tracking** | Add Sentry (or equivalent) to the Next.js app — server + client + edge. Capture unhandled errors in API routes (especially `/api/telegram/webhook`, `/api/payments/check`, `/api/signals/generate`) and React error boundaries. | TBD | Not started |
| **Uptime monitoring** | External uptime monitor (e.g. UptimeRobot/Better Uptime/Checkly) polling: landing (`/`), `/login`, `/dashboard` (expect a redirect, not a 500), an API health check, and the Telegram webhook URL (expect 401 without a secret header — confirms the route is live, not that it's healthy in the Telegram sense). | TBD | Not started |
| **Cron failure alerting** | Vercel Cron currently runs `payments/check`, `trends/generate`, `leaderboard/recompute` — none currently alert on failure. Add a check (e.g. a dead-man's-switch ping service, or Sentry Cron Monitoring) so a silently-failing cron job doesn't go unnoticed. | TBD | Not started |
| **Manual fallback triggers** | Confirm each cron job's admin-triggered manual equivalent still works if the cron itself fails: `/admin/payments` (manual payment check), `/admin` recompute action for the leaderboard, and trend generation. | TBD | Verify manually before beta |
| **Backup / export SOP** | Document (and test once) how to export a full Supabase project backup and how to restore from one. Supabase's own dashboard has point-in-time recovery on paid tiers — confirm which tier this project is on and what the actual recovery window is. | TBD | Not started |
| **Key rotation SOP** | Write down, step by step, how to rotate each secret without downtime: `SUPABASE_SERVICE_ROLE_KEY`, `TELEGRAM_BOT_TOKEN` (now rotatable via `/admin/settings` without a redeploy — PR #47), `TELEGRAM_WEBHOOK_SECRET` (needs a `setWebhook` re-call), `NVIDIA_API_KEY`, `CRON_SECRET`, `TRONGRID_API_KEY`. Note which ones need a Vercel redeploy vs. which are now admin-editable. | TBD | Not started |
| **Incident owner** | Assign one person as the first responder for production incidents (payment failures, bot outages, AI provider outages). Not a code change — a team decision. | TBD | Not decided |

---

## Manual test scripts

Run these against the deployed environment (not local dev) before calling Closed Beta ready. Full step-by-step scripts are in the audit report; summarized here for tracking:

| Script | Covers | Status |
|---|---|---|
| A — New member onboarding | Signup → dashboard → profile → Telegram link → broker UID submit | Not yet run |
| B — Telegram linking | Dashboard "Link Telegram" → deep link → `/start <code>` → link confirmed | Not yet run |
| C — Telegram Login | Linked account logs in; unlinked account cleanly rejected | Not yet run |
| D — Broker UID verification | Submit → admin verify → member sees status → audit log | Not yet run |
| E — Commission & Reward Ledger | CSV upload → preview → commit → approve → mark paid → member view | Not yet run |
| F — AI Signal flow | Request → fields present → archive → lifecycle transition → history | Not yet run |
| G — AI Mentor Heist flow | Dashboard entry → consent → chat → Signal Room "Ask Mentor" → position-size → mission completes | Not yet run |
| H — Mission & Points flow | Complete → claim → points added once → duplicate claim blocked | Not yet run |
| I — Genesis eligibility | Checklist progress → eligible → reservation ID → sticky after a later change | Not yet run |

---

## Sign-off

- [ ] IT lead signs off for closed beta (all P0 = PASS, live-verified where required).
- [ ] Product lead signs off for beta invite (P1 items PASS or explicitly accepted as non-blocking).

_Last updated: 2026-07-05, alongside PRs #41–#47 (blueprint compliance audit fixes + QA-A1/A2/A3)._
