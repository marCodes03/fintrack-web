---
name: db-safeguard
description: Database Schema Safety and No Data Loss Safeguards for FinTrack
---

# Database Migration Safeguards (No Data Loss Policy)

This instruction set defines safety rules and procedures for modifying database schemas, running migrations, and deploying changes to production environments for the **FinTrack** application.

---

## 1. Migration Safety Rules

> [!IMPORTANT]
> **Rule 1**: NEVER run `prisma db push` on a production or staging database. It skips migration history tracking and can lead to destructive changes and immediate data loss.
>
> **Rule 2**: Schema additions (new columns, new models) are safe, but MUST be non-destructive.
>
> **Rule 3**: Any destructive changes (drops, column renames, changing column types) MUST follow a multi-step safe migration pattern.

---

## 2. Checklists Before running Migrations

Before running any Prisma commands, walk through this checklist:

### A. Is the Database Deployed?
- If the project is deployed to production (e.g., Supabase / Render), assume real user data is active.
- **Never wipe the database.**

### B. Analyze Schema Changes
- Check if your edits in [`schema.prisma`](file:///c:/Users/ETI/.gemini/antigravity-ide/scratch/fintrack-web/server/prisma/schema.prisma) will drop tables or columns.
- Check if you are adding new `required` (non-nullable) columns to existing tables.
  - **Requirement**: If a column is required, it must either:
    1. Have a `@default` value.
    2. Be created as optional (`?`) first, populated with seed data, and then set as required in a subsequent migration.

---

## 3. Safe Deployment Procedure

1. **Local Test**: Run `npx prisma migrate dev --name <migration_name>` on your local test environment first.
2. **Review SQL**: Inspect the generated SQL file under `prisma/migrations/` to ensure no `DROP` statement is present unless explicitly expected.
3. **Staging / Prod Deployment**: Use `npx prisma migrate deploy` in the deployment pipeline. This applies migrations sequentially without interactive prompts or risk of data destruction.
