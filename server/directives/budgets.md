# Directive: Budget Operations

This SOP defines the expected behavior, validation, and fallbacks for FinTrack budget management.

## Goals
- Retrieve list of budget plans (filtering optionally by `userId`).
- Create a new budget plan with list items.
- Update an existing budget plan transactionally (removing old items, saving new ones).
- Provide robust error tolerance (falling back to an in-memory mock store if the persistent database is unreachable).

## Inputs & Schema

### Budget Plan Item Creation
- `type`: String (income, expense, transfer, etc.)
- `categoryName`: String
- `amount`: Number (must be non-negative)
- `accountId`: String (optional)
- `toAccountId`: String (optional)
- `transferFee`: Number (optional)

### Budget Plan Creation
- `name`: String (required)
- `timeframe`: String (required)
- `userId`: String (optional, defaults to first found user or a default fallback ID)
- `items`: Array of Budget Plan Items

## Execution Procedures
1. Validate inputs. If invalid, fail immediately with 400.
2. Attempt database operations within execution helper routines.
3. Assert query completeness. If database operations fail (e.g. Postgres disconnected), apply the *self-annealing fallback* strategy: log the error and run the matching mock store action.
4. Output standard response objects.
