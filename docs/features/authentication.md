# Feature: Authentication & Session

**Code:** `server/src/routes/auth.routes.ts`, `server/src/services/email.service.ts`, `src/app/services/auth.service.ts`, `src/app/components/auth/*`, `src/app/components/header`

## Purpose
Let users register, log in, recover a forgotten password, and change their password. Keep the session on the client.

## Endpoints (`/api/auth`)

| Method | Path | Body | Success | Errors |
|---|---|---|---|---|
| POST | `/register` | name, email, password | 201 `requiresVerification`, verification code emailed, no session | 400 missing fields; 400 duplicate email |
| POST | `/verify-email` | email, otp | 200 + token + user | 400 invalid or expired code |
| POST | `/resend-verification` | email | 200, same message for any email | 400 missing email; 429 rate limited |
| POST | `/login` | email, password | 200 + user | 400 missing fields; 401 bad credentials; 403 `EMAIL_NOT_VERIFIED` |
| POST | `/forgot-password` | email | 200, same generic message for known and unknown emails; OTP emailed if the account exists | 400 missing email; 429 rate limited |
| POST | `/refresh` | Bearer token | 200 + fresh token | 401 invalid token or user deleted |
| POST | `/reset-password-otp` | email, otp, newPassword | 200 | 400 missing fields; 400 invalid or expired OTP |
| POST | `/reset-password` | email, currentPassword, newPassword | 200 | 400 missing fields; 400 wrong current password |

## Behavior
- Forgot-password creates a 6-digit OTP, stores it in the in-memory `activeOtps` map keyed by email, and sends it with Nodemailer (SMTP configured through `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SENDER_NAME`).
- The OTP expires after 10 minutes and is invalidated after 5 wrong attempts. It is deleted after a successful reset.
- The forgot-password response includes `simulatedOtp` only when `NODE_ENV !== 'production'` (dev aid).
- Rate limits per IP (`express-rate-limit`, `trust proxy` = 1): login/register 20 per 15 min, forgot-password 5 per hour, OTP reset and password change 10 per 15 min.
- Sliding session: while the user is active, the client calls `/auth/refresh` every 30 minutes (and once on load) to replace the 6h token. Idle sessions expire.
- New accounts must verify their email with a 6-digit OTP (same expiry and attempt rules as password reset) before they can log in. `requireAdmin` also needs a verified email. Existing users were backfilled as verified by the migration; a successful password reset also verifies the account.
- Passwords are bcrypt hashes. Legacy plaintext passwords are re-hashed on first successful login.
- The in-memory mock user fallback is used only outside production, and only when the database is unreachable.
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
