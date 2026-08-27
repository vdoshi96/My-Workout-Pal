"use client";

import {
  EmailAuthProvider,
  GoogleAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  signOut,
} from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

import {
  AccountDeletionClientError,
  performAccountDeletion,
} from "@/client/account-deletion";
import { mapFirebaseAuthError } from "@/client/auth-errors";
import {
  classifyFirebaseClientIdentity,
  resolveFirebaseClientIdentity,
  type FirebaseClientIdentityState,
} from "@/client/firebase-client-auth-readiness";
import type { FirebasePublicConfig } from "@/client/firebase";
import { getFirebaseClientAuth } from "@/client/firebase";
import { privateApiMutation, PrivateApiClientError } from "@/client/private-api";
import { createIndexedDBRunnerStorage } from "@/client/runner-storage";
import { performSessionSignOut } from "@/client/session-sign-out";
import { FirebaseClientIdentityStatus } from "@/components/settings/firebase-client-identity-status";
import { Icon } from "@/components/ui/icon";
import { parsePreferencesMutationResponse } from "@/components/settings/preferences-response";
import { EQUIPMENT_PROFILES, type EquipmentProfileKind } from "@/domain/equipment";
import type {
  PreferencesReadModel,
} from "@/server/repositories/profile-program";
import type { ViewerProvider } from "@/server/auth/viewer";

function operationKey(): string {
  return globalThis.crypto.randomUUID();
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof PrivateApiClientError ? error.message : fallback;
}

