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
import { Icon } from "@/components/ui/icon";
import {
  EQUIPMENT_PROFILES,
  type EquipmentProfileKind,
} from "@/domain/equipment";
import type { ProgramSummaryReadModel } from "@/server/repositories/profile-program";

function operationKey(): string {
  return globalThis.crypto.randomUUID();
}

function failureMessage(error: unknown): string {
  if (error instanceof PrivateApiClientError) {
    if (error.code === "conflict") {
      return "The collection changed before this request finished. Your entries are still here; reload before retrying.";
    }
    if (error.code === "email_unverified") {
      return "Verify your email, sign in again, and then retry this permanent change.";
    }
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return "The program change was not confirmed. Check the connection and retry.";
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
  canMutate,
  initialPrograms,
}: Readonly<{
  canMutate: boolean;
  initialPrograms: readonly ProgramSummaryReadModel[];
}>) {
  const router = useRouter();
  const [programs, setPrograms] = useState(initialPrograms);
  const [createName, setCreateName] = useState("My strength plan");
  const [createProfile, setCreateProfile] =
    useState<EquipmentProfileKind>("dumbbells");
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
    setMessage(success.message);
    if (success.openActiveOverview) router.push("/app");
  }

  async function createProgram(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    let name: string;
    try {
      name = validatedProgramName(createName);
    } catch (error) {
      setFailure(failureMessage(error));
      setMessage("");
      return;
    }
    if (!begin("create", "Creating and activating the new program…")) return;
    const idempotencyKey = retryableOperationKey(
      createKey.current,
      operationKey,
    );
    createKey.current = idempotencyKey;
    try {
      const response = await privateApiMutation<unknown>("/api/app/programs", {
        body: {
          equipmentProfileKind: createProfile,
          idempotencyKey,
          mode: "starter",
          name,
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
    if (!begin("clone", `Cloning revision ${cloneSource.revisionNumber}…`))
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
    if (!begin(`activate:${program.id}`, `Activating ${program.name}…`)) return;
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

  return (
    <section
      className="program-collection member-page"
      aria-labelledby="program-collection-title"
    >
      <header className="member-page-heading">
        <div>
          <span className="eyebrow">Owned programs</span>
          <h1 id="program-collection-title">Your routes</h1>
          <p>
            Keep up to 24 private programs. One is active for the overview,
            editor, compatible library, and future workouts; existing workout
            snapshots never change.
          </p>
        </div>
        <Link className="secondary-action" href="/app">
          <Icon name="arrow-left" /> Active overview
        </Link>
      </header>

      {!canMutate ? (
        <p className="member-inline-notice">
          This collection is read-only until you verify your email and sign in
          again.
        </p>
      ) : null}

      <div className="program-collection-layout">
        <section aria-labelledby="owned-programs-title">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Collection</span>
              <h2 id="owned-programs-title">Programs</h2>
            </div>
            <span>{programs.length} / 24</span>
          </div>
          <ol className="program-collection-list">
            {programs.map((program) => {
              const activating = busyOperation === `activate:${program.id}`;
              return (
                <li
                  aria-current={program.isActive ? "true" : undefined}
                  key={program.id}
                >
                  <header>
                    <div>
                      <span className="program-collection-state">
                        {program.isActive ? "Active program" : "Owned program"}
                      </span>
                      <h3>{program.name}</h3>
                    </div>
                    <Icon name={program.isActive ? "check" : "map"} />
                  </header>
                  <dl>
                    <div>
                      <dt>Equipment</dt>
                      <dd>
                        {EQUIPMENT_PROFILES[program.equipmentProfileKind].label}
                      </dd>
                    </div>
                    <div>
                      <dt>Current revision</dt>
                      <dd>{program.revisionNumber}</dd>
                    </div>
                    <div>
                      <dt>Schedule</dt>
                      <dd>Five days</dd>
                    </div>
                    <div>
                      <dt>Updated</dt>
                      <dd>
                        <time dateTime={program.updatedAt}>
                          {updatedLabel(program.updatedAt)}
                        </time>
                      </dd>
                    </div>
                  </dl>
                  <div className="program-collection-card-actions">
                    {program.isActive ? (
                      <Link
                        className="secondary-action"
                        href="/app/program/edit"
                      >
                        Edit active
                      </Link>
                    ) : (
                      <button
                        className="primary-action"
                        disabled={!canMutate || busyOperation !== null}
                        onClick={() => void activateProgram(program)}
                        type="button"
                      >
                        {activating ? "Activating…" : "Make active"}
                      </button>
                    )}
                    <button
                      disabled={!canMutate || busyOperation !== null}
                      onClick={(event) => openClone(program, event)}
                      type="button"
                    >
                      Clone
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        <aside
          className="program-create-panel"
          aria-labelledby="create-program-title"
        >
          <span className="eyebrow">Fresh starter</span>
          <h2 id="create-program-title">Create a program</h2>
          <p>
            Start from the published five-day route. You can edit its exercises,
            targets, rest, notes, and cardio after creation.
          </p>
          <form onSubmit={(event) => void createProgram(event)}>
            <label htmlFor="create-program-name">Program name</label>
            <input
              autoComplete="off"
              disabled={!canMutate || busyOperation !== null}
              id="create-program-name"
              maxLength={80}
              onChange={(event) => {
                createKey.current = undefined;
                setCreateName(event.currentTarget.value);
              }}
              required
              value={createName}
            />
            <fieldset disabled={!canMutate || busyOperation !== null}>
              <legend>Equipment profile</legend>
              {(Object.keys(EQUIPMENT_PROFILES) as EquipmentProfileKind[]).map(
                (profile) => (
                  <label key={profile}>
                    <input
                      checked={createProfile === profile}
                      name="create-equipment-profile"
                      onChange={() => {
                        createKey.current = undefined;
                        setCreateProfile(profile);
                      }}
                      type="radio"
                      value={profile}
                    />
                    <span>
                      <strong>{EQUIPMENT_PROFILES[profile].label}</strong>
                      <small>{EQUIPMENT_PROFILES[profile].description}</small>
                    </span>
                  </label>
                ),
              )}
            </fieldset>
            <button
              className="primary-action"
              disabled={
                !canMutate || busyOperation !== null || programs.length >= 24
              }
              type="submit"
            >
              {busyOperation === "create" ? "Creating…" : "Create and activate"}
              <Icon name="arrow-right" />
            </button>
            {programs.length >= 24 ? (
              <p className="program-limit-note">
                The 24-program limit is reached.
              </p>
            ) : null}
          </form>
        </aside>
      </div>

      <p aria-live="polite" className="member-save-status" role="status">
        {message}
      </p>
      {failure ? (
        <p className="program-collection-error" role="alert">
          {failure}
        </p>
      ) : null}

      <dialog
        aria-labelledby="clone-program-title"
        className="program-clone-dialog"
        onClose={() => {
          setCloneFailure("");
          setCloneSource(null);
          cloneInvoker.current?.focus();
        }}
        ref={cloneDialog}
      >
        {cloneSource ? (
          <form
            className="program-clone-sheet"
            onSubmit={(event) => void cloneProgram(event)}
          >
            <header>
              <div>
                <span className="eyebrow">Independent copy</span>
                <h2 id="clone-program-title">Clone {cloneSource.name}</h2>
              </div>
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
              Revision {cloneSource.revisionNumber} and all five current days
              will be copied with new private record IDs. The source and workout
              history stay unchanged. The copy becomes active.
            </p>
            <label htmlFor="clone-program-name">New program name</label>
            <input
              autoComplete="off"
              disabled={busyOperation === "clone"}
              id="clone-program-name"
              maxLength={80}
              onChange={(event) => {
                cloneKey.current = undefined;
                setCloneName(event.currentTarget.value);
              }}
              ref={cloneInput}
              required
              value={cloneName}
            />
            {cloneFailure ? (
              <p className="program-collection-error" role="alert">
                {cloneFailure}
              </p>
            ) : null}
            <div>
              <button
                className="primary-action"
                disabled={busyOperation === "clone"}
                type="submit"
              >
                {busyOperation === "clone" ? "Cloning…" : "Clone and activate"}
              </button>
              <button
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
