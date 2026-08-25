export const SESSION_COOKIE_NAME =
  process.env.NODE_ENV === "production" ? "__Host-mwp_session" : "mwp_session";
export const CSRF_COOKIE_NAME =
  process.env.NODE_ENV === "production" ? "__Host-mwp_csrf" : "mwp_csrf";

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 5;

export function secureCookieOptions() {
  return {
    httpOnly: true,
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production",
  };
}
