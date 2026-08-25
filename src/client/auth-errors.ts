function providerCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) return undefined;
  return typeof error.code === "string" ? error.code : undefined;
}

const messages: Readonly<Record<string, string>> = {
  "auth/email-already-in-use": "An account already uses this email. Sign in or reset the password.",
  "auth/invalid-credential": "The email or password is not valid.",
  "auth/invalid-email": "Enter a valid email address.",
  "auth/network-request-failed": "The network request failed. Check the connection and try again.",
  "auth/popup-blocked": "The Google sign-in window was blocked. Allow pop-ups and try again.",
  "auth/popup-closed-by-user": "Google sign-in was closed before it completed.",
  "auth/too-many-requests": "Too many attempts were made. Wait before trying again.",
  "auth/weak-password": "Use a stronger password with at least eight characters.",
};

export function mapFirebaseAuthError(error: unknown): string {
  const code = providerCode(error);
  return (code ? messages[code] : undefined) ?? "Authentication could not be completed. Try again.";
}
