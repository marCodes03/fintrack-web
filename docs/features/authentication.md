# Feature: Authentication & Session

**Code:** `server/src/routes/auth.routes.ts`, `server/src/services/email.service.ts`, `src/app/services/auth.service.ts`, `src/app/components/auth/*`, `src/app/components/header`

## Purpose
Let users register, log in, recover a forgotten password, and change their password. Keep the session on the client.

## Endpoints (`/api/auth`)

| Method | Path | Body | Success | Errors |
|---|---|---|---|---|
| POST | `/register` | name, email, password | 201 + user (no password) | 400 missing fields; 400 duplicate email |
| POST | `/login` | email, password | 200 + user | 400 missing fields; 401 bad credentials |
| POST | `/forgot-password` | email | 200, OTP emailed | 400 missing email; 404 unknown email; 500 SMTP failure |
| POST | `/reset-password-otp` | email, otp, newPassword | 200 | 400 missing fields; 400 invalid or expired OTP |
| POST | `/reset-password` | email, currentPassword, newPassword | 200 | 400 missing fields; 400 wrong current password |

## Behavior
- Forgot-password creates a 6-digit OTP, stores it in the in-memory `activeOtps` map keyed by email, and sends it with Nodemailer (SMTP configured through `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SENDER_NAME`).
- The forgot-password response includes `simulatedOtp` so the UI works without SMTP (dev aid).
- The OTP is deleted after a successful reset.
- Client session: the user object is stored in `localStorage` (`fintrack_user`). It is cleared on logout.
- Auto-logout after 6 hours of inactivity. Activity is tracked from mouse, key, scroll, and touch events, throttled to 1 second, and checked every 10 seconds (`fintrack_last_activity`).
- Unauthenticated users are redirected to `/login` by each page's `ngOnInit`. There are no route guards.
- The "hide amounts" toggle is global and persisted (`fintrack_hide_amounts`).
- Change password is a modal (`ResetPasswordComponent`) opened from the dashboard.

## Data
`User { id, email (unique), name, password, monthlySavingsGoal, audit fields }`

## Known gaps
- Passwords are stored and compared as **plain text** (`user.password !== password`). `technical_design.md` says they are hashed, but the code does not do that.
- OTPs have no expiry and no attempt limit, and they are lost on server restart.
- No token or JWT. The server trusts `userId` sent by the client.
- Fallback user: `user@example.com` / `password123` in the mock store.
