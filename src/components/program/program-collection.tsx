"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type FormEvent,
  type MouseEvent,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  privateApiMutation,
  PrivateApiClientError,
} from "@/client/private-api";
import {
  parseProgramCollectionResponse,
  programCollectionSuccess,
  retryableOperationKey,
  suggestedCloneName,
  validatedProgramName,
  type ProgramCollectionMutationExpectation,
} from "@/components/program/program-collection-model";
import { BackLink } from "@/components/navigation/back-link";
import { EquipmentIllustration } from "@/components/ui/equipment-illustration";
import { Icon } from "@/components/ui/icon";
import { SceneStage } from "@/components/ui/scene-stage";
import { withFrom, type BackTarget } from "@/domain/navigation/back-target";
import {
  EQUIPMENT_PROFILES,
  supportsEquipment,
  type EquipmentId,
  type EquipmentProfileKind,
} from "@/domain/equipment";
import type { ProgramSummaryReadModel } from "@/server/repositories/profile-program";

function operationKey(): string {
  return globalThis.crypto.randomUUID();
}

function failureMessage(error: unknown): string {
  if (error instanceof PrivateApiClientError) {
    if (error.code === "conflict") {
      return "Your routines changed somewhere else. Your entries are still here. Reload the page, then try again.";
    }
    if (error.code === "email_unverified") {
      return "Verify your email to save changes.";
    }
  }
  if (error instanceof Error && ["Enter a routine name.", "Use 80 characters or fewer for the routine name."].includes(error.message)) return error.message;
  return "Your routine wasn't saved. Check your connection and try again.";
}

function updatedLabel(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(value));
}

