"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { privateApiMutation, PrivateApiClientError } from "@/client/private-api";
import { Icon } from "@/components/ui/icon";
import { EQUIPMENT_PROFILES, type EquipmentProfileKind } from "@/domain/equipment";
import { previewOwnedEquipmentChange } from "@/domain/programs/owned-equipment-preview";
import type {
  ActiveProgramReadModel,
  EquipmentChangeResult,
} from "@/server/repositories/profile-program";

function operationKey(): string {
  return globalThis.crypto.randomUUID();
}

function failedMessage(error: unknown): string {
  if (error instanceof PrivateApiClientError) {
    return error.code === "conflict"
      ? "The program changed after this preview. Reload the current revision before confirming."
      : error.message;
  }
  return "The equipment change was not saved. Try again.";
}

function oppositeProfile(profile: EquipmentProfileKind): EquipmentProfileKind {
  return profile === "dumbbells" ? "barbell" : "dumbbells";
}

export function MemberProgramHome({
  canMutate,
  initialProgram,
}: Readonly<{
  canMutate: boolean;
  initialProgram: ActiveProgramReadModel;
}>) {
  const router = useRouter();
  const [program, setProgram] = useState(initialProgram);
  const [targetProfile, setTargetProfile] = useState<EquipmentProfileKind>(() =>
    oppositeProfile(initialProgram.equipmentProfileKind),
  );
  const [reviewOpen, setReviewOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const confirmationKey = useRef<string | undefined>(undefined);
  const preview = useMemo(
    () => previewOwnedEquipmentChange(program, EQUIPMENT_PROFILES[targetProfile]),
    [program, targetProfile],
  );

  function chooseTarget(nextProfile: EquipmentProfileKind) {
    confirmationKey.current = undefined;
    setMessage("");
    setReviewOpen(nextProfile !== program.equipmentProfileKind);
    setTargetProfile(nextProfile);
  }

  async function confirmChange() {
    if (!canMutate || busy || !preview.canConfirm) return;
    const idempotencyKey = confirmationKey.current ?? operationKey();
    confirmationKey.current = idempotencyKey;
    setBusy(true);
    setMessage("Saving a new program revision…");
    try {
      const response = await privateApiMutation<{ profileProgram: EquipmentChangeResult }>(
        "/api/app/profile-program/equipment",
        {
          body: {
            baseRevisionId: program.revisionId,
            equipmentProfileKind: targetProfile,
            idempotencyKey,
            programId: program.id,
          },
          method: "POST",
        },
      );
      const nextProgram = response.profileProgram.activeProgram;
      if (!nextProgram) throw new Error("The saved program is unavailable.");
      confirmationKey.current = undefined;
      setProgram(nextProgram);
      setTargetProfile(oppositeProfile(nextProgram.equipmentProfileKind));
      setReviewOpen(false);
      setMessage(
        response.profileProgram.changes.length === 0
          ? "That equipment profile was already active."
          : `Saved revision ${nextProgram.revisionNumber}. Existing workout history was not changed.`,
      );
      router.refresh();
    } catch (error) {
      setMessage(failedMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="member-program" aria-labelledby="member-program-title">
      <header className="member-program-hero contour-surface">
        <div>
          <span className="eyebrow">Active published program</span>
          <h1 id="member-program-title">{program.name}</h1>
          <p>
            Revision {program.revisionNumber} · {EQUIPMENT_PROFILES[program.equipmentProfileKind].label} · five days
          </p>
        </div>
        <div className="member-program-actions">
          <Link className="secondary-action" href="/app/programs">
            <Icon name="map" /> Manage programs
          </Link>
          <Link className="secondary-action" href="/app/program/edit">
            <Icon name="settings" /> Edit program
          </Link>
          <Link className="secondary-action" href="/app/library/custom">
            <Icon name="library" /> Private exercises
          </Link>
        </div>
      </header>

      <section className="member-week" aria-labelledby="member-week-title">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Current route</span>
            <h2 id="member-week-title">Choose a training day</h2>
          </div>
          <span>{program.days.length} days</span>
        </div>
        <ol className="member-day-grid">
          {program.days.map((day) => (
            <li key={day.id}>
              <Link href={`/app/program/${day.dayKey}`} prefetch={false}>
                <span>{String(day.dayNumber).padStart(2, "0")}</span>
                <strong>{day.displayName}</strong>
                <small>{day.prescriptions.length} movements · walker or runner</small>
                <Icon name="chevron-right" />
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <section className="member-equipment" id="equipment-profile" aria-labelledby="member-equipment-title">
        <header>
          <span className="eyebrow">Program settings</span>
          <h2 id="member-equipment-title">Equipment profile</h2>
          <p>
            Preview the exact active-program changes. Confirmation creates a new revision; completed and in-progress workout snapshots keep their original meaning.
          </p>
        </header>
        <div aria-label="Equipment profile" className="member-equipment-options" role="group">
          {(Object.keys(EQUIPMENT_PROFILES) as EquipmentProfileKind[]).map((profile) => (
            <button
              aria-pressed={profile === (reviewOpen ? targetProfile : program.equipmentProfileKind)}
              disabled={busy}
              key={profile}
              onClick={() => chooseTarget(profile)}
              type="button"
            >
              <Icon name="dumbbell" />
              <span>
                <strong>{EQUIPMENT_PROFILES[profile].label}</strong>
                <small>{profile === program.equipmentProfileKind ? "Current" : "Review change"}</small>
              </span>
            </button>
          ))}
        </div>

        {reviewOpen ? (
          <section aria-labelledby="equipment-review-title" className="equipment-review">
            <h3 id="equipment-review-title">
              Review {EQUIPMENT_PROFILES[targetProfile].label}
            </h3>
            <p>{EQUIPMENT_PROFILES[targetProfile].description}</p>
            {preview.changes.length === 0 ? (
              <p>No canonical movement substitutions are required.</p>
            ) : (
              <ol className="equipment-change-list">
                {preview.changes.map((change) => (
                  <li key={change.prescriptionId}>
                    <span>{change.dayDisplayName}</span>
                    <strong>{change.fromName} → {change.toName}</strong>
                    <small>Sets, range, rest, position, and notes stay. Movement-specific targets clear.</small>
                  </li>
                ))}
              </ol>
            )}
            {preview.blockers.length > 0 ? (
              <div className="equipment-blockers" role="alert">
                <strong>Resolve incompatible custom movements first.</strong>
                <ul>
                  {preview.blockers.map((blocker) => (
                    <li key={blocker.prescriptionId}>
                      {blocker.dayDisplayName}: {blocker.exerciseName} requires {blocker.requiredEquipment.join(", ")}.
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {!canMutate ? (
              <p className="member-inline-notice">Verify your email and sign in again before saving this permanent change.</p>
            ) : null}
            <div className="equipment-review-actions">
              <button
                className="primary-action"
                disabled={!canMutate || !preview.canConfirm || busy}
                onClick={() => void confirmChange()}
                type="button"
              >
                {busy ? "Saving…" : `Confirm ${EQUIPMENT_PROFILES[targetProfile].label}`}
                <Icon name="arrow-right" />
              </button>
              <button disabled={busy} onClick={() => setReviewOpen(false)} type="button">Cancel</button>
            </div>
          </section>
        ) : null}
        <p aria-live="polite" className="member-save-status" role="status">{message}</p>
      </section>
    </section>
  );
}
