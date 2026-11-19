# Feature: Platform (health, fallback, deployment)

**Code:** `server/src/index.ts`, `server/src/mockStore.ts`, `server/src/prisma.ts`, `src/app/services/api.service.ts`, `DEPLOYMENT.md`, `docker-compose.yml`, `vercel.json`

## Stack
Angular 22 (standalone, Signals, Tailwind 4) → Express (TypeScript) → Prisma → PostgreSQL 16. Email through Nodemailer.

## Health
`GET /api/health` runs `SELECT 1`. It returns `status: ok` with a timestamp, or 500 with the error. The dashboard shows the result.

## Fallback (self-annealing)
- Each route catches Prisma failures and serves from the in-memory arrays in `mockStore.ts`.
- Mock data resets on restart and is never synced to the DB.
- `handleDbError` returns the raw DB error message to the client with a 500, so errors are not masked.
- Mock IDs use prefixes: `user-mock-`, `acc-mock-`, `tx-mock-`, `bp-`, `bg-mock-`.

## API client
- `ApiService` and `AuthService` choose the base URL by origin. `localhost` uses `http://localhost:3000/api`, and anything else uses the Render URL `https://fintrack-api-env1.onrender.com/api`.

## Database and migrations
- Prisma with `DATABASE_URL` (pooled) and `DIRECT_URL` (direct, for migrations), for Supabase.
- Migrations: `init` and `add_reviews`.
- Safety rules: `.agents/skills/db-safeguard/SKILL.md`. No `db push` on production, and schema changes must be additive.
- Seed script: `server/prisma/seed.js`.

## Hosting
- Frontend: Vercel. `vercel.json` rewrites all paths to `index.html` (SPA).
- API: Render. Database: Supabase PostgreSQL. `docker-compose.yml` is for local Postgres.

## Known gaps
- CORS is open to all origins (`cors()`).
- Middleware for auth is absent, and each handler trusts the `userId` it receives.
- API base URLs are hard-coded in the services.
