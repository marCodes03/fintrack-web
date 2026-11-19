# Feature: Budget Goals

**Code:** `budget-goals` routes in `server/src/routes/budgets.routes.ts`, UI in `src/app/components/budgets/*` and `dashboard/*`

## Purpose
Let a user split income into percentage groups (for example Necessity 50%, Leisure, Savings) and compare the plan and actual spending against those targets.

## Endpoints (`/api/budget-goals`)

| Method | Path | Rules | Errors |
|---|---|---|---|
| GET | `?userId=` | Returns the user's goal with its groups, or `null` | 400 no userId |
| PUT | `?userId=` (or body `userId`) | Body `{ groups: [{ name, percentage, categories[] }] }`. Creates the goal if missing, deletes the old groups, then creates the new ones. | 400 no userId or groups |

## Data
- `BudgetGoal { userId (unique) }` has many `BudgetGoalGroup { name, percentage, categories: string[] }`.
- One goal per user. A group with the category `Savings` maps to SAVINGS items and transactions.

## Behavior
- The dashboard's goal analytics compare each group's target percentage, budgeted percentage (active plan items in the group's categories divided by this month's income), and actual percentage (this month's transactions in those categories).
- The percentage total is not validated server-side.

## Known gaps
- The PUT replaces the groups in several separate queries without a transaction.
- No check that percentages sum to 100.
