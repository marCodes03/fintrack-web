# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Individuals managing their own personal budget: logging income and expenses, tracking accounts and savings, and checking progress against plans. Admin role exists for reference data and reviews.

## Product Purpose
FinTrack lets a person record money in and out across accounts, plan spending ahead with budget plans and goals, and see where they stand on a dashboard. Success is a user who plans before spending and can read their position at a glance.

## Positioning
Forward planning (budget plans and budget goals) rather than only logging past spending, in a deliberately simple, small feature set that is quick to use.

## Operating Context
Angular 22 (standalone components, Signals) with Tailwind CSS 4; Express + Prisma + PostgreSQL API under `/api` with JWT auth; Nodemailer for email verification codes; deployed via Vercel/Supabase (see DEPLOYMENT.md). Modules: accounts, income, expenses, transactions, budgets, savings, references, reviews, dashboard.

## Capabilities and Constraints
- Offline fallback: an in-memory store (`mockStore.ts`) keeps the app working when PostgreSQL is unreachable; preserve it.
- Currency is PHP (₱), formatted with Angular `CurrencyPipe`; accounts carry their own currency field. UI language is English (`lang="en"`).
- Specs live in `docs/features/`; decisions are logged in `docs/decision.md`.
- Undecided: whether multi-currency display is a real goal; household/shared use is not in scope.

## Evidence on Hand
Technical design and user stories in `technical_design.md`; feature specs in `docs/features/`. No real user testimonials, usage data, or benchmarks exist; do not fabricate them.

## Product Principles
- Plan first: surfaces that help users set and track plans and goals outrank passive logging.
- Stay small: add a feature only if it serves the core budgeting loop.
- Keep working: degrade gracefully when the backend or database is unavailable.
- Money must be unambiguous: amounts, currency, and signs read correctly everywhere.

## Accessibility & Inclusion
WCAG 2.1 AA is required.
