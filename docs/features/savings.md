# Feature: Savings & Monthly Savings Goal

**Code:** `src/app/components/savings/*`, savings-goal routes in `server/src/routes/budgets.routes.ts`

## Purpose
Record savings deposits and track progress toward a monthly savings target.

## Endpoints

| Method | Path | Rules | Errors |
|---|---|---|---|
| GET | `/api/user/savings-goal?userId=` | Returns `monthlySavingsGoal` (0 if unset) | 400 no userId |
| PUT | `/api/user/savings-goal` | Body `{ userId, monthlySavingsGoal }`. Non-numeric becomes 0. | 400 no userId |

Savings entries use `POST /api/transactions` with `type = SAVINGS` ([transactions.md](transactions.md)).

## Behavior
- Lists `SAVINGS` transactions with filtering, sorting, pagination, and bulk delete.
- A savings transaction with a source and destination account moves money from the source to the destination. With only one account, it adds the amount to that account (a deposit).
- Categories come from `RefSavingCategory`.
- Progress card: sum of this month's savings divided by the goal, capped at 100%. Shows 0 when the goal is 0 or less.
- The goal is stored on `User.monthlySavingsGoal`.
- The dashboard shows the same month-to-date progress.
