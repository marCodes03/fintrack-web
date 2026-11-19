# Feature: Reviews

**Code:** `server/src/routes/reviews.routes.ts`, `src/app/components/reviews/*`

## Purpose
Let logged-in users rate the app and leave a comment, and show the feedback list.

## Endpoints (`/api/reviews`)

| Method | Path | Rules | Errors |
|---|---|---|---|
| GET | `/?userId=` | Newest first, includes the author's `name` and `email` | 500 on DB failure |
| POST | `/` | Body `{ rating, comment, userId }`. Rating must be a whole number from 1 to 5. The user must exist. | 400 missing fields; 400 invalid rating; 400 unknown user |

## Data
`Review { id, rating, comment, userId, createdDate }`. Added in migration `20260727064734_add_reviews`.

## Known gaps
- Unlike the other routes, reviews have **no mock-store fallback**. A DB outage returns 500.
- GET exposes reviewers' email addresses to anyone who calls it.
