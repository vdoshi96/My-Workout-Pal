"use client";

import { signOut } from "firebase/auth";
import { useState } from "react";

import { createIndexedDBRunnerStorage } from "@/client/runner-storage";
import {
  performSessionSignOut,
} from "@/client/session-sign-out";
import type { FirebasePublicConfig } from "@/client/firebase";
import { getFirebaseClientAuth } from "@/client/firebase";
import { privateApiMutation } from "@/client/private-api";
import { Icon } from "@/components/ui/icon";

export function AuthenticatedSessionSignOut({
  firebaseConfig,
  ownerUid,
}: Readonly<{
  firebaseConfig: FirebasePublicConfig | null;
  ownerUid: string;
}>) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function beginSignOut() {
    if (busy) return;
    setBusy(true);
    setMessage("Signing out…");
    try {
      const storage = createIndexedDBRunnerStorage({ ownerUid });
      await performSessionSignOut(
        {
          clearOwner: async (uid) => {
            if (!storage.clearOwner) {
              throw new Error("Local account cleanup is unavailable.");
            }
            await storage.clearOwner(uid);
          },
          deleteServerSession: () => privateApiMutation<unknown>(
            "/api/auth/session",
            { body: {}, method: "DELETE" },
          ),
          signOutFirebase: async () => {
            if (firebaseConfig) {
              await signOut(getFirebaseClientAuth(firebaseConfig));
            }
          },
        },
        ownerUid,
      );
      window.location.replace("/sign-in");
    } catch (error) {
      setMessage(error instanceof Error && error.message === "Sign-out cancelled." ? "" : "Couldn't sign out. Try again.");
      setBusy(false);
    }
  }

  return (
    <div className="member-session-signout">
      <button disabled={busy} onClick={() => void beginSignOut()} type="button">
        <Icon name="sign-out" /> {busy ? "Signing out…" : "Sign out"}
      </button>
      <p aria-live="polite" role="status">{message}</p>
    </div>
  );
}
