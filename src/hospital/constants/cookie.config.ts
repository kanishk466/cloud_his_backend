import { CookieOptions } from 'express';

export const REFRESH_COOKIE_NAME = 'refreshToken';

/**
 * Single source of truth for refresh-token cookie options.
 * MUST be identical in res.cookie() and res.clearCookie() or
 * the browser will silently refuse to delete the cookie.
 */ 
export function getRefreshCookieOptions(): CookieOptions {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,            // true → HTTPS only
    sameSite: isProd ? 'none' : 'lax', // 'none' required for cross-origin (frontend ≠ API domain)
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,   // 7 days
  };
}