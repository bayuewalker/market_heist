# Market Heist — Working Plan (from Master Blueprint V1)

Working execution plan that maps the **Master Blueprint V1** onto the current
codebase. It records what is already built, what is missing, and the phased
order in which we close the gap. Treat this as the living build tracker —
update the status column as milestones land.

- **Source of truth:** `Market Heist Master Blueprint V1` (PRD + business model + architecture)
- **Stack in repo:** Next.js 16 (App Router) · React 19 · Tailwind v4 · Supabase (Auth + Postgres RLS) · NVIDIA OpenAI-compatible API for signals · on-chain USDT (TRON TRC20) payments · Vercel
- **Positioning guardrail (non-negotiable):** AI trading *intelligence* + verified broker *rewards*. Never "guaranteed profit", "passive income", "managed fund", or public backend commission. Every commit that touches user-facing copy respects §12 of the blueprint.

> ⚠️ **Framework note:** `AGENTS.md` warns this is a modified Next.js with
> breaking changes. Read the relevant guide in `node_modules/next/dist/docs/`
> before writing route/handler/config code — do not assume training-data APIs.

---

## 1. Current state — what already exists

| Blueprint area | Status | Where |
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

**Divergences from the blueprint to accept as-is (already shipped):**

- **Payments:** blueprint §13 says "Stripe first". Repo already ships **crypto USDT** end-to-end. Keep crypto; treat Stripe as optional/future, not a rebuild.
- **AI provider:** blueprint §13 says OpenAI. Repo uses **NVIDIA OpenAI-compatible API** (`lib/nvidia.ts`). Keep it — same interface, swap later if needed.
- **Elite price:** blueprint §3 lists Elite at **$99/mo**; seed data marks Elite "Coming soon" with `null` price. Reconcile when Elite ships (see M9).

---

## 2. Gap analysis — blueprint modules not yet built

The blueprint's build order (§20) is: security → auth → **Broker Station → UID
verification → commission import → reward ledger → member reward dashboard** →
signal engine → GPT Mentor → archive → leaderboard → captain code → disclosures
→ transparency. Items 1–2 are done. The reward/broker chain is the untouched
core of the business model.

| # | Module | Blueprint ref | Priority | Status |
|---|---|---|---|---|
| A | **Broker Station** (brokers, referral links, UID submit) | §6, §9 | **P0** | ❌ Not started |
| B | **UID verification** (admin review workflow, status states) | §9 | **P0** | ❌ Not started |
| C | **Commission import** (CSV import + row matching) | §5, §14 | **P0** | ❌ Not started |
| D | **Reward ledger** (allocation formula, statuses) | §5, §14 | **P0** | ❌ Not started |
| E | **Member reward dashboard** | §6 | **P0** | ❌ Not started |
| F | **Signal Engine v2** (invalidation, tp1–tp3, full status lifecycle) | §7 | **P1** | 🟡 Partial |
| G | **Signal archive** (all outcomes incl. losses, public) | §7, §12 | **P1** | ❌ Not started |
| H | **GPT Mentor interactive** (chat, position size, trade review, bot template) | §8 | **P1** | ❌ Not started |
| I | **Trade journal + discipline score** | §6, §10, §14 | **P1** | ❌ Not started |
| J | **Leaderboard v1** (volume / reward / discipline / captain) | §10 | **P1** | ❌ Not started |
| K | **Captain Network v1** (referral code, captain dashboard, tiers) | §11 | **P1** | ❌ Not started |
| L | **Trust pages** (affiliate disclosure, reward policy, donation ledger, transparency report) | §12 | **P1** | 🟡 Partial |
| M | **Audit logs** | §14 | **P1** | ❌ Not started |
| N | **Genesis 100 campaign** wiring | §18 | **P1** | ❌ Not started |

---

## 3. Data model plan (delta vs. blueprint §14)

Existing tables: `plans`, `profiles` (+ `role`, `plan_expires_at`), `signals`,
`payments`, `trend_updates`. New migrations continue the numbered sequence
(`0008_…` onward), idempotent, RLS-first (member reads own; all privileged
writes via service role; `is_admin()` for admin reads — reuse the established
pattern).

