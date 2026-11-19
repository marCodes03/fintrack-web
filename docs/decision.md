# Decision Log

Append-only record of every decision made in FinTrack. Required by `AGENTS.md` (Rule 1).

**How to add an entry:** append at the bottom with the next ID. Never edit or delete old entries. To reverse one, mark it `Superseded by D-xxx` and add a new entry.

```
## D-### — Title
- **Date:** YYYY-MM-DD
- **Status:** Accepted | Superseded by D-xxx
- **Context:** why this came up
- **Decision:** what was chosen
- **Alternatives:** what was rejected
- **Consequences:** trade-offs and follow-ups
- **Affected features:** links to docs/features/*.md
```

> D-001 to D-012 were reconstructed from the code, the git history, and the existing docs. Their dates are approximate. The migrations date the schema to 2026-07-27. Anything marked "inferred" was not stated by the team.

---

## D-001 — Angular standalone components with Signals
- **Date:** 2026-07 (inferred)
- **Status:** Accepted
- **Context:** Needed a frontend framework for a multi-page finance app.
- **Decision:** Angular 22 with standalone components, Signals for state, and no NgModules or NgRx.
- **Alternatives:** React or NgRx-based state (inferred; not documented).
- **Consequences:** Simple local state. Each page loads its own data through `ApiService`, so there is no shared cache.
- **Affected features:** all UI features

## D-002 — Express + Prisma + PostgreSQL backend
- **Date:** 2026-07 (inferred)
- **Status:** Accepted
- **Context:** Needed a typed, relational store with transactional balance updates.
- **Decision:** Node.js/Express in TypeScript, Prisma ORM, PostgreSQL 16. Routes are grouped by feature under `/api`.
- **Alternatives:** Not documented.
- **Consequences:** Balance changes use `prisma.$transaction`, so the ledger and balances stay consistent.
- **Affected features:** [platform](features/platform.md), [transactions](features/transactions.md)

## D-003 — Tailwind CSS 4 with dark-slate glassmorphism UI
- **Date:** 2026-07 (inferred)
- **Status:** Accepted
- **Context:** Visual identity for the app.
- **Decision:** Tailwind 4 with a dark-slate glassmorphism style (see `design.md`). Create and edit forms use slide-in panels ("sliders") instead of modals or separate pages.
- **Alternatives:** Not documented.
- **Consequences:** Consistent UX across features. Duplicate slider components per feature.
- **Affected features:** all UI features

## D-004 — In-memory mock store as database fallback ("self-annealing")
- **Date:** 2026-07 (inferred; documented in `server/directives/budgets.md`)
- **Status:** Accepted
- **Context:** The API should keep working when PostgreSQL is unreachable (for example Render/Supabase cold starts or no local DB).
- **Decision:** Every route catches Prisma errors and serves from `mockStore.ts`. Mock IDs are prefixed (`acc-mock-`, `tx-mock-`, and so on).
- **Alternatives:** Fail with 5xx.
- **Consequences:** The app stays usable offline. Data in fallback mode is lost on restart and not synced. Behavior can differ between DB and fallback paths. Reviews have no fallback.
- **Affected features:** all backend features, [platform](features/platform.md)

## D-005 — Three-layer pattern for budgets (directive / orchestration / execution)
- **Date:** 2026-07 (inferred)
- **Status:** Accepted (applied to budget plan list, create, and update only)
- **Context:** Separate the rules from the code that runs them.
- **Decision:** `server/directives/budgets.md` holds the SOP, `budget.orchestrator.ts` coordinates and handles fallback, and `budget.execution.ts` holds the Prisma calls.
- **Alternatives:** Handlers that call Prisma directly (used by every other feature).
- **Consequences:** Inconsistent structure across the backend. Delete, deactivate, and implement still live in the route file.
- **Affected features:** [budget-plans](features/budget-plans.md)

## D-006 — No server-side auth: client-held session and `userId` trust
- **Date:** 2026-07 (inferred)
- **Status:** Accepted (known risk)
- **Context:** Fast delivery of a first version.
- **Decision:** Login returns the user object, which the client keeps in `localStorage`. Requests pass `userId` as a query or body parameter. There are no tokens, no auth middleware, and no route guards.
- **Alternatives:** JWT or session cookies.
- **Consequences:** Any caller can read or write any user's data by passing a different `userId`. Needs replacing before handling real user data at scale.
- **Affected features:** [authentication](features/authentication.md), all API features

## D-007 — Passwords stored and compared as plain text
- **Date:** 2026-07 (inferred)
- **Status:** Accepted (known risk, should be superseded)
- **Context:** The code writes `password` directly and compares with `!==`. `technical_design.md` says passwords are hashed, which conflicts with the code.
- **Decision:** Keep as-is for now. No hashing library is used.
- **Alternatives:** bcrypt or argon2.
- **Consequences:** A database leak exposes every password. Fixing it needs a migration plan that follows `db-safeguard`, for example rehash on login.
- **Affected features:** [authentication](features/authentication.md)

