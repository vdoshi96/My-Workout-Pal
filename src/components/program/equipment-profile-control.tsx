"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { privateApiMutation, PrivateApiClientError } from "@/client/private-api";
import { parseEquipmentChangeResponse } from "@/components/program/program-mutation-response";
import { reconcileProgramRevisionMutation } from "@/components/program/program-revision-reconciliation";
import { EquipmentIllustration } from "@/components/ui/equipment-illustration";
import { Icon } from "@/components/ui/icon";
import { EQUIPMENT_PROFILES, type EquipmentProfileKind } from "@/domain/equipment";
import { previewOwnedEquipmentChange } from "@/domain/programs/owned-equipment-preview";
import type {
  ActiveProgramReadModel,
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
  return "The server response could not be reconciled. Reload before retrying this equipment change.";
}

function oppositeProfile(profile: EquipmentProfileKind): EquipmentProfileKind {
  return profile === "dumbbells" ? "barbell" : "dumbbells";
}

export function EquipmentProfileControl({
  canMutate,
  disabled = false,
  draftDirty = false,
  onBusyChange,
  onReviewChange,
  onSaved,
  placement = "settings",
  program,
}: Readonly<{
  canMutate: boolean;
  disabled?: boolean;
  draftDirty?: boolean;
  onBusyChange?: (busy: boolean) => void;
  onReviewChange?: (open: boolean) => void;
  onSaved: (nextProgram: ActiveProgramReadModel) => void;
  placement?: "editor" | "settings";
  program: ActiveProgramReadModel;
}>) {
  const router = useRouter();
  const [targetProfile, setTargetProfile] = useState<EquipmentProfileKind>(() =>
    oppositeProfile(program.equipmentProfileKind),
  );
  const [reviewOpen, setReviewOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const confirmationKey = useRef<string | undefined>(undefined);
  const profileButtons = useRef<Partial<Record<EquipmentProfileKind, HTMLButtonElement | null>>>({});
  const reviewHeading = useRef<HTMLHeadingElement>(null);
  const preview = useMemo(
    () => previewOwnedEquipmentChange(program, EQUIPMENT_PROFILES[targetProfile]),
    [program, targetProfile],
  );
  const controlsDisabled = disabled || busy;
  const headingId = placement === "editor"
    ? "program-editor-equipment-title"
    : "member-equipment-title";
  const reviewId = `${headingId}-review`;

  useEffect(() => {
    if (!reviewOpen) return;
    globalThis.requestAnimationFrame(() => reviewHeading.current?.focus());
  }, [reviewOpen, targetProfile]);

  function updateReviewOpen(open: boolean) {
    setReviewOpen(open);
    onReviewChange?.(open);
  }

  function chooseTarget(nextProfile: EquipmentProfileKind) {
    confirmationKey.current = undefined;
    setMessage("");
    updateReviewOpen(nextProfile !== program.equipmentProfileKind);
    setTargetProfile(nextProfile);
  }

  function cancelReview() {
    updateReviewOpen(false);
    setMessage(draftDirty ? "Equipment preview closed. Your unpublished editor changes are intact." : "");
    queueMicrotask(() => profileButtons.current[targetProfile]?.focus());
  }

  async function confirmChange() {
    if (!canMutate || controlsDisabled || draftDirty || !preview.canConfirm) return;
    const idempotencyKey = confirmationKey.current ?? operationKey();
    confirmationKey.current = idempotencyKey;
    setBusy(true);
    onBusyChange?.(true);
    setMessage("Saving a new program revision…");
    try {
      const raw = await privateApiMutation<unknown>(
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
      const response = parseEquipmentChangeResponse(raw, {
        changes: preview.changes,
        programId: program.id,
        targetProfileKind: targetProfile,
      });
      const reconciliation = reconcileProgramRevisionMutation(program, response);
      confirmationKey.current = undefined;
      if (reconciliation.kind === "stored-inactive") {
        updateReviewOpen(false);
        setMessage(
          `${reconciliation.affectedProgramName}'s earlier equipment revision is stored, but ${reconciliation.activeProgramName} remains active. Review your program collection before opening an overview.`,
        );
        return;
      }
      const nextProgram = reconciliation.program;
      onSaved(nextProgram);
      setTargetProfile(oppositeProfile(nextProgram.equipmentProfileKind));
      updateReviewOpen(false);
      setMessage(
        response.changeCount === 0
          ? `Saved revision ${nextProgram.revisionNumber}. No movement substitutions were required; existing workout history was not changed.`
          : `Saved revision ${nextProgram.revisionNumber}. Existing workout history was not changed.`,
      );
      router.refresh();
    } catch (error) {
      setMessage(failedMessage(error));
    } finally {
      setBusy(false);
      onBusyChange?.(false);
    }
  }

  return (
    <section
      aria-labelledby={headingId}
      className={`member-equipment${placement === "editor" ? " program-editor-equipment-control" : ""}`}
      id={placement === "settings" ? "equipment-profile" : undefined}
    >
      <header>
        <span className="eyebrow">{placement === "editor" ? "Editor settings" : "Program settings"}</span>
        <h2 id={headingId}>Equipment profile</h2>
        <p>
          Preview the movements that would change before confirming. Past and in-progress workouts stay as they were.
        </p>
      </header>
      <div aria-label="Equipment profile" className="member-equipment-options" role="group">
        {(Object.keys(EQUIPMENT_PROFILES) as EquipmentProfileKind[]).map((profile) => (
          <button
            aria-pressed={profile === (reviewOpen ? targetProfile : program.equipmentProfileKind)}
            aria-controls={profile !== program.equipmentProfileKind ? reviewId : undefined}
            aria-expanded={profile !== program.equipmentProfileKind
              ? reviewOpen && profile === targetProfile
              : undefined}
            disabled={controlsDisabled}
            key={profile}
            onClick={() => chooseTarget(profile)}
            ref={(node) => {
              profileButtons.current[profile] = node;
            }}
            type="button"
          >
            <EquipmentIllustration kind={profile === "barbell" ? "barbell" : "dumbbell"} />
            <span>
              <strong>{EQUIPMENT_PROFILES[profile].label}</strong>
              <small>{profile === program.equipmentProfileKind ? "Current" : "Review change"}</small>
            </span>
          </button>
        ))}
      </div>

      {reviewOpen ? (
        <section aria-labelledby={reviewId} className="equipment-review">
          <h3 id={reviewId} ref={reviewHeading} tabIndex={-1}>Review {EQUIPMENT_PROFILES[targetProfile].label}</h3>
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
          {draftDirty ? (
            <p className="member-inline-notice" role="status">
              This preview uses published revision {program.revisionNumber}. Your unpublished editor changes are not included. Publish or discard them before confirming an equipment revision.
            </p>
          ) : null}
          {!canMutate ? (
            <p className="member-inline-notice">Verify your email and sign in again before saving this permanent change.</p>
          ) : null}
          <div className="equipment-review-actions">
            <button
              className="primary-action"
              disabled={!canMutate || !preview.canConfirm || controlsDisabled || draftDirty}
              onClick={() => void confirmChange()}
              type="button"
            >
              {busy ? "Saving…" : `Confirm ${EQUIPMENT_PROFILES[targetProfile].label}`}
              <Icon name="arrow-right" />
            </button>
            <button disabled={controlsDisabled} onClick={cancelReview} type="button">Cancel</button>
          </div>
        </section>
      ) : null}
      <p aria-live="polite" className="member-save-status" role="status">{message}</p>
    </section>
  );
}
