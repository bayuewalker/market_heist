# Market Heist — Working Plan

Working execution plan that maps Market Heist's product docs onto the current
codebase. It records what is already built, what is missing, and the phased
order in which we close the gap. Treat this as the living build tracker —
update the status column as milestones land.

- **Primary source document:** `Market Heist Master Blueprint V1.1` — *"Broker
  Intelligence & Reward Engine with The Playmaker, Mission Layer, Genesis
  Eligibility & MVP V2 Expansion Plan"*, status **Final Touch (F)**. V1.1 is a
  **formal merge**: it explicitly folds the original `Master Blueprint V1`
  (business model) and the `Genesis MVP — IT Execution Order` doc (tactical
  build order) into one document, then adds new scope on top (Playmaker
  persona, Genesis Pass eligibility, AI privacy/cost control, admin
  permission matrix, abuse/fraud controls, and a full **MVP V2** phase). V1.1
  supersedes both predecessor docs — they're kept in git history for
  provenance but this plan now tracks V1.1's section numbers.
- **Stack in repo:** Next.js 16 (App Router) · React 19 · Tailwind v4 · Supabase (Auth + Postgres RLS) · NVIDIA OpenAI-compatible API for signals · on-chain USDT (TRON TRC20) payments · Vercel
- **Positioning guardrail (non-negotiable):** AI trading *intelligence* + verified broker *rewards*. Never "guaranteed profit", "passive income", "managed fund", "token promise", or "NFT speculation" — see §24.1's use/avoid copy table. Backend broker commission rates never reach the client.

> ⚠️ **Framework note:** `AGENTS.md` warns this is a modified Next.js with
> breaking changes. Read the relevant guide in `node_modules/next/dist/docs/`
> before writing route/handler/config code — do not assume training-data APIs.

---

## 1. Founder decisions (still standing under V1.1)

Two decisions were made reconciling the original Blueprint V1 with the
Genesis MVP doc. V1.1 doesn't reverse either — it reinforces Telegram's
importance (bundles "Telegram Login + Telegram Bot" as build-order item #3,
right after Auth+roles) but doesn't mandate replacing email/password auth.
Recorded here so future work doesn't re-litigate them.

| Decision | Status under V1.1 |
|---|---|
| **Keep Supabase email/password as primary auth.** Telegram Login is additive (M13 below), linking a `telegram_id` to the existing `profiles` row — not a login replacement. | **Stands.** V1.1 §25 lists auth as "Supabase Auth / Clerk **+** Telegram Login" (additive, not exclusive), consistent with the existing decision. If the founder wants Telegram Login pulled forward from M13, say so explicitly — noted as a flag, not auto-applied. |
| **Run cash Reward Ledger (business engine) and Points/Rank/Missions (retention engine) in parallel**, sharing the M4 verified-UID eligibility gate, never converting into each other. | **Stands and is now formalized in V1.1** — §7.1's Backend Pool Allocation (cash) and §8.3's Mission Engine (points) are explicitly separate engines in the V1.1 architecture (§8). |

---

## 2. Current state — what already exists

