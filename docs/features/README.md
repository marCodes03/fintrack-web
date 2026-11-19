# Feature Specs

One spec per feature, derived from the current code. Keep them in sync with the code (see `AGENTS.md`, Rule 2). Decisions live in [../decision.md](../decision.md).

| # | Feature | Frontend route | Backend prefix | Spec |
|---|---------|----------------|----------------|------|
| 1 | Authentication & Session | `/login` `/register` `/forgot-password` | `/api/auth` | [authentication.md](authentication.md) |
| 2 | Accounts | `/accounts` | `/api/accounts` | [accounts.md](accounts.md) |
| 3 | Transactions (ledger) | `/transactions` | `/api/transactions` | [transactions.md](transactions.md) |
| 4 | Income | `/income` | `/api/transactions` (type INCOME) | [income.md](income.md) |
| 5 | Expenses | `/expenses` | `/api/transactions` (type EXPENSE) | [expenses.md](expenses.md) |
| 6 | Savings & Savings Goal | `/savings` | `/api/transactions` (type SAVINGS), `/api/user/savings-goal` | [savings.md](savings.md) |
| 7 | Budget Plans | `/budgets` | `/api/budget-plans` | [budget-plans.md](budget-plans.md) |
| 8 | Budget Goals | `/dashboard`, `/budgets` | `/api/budget-goals` | [budget-goals.md](budget-goals.md) |
| 9 | Dashboard | `/dashboard` | none (aggregates other APIs) | [dashboard.md](dashboard.md) |
| 10 | Reference Data | `/references` | `/api/refs` | [references.md](references.md) |
| 11 | Reviews | `/reviews` | `/api/reviews` | [reviews.md](reviews.md) |
| 12 | Platform (health, fallback, deployment) | none | `/api/health` | [platform.md](platform.md) |

## Shared conventions

- Response envelope: `{ success: boolean, data?, message? }`.
- Every list endpoint accepts an optional `userId` query filter. There is no auth middleware (see D-006 in [decision.md](../decision.md)).
- Every route falls back to the in-memory `mockStore.ts` when Prisma fails (see D-004).
- Currency is PHP (₱). Money values are stored as `Float`.
- Transaction types: `INCOME`, `EXPENSE`, `TRANSFER`, `SAVINGS`. Account types: `CASH`, `BANK`, `CREDIT`, `SAVINGS`, `E_WALLET`.
- Frontend: Angular standalone components, Signals, Tailwind CSS 4. Side panels ("sliders") handle create and edit.
