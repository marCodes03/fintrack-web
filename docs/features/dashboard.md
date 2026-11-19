# Feature: Dashboard

**Code:** `src/app/components/dashboard/*`, `src/app/components/header/*`

## Purpose
Landing page (`/` redirects to `/dashboard`) that summarizes the user's finances for the current month.

## Data sources
Loads in parallel through `ApiService`: transactions, accounts, budget plans, budget goal, savings goal, and `GET /api/health` (shows a database status chip).

## Computed figures
| Figure | Rule |
|---|---|
| Net worth | Sum of account balances. `CREDIT` balances are subtracted. Savings accounts and credit accounts can each be included or excluded by a toggle (saved in `localStorage`: `fintrack_networth_include_savings`, default on; `fintrack_networth_include_credit`, default off). |
| Month income / expenses / savings | Current calendar month, using `expenseDate || date`. Expenses use absolute values. |
| Total savings | Sum of `SAVINGS` account balances. |
| Savings goal progress | Month savings divided by `monthlySavingsGoal`, capped at 100%. |
| Active plan | The plan with `isActive`. It shows planned outflows and savings, and remaining = month income − planned outflows. |
| Goal group analytics | Target, budgeted, and actual percent per group (see [budget-goals](budget-goals.md)). |

## Other behavior
- Redirects to `/login` if unauthenticated.
- Hide-amounts toggle masks all money values.
- Opens the change-password modal.
- Header: navigation, user menu, logout, hide-amounts toggle.

## Known gaps
- If the month has no income, inflows default to 1, so the percentages are misleading.