export function ProgramCollection({
  back = { href: "/app", label: "Back to Today" },
  canMutate,
  initialCatalogMovements = [],
  initialPrograms,
}: Readonly<{
  back?: BackTarget;
  canMutate: boolean;
  initialCatalogMovements?: readonly Readonly<{
    id: string;
    name: string;
    requiredEquipment: readonly EquipmentId[];
  }>[];
  initialPrograms: readonly ProgramSummaryReadModel[];
}>) {
  const router = useRouter();
  const [programs, setPrograms] = useState(initialPrograms);
  const [createName, setCreateName] = useState("My strength plan");
  const [createMode, setCreateMode] = useState<"starter" | "custom">("starter");
  const [createProfile, setCreateProfile] =
    useState<EquipmentProfileKind>("dumbbells");
  const [customDayName, setCustomDayName] = useState("My training day");
  const [customSectionName, setCustomSectionName] = useState("Main work");
  const [firstCatalogExerciseId, setFirstCatalogExerciseId] = useState(
    initialCatalogMovements.find((movement) =>
      supportsEquipment(EQUIPMENT_PROFILES.dumbbells, movement.requiredEquipment),
    )?.id ?? "",
  );
  const [cloneSource, setCloneSource] =
    useState<ProgramSummaryReadModel | null>(null);
  const [cloneName, setCloneName] = useState("");
  const [busyOperation, setBusyOperation] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [failure, setFailure] = useState("");
  const [cloneFailure, setCloneFailure] = useState("");
  const createKey = useRef<string | undefined>(undefined);
  const cloneKey = useRef<string | undefined>(undefined);
  const activationKeys = useRef(new Map<string, string>());
  const cloneDialog = useRef<HTMLDialogElement>(null);
  const cloneInput = useRef<HTMLInputElement>(null);
  const cloneInvoker = useRef<HTMLButtonElement | null>(null);
  const activeProgram = useMemo(
    () => programs.find((program) => program.isActive),
    [programs],
  );
  const compatibleCatalogMovements = useMemo(
    () =>
      initialCatalogMovements.filter((movement) =>
        supportsEquipment(
          EQUIPMENT_PROFILES[createProfile],
          movement.requiredEquipment,
        ),
      ),
    [createProfile, initialCatalogMovements],
  );

  function chooseProfile(profile: EquipmentProfileKind) {
    createKey.current = undefined;
    setCreateProfile(profile);
    const compatible = initialCatalogMovements.filter((movement) =>
      supportsEquipment(EQUIPMENT_PROFILES[profile], movement.requiredEquipment),
    );
    if (!compatible.some(({ id }) => id === firstCatalogExerciseId)) {
      setFirstCatalogExerciseId(compatible[0]?.id ?? "");
    }
  }

  function begin(operation: string, pendingMessage: string): boolean {
    if (!canMutate || busyOperation) return false;
    setBusyOperation(operation);
    setFailure("");
    setCloneFailure("");
    setMessage(pendingMessage);
    return true;
  }

  function acceptResponse(value: unknown, expected: ProgramCollectionMutationExpectation) {
    const parsed = parseProgramCollectionResponse(value, expected);
    const success = programCollectionSuccess(parsed);
    setPrograms(parsed.programs);
    setFailure("");
    setMessage(expected.kind === "clone" ? "Copy created. It's now your active routine." : success.message);
    if (success.openActiveOverview && expected.kind !== "clone") router.push("/app");
  }

  async function createProgram(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    let name: string;
    try {
      name = validatedProgramName(createName);
      if (createMode === "custom") {
        if (customDayName.trim().length === 0) {
          throw new Error("Enter the first day name.");
        }
        if (customSectionName.trim().length === 0) {
          throw new Error("Enter the first section name.");
        }
        if (
          !compatibleCatalogMovements.some(
            ({ id }) => id === firstCatalogExerciseId,
          )
        ) {
          throw new Error("Choose a compatible first movement.");
        }
      }
    } catch (error) {
      setFailure(failureMessage(error));
      setMessage("");
      return;
    }
    if (!begin("create", "Creating your routine…")) return;
    const idempotencyKey = retryableOperationKey(
      createKey.current,
      operationKey,
    );
    createKey.current = idempotencyKey;
    try {
      const response = await privateApiMutation<unknown>("/api/app/programs", {
        body:
          createMode === "starter"
            ? {
                equipmentProfileKind: createProfile,
                idempotencyKey,
                mode: "starter",
                name,
              }
            : {
                dayName: customDayName.trim(),
                equipmentProfileKind: createProfile,
                firstCatalogExerciseId,
                idempotencyKey,
                mode: "custom",
                name,
                sectionName: customSectionName.trim(),
              },
        method: "POST",
      });
      acceptResponse(response, {
        equipmentProfileKind: createProfile,
        kind: "create",
        name,
        priorProgramIds: programs.map((program) => program.id),
      });
      createKey.current = undefined;
    } catch (error) {
      setFailure(failureMessage(error));
      setMessage("");
    } finally {
      setBusyOperation(null);
    }
  }

  function openClone(
    source: ProgramSummaryReadModel,
    event: MouseEvent<HTMLButtonElement>,
  ) {
    cloneKey.current = undefined;
    cloneInvoker.current = event.currentTarget;
    setCloneSource(source);
    setCloneName(suggestedCloneName(source.name));
    setFailure("");
    setCloneFailure("");
    setMessage("");
    globalThis.requestAnimationFrame(() => {
      cloneDialog.current?.showModal();
      cloneInput.current?.focus();
      cloneInput.current?.select();
    });
  }

  async function cloneProgram(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!cloneSource) return;
    let name: string;
    try {
      name = validatedProgramName(cloneName);
    } catch (error) {
      setCloneFailure(failureMessage(error));
      setMessage("");
      cloneInput.current?.focus();
      return;
    }
    if (!begin("clone", `Duplicating ${cloneSource.name}…`))
      return;
    const idempotencyKey = retryableOperationKey(
      cloneKey.current,
      operationKey,
    );
    cloneKey.current = idempotencyKey;
    try {
      const response = await privateApiMutation<unknown>("/api/app/programs", {
        body: {
          idempotencyKey,
          mode: "clone",
          name,
          sourceProgramId: cloneSource.id,
          sourceRevisionId: cloneSource.revisionId,
        },
        method: "POST",
      });
      acceptResponse(response, {
        kind: "clone",
        name,
        priorProgramIds: programs.map((program) => program.id),
        sourceEquipmentProfileKind: cloneSource.equipmentProfileKind,
        sourceProgramId: cloneSource.id,
      });
      cloneKey.current = undefined;
      cloneDialog.current?.close();
    } catch (error) {
      setCloneFailure(failureMessage(error));
      setMessage("");
    } finally {
      setBusyOperation(null);
    }
  }

  async function activateProgram(program: ProgramSummaryReadModel) {
    if (!activeProgram || program.isActive) return;
    if (!begin(`activate:${program.id}`, `Switching to ${program.name}…`)) return;
    const existingKey = activationKeys.current.get(program.id);
    const idempotencyKey = retryableOperationKey(existingKey, operationKey);
    activationKeys.current.set(program.id, idempotencyKey);
    try {
      const response = await privateApiMutation<unknown>(
        "/api/app/programs/activate",
        {
          body: {
            expectedActiveProgramId: activeProgram.id,
            idempotencyKey,
            programId: program.id,
            revisionId: program.revisionId,
          },
          method: "POST",
        },
      );
      acceptResponse(response, {
        kind: "activate",
        programId: program.id,
        revisionId: program.revisionId,
      });
      activationKeys.current.delete(program.id);
    } catch (error) {
      setFailure(failureMessage(error));
      setMessage("");
    } finally {
      setBusyOperation(null);
    }
  }

  const disabled = !canMutate || busyOperation !== null;

  return (
    <section
      className="pal-routines"
      aria-labelledby="program-collection-title"
    >
      <SceneStage scene="routine" />
      <header className="pal-page-head">
        <BackLink target={back} />
        <h1 id="program-collection-title">Your routines</h1>
        <p>Today follows your active routine. Switch whenever you like.</p>
      </header>

      {!canMutate ? (
        <p className="pal-notice">
          Your routines are read-only until you verify your email and sign in
          again.
        </p>
      ) : null}

      <div className="pal-page-body">
        <section aria-labelledby="owned-programs-title">
          <div className="pal-section-head">
            <h2 id="owned-programs-title">Saved routines</h2>
            <span>{programs.length} of 24</span>
          </div>
          <ol className="pal-routines-list">
            {programs.map((program) => {
              const activating = busyOperation === `activate:${program.id}`;
              return (
                <li
                  aria-current={program.isActive ? "true" : undefined}
                  key={program.id}
                >
                  <div className="pal-routines-row">
                    <span aria-hidden="true" className="pal-routines-mark">
                      <Icon name={program.isActive ? "check" : "map"} />
                    </span>
                    <div>
                      <h3>{program.name}</h3>
                      <p>
                        {program.isActive ? <><span className="pal-tag">Active</span>{" "}</> : null}
                        {EQUIPMENT_PROFILES[program.equipmentProfileKind].label}
                        {" · "}
                        {program.dayCount} day{program.dayCount === 1 ? "" : "s"}
                        {" · Updated "}
                        <time dateTime={program.updatedAt}>
                          {updatedLabel(program.updatedAt)}
                        </time>
                      </p>
                    </div>
                    <div className="pal-routines-actions">
                      {program.isActive ? (
                        <Link
                          className="secondary-action"
                          href={withFrom("/app/program/edit", "/app/programs")}
                        >
                          Edit routine
                        </Link>
                      ) : (
                        <button
                          className="primary-action"
                          disabled={disabled}
                          onClick={() => void activateProgram(program)}
                          type="button"
                        >
                          {activating ? "Switching…" : "Make active"}
                        </button>
                      )}
                      <button
                        className="pal-text-button"
                        disabled={disabled}
                        onClick={(event) => openClone(program, event)}
                        type="button"
                      >
                        Duplicate
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        <section
          className="pal-routines-new"
          aria-labelledby="create-program-title"
        >
          <h2 id="create-program-title">New routine</h2>
          <p>
            {"Each routine is yours to change. Switching routines doesn't change past workouts."}
          </p>
          <form onSubmit={(event) => void createProgram(event)}>
            <fieldset className="pal-routines-fieldset" disabled={disabled}>
              <legend>Starting point</legend>
              <div className="pal-choices">
                <label className="pal-choice">
                  <input
                    checked={createMode === "starter"}
                    name="create-program-mode"
                    onChange={() => {
                      createKey.current = undefined;
                      setCreateMode("starter");
                    }}
                    type="radio"
                    value="starter"
                  />
                  <span>
                    <strong>Five-day example</strong>
                    <small>Five ready-made days.</small>
                  </span>
                  <Icon name="check" />
                </label>
                <label className="pal-choice">
                  <input
                    checked={createMode === "custom"}
                    name="create-program-mode"
                    onChange={() => {
                      createKey.current = undefined;
                      setCreateMode("custom");
                    }}
                    type="radio"
                    value="custom"
                  />
                  <span>
                    <strong>Custom starting point</strong>
                    <small>Start with one day and build from there.</small>
                  </span>
                  <Icon name="check" />
                </label>
              </div>
            </fieldset>
            <div className="pal-routines-field">
              <label htmlFor="create-program-name">Routine name</label>
              <input
                autoComplete="off"
                disabled={disabled}
                id="create-program-name"
                maxLength={80}
                onChange={(event) => {
                  createKey.current = undefined;
                  setCreateName(event.currentTarget.value);
                }}
                required
                value={createName}
              />
            </div>
            <fieldset className="pal-routines-fieldset" disabled={disabled}>
              <legend>Equipment</legend>
              <div className="pal-choices pal-choices--art">
                {(Object.keys(EQUIPMENT_PROFILES) as EquipmentProfileKind[]).map(
                  (profile) => (
                    <label className="pal-choice" key={profile}>
                      <input
                        checked={createProfile === profile}
                        name="create-equipment-profile"
                        onChange={() => {
                          chooseProfile(profile);
                        }}
                        type="radio"
                        value={profile}
                      />
                      <EquipmentIllustration kind={profile === "barbell" ? "barbell" : "dumbbell"} />
                      <span>
                        <strong>{EQUIPMENT_PROFILES[profile].label}</strong>
                        <small>{EQUIPMENT_PROFILES[profile].description}</small>
                      </span>
                      <Icon name="check" />
                    </label>
                  ),
                )}
              </div>
            </fieldset>
            {createMode === "custom" ? (
              <div className="pal-routines-custom">
                <div className="pal-routines-field">
                  <label htmlFor="create-day-name">First day name</label>
                  <input
                    autoComplete="off"
                    disabled={disabled}
                    id="create-day-name"
                    maxLength={120}
                    onChange={(event) => {
                      createKey.current = undefined;
                      setCustomDayName(event.currentTarget.value);
                    }}
                    required
                    value={customDayName}
                  />
                </div>
                <div className="pal-routines-field">
                  <label htmlFor="create-section-name">First section name</label>
                  <input
                    autoComplete="off"
                    disabled={disabled}
                    id="create-section-name"
                    maxLength={120}
                    onChange={(event) => {
                      createKey.current = undefined;
                      setCustomSectionName(event.currentTarget.value);
                    }}
                    required
                    value={customSectionName}
                  />
                </div>
                <div className="pal-routines-field">
                  <label htmlFor="create-first-movement">First movement</label>
                  <select
                    disabled={disabled}
                    id="create-first-movement"
                    onChange={(event) => {
                      createKey.current = undefined;
                      setFirstCatalogExerciseId(event.currentTarget.value);
                    }}
                    required
                    value={firstCatalogExerciseId}
                  >
                    {compatibleCatalogMovements.map((movement) => (
                      <option key={movement.id} value={movement.id}>
                        {movement.name}
                      </option>
                    ))}
                  </select>
                </div>
                {compatibleCatalogMovements.length === 0 ? (
                  <p className="pal-field-error">
                    No Library movement fits this equipment yet. Pick the other equipment.
                  </p>
                ) : null}
              </div>
            ) : null}
            <div className="pal-actions">
              <button
                className="primary-action"
                disabled={
                  disabled ||
                  programs.length >= 24 ||
                  (createMode === "custom" && compatibleCatalogMovements.length === 0)
                }
                type="submit"
              >
                {busyOperation === "create"
                  ? "Creating…"
                  : "Create and use this routine"}
                <Icon name="arrow-right" />
              </button>
            </div>
            <p className="pal-routines-note">It replaces {programs.find((program) => program.isActive)?.name ?? "your active routine"} on Today.</p>
            {programs.length >= 24 ? (
              <p className="pal-field-error">
                {"You've reached 24 routines. Remove one before adding another."}
              </p>
            ) : null}
          </form>
        </section>

        <p aria-live="polite" className="pal-status" role="status">
          {message}
        </p>
        {failure ? (
          <p className="pal-routines-error" role="alert">
            {failure}
          </p>
        ) : null}
      </div>

      <dialog
        aria-labelledby="clone-program-title"
        className="pal-sheet pal-routine-sheet"
        onClose={() => {
          setCloneFailure("");
          setCloneSource(null);
          cloneInvoker.current?.focus();
        }}
        ref={cloneDialog}
      >
        {cloneSource ? (
          <form
            className="pal-routine-sheet-body"
            onSubmit={(event) => void cloneProgram(event)}
          >
            <header>
              <h2 id="clone-program-title">Duplicate {cloneSource.name}</h2>
              <button
                aria-label="Close clone review"
                disabled={busyOperation === "clone"}
                onClick={() => cloneDialog.current?.close()}
                type="button"
              >
                Close
              </button>
            </header>
            <p>
              The copy becomes your active routine. Past workouts stay the same.
            </p>
            <div className="pal-routines-field">
              <label htmlFor="clone-program-name">New routine name</label>
              <input
                aria-describedby={cloneFailure ? "clone-program-error" : undefined}
                aria-invalid={cloneFailure ? true : undefined}
                autoComplete="off"
                disabled={busyOperation === "clone"}
                id="clone-program-name"
                maxLength={80}
                onChange={(event) => {
                  cloneKey.current = undefined;
                  setCloneFailure("");
                  setCloneName(event.currentTarget.value);
                }}
                ref={cloneInput}
                required
                value={cloneName}
              />
              {cloneFailure ? (
                <p className="pal-field-error" id="clone-program-error" role="alert">
                  {cloneFailure}
                </p>
              ) : null}
            </div>
            <div className="pal-actions">
              <button
                className="primary-action"
                disabled={busyOperation === "clone"}
                type="submit"
              >
                {busyOperation === "clone" ? "Duplicating…" : "Duplicate"}
              </button>
              <button
                className="secondary-action"
                disabled={busyOperation === "clone"}
                onClick={() => cloneDialog.current?.close()}
                type="button"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}
      </dialog>
    </section>
  );
}
