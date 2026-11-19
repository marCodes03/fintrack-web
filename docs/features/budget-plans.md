# Feature: Budget Plans

**Code:** `server/src/routes/budgets.routes.ts`, `server/src/services/budget.orchestrator.ts`, `server/src/execution/budget.execution.ts`, `server/directives/budgets.md`, `src/app/components/budgets/*`

## Purpose
Define reusable income, expense, savings, and transfer plans for a time period. Implementing a plan generates the matching transactions.

## Endpoints (mounted under `/api`)

| Method | Path | Rules | Errors |
|---|---|---|---|
| GET | `/budget-plans?userId=` | Plans with their items | none |
| POST | `/budget-plans` | Requires name and timeframe. Falls back to the first user if no `userId`. | 400 |
| PUT | `/budget-plans/:id` | Replaces the plan's items. Old items are removed and new ones saved in one transaction. | 404 |
| DELETE | `/budget-plans/:id` | Deletes the plan (items cascade) | 404 |
| PUT | `/budget-plans/:id/deactivate` | Sets `isActive = false` | 404 |
| POST | `/budget-plans/:id/implement` | See below | 400 missing dates or account; 404 |

## Data
- `BudgetPlan { name, timeframe (JSON string), startDate, endDate, isActive, implementedAccountId, userId }`
- `BudgetPlanItem { type (INCOME | EXPENSE | SAVINGS | TRANSFER), categoryName, amount (>= 0), accountId?, toAccountId?, transferFee? }`
- `timeframe` JSON holds `recurrence` (NONE, DAILY, WEEKLY, BI_MONTHLY, MONTHLY, YEARLY) and `details` (`label`, `startDay`, `endDay`).

## Implement (activation) flow
Requires `startDate`, `endDate`, and `accountId`. Optional: `expenseAccountId`, `savingsAccountId`, `userId`, `execute` (default true).
1. In one DB transaction, set every other plan of the user to inactive. Only one plan can be active.
2. Mark this plan active and save the dates and `implementedAccountId`.
3. Unless `execute === false`, create one transaction per item and adjust balances. Each uses its own `accountId` and `toAccountId`, or the default account. Descriptions are `BP(<period label>): <category>`, dated at `startDate`.
   - INCOME: creates an income and increases the balance.
   - EXPENSE: creates an expense and decreases the balance.
   - TRANSFER and SAVINGS: move money between accounts. A `transferFee > 0` is recorded as a separate EXPENSE with category `Transfer Fee`.
4. The period label comes from `timeframe.details.label`, then `Day X - Day Y`, then the recurrence name, then the plan name.

## UI
- Plan list with pagination. Create and edit use a large slider (`budget-plan-slider`) with item rows per type, categories, and accounts.
- The implement dialog computes the end date from the plan's timeframe. It shows an error if it can't.

## Architecture
Three layers: a directive (`directives/budgets.md`, SOP), an orchestrator (service with a mock fallback), and a deterministic execution layer (Prisma calls). Only plan list, create, and update go through the orchestrator. Delete, deactivate, and implement live in the route file.

## Known gaps
- Implementing the same plan twice creates duplicate transactions.
- The implement step does not check for insufficient funds.
