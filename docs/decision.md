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

## D-007 — Passwords hashed with bcrypt, legacy plaintext upgraded on login
- **Date:** 2026-11-19
- **Status:** Accepted
- **Context:** Passwords were stored and compared as plain text.
- **Decision:** Use `bcryptjs` (cost 10). New and changed passwords are hashed. Legacy plaintext rows still verify once, then are re-saved as a hash on login (`server/src/utils/password.ts`). No schema migration.
- **Alternatives:** argon2, or a one-off migration that hashes every row.
- **Consequences:** Users who never log in keep a plaintext password until they do.
- **Affected features:** [authentication](features/authentication.md)

## D-008 — Password reset by emailed 6-digit OTP, held in memory
- **Date:** 2026-07 (inferred)
- **Status:** Accepted
- **Context:** Users need a way to recover access.
- **Decision:** Generate a 6-digit OTP with `crypto.randomInt`, store it in a server `Map` with a 10-minute expiry and a 5-attempt cap, and send it with Nodemailer over SMTP. The forgot-password response returns `simulatedOtp` only when `NODE_ENV !== 'production'`.
- **Alternatives:** Signed reset links, or a DB table for OTPs.
- **Consequences:** OTPs are lost on restart. Production needs working SMTP. There is still no per-IP rate limiting.
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

## D-021 — Local dev ports: web 4901, API 4902
- **Date:** 2026-11-19
- **Status:** Accepted
- **Context:** The default ports (4200, 3000) were already in use on the dev machine.
- **Decision:** Run the Angular app on 4901 (`ng serve --port 4901`) and the API on 4902 (`PORT` in `server/.env`). The localhost API URL in `api.service.ts` and `auth.service.ts` now points to 4902.
- **Alternatives:** Keep the defaults and free the ports.
- **Consequences:** Anyone running locally must use these ports. The production URL is unchanged.
- **Affected features:** [platform](features/platform.md)

## D-023 — Accessible accent tokens and a separate chart palette
- **Date:** 2026-11-19
- **Status:** Accepted
- **Context:** The dashboard audit found light-mode accent text at about 2.5:1 (emerald/teal) and 3.6:1 (rose) on white, hard-coded Tailwind accent classes, and a chart palette that reused the emerald/amber money colors.
- **Decision:** In `src/styles.css`, darken the light-mode `--accent-*` tokens to at least 4.5:1 on card and subtle surfaces, lighten dark `--accent-rose`, darken light `--text-muted`, and add `--accent-teal`, `--accent-indigo`, `--on-accent` and `--chart-1..5`. The dashboard uses the tokens instead of `*-500` classes and `dark:` text overrides. Chart hues avoid emerald, amber and rose.
- **Alternatives:** Keep Tailwind `*-500` classes and only darken them per element; keep the old chart colors.
- **Consequences:** `--text-muted` changes app-wide (slightly darker in light mode). Other components still use hard-coded `*-500` accents and need the same migration. Light-mode emerald is now `#047857`.
- **Affected features:** [dashboard](features/dashboard.md)

## D-024 — Dashboard accessibility, table structure, touch targets and type floor
- **Date:** 2026-11-19
- **Status:** Accepted
- **Context:** The dashboard audit found missing ARIA, flex on table cells, 14px checkbox targets and 9-11px text.
- **Decision:** Progress bars get `role="progressbar"`; the donut gets `role="img"` with a text label; emoji and arrow glyphs are `aria-hidden` and each transaction row names its type for screen readers. The table scroll region is focusable and labelled, headers have `scope="col"`, and cell layout moved to an inner div. Net-worth checkboxes have a 24px minimum target (44px on coarse pointers). All fixed 9-11px text now uses `text-xs` (13px floor from `styles.css`); money figures use `tabular-nums`. Pulse and hover-scale effects use `motion-safe:`.
- **Alternatives:** Keep fixed small sizes; leave motion to the global reduced-motion rule alone.
- **Consequences:** Emoji icons remain (a drawn icon set is a separate change). The global 0.01ms reduced-motion rule in `styles.css` is unchanged.
- **Affected features:** [dashboard](features/dashboard.md)

## D-025 — Dashboard headings, loading announcements and drawn icons
- **Date:** 2026-11-19
- **Status:** Accepted
- **Context:** The second dashboard audit found no `<h1>`, stat titles as paragraphs, silent loading states, and emoji used as icons.
- **Decision:** Add a visually hidden `<h1>` and a `role="status"` loading message; make widget titles `<h2>`; set `aria-busy` on the stats, plan and table regions while loading. Replace emoji with inline stroke SVG icons (chart, info, briefcase, transfer, wallet, cart). Drop `transition-all` from static cards.
- **Alternatives:** Keep emoji; add an icon library dependency.
- **Consequences:** Icons are inline SVG with no new dependency; other pages still use emoji.
- **Affected features:** [dashboard](features/dashboard.md)