| Area | Status | Where |
|---|---|---|
| Security cleanup, secure auth, roles (member/admin) | ✅ Done | `app/(auth)/*`, `lib/supabase/*`, migrations `0005`/`0006` |
| Membership plans (Basic / Pro / Elite) | ✅ Done | `supabase/migrations/0001`, `lib/pricing.ts` |
| Payments (on-chain USDT, TRC20) + membership expiry | ✅ Done (crypto path) | `app/api/payments/*`, `lib/tron.ts`, `lib/payments.ts`, migrations `0003`/`0004` |
| AI Signal Engine (basic) | 🟡 Partial | `app/api/signals/generate`, `lib/nvidia.ts` (+ shared HTTP/auth in `lib/nvidia-client.ts`), `signals` table |
| Daily trend updates | ✅ Done | `app/dashboard/trends`, `app/api/trends/generate`, migration `0007` |
| Live mentoring (schedule only) | 🟡 Partial | `app/dashboard/mentoring`, `data/mentoring.ts` |
| Admin panel (overview / users / signals / payments) | ✅ Done | `app/admin/*`, `lib/admin.ts` |
| Legal pages (risk / privacy / terms) | 🟡 Partial | `app/(legal)/*` |
| Member dashboard shell + billing/account | ✅ Done | `app/dashboard/*` |
| **Broker Station + UID verification** (§12.3, module #5–6) | ✅ **Done — PR #18, merged** | `app/dashboard/broker`, `app/admin/broker-accounts`, migration `0008` |
| **Commission import + Reward Ledger + member dashboard** (§7, module #7–9) | ✅ **Done — PR #27, merged** | `app/admin/commissions`, `app/admin/rewards`, `app/dashboard/rewards`, migration `0009` |

**Divergences to accept as-is (already shipped, do not rebuild):**

- **Payments:** §25 says "Stripe first". Repo already ships **crypto USDT** end-to-end. Keep crypto; Stripe stays optional/future.
- **AI provider:** §25 says OpenAI. Repo uses **NVIDIA OpenAI-compatible API** (`lib/nvidia.ts`, `lib/trends.ts`, `lib/mentor.ts` — all sharing HTTP/auth logic via `lib/nvidia-client.ts`). Keep it.
- **Elite price:** §5.2 lists Elite at **$99/mo**; seed data marks Elite "Coming soon" with `null` price. Reconcile in M12 (Trust & Compliance).
- **Broker UID status set:** already shipped as `submitted / under_review / verified / rejected / duplicate / inactive` — exactly matches §12.3's table (with `not_submitted` represented as "no row exists", per the existing migration's design note).
- **Reward Ledger status set:** shipped as `estimated / pending / approved / paid` (migration `0009`) — §7.3 explicitly allows "MVP V1 can start with a shorter status list." The fuller 10-state list (`matched/payable/rejected/adjusted/disputed/reversed`) is **MVP V2 scope**, tied to the Reward Settlement System (§17.7) — see §9 below.
- **Signal archive:** planned as a status filter on `signals` (no separate `signal_archive` table), not the literal separate table in §13's DB model — simpler, same effect, less to keep in sync.

---

## 3. Gap analysis — modules not yet built

| # | Module | V1.1 ref | Priority | Status |
|---|---|---|---|---|
| A | Broker Station + UID verification | §11.1 #5–6 | P0 | ✅ Done |
| B | Commission import + Reward Ledger + member reward dashboard | §11.1 #7–9 | P0 | ✅ Done |
| C | Telegram Bot + Telegram identity linking | §11.1 #3, §21.1 | **P0** | ❌ Not started |
| D | **The Playmaker Character Layer** (`character_configs`, admin-editable persona) | §9, §11.2 #18 | **P0/P1** | ❌ Not started |
| E | Missions, Heist Points, Heister Rank + Command Center Dashboard | §11.2 #13–15, §12.4–12.6 | **P0/P1** | ❌ Not started |
| F | Signal Engine v2 (8-state lifecycle, invalidation, TP1–3, signal archive) | §11.2 #10–11, §12.1 | P1 | 🟡 Partial |
| G | GPT Mentor interactive + AI privacy/cost control | §11.2 #12, §12.2, §19 | P1 | ❌ Not started |
| H | Trade journal + discipline score | §22 | P1 | ❌ Not started |
| I | Unified leaderboard (volume / reward / discipline / captain / points) | §11.2 #16, §22 | P1 | ❌ Not started |
| J | Captain Network v1 (code only, not full dashboard) | §11.2 #17, §23 | P1 | ❌ Not started |
| K | Genesis Pass eligibility tracker (off-chain, `reservation_id`, admin export) | §11.2 #19, §12.7 | P1 | ❌ Not started |
| L | Trust & Compliance pages incl. AI Data Consent | §11.2 #20, §24 | P1 | 🟡 Partial |
| M | Admin panel hardening + audit logs (already have single-admin RBAC; §20's sub-roles are V2) | §11.1/§11.2 #21 | P1 | 🟡 Partial (audit_logs shipped in M5) |
| N | Telegram Login (linked identity, optional sign-in) | §2 (deferred, decision above) | P2 | ❌ Not started |
| — | **MVP V2 Expansion** (Plan Limiter, Captain Dashboard, Campaign Engine, Reward Settlement, Fraud/Risk Flags, Notification System, Broker API Sync, AI Trade Review V2, Bot Template Builder V2, Donation Ledger Live, Transparency Report Generator, Admin Permission Matrix) | §16/§17/§18/§20 | **Deferred — see §9** | ❌ Not started |

---

## 4. Data model plan (delta vs. V1.1 §13)

Existing tables: `plans`, `profiles` (+ `role`, `plan_expires_at`), `signals`,
`payments`, `trend_updates`, `brokers`, `broker_accounts`, `commission_imports`,
`commission_rows`, `reward_ledger`, `audit_logs`. New migrations continue the
numbered sequence (`0010_…` onward), idempotent, RLS-first (member reads own;
privileged writes via service role; `is_admin()` for admin reads; guard
triggers for immutable/privileged columns — the pattern established in
`0006`/`0008`/`0009`).

| New table | Purpose | Key columns | RLS intent |
|---|---|---|---|
| `character_configs` | The Playmaker (or future personas) — admin-editable copy | `id, character_name, role, tagline, avatar_url, banner_url, bot_intro_message, signal_prefix, dashboard_note_title, dashboard_note_body, is_active, created_at, updated_at` | Public read (active only); admin write |
| `telegram_links` | `telegram_id` ↔ `profiles.id`, linked at bot `/start` or dashboard opt-in | `id, user_id, telegram_id, telegram_username, linked_at` | Read own; admin all |
| `bot_events` | Telegram bot audit trail | `id, user_id, event_type, payload jsonb, created_at` | Admin read; service-role write |
| `missions` | Mission catalog (§12.4/§12.5 seed list) | `id, mission_key, public_name, description, points_reward, trigger_type, is_active, sort_order` | Public read (active only) |
| `user_missions` | Per-user mission state (§13.2 naming) | `id, user_id, mission_id, status, completed_at, claimed_at` | Read own; admin all |
| `heist_points_ledger` | **Append-only** points accounting (§12.5 non-negotiable) | `id, user_id, source_type, source_id, points_delta, balance_after, created_at` | Read own; admin/service write |
| `heister_ranks` | Rank thresholds (§12.6 seed list) | `id, name, min_points, rules_json, active` | Public read |
| `signal_updates` | Signal lifecycle/status-change history (replaces a literal `signal_archive` table — see divergence note in §2) | `id, signal_id, update_text, status_change, created_at` | Public read |
| `trade_journals` | Member trade log + discipline score | `id, user_id, signal_id?, pair, side, entry, exit, pnl, notes, emotion_tag, discipline_score, created_at` | Read/write own; admin read |
| `ai_chat_sessions` | GPT Mentor session logs + token usage (feeds AI cost control, §19) | `id, user_id, kind, messages jsonb, token_usage, created_at` | Read own; admin read |
| `leaderboard_entries` | Unified leaderboard score/rank/metrics snapshot (5 board types incl. Points, §22) | `id, board, period, user_id, score, rank, metrics jsonb, computed_at` | Public read |
| `captain_networks` | Captain↔member link + code | `id, captain_id, member_id, referral_code, joined_at` | Captain reads own branch; admin all |
| `referral_codes` | Captain code registry | `code, captain_id, active, created_at` | Public read; admin write |
| `genesis_eligibility` | Genesis Pass eligibility (§12.7/§13.2 naming — off-chain in MVP, minting is V2+) | `id, user_id, campaign_key, is_eligible, reservation_id, requirements_json, eligible_at, exported_at` | Read own; admin all |
| `donation_ledger` | Kids donation pool allocations + proof | `id, period, amount, description, proof_url, created_at` | Public read; admin write |

**Signal table extension:** add `invalidation numeric`, `tp1/tp2/tp3 numeric`,
`setup_reason text` (or reuse `rationale`), `ai_note text`, and widen `status`
to the exact §12.1 list: `pending / active / hit_tp1 / hit_tp2 / hit_tp3 /
invalidated / expired / manual_closed`. Migrate existing `active/closed` rows
safely (`closed` → `manual_closed` or the appropriate `hit_tp*`/`invalidated`
based on outcome, decided at migration time).

**Points Rule (§12.5, non-negotiable):** `heist_points_ledger` is the source
of truth. A user's total is computed (or cached) from ledger rows — never
stored as a single mutable counter, so history and reversals stay auditable.
Same rule already applies to `reward_ledger` (DB-enforced via a guard trigger
in migration `0009`) — mirror that trigger pattern here.

**Deferred to MVP V2** (§9 below has the full list; not created now):
`ai_usage_logs`/`plan_limits`/`subscriptions`/`ai_credit_ledger` (§17.4),
`risk_flags`/`reward_disputes`/`admin_adjustments`/`support_tickets`/`broker_uid_appeals`
(§18).

---

## 5. Phased milestones (MVP V1)

Each milestone = one focused PR, security-reviewed, with migrations that run
cleanly on top of the latest existing migration. **M4/M5 are shipped — do not
rebuild.** Numbering continues from there; M6 is newly inserted (Playmaker)
ahead of the Telegram Bot work that was next in line, since bot/dashboard
copy references the persona config this milestone creates.

### M4 — Broker Station + UID verification (P0) — ✅ Done (PR #18, merged)
Migration `0008`. Shared eligibility gate every reward system (cash ledger
and points/rank) reads from.

### M5 — Commission import + Reward Ledger + member reward dashboard (P0) — ✅ Done (PR #27, merged)
Migration `0009`. Member/donation/operation buckets computed now;
captain/leaderboard/campaign buckets deferred to M11 (no recipient system
exists for them yet). `audit_logs` pulled forward from what's now M12.

### M6 — The Playmaker Character Layer (P0/P1) — *§9, §11.2 #18*
- Migration `0010`: `character_configs`.
- Seed one active row for **The Playmaker** (tagline, avatar, bot intro message, signal prefix, dashboard note) — admin-editable so copy changes need no deploy.
- Admin `/admin/character` — edit the active persona's fields.
- Wire the persona into surfaces that already exist: dashboard note block, signal card prefix (used by M9). Bot/mission/rank surfaces wire in as M7/M8 ship.
- **Non-negotiable:** persona copy still follows the §24.1 compliance copy rule — brand voice, not profit promises.

### M7 — Telegram Bot + identity linking (P0) — *§11.1 #3, §21.1*
- Migration `0011`: `telegram_links`, `bot_events`.
- Bot webhook (`POST /api/telegram/webhook`) + the exact §21.1 command set: `/start`, `/signal`, `/mission`, `/brokers`, `/rank`, `/profile`, `/help` — copy voiced as The Playmaker (M6).
- `/start` (or a dashboard "Link Telegram" button) links `telegram_id` to the signed-in `profiles.id` — **auth stays Supabase email/password**; this is identity linking, not login.
- Inline buttons deep-link to dashboard/broker station/signals/missions.
- Notification service — signal pushes now (M9), extended per the trigger list in §17.10 as those systems ship (UID verified, reward approved, mission completed, rank upgraded, Genesis eligible).
- All bot interactions logged to `bot_events`.

### M8 — Missions, Heist Points, Heister Rank + Command Center Dashboard (P0) — *§11.2 #13–15, §12.4–12.6*
- Migration `0012`: `missions`, `user_missions`, `heist_points_ledger` (append-only, guard-triggered), `heister_ranks`.
- Seed the exact §12.4/§12.5 mission list (First Contact, Enter The Hideout, Risk Calibration, Enter The Station, Broker Infiltration, Verified Raider, Signal Intercept, Recruit Heister) with their point values, and the §12.6 rank thresholds (Rookie Heister 0 → Genesis Heister special).
- Mission completion service: idempotent (no duplicate points for one-time missions), writes `heist_points_ledger`, recomputes rank.
- `/dashboard/missions` — mission cards, progress, claim state.
- **Command Center Dashboard** (§11.1 #4): upgrade `/dashboard` overview with profile card, broker status, points, rank, reward summary, latest signal snapshot, Genesis status, and the Playmaker Note (from M6).
- Rank display + Telegram rank-up push (via M7's notification service).
- Admin `/admin/missions` — create/edit/disable missions, points adjustment with required reason (→ `audit_logs`).
- **Ties into M4:** "Verified Raider" mission auto-completes when `broker_accounts.status` flips to `verified`.

### M9 — Signal Engine v2 + Signal Archive (P1) — *§11.2 #10–11, §12.1*
- Migration `0013`: extend `signals` to the exact §12.1 field/status set (see §4 above); add `signal_updates`.
- Update `lib/nvidia.ts` prompt + parser for the full field set (incl. `ai_note`, signal prefix from M6); enforce the **non-negotiable rule**: every signal has reasoning + invalidation, and *all* outcomes are archived (incl. losses/invalidated).
- Admin signal status transitions write a `signal_updates` row.
- Telegram push (via M7) when a signal becomes `active`.
- Public **Signal Archive** page (status filter over `signals`, not a separate table) — wins *and* losses.

### M10 — GPT Mentor (interactive) + Trade Journal + AI Privacy/Cost Control (P1) — *§11.2 #12, §12.2, §19, §22*
- Migration `0014`: `trade_journals`, `ai_chat_sessions`.
- `/dashboard/mentor`: chat + explain-signal / position-size / trade-review / paper-bot-template / suggest-broker-route / summarize-journal / overtrading-warning (§12.2's full function list — **paper-template only, never auto-execute**). Output standard: clear answer, risk note, suggested action, invalidation point, position size guidance, no guaranteed-profit wording.
- API: `POST /api/mentor/{chat,position-size,bot-template,trade-review}`, token-logged to `ai_chat_sessions`, plan-gated (Pro+).
- `/dashboard/journal`: trades, discipline score, overtrading detection.
- **AI Privacy consent** (§19): a consent gate before first Mentor use covering AI Data / Journal Data / Broker Activity Data / Reward Data usage — the actual consent-page copy ships with M12's Trust pages; this milestone wires the gate + records consent alongside the session.
- **AI cost visibility**: `ai_chat_sessions.token_usage` already captures the raw data `ai_usage_logs`/quota dashboards (§17.4, V2) will later aggregate — no separate table needed yet.

### M11 — Unified Leaderboard + Captain Network v1 + Genesis Pass Eligibility (P1) — *§11.2 #16–17/#19, §22, §23, §12.7*
- Migration `0015`: `leaderboard_entries`, `captain_networks`, `referral_codes`, `genesis_eligibility`.
- Leaderboard compute (`lib/leaderboard.ts`): 5 board types per §22 — **Volume, Reward, Discipline, Captain, Points**. Volume/Reward/Captain require `verified` broker UID (real trading data); Points is open to any signed-in user (mission/points activity only). Score formula (40% volume / 25% active days / 20% journal / 10% reward / 5% community) applies once trade-journal (M10) and reward (M5) data exist. Public `/dashboard/leaderboard`.
- Captain: referral code + link (Captain Code V1 — §11.2 #17 explicitly scopes out the full dashboard as V2, §17.2), tiers Scout→Elite Captain (§23). Public copy = "Captain Reward" (not MLM, not passive income, not investment return — §23 rule).
- **Genesis Pass eligibility tracker** (§12.7): checklist — Telegram linked, profile completed, broker UID submitted, broker UID verified, ≥1,500 HP, joined Genesis campaign. Output: eligibility status, requirement checklist, `reservation_id`, admin export. **Off-chain only — no NFT minting in MVP** (minting is explicitly V2+/future per §29's D/R/F index).
- Compute the captain/leaderboard/campaign `reward_ledger` buckets deferred in M5, now that there's a recipient (captain_networks) and a board (leaderboard_entries) to credit.

### M12 — Trust & Compliance layer + audit + launch QA hardening (P1) — *§11.2 #20–21, §24, §19*
- Migration `0016`: `donation_ledger` (`audit_logs` already shipped in M5).
- Trust pages: Risk Disclosure (exists), Affiliate Disclosure, Reward Policy, Donation Ledger, Transparency Report placeholder, Terms & Privacy (exists), and **AI Data Consent** (§19 — the copy page backing M10's consent gate).
- Backfill `audit_logs` across every admin mutation not yet logged (e.g. M4's UID verify).
- Reconcile Elite pricing; full copy audit vs §24.1's use/avoid table.
- Launch QA per §15's acceptance criteria checklist — run it in full before calling MVP V1 done.

### M13 — Telegram Login (P2, deferred) — *§2 (decision in §1)*
Only after M7's linking flow is live and stable: add Telegram Login as an
**additional** sign-in method (not a replacement) for users who prefer it,
resolving to the same `profiles` row as their linked `telegram_id`.

---

## 6. Cross-cutting rules (apply to every milestone)

1. **Compliance copy gate** — no "guaranteed profit / passive income / managed fund / no loss / fixed return / token promise / NFT speculation" (§24.1's full avoid-list). Backend commission rates never reach the client bundle. Bot **and** Playmaker persona copy follow the same rule.
2. **RLS-first** — new tables deny by default; member reads own; admin via `is_admin()`; privileged writes via service role only (mirror the `0006`/`0008`/`0009` guard-trigger pattern for immutable/privileged columns).
3. **Eligibility gate** — cash reward-ledger and the Volume/Reward/Captain leaderboards require `verified` broker UID + active membership; points/missions/rank/Points-leaderboard have their own, looser eligibility (any signed-in user).
4. **Ledger integrity** — `heist_points_ledger` and `reward_ledger` are both append-only sources of truth, DB-enforced via guard trigger (not just convention) — corrections are new rows, never overwrites.
5. **Migrations** — sequential, idempotent (`if not exists` / `drop policy if exists`), safe to re-run; document in `SETUP.md`.
6. **Security review** — verify RLS policies deny by default, service-role boundaries hold, and privileged columns stay guarded, on every PR touching auth, RLS, payments, rewards, points, bot webhook, or admin.
7. **Framework docs** — consult `node_modules/next/dist/docs/` before route/handler/config changes (per `AGENTS.md`).
8. **Bot secrets** — `TELEGRAM_BOT_TOKEN` and any webhook secret are server-only env vars, never exposed to the client bundle; validate Telegram's webhook signature on every incoming request.
9. **Do-not-build list** (§10.2, still binding) — no auto-trading execution, no custody/withdrawal/wallet balance, no managed/copy-trading execution, no public backend commission disclosure, no on-chain NFT minting, no token launch/claim/airdrop claim, no NFT marketplace, no staking/governance/tokenized points, no native mobile app, no full broker API automation, no character faction/inventory game systems.

---

## 7. Roadmap alignment (§26)

| Horizon | Milestones | Deliverables |
|---|---|---|
| **30 days — MVP V1 Live (§26.1)** | M6, M7, M8, start M9 | Playmaker layer, Telegram bot + identity linking, missions/points/rank + Command Center Dashboard, signal engine v2 underway |
| **60–90 days — MVP V2 Growth (§26.2)** | M9 done, M10, M11, M12, then §9's MVP V2 phase begins | Signal archive, GPT Mentor + AI privacy, trade journal, unified leaderboard, captain code, Genesis Pass tracker, trust pages, then Plan Limiter/Captain Dashboard/Campaign Engine/Reward Settlement/Fraud controls/Notifications |
| **180 days — Platform Beta (§26.3)** | Post-§9 | Broker aggregation layer, advanced analytics, Elite Room, AI portfolio/risk review, white-label signal API beta, Genesis Pass claim prep |
| **365 days — Ecosystem Platform (§26.4)** | — | KuCoin deep API/OAuth, Bitget/BingX automation, copy-trading lab, mobile app, bot template marketplace, institution dashboard, optional NFT minting, optional token/airdrop layer (only after legal/product maturity) |

---

## 8. Immediate next step

**M6 (The Playmaker Character Layer)** is next — it's small, unblocks nothing
downstream by being late, but M7 (Telegram Bot) and M8 (Command Center
Dashboard) both want to render persona copy, so building it first avoids
placeholder text that gets swapped out twice. M7 (Telegram Bot) can start
immediately after or in parallel if preferred — say which.

---

## 9. MVP V2 Expansion (deferred — do not start until MVP V1 / M4–M13 above ships)

V1.1 §16–§18/§20 locks a full V2 scope as "Final Touch." Documented here so
it isn't lost, but **not broken into GitHub sub-issues yet** — that happens
when V1 is live and V2 planning actually starts, per §28.2's build order:

1. Plan Limiter + AI usage quota/cost dashboard (`subscriptions`, `plan_limits`, `usage_logs`, `ai_credit_ledger`)
2. Captain Dashboard V1 (full — branch stats, campaign assets; §17.2)
3. Campaign Engine (Genesis 100, Weekly Heist Challenge, Broker Campaign, etc.; §17.3)
4. Broker import standardization + Broker API Sync (KuCoin/Bitget/BingX; §17.1)
5. Reward Settlement + payout batch (`matched/payable/rejected/adjusted/disputed/reversed` statuses; §17.7)
6. Support/Dispute system + Fraud/Risk flags (`risk_flags`, `reward_disputes`, `admin_adjustments`, `support_tickets`, `broker_uid_appeals`; §18)
7. Notification system (multi-channel: Telegram + email + dashboard; §17.10)
8. Pro/Elite paywall + plan limiter enforcement
9. AI Trade Review V2 (loss-streak detection, discipline score, weekly recap; §17.5)
10. Bot Template Builder V2 (§17.6)
11. Donation Ledger Live + Transparency Report Generator (§17.8–17.9)
12. Advanced analytics, Elite Room
13. Admin Permission Matrix — split `super_admin` into `signal_admin` / `broker_admin` / `reward_admin` / `support_admin` / `content_admin` (§20) — MVP V1 stays single-role by design (§20's own text: "MVP V1 can start simple")