## D-008 — Password reset by emailed 6-digit OTP, held in memory
- **Date:** 2026-07 (inferred)
- **Status:** Accepted
- **Context:** Users need a way to recover access.
- **Decision:** Generate a 6-digit OTP, store it in a server `Map`, and send it with Nodemailer over SMTP. The forgot-password response also returns `simulatedOtp` so the UI works without SMTP.
- **Alternatives:** Signed reset links, or a DB table for OTPs.
- **Consequences:** OTPs are lost on restart, have no expiry or attempt limit, and the response leaks the code. Fine for dev only.
- **Affected features:** [authentication](features/authentication.md)

## D-009 — Single ledger table for income, expense, savings, and transfers
- **Date:** 2026-07 (inferred)
- **Status:** Accepted
- **Context:** All money movement needs one history and consistent balances.
- **Decision:** One `Transaction` table with `type` (`INCOME`, `EXPENSE`, `TRANSFER`, `SAVINGS`), `accountId`, and `toAccountId`. Income, Expenses, and Savings pages are filtered views. Account balances are stored values updated by each write and reversed on delete.
- **Alternatives:** Separate tables per type, or derive balances from the ledger.
- **Consequences:** Simple queries and one delete path. Stored balances can drift, and PUT does not re-adjust balances.
- **Affected features:** [transactions](features/transactions.md), [income](features/income.md), [expenses](features/expenses.md), [savings](features/savings.md)

## D-010 — Non-credit accounts cannot go negative; deleting an account requires zero balance
- **Date:** 2026-07 (inferred)
- **Status:** Accepted
- **Context:** Prevent invalid cash balances and orphaned money.
- **Decision:** Reject EXPENSE, TRANSFER, and SAVINGS-with-destination when the source is not `CREDIT` and the balance is too low. Block account deletion unless the balance is exactly 0. Manual balance edits create an `Adjustment` transaction so the ledger still explains the balance.
- **Alternatives:** Allow overdrafts, or cascade-delete transactions.
- **Consequences:** `CREDIT` accounts act as liabilities, and net worth subtracts them.
- **Affected features:** [accounts](features/accounts.md), [transactions](features/transactions.md)

## D-011 — Budget plan "implement" generates real transactions and allows one active plan
- **Date:** 2026-07 (inferred)
- **Status:** Accepted
- **Context:** Turn a plan into actual ledger entries for a period.
- **Decision:** Implementing a plan deactivates the user's other plans, marks this one active, and creates transactions for each item (descriptions `BP(<period>): <category>`). Transfer fees become separate `Transfer Fee` expenses. The plan `timeframe` is stored as a JSON string.
- **Alternatives:** Plans as planning-only data with manual entry.
- **Consequences:** Re-implementing a plan duplicates transactions. The `timeframe` JSON is flexible but unvalidated.
- **Affected features:** [budget-plans](features/budget-plans.md)

## D-012 — Budget goals as percentage groups; savings goal as a single user field
- **Date:** 2026-07 (inferred)
- **Status:** Accepted
- **Context:** Support goal tracking such as 50/30/20 and a monthly savings target.
- **Decision:** `BudgetGoal` has one row per user with `BudgetGoalGroup` rows (name, percentage, categories). `monthlySavingsGoal` lives on `User`. The dashboard compares target, budgeted, and actual percentages.
- **Alternatives:** Per-category limits.
- **Consequences:** Percentages are not validated to total 100.
- **Affected features:** [budget-goals](features/budget-goals.md), [savings](features/savings.md), [dashboard](features/dashboard.md)

## D-013 — Deployment on Vercel (web), Render (API), Supabase (DB)
- **Date:** 2026-07 (commit `d4213f4`: "update API service endpoints with the live Render URL")
- **Status:** Accepted
- **Context:** Needed hosted environments.
- **Decision:** Vercel for the Angular SPA (rewrite all paths to `index.html`), Render for the API, Supabase PostgreSQL for the DB. The API URL is hard-coded in the services and chosen by `window.location.origin` (`localhost` vs. production).
- **Alternatives:** Not documented.
- **Consequences:** No environment-file based config. Changing the API host means editing code.
- **Affected features:** [platform](features/platform.md)

## D-014 — Supabase connection pooling with `DATABASE_URL` + `DIRECT_URL`
- **Date:** 2026-07 (commit `bb9857c`)
- **Status:** Accepted
- **Context:** Supabase requires pooled connections for the app and a direct connection for migrations.
- **Decision:** Prisma datasource uses `url = DATABASE_URL` (pooled) and `directUrl = DIRECT_URL`. Documented in `DEPLOYMENT.md`.
- **Alternatives:** A single connection string.
- **Consequences:** Both variables must be set in every environment.
- **Affected features:** [platform](features/platform.md)

