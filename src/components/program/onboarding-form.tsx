"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { privateApiMutation, PrivateApiClientError } from "@/client/private-api";
import { parseOnboardingResponse } from "@/components/program/program-mutation-response";
import { Icon } from "@/components/ui/icon";
import { EQUIPMENT_PROFILES, type EquipmentProfileKind } from "@/domain/equipment";
import { getCatalogExercise } from "@/domain/exercises/catalog";
import { createStarterProgram } from "@/domain/programs/starter";
import { previewEquipmentChange } from "@/domain/programs/substitutions";

function operationKey(): string {
  return globalThis.crypto.randomUUID();
}

function failedMessage(error: unknown): string {
  return error instanceof PrivateApiClientError
    ? error.message
    : "Your starter program was not created. Try again.";
}

export function OnboardingForm({ canMutate }: Readonly<{ canMutate: boolean }>) {
  const router = useRouter();
  const [equipmentProfileKind, setEquipmentProfileKind] = useState<EquipmentProfileKind>("dumbbells");
  const [unitSystem, setUnitSystem] = useState<"metric" | "imperial">("imperial");
  const [timezone, setTimezone] = useState("UTC");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const saveKey = useRef<string | undefined>(undefined);

  const preview = useMemo(() => {
    const sourceKind = equipmentProfileKind === "dumbbells" ? "barbell" : "dumbbells";
    return previewEquipmentChange(
      createStarterProgram(EQUIPMENT_PROFILES[sourceKind]),
      EQUIPMENT_PROFILES[equipmentProfileKind],
    );
  }, [equipmentProfileKind]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canMutate || busy) return;
    const idempotencyKey = saveKey.current ?? operationKey();
    saveKey.current = idempotencyKey;
    setBusy(true);
    setMessage("Creating your private starter program…");
    try {
      const response = await privateApiMutation<unknown>(
        "/api/app/profile-program/onboard",
        {
          body: {
            equipmentProfileKind,
            idempotencyKey,
            reducedMotion,
            timezone,
            unitSystem,
          },
          method: "POST",
        },
      );
      parseOnboardingResponse(response, {
        equipmentProfileKind,
        reducedMotion,
        timezone,
        unitSystem,
      });
      saveKey.current = undefined;
      setMessage("Starter program created.");
      router.refresh();
    } catch (error) {
      setMessage(failedMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="member-onboarding" aria-labelledby="onboarding-title">
      <header className="member-onboarding-copy contour-surface">
        <span className="eyebrow">Private setup · step 1 of 1</span>
        <h1 id="onboarding-title">Start with the five-day example</h1>
        <p>
          Choose your equipment and presentation preferences. Saving creates a private,
          editable copy of this example in your account; it does not lock you into five days.
        </p>
      </header>

      {!canMutate ? (
        <aside className="member-inline-notice" role="status">
          Verify your email and sign in again before creating permanent fitness data. Public previews remain available.
        </aside>
      ) : null}

      <form className="onboarding-form" onSubmit={(event) => void submit(event)}>
        <fieldset disabled={!canMutate || busy}>
          <legend>Equipment profile</legend>
          <div className="onboarding-profile-grid">
            {(Object.keys(EQUIPMENT_PROFILES) as EquipmentProfileKind[]).map((profile) => (
              <label key={profile}>
                <input
                  checked={equipmentProfileKind === profile}
                  name="equipment-profile"
                  onChange={() => {
                    saveKey.current = undefined;
                    setEquipmentProfileKind(profile);
                    setMessage("");
                  }}
                  type="radio"
                />
                <span>
                  <Icon name="dumbbell" />
                  <strong>{EQUIPMENT_PROFILES[profile].label}</strong>
                  <small>{EQUIPMENT_PROFILES[profile].description}</small>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <section className="onboarding-preview" aria-labelledby="onboarding-preview-title">
          <h2 id="onboarding-preview-title">What changes in this profile</h2>
          <p>{preview.changes.length} day-specific substitutions compared with the other starter profile. Push and Legs keep their dumbbell movements.</p>
          <ul>
            {preview.changes.map((change) => (
              <li key={`${change.day}:${change.order}`}>
                <span>{change.day}</span>
                <strong>{getCatalogExercise(change.fromSlug).name} → {getCatalogExercise(change.toSlug).name}</strong>
              </li>
            ))}
          </ul>
        </section>

        <div className="onboarding-preferences">
          <label htmlFor="onboarding-units">Display units</label>
          <select
            disabled={!canMutate || busy}
            id="onboarding-units"
            onChange={(event) => setUnitSystem(event.target.value === "metric" ? "metric" : "imperial")}
            value={unitSystem}
          >
            <option value="imperial">Pounds and miles</option>
            <option value="metric">Kilograms and kilometers</option>
          </select>

          <label htmlFor="onboarding-timezone">Time zone</label>
          <input
            disabled={!canMutate || busy}
            id="onboarding-timezone"
            maxLength={64}
            onChange={(event) => {
              setTimezone(event.target.value);
            }}
            required
            spellCheck={false}
            value={timezone}
          />
          <small>Use an IANA time zone such as America/Chicago so workout dates remain stable.</small>

          <label className="onboarding-check">
            <input
              checked={reducedMotion}
              disabled={!canMutate || busy}
              onChange={(event) => setReducedMotion(event.target.checked)}
              type="checkbox"
            />
            <span><strong>Reduce interface motion</strong><small>Timers and save status still use clear text.</small></span>
          </label>
        </div>

        <div className="onboarding-submit">
          <button className="primary-action" disabled={!canMutate || busy} type="submit">
            {busy ? "Creating…" : "Save the five-day example"}<Icon name="arrow-right" />
          </button>
          <p aria-live="polite" role="status">{message}</p>
        </div>
      </form>
    </section>
  );
}
