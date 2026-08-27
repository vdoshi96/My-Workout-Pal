"use client";

import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function beginSignOut() {
    if (busy) return;
    setBusy(true);
    setMessage("Clearing this account’s local workout drafts…");
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
      router.replace("/sign-in");
      router.refresh();
    } catch {
      setMessage("Sign out did not finish safely. Try again.");
      setBusy(false);
    }
  }

  return (
    <div className="member-session-signout">
      <button disabled={busy} onClick={() => void beginSignOut()} type="button">
        <Icon name="sign-in" /> {busy ? "Signing out…" : "Sign out"}
      </button>
      <p aria-live="polite" role="status">{message}</p>
    </div>
  );
}
