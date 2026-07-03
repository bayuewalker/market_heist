# Market Heist — Working Plan

Working execution plan that maps Market Heist's product docs onto the current
codebase. It records what is already built, what is missing, and the phased
order in which we close the gap. Treat this as the living build tracker —
update the status column as milestones land.

- **Source documents:**
  1. `Market Heist Master Blueprint V1` — PRD + business model + architecture. Defines the **cash Reward Ledger** business engine (broker commission → member/captain/leaderboard/donation split).
  2. `Market Heist Genesis MVP — IT Execution Order & Prompt Pack` — tactical 30-day IT build order. Defines the **Telegram-first acquisition + gamification layer** (bot, Missions, Heist Points, Heister Rank, Leaderboard, Genesis NFT eligibility).
- **Stack in repo:** Next.js 16 (App Router) · React 19 · Tailwind v4 · Supabase (Auth + Postgres RLS) · NVIDIA OpenAI-compatible API for signals · on-chain USDT (TRON TRC20) payments · Vercel
- **Positioning guardrail (non-negotiable):** AI trading *intelligence* + verified broker *rewards*. Never "guaranteed profit", "passive income", "managed fund", or public backend commission. Every commit that touches user-facing copy respects Blueprint §12.

> ⚠️ **Framework note:** `AGENTS.md` warns this is a modified Next.js with
> breaking changes. Read the relevant guide in `node_modules/next/dist/docs/`
> before writing route/handler/config code — do not assume training-data APIs.

---

## 1. Founder decisions — reconciling the two source docs

The two docs disagree on two foundational points. Both were resolved with the
founder before continuing the plan; record kept here so future work doesn't
re-litigate them.

