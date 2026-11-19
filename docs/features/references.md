# Feature: Reference Data

**Code:** `server/src/routes/reference.routes.ts`, `src/app/components/references/*`, `server/prisma/seed.js`

## Purpose
Manage the lookup lists used by forms: income, expense, and saving categories, plus read-only recurrence intervals and account types.

## Endpoints (`/api/refs`)

| Resource | Methods | Rules |
|---|---|---|
| `income-categories`, `expense-categories`, `saving-categories` | GET (sorted by name), POST, PUT `/:id`, DELETE `/:id` | POST requires `name` (400). Names are unique. DELETE returns 400 if any transaction of that kind uses the category, with the usage count in the message. 404 if not found. |
| `recurrence-intervals` | GET | Read-only: NONE, DAILY, WEEKLY, BI_MONTHLY, MONTHLY, YEARLY |
| `account-types` | GET | Read-only: CASH, BANK, CREDIT, SAVINGS, E_WALLET with label and icon |

## Data
`RefIncomeCategory`, `RefExpenseCategory`, `RefSavingCategory` (`name` unique, `description`, `isActive`), `RefAccountType` (`code`, `label`, `icon`, `sortOrder`).

## Behavior
- Reference tables are global, not per user.
- Fallback expense categories (11, such as Food & Dining and Transfer Fee) are seeded in the mock store. Income and saving fallbacks are empty.
- The UI is a tabbed page with inline add, edit, and delete.

## Known gaps
- The `Category` model in the schema (per-user, hierarchical) is not used by any route or screen.
- The `isActive` flag is stored but not used to filter.
- Recurrence intervals exist only in the mock store, not in the schema.