export function SettingsForm({
  canMutate,
  equipmentProfileKind,
  firebaseConfig,
  initialPreferences,
  ownerUid,
  viewerProvider,
}: Readonly<{
  canMutate: boolean;
  equipmentProfileKind: EquipmentProfileKind;
  firebaseConfig: FirebasePublicConfig | null;
  initialPreferences: PreferencesReadModel;
  ownerUid: string;
  viewerProvider: ViewerProvider;
}>) {
  const router = useRouter();
  const [preferences, setPreferences] = useState(initialPreferences);
  const [unitSystem, setUnitSystem] = useState(initialPreferences.unitSystem);
  const [timezone, setTimezone] = useState(initialPreferences.timezone);
  const [reducedMotion, setReducedMotion] = useState(initialPreferences.reducedMotion);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteMessage, setDeleteMessage] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deletionReviewOpen, setDeletionReviewOpen] = useState(false);
  const [deletionFinished, setDeletionFinished] = useState(false);
  const [firebaseIdentityAttempt, setFirebaseIdentityAttempt] = useState(0);
  const [firebaseIdentityState, setFirebaseIdentityState] =
    useState<FirebaseClientIdentityState>({ status: "loading" });
  const deleteDialog = useRef<HTMLDialogElement>(null);
  const deleteHeading = useRef<HTMLHeadingElement>(null);
  const deleteKey = useRef<string | undefined>(undefined);
  const saveKey = useRef<string | undefined>(undefined);
  const providerSupported = viewerProvider === "google" || viewerProvider === "password";
  const shouldResolveFirebaseIdentity = canMutate && firebaseConfig !== null && providerSupported;
  const deletionAvailable = shouldResolveFirebaseIdentity && firebaseIdentityState.status === "ready";

  useEffect(() => {
    if (!shouldResolveFirebaseIdentity || !firebaseConfig) return;

    const auth = getFirebaseClientAuth(firebaseConfig);
    let active = true;
    let unsubscribe: (() => void) | undefined;

    void resolveFirebaseClientIdentity(
      {
        getCurrentUser: () => auth.currentUser,
        waitForInitialState: () => auth.authStateReady(),
      },
      ownerUid,
    ).then((state) => {
      if (!active) return;
      setFirebaseIdentityState(state);
      if (state.status === "unavailable") return;

      try {
        unsubscribe = onAuthStateChanged(
          auth,
          (currentUser) => {
            if (active) {
              setFirebaseIdentityState(
                classifyFirebaseClientIdentity(currentUser, ownerUid),
              );
            }
          },
          () => {
            if (active) setFirebaseIdentityState({ status: "unavailable" });
          },
        );
      } catch {
        setFirebaseIdentityState({ status: "unavailable" });
      }
    });

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [firebaseConfig, firebaseIdentityAttempt, ownerUid, shouldResolveFirebaseIdentity]);

  useEffect(() => {
    if (!deleteBusy) return;
    const protectNavigation = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", protectNavigation);
    return () => window.removeEventListener("beforeunload", protectNavigation);
  }, [deleteBusy]);

  function changed() {
    saveKey.current = undefined;
    setMessage("");
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canMutate || busy) return;
    const idempotencyKey = saveKey.current ?? operationKey();
    saveKey.current = idempotencyKey;
    setBusy(true);
    setMessage("Saving presentation preferences…");
    try {
      const raw = await privateApiMutation<unknown>(
        "/api/app/preferences",
        {
          body: {
            expectedUpdatedAt: preferences.updatedAt,
            idempotencyKey,
            reducedMotion,
            timezone,
            unitSystem,
          },
          method: "PATCH",
        },
      );
      const saved = parsePreferencesMutationResponse(raw, {
        reducedMotion,
        timezone,
        unitSystem,
      });
      saveKey.current = undefined;
      setPreferences(saved);
      setMessage("Preferences saved. Stored workout measurements remain in canonical kilograms and meters.");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof PrivateApiClientError && error.code === "conflict"
          ? "Preferences changed after this page loaded. Reload before saving."
          : errorMessage(error, "Preferences were not saved. Try again."),
      );
    } finally {
      setBusy(false);
    }
  }

  async function signOutAccount() {
    if (busy || deleteBusy) return;
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
            if (firebaseConfig) await signOut(getFirebaseClientAuth(firebaseConfig));
          },
        },
        ownerUid,
      );
      router.replace("/sign-in");
      router.refresh();
    } catch (error) {
      setMessage(errorMessage(error, "Sign out did not finish safely. Try again."));
      setBusy(false);
    }
  }

  function openDeletionReview() {
    if (!deletionAvailable || busy || deleteBusy) return;
    deleteKey.current = operationKey();
    setDeleteConfirmation("");
    setDeletePassword("");
    setDeleteMessage("");
    setDeletionFinished(false);
    setDeletionReviewOpen(true);
    deleteDialog.current?.showModal();
    globalThis.requestAnimationFrame(() => deleteHeading.current?.focus());
  }

  function deletionFailureMessage(error: unknown): string {
    if (error instanceof AccountDeletionClientError) return error.message;
    if (error instanceof PrivateApiClientError) return error.message;
    return mapFirebaseAuthError(error);
  }

  function retryFirebaseIdentity() {
    setFirebaseIdentityState({ status: "loading" });
    setFirebaseIdentityAttempt((attempt) => attempt + 1);
  }

  async function deleteAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!deletionAvailable || deleteBusy || deletionFinished || !firebaseConfig) return;
    const idempotencyKey = deleteKey.current ?? operationKey();
    deleteKey.current = idempotencyKey;
    const auth = getFirebaseClientAuth(firebaseConfig);
    setDeleteBusy(true);
    setDeleteMessage("Reauthenticating this Firebase account…");

    try {
      await performAccountDeletion(
        {
          clearOwner: async (uid) => {
            setDeleteMessage("Clearing this account’s local workout drafts…");
            const storage = createIndexedDBRunnerStorage({ ownerUid: uid });
            if (!storage.clearOwner) throw new Error("Local owner cleanup is unavailable.");
            await storage.clearOwner(uid);
          },
          deleteAccount: async (input) => {
            setDeleteMessage("Deleting fitness data and Firebase identity…");
            const response = await privateApiMutation<{
              deletion: { status: string };
            }>("/api/app/account", { body: input, method: "DELETE" });
            return response.deletion;
          },
          getCurrentUser: () => auth.currentUser,
          reauthenticateGoogle: async (user) => {
            const currentUser = auth.currentUser;
            if (!currentUser) {
              throw new AccountDeletionClientError(
                "identity_unavailable",
                "Your Firebase session is unavailable. Sign in again before deleting the account.",
              );
            }
            if (currentUser.uid !== user.uid) {
              throw new AccountDeletionClientError(
                "identity_mismatch",
                "The active Firebase identity changed before reauthentication.",
              );
            }
            return (await reauthenticateWithPopup(currentUser, new GoogleAuthProvider())).user;
          },
          reauthenticatePassword: async (user, email, password) => {
            const currentUser = auth.currentUser;
            if (!currentUser) {
              throw new AccountDeletionClientError(
                "identity_unavailable",
                "Your Firebase session is unavailable. Sign in again before deleting the account.",
              );
            }
            if (currentUser.uid !== user.uid) {
              throw new AccountDeletionClientError(
                "identity_mismatch",
                "The active Firebase identity changed before reauthentication.",
              );
            }
            return (
              await reauthenticateWithCredential(
                currentUser,
                EmailAuthProvider.credential(email, password),
              )
            ).user;
          },
          refreshServerSession: async (idToken) => {
            setDeleteMessage("Refreshing the secure server session…");
            await privateApiMutation<{ authenticated: true }>("/api/auth/session", {
              body: { idToken },
              method: "POST",
            });
          },
          signOut: async () => {
            setDeleteMessage("Finishing Firebase sign-out…");
            await signOut(auth);
          },
        },
        {
          confirmation: deleteConfirmation,
          idempotencyKey,
          ownerUid,
          password: deletePassword,
          provider: viewerProvider,
        },
      );
      deleteKey.current = undefined;
      setDeletionFinished(true);
      setDeleteMessage("Account and fitness data deleted. Returning to the public site…");
      router.replace("/?account=deleted");
      router.refresh();
    } catch (error) {
      const accountDeleted = error instanceof AccountDeletionClientError && error.accountDeleted;
      setDeletionFinished(accountDeleted);
      setDeleteMessage(deletionFailureMessage(error));
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <section className="member-settings" aria-labelledby="settings-title">
      <header className="member-settings-heading contour-surface">
        <span className="eyebrow">Private account preferences</span>
        <h1 id="settings-title">Settings</h1>
        <p>Units change entry and presentation only. Persisted loads and distances keep their canonical meaning.</p>
      </header>

      {!canMutate ? (
        <aside className="member-inline-notice" role="status">Verify your email and sign in again before saving permanent preference changes.</aside>
      ) : null}

      <form className="settings-form" onSubmit={(event) => void save(event)}>
        <section aria-labelledby="units-title">
          <span className="eyebrow">Presentation</span>
          <h2 id="units-title">Units and dates</h2>
          <label htmlFor="settings-units">Display units</label>
          <select
            disabled={!canMutate || busy}
            id="settings-units"
            onChange={(event) => {
              changed();
              setUnitSystem(event.target.value === "metric" ? "metric" : "imperial");
            }}
            value={unitSystem}
          >
            <option value="imperial">Pounds and miles</option>
            <option value="metric">Kilograms and kilometers</option>
          </select>

          <label htmlFor="settings-timezone">IANA time zone</label>
          <input
            disabled={!canMutate || busy}
            id="settings-timezone"
            maxLength={64}
            onChange={(event) => {
              changed();
              setTimezone(event.target.value);
            }}
            required
            spellCheck={false}
            value={timezone}
          />
          <small>Examples: America/Chicago, Europe/London, Asia/Kolkata.</small>

          <label className="settings-check">
            <input
              checked={reducedMotion}
              disabled={!canMutate || busy}
              onChange={(event) => {
                changed();
                setReducedMotion(event.target.checked);
              }}
              type="checkbox"
            />
            <span><strong>Reduce interface motion</strong><small>Status, timers, and errors remain available as text.</small></span>
          </label>
          <button className="primary-action" disabled={!canMutate || busy} type="submit">{busy ? "Working…" : "Save preferences"}<Icon name="arrow-right" /></button>
        </section>

        <section aria-labelledby="equipment-settings-title">
          <span className="eyebrow">Program-specific</span>
          <h2 id="equipment-settings-title">Equipment</h2>
          <p><strong>{EQUIPMENT_PROFILES[equipmentProfileKind].label}</strong> is active. Equipment confirmation belongs on the Program screen because it creates and explains a new immutable program revision.</p>
          <Link className="secondary-action" href="/app">Review equipment change <Icon name="arrow-right" /></Link>
        </section>
      </form>

      <section className="settings-account" aria-labelledby="account-settings-title">
        <span className="eyebrow">Account</span>
        <h2 id="account-settings-title">Session and data</h2>
        <p>Signing out clears only this Firebase account’s local workout draft namespace, then removes the secure server session.</p>
        <button disabled={busy || deleteBusy} onClick={() => void signOutAccount()} type="button"><Icon name="sign-in" /> Sign out</button>
        <div className="settings-delete-preview">
          <strong>Delete account and fitness data</strong>
          <p>This permanently removes the Firebase sign-in, program revisions, workout history, records, analytics, preferences, and custom exercises. It cannot be undone.</p>
          {!firebaseConfig ? <small>Deletion remains unavailable until Firebase is configured.</small> : null}
          {!providerSupported ? <small>This sign-in provider does not support deletion yet.</small> : null}
          {shouldResolveFirebaseIdentity ? (
            <FirebaseClientIdentityStatus
              onRetry={retryFirebaseIdentity}
              state={firebaseIdentityState}
            />
          ) : null}
          <button
            className="danger-action"
            disabled={!deletionAvailable || busy || deleteBusy}
            onClick={openDeletionReview}
            type="button"
          >Review permanent deletion</button>
        </div>
      </section>
      <p aria-live="polite" className="member-save-status" role="status">{message}</p>

      <dialog
        aria-describedby="account-delete-impact"
        aria-labelledby="account-delete-heading"
        className="account-delete-dialog"
        onCancel={(event) => {
          if (deleteBusy) event.preventDefault();
        }}
        onClose={() => setDeletionReviewOpen(false)}
        ref={deleteDialog}
      >
        <form className="account-delete-form" onSubmit={(event) => void deleteAccount(event)}>
          <span className="eyebrow">Permanent account action</span>
          <h2 id="account-delete-heading" ref={deleteHeading} tabIndex={-1}>Delete everything owned by this account?</h2>
          <div id="account-delete-impact">
            <p>The server deletes fitness data first, then the matching Firebase identity. If identity deletion is interrupted, the screen reports that partial state and offers a safe retry.</p>
            <ul>
              <li>Programs, custom exercises, workout snapshots, set and cardio logs</li>
              <li>History, personal records, analytics summaries, equipment and preferences</li>
              <li>The matching Firebase sign-in after a fresh {viewerProvider === "google" ? "Google popup" : "password"} check</li>
            </ul>
          </div>

          {deletionFinished ? null : (
            <>
              {viewerProvider === "password" ? (
                <>
                  <label htmlFor="account-delete-password">Current password</label>
                  <input
                    autoComplete="current-password"
                    disabled={deleteBusy}
                    id="account-delete-password"
                    onChange={(event) => setDeletePassword(event.target.value)}
                    required
                    type="password"
                    value={deletePassword}
                  />
                </>
              ) : null}
              <label htmlFor="account-delete-confirmation">Type DELETE to confirm</label>
              <input
                autoCapitalize="characters"
                autoComplete="off"
                disabled={deleteBusy}
                id="account-delete-confirmation"
                onChange={(event) => setDeleteConfirmation(event.target.value)}
                required
                spellCheck={false}
                value={deleteConfirmation}
              />
            </>
          )}

          <p aria-live="polite" className="account-delete-status" role="status">{deleteMessage}</p>
          {deletionReviewOpen &&
          shouldResolveFirebaseIdentity &&
          firebaseIdentityState.status !== "ready" ? (
            <FirebaseClientIdentityStatus
              onRetry={retryFirebaseIdentity}
              state={firebaseIdentityState}
            />
          ) : null}
          <div className="account-delete-actions">
            {deletionFinished ? (
              <button onClick={() => router.replace("/")} type="button">Return to public site</button>
            ) : (
              <>
                <button
                  className="danger-action"
                  disabled={
                    deleteBusy ||
                    !deletionAvailable ||
                    deleteConfirmation !== "DELETE" ||
                    (viewerProvider === "password" && deletePassword.length === 0)
                  }
                  type="submit"
                >{deleteBusy ? "Deletion in progress…" : "Reauthenticate and permanently delete"}</button>
                <button
                  disabled={deleteBusy}
                  onClick={() => deleteDialog.current?.close()}
                  type="button"
                >Cancel</button>
              </>
            )}
          </div>
        </form>
      </dialog>
    </section>
  );
}
