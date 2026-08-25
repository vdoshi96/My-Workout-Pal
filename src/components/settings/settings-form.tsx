"use client";

import { signOut } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

import type { FirebasePublicConfig } from "@/client/firebase";
import { getFirebaseClientAuth } from "@/client/firebase";
import { privateApiMutation, PrivateApiClientError } from "@/client/private-api";
import { createIndexedDBRunnerStorage } from "@/client/runner-storage";
import { Icon } from "@/components/ui/icon";
import { EQUIPMENT_PROFILES, type EquipmentProfileKind } from "@/domain/equipment";
import type {
  PreferencesReadModel,
  ProfileProgramReadModel,
} from "@/server/repositories/profile-program";

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
}: Readonly<{
  canMutate: boolean;
  equipmentProfileKind: EquipmentProfileKind;
  firebaseConfig: FirebasePublicConfig | null;
  initialPreferences: PreferencesReadModel;
  ownerUid: string;
}>) {
  const router = useRouter();
  const [preferences, setPreferences] = useState(initialPreferences);
  const [unitSystem, setUnitSystem] = useState(initialPreferences.unitSystem);
  const [timezone, setTimezone] = useState(initialPreferences.timezone);
  const [reducedMotion, setReducedMotion] = useState(initialPreferences.reducedMotion);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const saveKey = useRef<string | undefined>(undefined);

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
      const response = await privateApiMutation<{ profileProgram: ProfileProgramReadModel }>(
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
      saveKey.current = undefined;
      setPreferences(response.profileProgram.preferences);
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
    if (busy) return;
    setBusy(true);
    setMessage("Clearing this account’s local workout drafts…");
    try {
      await createIndexedDBRunnerStorage({ ownerUid }).clearOwner?.(ownerUid);
      await privateApiMutation<{ authenticated: false }>("/api/auth/session", {
        body: {},
        method: "DELETE",
      });
      if (firebaseConfig) await signOut(getFirebaseClientAuth(firebaseConfig));
      router.replace("/sign-in");
      router.refresh();
    } catch (error) {
      setMessage(errorMessage(error, "Sign out did not finish safely. Try again."));
      setBusy(false);
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
        <button disabled={busy} onClick={() => void signOutAccount()} type="button"><Icon name="sign-in" /> Sign out</button>
        <div className="settings-delete-preview">
          <strong>Delete account and fitness data</strong>
          <p>Deletion will require recent provider reauthentication and an explicit irreversible confirmation. It remains closed until the deletion saga and configured Firebase project pass their failure-path tests.</p>
          <button disabled type="button">Deletion connection pending</button>
        </div>
      </section>
      <p aria-live="polite" className="member-save-status" role="status">{message}</p>
    </section>
  );
}
