export function signInRedirectPath(requested: string | null): string {
  const destination = requested !== null && !requested.startsWith("//") &&
    (requested === "/app" || requested.startsWith("/app/") || requested.startsWith("/app?"))
    ? requested : "/app";
  return `/sign-in?returnTo=${encodeURIComponent(destination)}`;
}
