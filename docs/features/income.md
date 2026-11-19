# Feature: Income

**Code:** `src/app/components/income/*` (frontend view over [transactions](transactions.md))

## Purpose
Track money coming in.

## Behavior
- Lists transactions where `type = INCOME`, with a search filter, sort, and pagination. It shows a total for the filtered set.
- Multi-select with bulk delete (calls `POST /api/transactions/bulk-delete`).
- Create and edit use `income-slider`. Categories come from `RefIncomeCategory` (`GET /api/refs/income-categories`), and the target account comes from `GET /api/accounts`.
- Creating income increases the chosen account's balance. Deleting it reverses that.
- Budget plan implementation also generates INCOME transactions, described as `BP(<period>): <category>` with `expenseType = FIXED` (see [budget-plans](budget-plans.md)).

## Rules
- Amount, description, and account are required in the UI.
- Backend rules are in [transactions.md](transactions.md).
