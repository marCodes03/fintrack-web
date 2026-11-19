# Feature: Expenses

**Code:** `src/app/components/expenses/*` (frontend view over [transactions](transactions.md))

## Purpose
Track spending and classify it as fixed or variable.

## Behavior
- Lists transactions where `type = EXPENSE`, with a search filter, sort, pagination, and a filtered total (absolute values).
- Multi-select with bulk delete.
- Create and edit use `expense-slider`. Categories come from `RefExpenseCategory` (`GET /api/refs/expense-categories`).
- `expenseType` is `FIXED` or `VARIABLE` (default `VARIABLE`).
- An optional `expenseDate` lets the user back-date an expense. The dashboard and reports use `expenseDate || date`.
- Creating an expense decreases the source account's balance. A non-credit account cannot go negative.
- Transfer fees from budget plan implementation are recorded as EXPENSE transactions with category `Transfer Fee`.