## D-015 — Database safeguards: no `db push`, additive migrations only
- **Date:** 2026-07 (commit `ed98b5e`: "database safeguards")
- **Status:** Accepted
- **Context:** Production holds real user data in Supabase.
- **Decision:** Adopt `.agents/skills/db-safeguard/SKILL.md`. Never use `prisma db push` on production or staging. Use `migrate dev` locally, review the SQL, and use `migrate deploy` in the pipeline. New required columns need a default or a staged rollout. Never wipe the database.
- **Alternatives:** Not documented.
- **Consequences:** Agents and developers must check migration SQL for `DROP` statements before applying.
- **Affected features:** [platform](features/platform.md)

## D-016 — Session auto-logout after 6 hours of inactivity
- **Date:** 2026-07 (inferred)
- **Status:** Accepted
- **Context:** The session lives only in `localStorage`, so it needs an expiry.
- **Decision:** Track user activity events (throttled to 1 second) and log out after 6 hours without activity. Check every 10 seconds.
- **Alternatives:** Server-side session expiry.
- **Consequences:** Client-only. Can be bypassed by anyone who edits `localStorage`.
- **Affected features:** [authentication](features/authentication.md)

## D-017 — Dashboard uses the current calendar month and `expenseDate || date`
- **Date:** 2026-07 (inferred)
- **Status:** Accepted
- **Context:** Reports must reflect when money was actually spent, not when it was entered.
- **Decision:** Month totals filter on `expenseDate || date` within the current calendar month. Net worth includes savings by default and excludes credit by default, and both settings are user toggles in `localStorage`.
- **Alternatives:** The active plan's date range.
- **Consequences:** The dashboard ignores the active plan's start and end dates for actuals.
- **Affected features:** [dashboard](features/dashboard.md), [expenses](features/expenses.md)

## D-018 — Reference data as global DB tables
- **Date:** 2026-07 (inferred)
- **Status:** Accepted
- **Context:** Forms need consistent category and account-type lists.
- **Decision:** `RefIncomeCategory`, `RefExpenseCategory`, `RefSavingCategory`, and `RefAccountType` are global (not per user) and editable on `/references`. Deleting a category is blocked while any transaction uses it. The per-user `Category` model is unused.
- **Alternatives:** Hard-coded enums, or per-user categories.
- **Consequences:** One user's category edits affect everyone. `Category` is dead schema.
- **Affected features:** [references](features/references.md)

## D-019 — Docs structure and decision logging rule
- **Date:** 2026-11-19
- **Status:** Accepted
- **Context:** Specs and decisions were scattered or missing, and `technical_design.md` had drifted from the code (for example the password hashing claim).
- **Decision:** Create `docs/features/<feature>.md` (one spec per feature, derived from the code) and `docs/decision.md` (this log). Add `AGENTS.md` with a mandatory rule that agents log every decision here and keep the specs in sync.
- **Alternatives:** Keep everything in `technical_design.md`.
- **Consequences:** Agents must update the docs with each change. `technical_design.md` stays as the user-story reference and may disagree with the code. The feature specs are the source of truth for current behavior.
- **Affected features:** all

## D-020 — Agents must clarify vague prompts with options, never assume
- **Date:** 2026-11-19
- **Status:** Accepted
- **Context:** Guessing at ambiguous requests risks wrong or unwanted changes.
- **Decision:** Add `rules.md` (linked from `AGENTS.md`, Rule 4). If a prompt is vague, agents stop and ask with 2–4 concrete options, recommended first, and start no work until answered.
- **Alternatives:** Let agents pick a default and state their assumption.
- **Consequences:** More questions up front, fewer wrong changes. Specific, easily undone requests are still done without asking.
- **Affected features:** all

## D-021 — Adopt Impeccable context files; split design.md from architecture
- **Date:** 2026-11-19
- **Status:** Accepted
- **Context:** `impeccable init` and `document` needed PRODUCT.md and a token-based DESIGN.md. `design.md` was an architecture doc with only a short UI section.
- **Decision:** Add `PRODUCT.md` (product truth) and rewrite `design.md` as the visual system ("The Calm Ledger", tokens from `src/styles.css`, plus `.impeccable/design.json`). Move stack, ER, API and security content to `docs/architecture.md`. Enable the Impeccable design hook.
- **Alternatives:** Overwrite `design.md` and drop the architecture content; keep architecture on top of the visual system.
- **Consequences:** `AGENTS.md` and `technical_design.md` still list `design.md` as the visual design reference, which now holds that. Architecture lives in `docs/architecture.md`. North Star blends three options the user picked.
- **Affected features:** all (UI)

## D-022 — Correct D-021: no stale design.md links; list new docs in AGENTS.md
- **Date:** 2026-11-19
- **Status:** Accepted
- **Context:** D-021 said `AGENTS.md` and `technical_design.md` still pointed to `design.md` as the architecture reference. A check showed `AGENTS.md` already called it "visual design" (correct) and `technical_design.md` never referenced it.
- **Decision:** Leave those references as they are. Add `PRODUCT.md` and `docs/architecture.md` to the reference docs in `AGENTS.md`.
- **Alternatives:** Edit D-021 in place (rejected: the log is append-only).
- **Consequences:** The "Consequences" claim in D-021 about stale links is wrong; this entry supersedes it.
- **Affected features:** none