## D-026 — Dashboard mobile adaptation
- **Date:** 2026-11-19
- **Status:** Accepted
- **Context:** Rendering the dashboard at 360, 768 and 1280px (headless Chrome, mocked API, touch emulation) showed the transactions table hiding the amount column off-screen at 360px, a cramped analytics header, and 20px-tall text links.
- **Decision:** Below `sm`, the Category and Date columns are hidden and shown as a muted line under the description, so the amount stays visible. Amounts never wrap. The analytics header stacks on narrow screens. The "Manage Plans", "Savings Page" and "View All" links get a 24px minimum height (44px on coarse pointers).
- **Alternatives:** Horizontal scroll for the whole table; card list on mobile.
- **Consequences:** No horizontal page overflow at 360, 768 or 1280px. Real-device touch and Safari remain untested.
- **Affected features:** [dashboard](features/dashboard.md)

## D-027 — Token-based accents on every page
- **Date:** 2026-11-19
- **Status:** Accepted
- **Context:** The all-pages audit found about 790 hard-coded accent and white color classes outside the dashboard, light-mode contrast failures, and 10 mistyped classes (`text-emerald-505`, `dark:text-slate-955`, `text-amber-550` and similar) that generated no CSS.
- **Decision:** Every template now uses `accent-emerald|amber|rose|teal|indigo` and `text-on-accent` instead of raw `*-400/500/600` and `text-white`. Yellow maps to amber and blue to indigo. Hover on filled buttons is `hover:opacity-90`; `dark:` color overrides were removed. Typos were corrected to their intended values. Light-mode emerald is `#046c4e` and amber `#9a4506` so tinted badges stay at 4.5:1 or better.
- **Alternatives:** Keep Tailwind palette classes and darken per element.
- **Consequences:** A programmatic contrast check (headless Chrome, mocked API) found no failing text on 12 pages in light and dark. Sliders, modals and states that need interaction were not opened. Emoji, dialog semantics and `animate-in` classes are still open.
- **Affected features:** all (UI)

## D-028 — Shared inline-SVG icon component replaces emoji everywhere
- **Date:** 2026-11-19
- **Status:** Accepted
- **Context:** After the dashboard, emoji and text glyphs (✅ ⚠️ 🗑️ ★ ➔ ⏮ and the menu, account, reference and budget-step icons) were still used as icons on every other page. They render differently per platform and are read aloud by screen readers.
- **Decision:** Add `IconComponent` (`<app-icon name="...">`, `src/app/components/icon/icon.component.ts`): a registry of static 24px stroke SVGs that inherits `currentColor` and font size, with `aria-hidden`. All templates use it. Emoji inside `<option>` labels were dropped, since options cannot hold SVG.
- **Alternatives:** An icon library dependency; inline SVG copied into each template.
- **Consequences:** No new dependency. New icons are added to the registry. Icon-only buttons still need accessible names (harden pass).
- **Affected features:** all (UI)

## D-029 — Own entrance-motion CSS, smaller logo, dark theme-color
- **Date:** 2026-11-19
- **Status:** Accepted
- **Context:** `animate-in`, `fade-in`, `slide-in-from-right` and `zoom-in-95` are used about 80 times but Tailwind v4 does not generate them (they come from `tailwindcss-animate`, which is not installed), so overlays appeared instantly. `logo.png` was a 61KB 300px image shown at 32 to 64px.
- **Decision:** Define those classes in `src/styles.css` (one `enter` keyframe driven by CSS variables, exponential ease-out, duration from the existing `duration-*` class, default 250ms) and run them only under `prefers-reduced-motion: no-preference`. Resize `public/logo.png` to 128px (15KB). Add a dark `theme-color` next to the light one in `index.html`. The title and meta description in `index.html` were already set.
- **Alternatives:** Install `tailwindcss-animate`; remove the dead classes. Real multi-size favicon was offered and not chosen.
- **Consequences:** No new dependency and no template changes. `favicon.ico` is still the 61KB PNG.
- **Affected features:** all (UI)

## D-030 — Email verification before login
- **Date:** 2026-11-19
- **Status:** Accepted
- **Context:** Anyone could register any email, including an unclaimed `ADMIN_EMAILS` address, and be treated as that person.
- **Decision:** Add `User.emailVerified` (migration `add_email_verified`, backfilled to `true` for existing users). Register emails an OTP and returns no session. `POST /auth/verify-email` verifies and logs in; login returns 403 `EMAIL_NOT_VERIFIED` until then. `requireAdmin` requires a verified email.
- **Alternatives:** Verify only for admin access; verification links instead of OTPs.
- **Consequences:** Production signup needs working SMTP. An attacker can register a victim's address unverified, but cannot log in as it; the owner can still recover it through forgot-password.
- **Affected features:** [authentication](features/authentication.md)