| New table | Purpose | Key columns | RLS intent |
|---|---|---|---|
| `brokers` | Partner metadata + referral base URL | `id, name, slug, referral_base_url, markets[], active, sort` | Public read (active only) |
| `broker_accounts` | User broker UID + verification | `id, user_id, broker_id, uid, status, note, verified_at, verified_by` | Read own; admin read/update all |
| `commission_imports` | Import sessions by broker/period | `id, broker_id, period, source(csv/api/manual), row_count, imported_by, created_at` | Admin only |
| `commission_rows` | Raw matched commission/volume/fees | `id, import_id, broker_id, uid, volume, fees, backend_commission, matched_user_id, for_period` | Admin only |
| `reward_ledger` | Member/captain/leaderboard/donation/ops allocations | `id, user_id, source_type, allocation_type, amount, status, period, commission_row_id, created_at, approved_at, paid_at` | Read own (member/captain/leaderboard rows); admin all |
| `captain_networks` | Captain↔member link + code | `id, captain_id, member_id, referral_code, joined_at` | Captain reads own branch; admin all |
| `referral_codes` | Captain code registry | `code, captain_id, active, created_at` | Public read (validate at signup); admin write |
| `trade_journals` | Member trade log + discipline score | `id, user_id, signal_id?, pair, side, entry, exit, pnl, notes, emotion_tag, discipline_score, created_at` | Read/write own; admin read |
| `leaderboard_entries` | Score/rank/metrics snapshot | `id, board, period, user_id, score, rank, metrics jsonb, computed_at` | Public read (leaderboard is public) |
| `donation_ledger` | Kids donation pool allocations + proof | `id, period, amount, description, proof_url, created_at` | Public read; admin write |
| `audit_logs` | Admin/system action history | `id, actor_id, action, target_type, target_id, meta jsonb, created_at` | Admin read; service-role write |

**Signal table extension (F):** add `invalidation numeric`, `tp1/tp2/tp3
numeric`, `setup_reason text` (or reuse `rationale`), and widen `status` to
`pending / active / hit_tp / invalidated / expired` (currently only
`active / closed`). Migrate existing rows to the new enum safely.

Blueprint mentions `ai_chat_sessions` (§14) — add with the GPT Mentor work (H):
`ai_chat_sessions(id, user_id, kind, messages jsonb, token_usage, created_at)`.

---

## 4. Phased milestones

Milestones continue the existing `M1…M3` naming (see git log). Each milestone =
one PR to `claude/working-plan-qy20ca`, security-reviewed, with migrations that
run cleanly on top of `0007`.

### M4 — Broker Station + UID verification (P0) — *blueprint §6, §9, items A/B*
- Migration `0008`: `brokers`, `broker_accounts` (+ UID status enum from §9).
- Seed brokers: **Bitget, KuCoin, BingX** with referral base URLs (env-driven, no backend rates in client).
- Member: `/dashboard/broker` — broker cards, referral link (open in new tab), UID submit form, live verification status.
- API: `GET /api/brokers`, `POST /api/broker-accounts/submit-uid`, `GET /api/broker-accounts/me`, `PATCH /api/admin/broker-accounts/:id/verify`.
- Admin: `/admin/broker-accounts` — review queue, verify/reject/duplicate/inactive transitions, note field.
- **Gate:** rewards + leaderboard eligibility require `broker_accounts.status = 'verified'`.

### M5 — Commission import + reward ledger + member reward dashboard (P0) — *§5, §14, items C/D/E*
- Migration `0009`: `commission_imports`, `commission_rows`, `reward_ledger`.
- Admin: `/admin/commissions` — CSV upload → parse → match rows to verified UIDs → preview → commit import.
- Reward calculation service (`lib/rewards.ts`): `Eligible Fee × Backend Rate = Pool`, then split into Member / Captain / Leaderboard / Campaign / Donation / Operation per §5. **Backend rate + pool split live in server-only env/config; never exposed to client.**
- Ledger statuses: `estimated → pending → approved → paid` (§6). Admin approve + mark-paid actions write `audit_logs`.
- Member: `/dashboard/rewards` — estimated/pending/approved/paid totals + line items. Public framing only ("trading fee reward"), tier reward bands from §5.
- API: `GET /api/rewards/me`, `GET /api/admin/rewards`, `POST /api/admin/rewards/approve`, `POST /api/admin/rewards/mark-paid`.

