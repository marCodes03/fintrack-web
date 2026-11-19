import { rateLimit } from 'express-rate-limit';

function limiter(windowMinutes: number, max: number, message: string) {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit: max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { success: false, message }
  });
}

/** Login and register: slows credential stuffing and mass signups per IP. */
export const credentialsLimiter = limiter(15, 20, 'Too many attempts. Please try again in a few minutes.');

/** Forgot-password: each call sends an email and issues a fresh OTP. */
export const forgotPasswordLimiter = limiter(60, 5, 'Too many reset requests. Please try again later.');

/** OTP verification and password change: bounds OTP guessing across re-issued codes. */
export const resetLimiter = limiter(15, 10, 'Too many attempts. Please try again in a few minutes.');