## D-031 — Session JWT in an httpOnly cookie, served first-party through Vercel
- **Date:** 2026-11-19
- **Status:** Accepted
- **Context:** The JWT lived in `localStorage`, so any XSS could read and reuse it. The frontend (Vercel) and API (Render) are different sites, so a direct cross-site cookie would be a third-party cookie that Safari and some Chrome settings block.
- **Decision:** Login, verify-email and refresh set `fintrack_token` as an httpOnly, `SameSite=Lax` cookie (`Secure` in production). `vercel.json` rewrites `/api/*` to Render and the production `apiUrl` is `/api`, so the cookie is first-party. Local dev calls the API on the page's own host, which is same-site. CORS is credentialed with an explicit origin list. A state-changing request with the cookie must send `X-Requested-With: fintrack`. `requireAuth` also still accepts a Bearer header.
- **Alternatives:** Cross-site `SameSite=None` cookie with CSRF tokens (breaks on Safari); keep `localStorage`.
- **Consequences:** The rewrite and the client must deploy together. `TRUST_PROXY_HOPS` must match the real proxy count or rate limiting sees the wrong IP. There is still no server-side revocation: logout clears the cookie, but a copied token works until it expires (6h).
- **Affected features:** [authentication](features/authentication.md)

## D-032 — Accessible names, real favicon, targeted reduced motion
- **Date:** 2026-11-19
- **Status:** Accepted
- **Context:** The all-pages audit found icon-only buttons with no accessible name, table headers without `scope`, a `favicon.ico` that was a renamed 61KB PNG, and a global reduced-motion rule that set every duration to 0.01ms (removing useful hover and focus feedback). Rendering the overlays also showed the budget plan step tabs overlapping, and the active tab carrying a conflicting muted text class.
- **Decision:** Close buttons, password show/hide toggles and star ratings get `aria-label` (toggles and stars also `aria-pressed`); every `<th>` has `scope="col"`. `favicon.ico` is now a real 16/32/48px ICO (6KB) with a 32px PNG link. Under reduced motion, animations stop (spinners keep turning) and transitions shorten to 120ms on color and opacity only. Step tabs use `grow shrink-0` so labels cannot overlap, and the stray muted class on the active tab was removed. Added `docs/ui-quality.md`.
- **Alternatives:** Keep the global 0.01ms rule; generate favicons with an image tool.
- **Consequences:** The confirm-delete modal could not be opened in the mocked render and was checked from source only.
- **Affected features:** all (UI)

## D-033 — 13px type floor, token classes, table-to-card layout on small screens
- **Date:** 2026-11-19
- **Status:** Accepted
- **Context:** The all-pages audit found `design.md` still listing a 12px label (and the full copy a 10px compact size) while the app enforces a 13px floor. Templates also mixed `text-[13px]`, `text-[var(--text-muted)]` and token classes, and the detector flagged 13px and 15px as off the type ramp. Wide tables forced sideways scrolling on phones.
- **Decision:** 13px (`text-xs`, the label step) is the smallest text; the label step in `design.md` is now 0.8125rem. Templates use `text-xs` and token classes (`text-text-muted`, `border-border-subtle`, `bg-surface-card`) instead of `text-[13px]` or `[var(--…)]`. The card amount is 14px bold to stay on the ramp. Below 1024px, tables tagged `card-table` render as cards (title and amount on top, details below, row menu in the corner). The detector's `rgb(0,0,0)` colour findings are treated as false positives because it cannot resolve CSS variables.
- **Alternatives:** Allow 12px labels; keep horizontally scrolling tables on phones; add 15px to the ramp.
- **Consequences:** Dense labels are slightly larger. New templates must use token classes. The table-to-card CSS depends on `data-cell` and `data-label` attributes in each table template.
- **Affected features:** all (UI)

## D-034 — Dashboard hierarchy, plain analytics wording, savings blue
- **Date:** 2026-11-20
- **Status:** Accepted
- **Context:** The dashboard critique found four equal KPI cards with empty space under three of them, jargon in the analytics block ("Denominator", "Progress to Goal 22% Achieved" on spending caps), a 4,000px page at 360px, duplicated category and date lines in the phone transaction cards, and savings teal that read almost the same as income emerald.
- **Decision:** Net worth is a full-width hero card (larger figure) with income, expenses and savings in a row beneath. The analytics block is titled "Spending vs your plan" with plain labels ("Spent so far", "Spending limit 22% used", "Savings target 55% reached"); on phones the per-group breakdown is collapsed behind a "Show breakdown by group" toggle. Phone transaction cards drop the duplicate inline category line and the 3rem right padding reserved for a kebab menu the dashboard does not have. `--accent-teal` changes to a sky blue (`#0369a1` light, `#38bdf8` dark) so savings is distinct from income; the token name stays `accent-teal`.
- **Alternatives:** Keep four equal cards; a new `accent-savings` token name (more edits across six components); show all analytics on phones.
- **Consequences:** Every use of `accent-teal` (savings, budgets, references) is now blue. The phone page is about 2,900px tall instead of 4,000px.
- **Affected features:** dashboard, savings, budgets (UI)
