"use client";

import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { mapFirebaseAuthError } from "@/client/auth-errors";
import { getFirebaseClientAuth, type FirebasePublicConfig } from "@/client/firebase";
import { Icon } from "@/components/ui/icon";

type Mode = "register" | "reset" | "sign-in";

async function createServerSession(user: User): Promise<void> {
  const csrfResponse = await fetch("/api/auth/csrf", { cache: "no-store", credentials: "same-origin" });
  const csrfPayload = (await csrfResponse.json()) as { token?: unknown };
  if (!csrfResponse.ok || typeof csrfPayload.token !== "string") {
    throw new Error("CSRF bootstrap failed");
  }

  const idToken = await user.getIdToken(true);
  const sessionResponse = await fetch("/api/auth/session", {
    body: JSON.stringify({ idToken }),
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfPayload.token },
    method: "POST",
  });
  if (!sessionResponse.ok) {
    const body = (await sessionResponse.json().catch(() => null)) as { message?: unknown } | null;
    throw new Error(typeof body?.message === "string" ? body.message : "Session creation failed");
  }
}

export function AuthPanel({
  config,
  returnTo,
}: Readonly<{ config: FirebasePublicConfig; returnTo: string }>) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const auth = getFirebaseClientAuth(config);

  async function finishSignIn(user: User) {
    await createServerSession(user);
    setMessage(
      user.emailVerified
        ? "Signed in securely. Opening your route."
        : "Signed in. Verify your email before saving permanent changes.",
    );
    router.replace(returnTo);
    router.refresh();
  }

  async function handleGoogle() {
    setBusy(true);
    setMessage("");
    try {
      const credential = await signInWithPopup(auth, new GoogleAuthProvider());
      await finishSignIn(credential.user);
    } catch (error) {
      setMessage(error instanceof Error && !('code' in error) ? error.message : mapFirebaseAuthError(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleEmail(formData: FormData) {
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    setBusy(true);
    setMessage("");
    try {
      if (mode === "reset") {
        await sendPasswordResetEmail(auth, email);
        setMessage("If this email has an account, Firebase will send recovery instructions.");
        return;
      }
      if (mode === "register") {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(credential.user);
        await signOut(auth);
        setMessage("Account created. Verify the email before signing in to save permanent changes.");
        setMode("sign-in");
        return;
      }
      const credential = await signInWithEmailAndPassword(auth, email, password);
      await finishSignIn(credential.user);
    } catch (error) {
      setMessage(error instanceof Error && !('code' in error) ? error.message : mapFirebaseAuthError(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="status-stamp">Firebase session</div>
      <h2 id="auth-heading">
        {mode === "register" ? "Create account" : mode === "reset" ? "Recover access" : "Sign in"}
      </h2>
      <div className="auth-tabs" role="group" aria-label="Authentication task">
        <button aria-pressed={mode === "sign-in"} onClick={() => setMode("sign-in")} type="button">Sign in</button>
        <button aria-pressed={mode === "register"} onClick={() => setMode("register")} type="button">Register</button>
        <button aria-pressed={mode === "reset"} onClick={() => setMode("reset")} type="button">Recovery</button>
      </div>
      {mode === "sign-in" ? (
        <button className="auth-method" disabled={busy} onClick={() => void handleGoogle()} type="button">
          <Icon name="sign-in" /> Continue with Google
        </button>
      ) : null}
      <form action={(formData) => void handleEmail(formData)} className="auth-form">
        <label htmlFor="auth-email">Email</label>
        <input autoComplete="email" id="auth-email" name="email" required type="email" />
        {mode === "reset" ? null : (
          <>
            <label htmlFor="auth-password">Password</label>
            <input
              autoComplete={mode === "register" ? "new-password" : "current-password"}
              id="auth-password"
              minLength={8}
              name="password"
              required
              type="password"
            />
          </>
        )}
        <button className="primary-action" disabled={busy} type="submit">
          <span>{busy ? "Working…" : mode === "register" ? "Create account" : mode === "reset" ? "Send recovery" : "Sign in with email"}</span>
          <Icon name="arrow-right" />
        </button>
      </form>
      <p aria-live="polite" className="auth-message" role="status">{message}</p>
      <small>Password accounts must verify email before permanent mutations. The server accepts identity only through a verified HTTP-only Firebase session cookie.</small>
    </>
  );
}
