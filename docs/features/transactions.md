# Feature: Transactions (ledger)

**Code:** `server/src/routes/transactions.routes.ts`, `src/app/components/transactions/*`

## Purpose
The single ledger behind income, expenses, savings, and transfers. Every write keeps account balances in sync.

## Endpoints (`/api/transactions`)

| Method | Path | Rules | Errors |
|---|---|---|---|
| GET | `/?userId=` | Newest `date` first | none (mock fallback) |
| POST | `/` | Requires description, amount, type. Runs in one DB transaction. | 400 missing fields; 400 insufficient balance |
| PUT | `/:id` | Updates description, amount, category, accountId, expenseDate. **Does not re-adjust balances.** | 404 |
| DELETE | `/:id` | Rolls back the balance effect, then deletes, in one DB transaction | 404 |
| POST | `/bulk-delete` | Body `{ ids: [] }`. Rolls back and deletes all in one DB transaction. | 400 invalid or empty ids |

## Balance rules (create; delete applies the inverse)

| Type | Source account (`accountId`) | Destination (`toAccountId`) |
|---|---|---|
| INCOME | + amount | none |
| EXPENSE | − amount | none |
| TRANSFER | − (amount + transferFee) | + amount |
| SAVINGS with `toAccountId` | − amount | + amount |
| SAVINGS without `toAccountId` | + amount | none |

- Insufficient-funds check: for EXPENSE, TRANSFER (amount + fee), and SAVINGS with a destination, a non-`CREDIT` source whose balance is less than the amount is rejected with a message that includes the current balance.
- `expenseType` (`FIXED` or `VARIABLE`, default `VARIABLE`) is stored only for EXPENSE.
- Category defaults to `General`. `expenseDate` is optional. UI views use `expenseDate || date` as the effective date.

## UI
- Ledger page shows all types with filtering, sorting, pagination, multi-select, and bulk delete (with a confirm modal).
- Create and edit use a slide-in panel (`transaction-slider`).

## Known gaps
- PUT edits amount and account without adjusting balances, so balances can drift.
- A PUT cannot change `type`, `toAccountId`, or `transferFee`.
- Bulk delete skips unknown IDs without error.
