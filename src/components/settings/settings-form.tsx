"use client";

import {
  EmailAuthProvider,
  GoogleAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  signOut,
} from "firebase/auth";
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
import { FirebaseClientIdentityStatus } from "@/components/settings/firebase-client-identity-status";
import { EquipmentProfileControl } from "@/components/program/equipment-profile-control";
import type { ActiveProgramReadModel } from "@/server/repositories/profile-program";
import { CompanionPreference } from "@/components/ui/companion-preference";
import { DecorativeCompanion } from "@/components/ui/decorative-companion";
import { Icon } from "@/components/ui/icon";
import { parsePreferencesMutationResponse } from "@/components/settings/preferences-response";
import { canShowSettingsCompanion } from "@/domain/companions/visibility";
import { type EquipmentProfileKind } from "@/domain/equipment";
import type {
  PreferencesReadModel,
} from "@/server/repositories/profile-program";
import type { ViewerProvider } from "@/server/auth/viewer";

import { timeZoneOptions } from "@/domain/time-zones";

function operationKey(): string {
  return globalThis.crypto.randomUUID();
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof PrivateApiClientError ? error.message : fallback;
}

export function SettingsForm({
  canMutate,
  activeProgram,
  firebaseConfig,
  initialFirebaseIdentityState = { status: "loading" },
  initialPreferences,
  ownerUid,
  viewerProvider,
}: Readonly<{
  canMutate: boolean;
  activeProgram?: ActiveProgramReadModel | null;
  equipmentProfileKind: EquipmentProfileKind | null;
  firebaseConfig: FirebasePublicConfig | null;
  initialFirebaseIdentityState?: FirebaseClientIdentityState;
  initialPreferences: PreferencesReadModel | null;
  ownerUid: string;
  viewerProvider: ViewerProvider;
}>) {
  const router = useRouter();
  const [equipmentProgram, setEquipmentProgram] = useState(activeProgram);
  const [preferences, setPreferences] = useState(initialPreferences);
  const [unitSystem, setUnitSystem] = useState(initialPreferences?.unitSystem ?? "imperial");
  const [timezone, setTimezone] = useState(initialPreferences?.timezone ?? "UTC");
  const [reducedMotion, setReducedMotion] = useState(initialPreferences?.reducedMotion ?? false);
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
    useState<FirebaseClientIdentityState>(initialFirebaseIdentityState);
  const deleteDialog = useRef<HTMLDialogElement>(null);
  const deleteHeading = useRef<HTMLHeadingElement>(null);
  const deleteKey = useRef<string | undefined>(undefined);
  const saveKey = useRef<string | undefined>(undefined);
  const providerSupported = viewerProvider === "google" || viewerProvider === "password";
  const shouldResolveFirebaseIdentity = canMutate && firebaseConfig !== null && providerSupported;
  const deletionAvailable = shouldResolveFirebaseIdentity && firebaseIdentityState.status === "ready";
  const hasUnsubmittedInput =
    unitSystem !== preferences?.unitSystem ||
    timezone !== preferences?.timezone ||
    reducedMotion !== preferences?.reducedMotion;
  const showSettingsCompanion = canShowSettingsCompanion({
    busy,
    deleteBusy,
    hasDeletionReview: deletionReviewOpen || deletionFinished,
    hasStatusMessage:
      message.trim().length > 0 || deleteMessage.trim().length > 0,
    hasUnsubmittedInput,
    identityReady: firebaseIdentityState.status === "ready",
    verified: canMutate,
  });

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
    if (!canMutate || busy || !preferences) return;
    const idempotencyKey = saveKey.current ?? operationKey();
    saveKey.current = idempotencyKey;
    setBusy(true);
    setMessage("Saving…");
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
      const shell = document.querySelector(".authenticated-shell-root");
      if (saved.reducedMotion) shell?.setAttribute("data-reduced-motion", "true");
      else shell?.removeAttribute("data-reduced-motion");
      setMessage("Saved.");
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
    if (error instanceof AccountDeletionClientError) return error.accountDeleted ? error.message : "Please sign in again, then retry.";
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
    setDeleteMessage("Confirming your sign-in…");

    try {
      await performAccountDeletion(
        {
          clearOwner: async (uid) => {
            setDeleteMessage("Finishing…");
            const storage = createIndexedDBRunnerStorage({ ownerUid: uid });
            if (!storage.clearOwner) throw new Error("Local owner cleanup is unavailable.");
            await storage.clearOwner(uid);
          },
          deleteAccount: async (input) => {
            setDeleteMessage("Deleting…");
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
                "Please sign in again, then retry.",
              );
            }
            if (currentUser.uid !== user.uid) {
              throw new AccountDeletionClientError(
                "identity_mismatch",
                "Please sign in again, then retry.",
              );
            }
            return (await reauthenticateWithPopup(currentUser, new GoogleAuthProvider())).user;
          },
          reauthenticatePassword: async (user, email, password) => {
            const currentUser = auth.currentUser;
            if (!currentUser) {
              throw new AccountDeletionClientError(
                "identity_unavailable",
                "Please sign in again, then retry.",
              );
            }
            if (currentUser.uid !== user.uid) {
              throw new AccountDeletionClientError(
                "identity_mismatch",
                "Please sign in again, then retry.",
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
            setDeleteMessage("Confirming your sign-in…");
            await privateApiMutation<{ authenticated: true }>("/api/auth/session", {
              body: { idToken },
              method: "POST",
            });
          },
          signOut: async () => {
            setDeleteMessage("Finishing…");
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
      <header className="member-settings-heading companion-heading contour-surface">
        <div>
          <h1 id="settings-title">Settings</h1>
          <p>Make the app comfortable for you.</p>
        </div>
        {showSettingsCompanion ? <DecorativeCompanion variant="settings" /> : null}
      </header>

      {!canMutate ? (
        <aside className="member-inline-notice" role="status">Verify your email and sign in again before saving permanent preference changes.</aside>
      ) : null}

      <form className="settings-form" onSubmit={(event) => void save(event)}>
        <section>
          <h2 id="units-title">Units and time zone</h2>
          <label htmlFor="settings-units">Display units</label>
          <select
            disabled={!canMutate || busy || !preferences}
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

          <label htmlFor="settings-timezone">Time zone</label>
          <select id="settings-timezone" disabled={!canMutate || busy || !preferences} value={timezone} onChange={(event) => { changed(); setTimezone(event.target.value); }}>
            {timeZoneOptions(timezone).map((zone) => <option key={zone} value={zone}>{zone}</option>)}
          </select>

          <label className="settings-check">
            <input
              checked={reducedMotion}
              disabled={!canMutate || busy || !preferences}
              onChange={(event) => {
                changed();
                setReducedMotion(event.target.checked);
              }}
              type="checkbox"
            />
            <span><strong>Reduce interface motion</strong><small>Turns off animations and smooth scrolling.</small></span>
          </label>
          <>{preferences ? <button className="primary-action" disabled={!canMutate || busy} type="submit">{busy ? "Saving…" : "Save preferences"}<Icon name="arrow-right" /></button> : <p>Set up your routine to choose units and time zone.</p>}</>
        </section>

      </form>

      <CompanionPreference />
      {equipmentProgram ? <EquipmentProfileControl canMutate={canMutate} disabled={busy || deleteBusy} program={equipmentProgram} onSaved={setEquipmentProgram} /> : null}
      <section className="settings-account" aria-labelledby="account-settings-title">
        <h2 id="account-settings-title">Account</h2>
        <div className="settings-delete-preview">
          <strong>Delete account</strong>
          <p>{"Permanently deletes your account, routines, workout history and records. This can't be undone."}</p>
          {!firebaseConfig || !providerSupported ? <small>Account deletion is unavailable right now.</small> : null}
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
          >Delete my account</button>
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
          <h2 id="account-delete-heading" ref={deleteHeading} tabIndex={-1}>Delete your account?</h2>
          <div id="account-delete-impact"><p>{"You'll confirm your sign-in, then everything is deleted."}</p></div>

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
                >{deleteBusy ? "Deleting…" : "Delete everything"}</button>
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
