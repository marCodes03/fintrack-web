# Feature: Accounts

**Code:** `server/src/routes/accounts.routes.ts`, `src/app/components/accounts/*`

## Purpose
Manage financial accounts (cash, bank, credit, savings, e-wallet) and their balances.

## Endpoints (`/api/accounts`)

| Method | Path | Rules | Errors |
|---|---|---|---|
| GET | `/?userId=` | Filter by user, newest `updatedDate` first | falls back to mock store |
| POST | `/` | Requires name and type. Currency defaults to `PHP`. Balance defaults to 0. Falls back to the default user if no `userId`. | 400 missing name or type; 400 no user |
| PUT | `/:id` | Updates name and type. If the balance changed, it creates an `Adjustment` transaction (INCOME if the balance went up, EXPENSE if it went down) for the difference. | 404 not found |
| DELETE | `/:id` | Only allowed when balance is exactly 0 | 400 non-zero balance; 404 not found |

## Behavior
- Account types come from the reference table `RefAccountType` (code, label, icon, sortOrder).
- A `CREDIT` account is a liability. It may go negative, and the dashboard subtracts it from net worth when it is included.
- Non-credit accounts may not go negative (enforced in [transactions](transactions.md)).
- Create and edit use a slide-in panel (`account-slider`). Delete uses a confirm modal.
- Mock-store accounts use the `acc-mock-` ID prefix, and mock users use `user-mock-`. These IDs are routed straight to the mock store.

## Data
`Account { id, name, type, balance, currency, userId, audit fields }`. Deleting a user cascades to their accounts. Deleting an account sets `accountId` and `toAccountId` on its transactions to null.