| Conflict | Genesis MVP doc says | Decision | Why |
|---|---|---|---|
| **Primary auth** | Telegram Login replaces email/password as primary auth | **Keep Supabase email/password auth as primary.** Telegram Login is a later, additive milestone (M12) that links a `telegram_id` to the existing `profiles` row — for bot notifications and an optional sign-in method, not a replacement. | The app already has real Supabase-authenticated users, and the in-review Broker Station (PR #18) is built on `auth.users`/`profiles`. Ripping that out now is high-cost, high-risk for zero near-term benefit. |
| **Reward model** | Points / Rank / Leaderboard / Genesis NFT eligibility (off-chain, gamified) | **Run both layers in parallel.** Points/Rank/Missions/Genesis NFT become a gamification & retention track (M7, M10) alongside the Blueprint's cash Reward Ledger (M5). They share the same `verified` broker-UID eligibility gate (already shipped in M4) but are otherwise independent systems — points don't convert to cash, and cash rewards don't require a rank. | The two aren't actually in tension: the Blueprint's ledger is the *business* engine (real broker commission payouts); the Genesis doc's points/rank/missions are a *retention* engine (engagement, onboarding, future airdrop base). Shipping both is strictly additive once the shared eligibility gate exists. |

---

## 2. Current state — what already exists

| Area | Status | Where |
|---|---|---|
| Security cleanup, secure auth, roles (member/admin) | ✅ Done | `app/(auth)/*`, `lib/supabase/*`, migrations `0005`/`0006` |
| Membership plans (Basic / Pro / Elite) | ✅ Done | `supabase/migrations/0001`, `lib/pricing.ts` |
| Payments (on-chain USDT, TRC20) + membership expiry | ✅ Done (crypto path) | `app/api/payments/*`, `lib/tron.ts`, `lib/payments.ts`, migrations `0003`/`0004` |
| AI Signal Engine (basic) | 🟡 Partial | `app/api/signals/generate`, `lib/nvidia.ts`, `signals` table |
| Daily trend updates | ✅ Done | `app/dashboard/trends`, `app/api/trends/generate`, migration `0007` |
| Live mentoring (schedule only) | 🟡 Partial | `app/dashboard/mentoring`, `data/mentoring.ts` |
| Admin panel (overview / users / signals / payments) | ✅ Done | `app/admin/*`, `lib/admin.ts` |
| Legal pages (risk / privacy / terms) | 🟡 Partial | `app/(legal)/*` |
| Member dashboard shell + billing/account | ✅ Done | `app/dashboard/*` |
| **Broker Station + UID verification** | ✅ **Done — PR #18 (in review)** | `app/dashboard/broker`, `app/admin/broker-accounts`, migration `0008` |

**Divergences to accept as-is (already shipped, do not rebuild):**

- **Payments:** Blueprint §13 says "Stripe first". Repo already ships **crypto USDT** end-to-end. Keep crypto; Stripe stays optional/future.
- **AI provider:** Blueprint §13 says OpenAI. Repo uses **NVIDIA OpenAI-compatible API** (`lib/nvidia.ts`). Keep it.
- **Elite price:** Blueprint §3 lists Elite at **$99/mo**; seed data marks Elite "Coming soon" with `null` price. Reconcile in M11.
- **Broker UID status set:** already shipped as `submitted / under_review / verified / rejected / duplicate / inactive` (Blueprint §9's full set), a superset of the Genesis doc's simpler `not_submitted / pending / verified / rejected`. No change needed — the richer state machine already covers the leaner one.

---

## 3. Gap analysis — modules not yet built

| # | Module | Source | Priority | Status |
|---|---|---|---|---|
| A | Broker Station + UID verification | Blueprint §6/§9, Genesis Order 007 | P0 | ✅ Done |
| B | Commission import + Reward Ledger + member reward dashboard | Blueprint §5/§14 | **P0** | ❌ Not started |
| C | Telegram Bot + Telegram identity linking | Genesis §5, Order 005 | **P0** | ❌ Not started |
| D | Missions, Heist Points, Heister Rank | Genesis §6, Order 009 | **P0** | ❌ Not started |
| E | Signal Engine v2 (invalidation, tp1–tp3, status lifecycle, update history) | Blueprint §7, Genesis Order 008 | P1 | 🟡 Partial |
| F | Signal archive (all outcomes incl. losses, public) | Blueprint §7/§12 | P1 | ❌ Not started |
| G | GPT Mentor interactive (chat, position size, trade review, bot template) | Blueprint §8 | P1 | ❌ Not started |
| H | Trade journal + discipline score | Blueprint §6/§10/§14 | P1 | ❌ Not started |
| I | Unified leaderboard (points / volume / referral / UID / discipline / captain) | Blueprint §10, Genesis Order 010 | P1 | ❌ Not started |
| J | Captain Network v1 | Blueprint §11 | P1 | ❌ Not started |
| K | Genesis NFT eligibility tracker | Genesis §11, Order 011 | P1 | ❌ Not started |
| L | Trust pages + audit log + launch QA hardening | Blueprint §12/§14, Genesis §14/§15/§16 | P1 | 🟡 Partial |
| M | Telegram Login (linked identity, optional sign-in) | Genesis §2 (deferred per decision above) | P2 | ❌ Not started |

---

## 4. Data model plan (delta vs. Blueprint §14 + Genesis §6)

Existing tables: `plans`, `profiles` (+ `role`, `plan_expires_at`), `signals`,
`payments`, `trend_updates`, `brokers`, `broker_accounts`. New migrations
continue the numbered sequence (`0009_…` onward), idempotent, RLS-first
(member reads own; privileged writes via service role; `is_admin()` for admin
reads — reuse the pattern established in `0006`/`0008`).

**Naming note:** the Genesis doc's `notes`/`admin_logs`/`targets` map onto
already-decided names below (`note`, `audit_logs`, `tp1/tp2/tp3`) — one name
per concept, no duplicate tables.

| New table | Purpose | Key columns | RLS intent |
|---|---|---|---|
| `commission_imports` | Import sessions by broker/period | `id, broker_id, period, source(csv/api/manual), row_count, imported_by, created_at` | Admin only |
| `commission_rows` | Raw matched commission/volume/fees | `id, import_id, broker_id, uid, volume, fees, backend_commission, matched_user_id, for_period` | Admin only |
| `reward_ledger` | Member/captain/leaderboard/donation/ops allocations | `id, user_id, source_type, allocation_type, amount, status, period, commission_row_id, created_at, approved_at, paid_at` | Read own; admin all |
| `telegram_links` | `telegram_id` ↔ `profiles.id`, linked at bot `/start` or dashboard opt-in | `id, user_id, telegram_id, telegram_username, linked_at` | Read own; admin all |
| `bot_events` | Telegram bot audit trail | `id, user_id, event_type, payload jsonb, created_at` | Admin read; service-role write |
| `missions` | Mission catalog (seeded from Genesis §12) | `id, code, title, description, points, type, active, sort_order` | Public read (active only) |
| `mission_completions` | Per-user mission state | `id, user_id, mission_id, status, completed_at, evidence` | Read own; admin all |
| `points_ledger` | **Immutable** points accounting — never store only a mutable total | `id, user_id, source, source_id, points, direction, reason, created_at` | Read own; admin/service write |
| `ranks` | Heister Rank thresholds (seeded from Genesis §12) | `id, name, min_points, rules_json, active` | Public read |
| `signal_updates` | Signal lifecycle/status-change history | `id, signal_id, update_text, status_change, created_at` | Public read (mirrors signal archive) |
| `trade_journals` | Member trade log + discipline score | `id, user_id, signal_id?, pair, side, entry, exit, pnl, notes, emotion_tag, discipline_score, created_at` | Read/write own; admin read |
| `ai_chat_sessions` | GPT Mentor session logs + token usage | `id, user_id, kind, messages jsonb, token_usage, created_at` | Read own; admin read |
| `leaderboard_entries` | Unified leaderboard score/rank/metrics snapshot | `id, board, period, user_id, score, rank, metrics jsonb, computed_at` | Public read |
| `captain_networks` | Captain↔member link + code | `id, captain_id, member_id, referral_code, joined_at` | Captain reads own branch; admin all |
| `referral_codes` | Captain code registry | `code, captain_id, active, created_at` | Public read; admin write |
| `nft_eligibility` | Genesis NFT eligibility tracking (off-chain in MVP) | `id, user_id, campaign, status, criteria_json, updated_at` | Read own; admin all |
| `donation_ledger` | Kids donation pool allocations + proof | `id, period, amount, description, proof_url, created_at` | Public read; admin write |
| `audit_logs` | Admin/system action history (= Genesis doc's `admin_logs`) | `id, actor_id, action, target_type, target_id, meta jsonb, created_at` | Admin read; service-role write |

**Signal table extension:** add `invalidation numeric`, `tp1/tp2/tp3 numeric`,
`setup_reason text` (or reuse `rationale`), and widen `status` to
`draft / pending / active / hit_tp / invalidated / expired` (currently only
`active / closed`). Migrate existing rows safely.

**Points Rule (Genesis, non-negotiable):** `points_ledger` is the source of
truth. A user's total is computed (or cached) from ledger rows — never stored
as a single mutable counter, so history and reversals stay auditable.

---

## 5. Phased milestones

Each milestone = one focused PR, security-reviewed, with migrations that run
cleanly on top of the latest existing migration.

### M4 — Broker Station + UID verification (P0) — ✅ Done (PR #18, in review)
Migration `0008`. `brokers` + `broker_accounts`, full UID status lifecycle,
guard-trigger-protected privileged fields, `/dashboard/broker`,
`/admin/broker-accounts`. This is the shared eligibility gate every reward
system (cash ledger and points/rank) reads from.

### M5 — Commission import + Reward Ledger + member reward dashboard (P0) — *Blueprint §5/§14*
- Migration `0009`: `commission_imports`, `commission_rows`, `reward_ledger`.
- Admin `/admin/commissions` — CSV upload → parse → match rows to verified UIDs → preview → commit.
- `lib/rewards.ts`: `Eligible Fee × Backend Rate = Pool`, split Member/Captain/Leaderboard/Campaign/Donation/Operation per §5. **Rate + split stay server-only.**
- Ledger statuses `estimated → pending → approved → paid`; admin actions write `audit_logs`.
- `/dashboard/rewards` — public framing only ("trading fee reward").
- API: `GET /api/rewards/me`, `GET /api/admin/rewards`, `POST /api/admin/rewards/approve`, `POST /api/admin/rewards/mark-paid`.

### M6 — Telegram Bot + identity linking (P0) — *Genesis §5, Order 005*
- Migration `0010`: `telegram_links`, `bot_events`.
- Bot webhook (`POST /api/telegram/webhook`) + commands: `/start`, `/signal`, `/brokers`, `/missions`, `/rank`, `/profile` (copy per Genesis §13, "The Playmaker" persona).
- `/start` (or a dashboard "Link Telegram" button) links `telegram_id` to the signed-in `profiles.id` — **auth stays Supabase email/password**; this is identity linking, not login.
- Inline buttons deep-link to dashboard/broker station/signals/missions.
- Notification service for signal pushes (used by M8).
- All bot interactions logged to `bot_events`.

### M7 — Missions, Heist Points, Heister Rank (P0) — *Genesis §6, Order 009*
- Migration `0011`: `missions`, `mission_completions`, `points_ledger`, `ranks`.
- Seed missions + point values and rank thresholds from Genesis §12 (`LOGIN_TELEGRAM` 50, `SUBMIT_BROKER_UID` 300, `UID_VERIFIED` 500, etc.; ranks Rookie Heister → Genesis Heister).
- Mission completion service: idempotent (no duplicate points for one-time missions), writes `points_ledger`, recomputes rank.
- `/dashboard/missions` — mission cards, progress, claim state.
- Rank display on dashboard + Telegram rank-up push (via M6's notification service).
- Admin `/admin/missions` — create/edit/disable missions, points adjustment with required reason (→ `audit_logs`).
- **Ties into M4:** `UID_VERIFIED` mission auto-completes when `broker_accounts.status` flips to `verified`.

### M8 — Signal Engine v2 + Signal Archive (P1) — *Blueprint §7/§12, Genesis Order 008*
- Migration `0012`: extend `signals` (invalidation, tp1–tp3, setup_reason, status lifecycle); add `signal_updates`.
- Update `lib/nvidia.ts` prompt + parser for the full field set; enforce the **non-negotiable rule**: every signal has reasoning + invalidation, and *all* outcomes are archived (incl. losses/invalidated).
- Admin signal status transitions write a `signal_updates` row.
- Telegram push (via M6) when a signal becomes `active`.
- Public **Signal Archive** page — wins *and* losses.

### M9 — GPT Mentor (interactive) + Trade Journal (P1) — *Blueprint §8/§10*
- Migration `0013`: `trade_journals`, `ai_chat_sessions`.
- `/dashboard/mentor`: chat + explain-signal / position-size / trade-review / bot-template (**paper-template only, never auto-execute**). Output standard from §8.
- API: `POST /api/mentor/{chat,position-size,bot-template,trade-review}`, token-logged, plan-gated (Pro+).
- `/dashboard/journal`: trades, discipline score, overtrading detection.

### M10 — Unified Leaderboard v1 + Captain Network v1 + Genesis NFT eligibility (P1) — *Blueprint §10/§11/§18, Genesis Order 010/011*
- Migration `0014`: `leaderboard_entries`, `captain_networks`, `referral_codes`, `nft_eligibility`.
- Leaderboard compute (`lib/leaderboard.ts`): starts with the Genesis doc's lean boards (points, referral, verified-UID, broker volume), extends to the Blueprint's fuller score formula (40% volume / 25% active days / 20% journal / 10% reward / 5% community) as trade-journal (M9) and reward (M5) data become available. Public `/dashboard/leaderboard`.
- Captain: referral code + link, `/dashboard/captain` (invited/verified/active/branch volume/estimated reward), tiers Scout→Elite Captain. Public copy = "Captain Reward" (not MLM).
- Genesis NFT eligibility tracker: criteria checklist (Telegram linked, core missions done, ≥1 verified broker UID, points threshold, campaign active) on dashboard; admin campaign settings + CSV export. **Off-chain only in MVP — no minting.**
- Wire **Genesis 100** campaign flow: founding badge, Pro trial, Genesis leaderboard view.

### M11 — Trust & Compliance layer + audit + launch QA hardening (P1) — *Blueprint §12/§14, Genesis §14/§15/§16*
- Migration `0015`: `donation_ledger`, `audit_logs`.
- Trust pages: Affiliate Disclosure, Reward Policy, Donation Ledger, Transparency Report (+ `/trust` hub, footer links).
- Backfill `audit_logs` writes across every admin mutation (UID verify, reward approve, points adjustment, role/plan change, signal edit, mission edit).
- Reconcile Elite pricing; full copy audit vs Blueprint §12 use/avoid table.
- Run the Genesis §16 go-live checklist (bot token/webhook stability, mobile onboarding E2E test, error monitoring, backup/export docs).

### M12 — Telegram Login (P2, deferred) — *Genesis §2*
Only after M6's linking flow is live and stable: add Telegram Login as an
**additional** sign-in method (not a replacement) for users who prefer it,
resolving to the same `profiles` row as their linked `telegram_id`.

---

## 6. Cross-cutting rules (apply to every milestone)

1. **Compliance copy gate** — no "guaranteed profit / passive income / managed fund / no loss / fixed return"; backend commission rates never reach the client bundle. Bot copy follows the same rule (Genesis §13 templates already comply).
2. **RLS-first** — new tables deny by default; member reads own; admin via `is_admin()`; privileged writes via service role only (mirror the `0006`/`0008` guard-trigger pattern for immutable/privileged columns).
3. **Eligibility gate** — reward-ledger and leaderboard participation require `verified` broker UID + active membership; points/missions/rank have their own, looser eligibility (any signed-in user).
4. **Ledger integrity** — `points_ledger` and `reward_ledger` are both append-only sources of truth; never overwrite a row to "adjust" a balance, insert a correcting entry with a reason instead.
5. **Migrations** — sequential, idempotent (`if not exists` / `drop policy if exists`), safe to re-run; document in `SETUP.md`.
6. **Security review** — verify RLS policies deny by default, service-role boundaries hold, and privileged columns stay guarded, on every PR touching auth, RLS, payments, rewards, points, bot webhook, or admin.
7. **Framework docs** — consult `node_modules/next/dist/docs/` before route/handler/config changes (per `AGENTS.md`).
8. **Bot secrets** — `TELEGRAM_BOT_TOKEN` and any webhook secret are server-only env vars, never exposed to the client bundle; validate Telegram's webhook signature on every incoming request.

---

## 7. Roadmap alignment

| Horizon | Milestones | Deliverables |
|---|---|---|
| **~30 days — Genesis MVP launch** | M5, M6, M7, start M8 | Reward ledger + dashboard, Telegram bot + identity linking, missions/points/rank, signal engine core, Genesis 100 kickoff |
| **~90 days — Growth Engine** | M8, M9, M10 | Signal archive, GPT Mentor + trade review, trade journal, unified leaderboard, captain dashboard, Genesis NFT eligibility, donation ledger |
| **~365 days — Intelligence Platform** | Post-M11 | Broker API/OAuth (KuCoin deep, Bitget/BingX automation), on-chain Genesis NFT minting, bot template builder/marketplace, white-label signal API, Telegram Mini App, mobile app, token utility design |

---

## 8. Immediate next step

**M5 (Commission import + Reward Ledger + member reward dashboard)** is next
— M4 already shipped the eligibility gate it depends on. M6 (Telegram Bot)
can start in parallel since it has no dependency on M5.