### M6 — Signal Engine v2 + Signal Archive (P1) — *§7, §12, items F/G*
- Migration `0010`: extend `signals` (invalidation, tp1–tp3, setup_reason, status lifecycle). Update `lib/nvidia.ts` prompt + parser to emit the full field set; enforce the **non-negotiable rule**: every signal has reasoning + invalidation, and *all* outcomes are archived (incl. losses/invalidated).
- Admin signal status transitions (`PATCH /api/admin/signals/:id/status`) with archive integrity.
- Public **Signal Archive** page (`/archive` or under Trust layer) showing outcomes transparently — wins *and* losses.

### M7 — GPT Mentor (interactive) + Trade Journal (P1) — *§8, §10, items H/I*
- Migration `0011`: `trade_journals`, `ai_chat_sessions`.
- `/dashboard/mentor` (upgrade the current schedule-only page): chat + the four tools — explain signal, position size, trade review, bot template (**paper-template only, never auto-execute**). Output standard from §8 (answer / risk note / action / invalidation / sizing, no guaranteed-profit wording).
- API: `POST /api/mentor/{chat,position-size,bot-template,trade-review}`. Token usage logged to `ai_chat_sessions`. Rate-limit + plan-gate (Pro+).
- `/dashboard/journal`: log trades, discipline score, emotional-overtrading detection summary.

### M8 — Leaderboard v1 + Captain Network v1 (P1) — *§10, §11, items J/K/N*
- Migration `0012`: `leaderboard_entries`, `captain_networks`, `referral_codes`.
- Leaderboard compute job (`lib/leaderboard.ts`) using §10 formula (40% volume / 25% active days / 20% journal / 10% reward / 5% community). Boards: Volume, Reward, Discipline, Captain. Public `/leaderboard`.
- Captain: referral code issue + link, signup attribution, `/dashboard/captain` (invited / verified / active / branch volume / estimated reward), tiers Scout→Elite Captain (§11). Public copy = "Captain Reward" (not MLM).
- Wire **Genesis 100** campaign flow (§18): founding badge, Pro trial, Genesis leaderboard view.

### M9 — Trust & Compliance layer + audit + reconcile (P1) — *§12, items L/M*
- Migration `0013`: `donation_ledger`, `audit_logs` (if not already added in M5).
- New Trust pages: **Affiliate Disclosure**, **Reward Policy**, **Donation Ledger**, **Transparency Report** (monthly: signals/rewards/users/updates). Link all from footer + a `/trust` hub.
- Backfill `audit_logs` writes across admin mutations (verify UID, approve reward, change role/plan, edit signal).
- Reconcile Elite pricing ($99 vs "coming soon") and finalize tier reward bands copy.
- Full copy audit against the §12 "use/avoid" table.

---

## 5. Cross-cutting rules (apply to every milestone)

1. **Compliance copy gate** — no "guaranteed profit / passive income / managed fund / no loss / fixed return"; backend commission rates never reach the client bundle.
2. **RLS-first** — new tables deny by default; member reads own; admin via `is_admin()`; privileged writes via service role only (mirror `0006` trigger pattern for immutable/privileged columns).
3. **Eligibility gate** — rewards & leaderboard require `verified` broker UID + active membership (respect `plan_expires_at`).
4. **Migrations** — sequential, idempotent (`if not exists` / `drop policy if exists`), safe to re-run; document in `SETUP.md`.
5. **Security review** — run `/security-review` on each PR touching auth, RLS, payments, rewards, or admin.
6. **Framework docs** — consult `node_modules/next/dist/docs/` before route/handler/config changes (per `AGENTS.md`).

---

## 6. Roadmap alignment (blueprint §17)

| Blueprint horizon | Milestones | Deliverables |
|---|---|---|
| **30 days — MVP Launch** | M4, M5, (start M6) | Broker Station, UID verification, CSV import, reward ledger + member dashboard, signal engine core, Genesis 100 kickoff |
| **90 days — Growth Engine** | M6, M7, M8 | Signal archive, GPT Mentor + trade review, trade journal, leaderboard, captain dashboard, donation ledger |
| **365 days — Intelligence Platform** | Post-M9 | Broker API/OAuth (KuCoin deep, Bitget/BingX automation), bot template builder/marketplace, white-label signal API, mobile app |

---

## 7. Immediate next step

Start **M4 (Broker Station + UID verification)** — it unblocks the entire
reward chain (M5) and every eligibility gate downstream. First PR: migration
`0008` + `/dashboard/broker` + admin review queue.
