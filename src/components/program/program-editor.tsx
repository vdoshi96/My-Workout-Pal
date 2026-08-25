"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { privateApiMutation, PrivateApiClientError } from "@/client/private-api";
import {
  addProgramPrescription,
  filterProgramExerciseCandidates,
  programPublishInputFromReadModel,
  removeProgramPrescription,
  replaceProgramPrescription,
  reorderProgramPrescription,
  stripLocalProgramPrescriptionIds,
  validateProgramExerciseSelections,
  type ProgramExerciseCandidate,
} from "@/components/program/program-editor-model";
import { Icon } from "@/components/ui/icon";
import { EQUIPMENT_PROFILES } from "@/domain/equipment";
import {
  programPublishRequestSchema,
  type ProgramPublishInput,
} from "@/domain/programs/publication";
import type {
  ActiveProgramReadModel,
  ProfileProgramReadModel,
} from "@/server/repositories/profile-program";

function operationKey(): string {
  return globalThis.crypto.randomUUID();
}

function optionalNumber(value: string): number | null {
  if (value.trim() === "") return null;
  return Number(value);
}

function publishFailure(error: unknown): string {
  if (error instanceof PrivateApiClientError) {
    if (error.code === "conflict") {
      return "The active program changed while this draft was open. Your local edits remain here; reload before publishing again.";
    }
    return error.message;
  }
  return "The draft was not published. Check the connection and try again.";
}

type Prescription = ProgramPublishInput["days"][number]["sections"][number]["prescriptions"][number];
type Cardio = ProgramPublishInput["days"][number]["cardio"][number];
type ExerciseChooser = Readonly<
  | {
      dayIndex: number;
      mode: "add";
      sectionIndex: number;
    }
  | {
      currentLoggingKind: ProgramExerciseCandidate["loggingKind"];
      dayIndex: number;
      mode: "replace";
      prescriptionIndex: number;
      sectionIndex: number;
    }
>;

export function ProgramEditor({
  canMutate,
  candidates,
  initialProgram,
}: Readonly<{
  canMutate: boolean;
  candidates: readonly ProgramExerciseCandidate[];
  initialProgram: ActiveProgramReadModel;
}>) {
  const router = useRouter();
  const [program, setProgram] = useState(initialProgram);
  const [draft, setDraft] = useState<ProgramPublishInput>(() =>
    programPublishInputFromReadModel(initialProgram, operationKey()),
  );
  const [baseline, setBaseline] = useState(() => JSON.stringify(draft));
  const [selectedDay, setSelectedDay] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [chooser, setChooser] = useState<ExerciseChooser | null>(null);
  const [candidateQuery, setCandidateQuery] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const localPrescriptionIdsRef = useRef(new Set<string>());
  const errorRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const dirty = useMemo(() => JSON.stringify(draft) !== baseline, [baseline, draft]);
  const selected = draft.days[selectedDay] ?? draft.days[0]!;
  const meaningBySourceId = useMemo(
    () =>
      new Map(
        program.days.flatMap((day) =>
          day.prescriptions.map((prescription) => [prescription.id, prescription] as const),
        ),
      ),
    [program],
  );
  const candidateById = useMemo(
    () => new Map(candidates.map((candidate) => [candidate.id, candidate] as const)),
    [candidates],
  );
  const filteredCandidates = useMemo(
    () => filterProgramExerciseCandidates(candidates, candidateQuery),
    [candidateQuery, candidates],
  );

  function meaningForPrescription(prescription: Prescription) {
    const id = prescription.catalogExerciseId ?? prescription.customExerciseId;
    const source = prescription.sourcePrescriptionId
      ? meaningBySourceId.get(prescription.sourcePrescriptionId)
      : undefined;
    const sourceId = source?.catalogExerciseId ?? source?.customExerciseId;
    if (source && id === sourceId) {
      return { label: source.label, measurementKind: source.measurementKind };
    }
    const candidate = id ? candidateById.get(id) : undefined;
    return candidate
      ? { label: candidate.name, measurementKind: candidate.loggingKind }
      : undefined;
  }

  function dismissChooser() {
    setChooser(null);
    setCandidateQuery("");
    queueMicrotask(() => returnFocusRef.current?.focus());
  }

  function openChooser(next: ExerciseChooser) {
    returnFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    setCandidateQuery("");
    setChooser(next);
  }

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!chooser || !dialog || dialog.open) return;
    dialog.showModal();
    queueMicrotask(() => searchRef.current?.focus());
  }, [chooser]);

  useEffect(() => {
    if (!dirty || busy) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const protectNavigation = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      const target = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(target instanceof HTMLAnchorElement) || target.download) return;
      if (target.target && target.target !== "_self") return;

      const current = new URL(window.location.href);
      const destination = new URL(target.href, current);
      if (destination.origin !== current.origin) return;
      if (
        destination.pathname === current.pathname &&
        destination.search === current.search
      ) {
        return;
      }
      if (!window.confirm("Discard this unpublished program draft?")) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", protectNavigation, true);
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", protectNavigation, true);
    };
  }, [busy, dirty]);

  function updateDay(
    dayIndex: number,
    update: (day: ProgramPublishInput["days"][number]) => ProgramPublishInput["days"][number],
  ) {
    setDraft((current) => ({
      ...current,
      days: current.days.map((day, index) => (index === dayIndex ? update(day) : day)) as ProgramPublishInput["days"],
    }));
    setMessage("");
  }

  function updatePrescription(
    dayIndex: number,
    sectionIndex: number,
    prescriptionIndex: number,
    update: Partial<Prescription>,
  ) {
    updateDay(dayIndex, (day) => ({
      ...day,
      sections: day.sections.map((section, index) =>
        index === sectionIndex
          ? {
              ...section,
              prescriptions: section.prescriptions.map((prescription, innerIndex) =>
                innerIndex === prescriptionIndex
                  ? { ...prescription, ...update }
                  : prescription,
              ),
            }
          : section,
      ),
    }));
  }

  function updateCardio(dayIndex: number, cardioIndex: number, update: Partial<Cardio>) {
    updateDay(dayIndex, (day) => ({
      ...day,
      cardio: day.cardio.map((cardio, index) =>
        index === cardioIndex ? { ...cardio, ...update } : cardio,
      ) as ProgramPublishInput["days"][number]["cardio"],
    }));
  }

  function move(dayIndex: number, sectionIndex: number, prescriptionIndex: number, direction: -1 | 1) {
    setDraft((current) =>
      reorderProgramPrescription(current, dayIndex, sectionIndex, prescriptionIndex, direction),
    );
    const prescription = draft.days[dayIndex]?.sections[sectionIndex]?.prescriptions[prescriptionIndex];
    const name = prescription ? meaningForPrescription(prescription)?.label : "Exercise";
    setMessage(`${name ?? "Exercise"} moved ${direction < 0 ? "up" : "down"}.`);
  }

  function chooseCandidate(candidate: ProgramExerciseCandidate) {
    if (!chooser) return;
    if (chooser.mode === "add") {
      const localId = operationKey();
      localPrescriptionIdsRef.current.add(localId);
      setDraft((current) => {
        const next = addProgramPrescription(
          current,
          chooser.dayIndex,
          chooser.sectionIndex,
          candidate,
        );
        const added = next.days[chooser.dayIndex]
          ?.sections[chooser.sectionIndex]
          ?.prescriptions.at(-1);
        if (!added) return next;
        added.sourcePrescriptionId = localId;
        return next;
      });
      setMessage(`${candidate.name} added with editable defaults. This draft is still unpublished.`);
    } else {
      const reset = chooser.currentLoggingKind !== candidate.loggingKind;
      setDraft((current) => replaceProgramPrescription(
        current,
        chooser.dayIndex,
        chooser.sectionIndex,
        chooser.prescriptionIndex,
        candidate,
        chooser.currentLoggingKind,
      ));
      setMessage(
        reset
          ? `${candidate.name} selected. Sets, rest, and notes were retained; the range and incompatible targets were reset.`
          : `${candidate.name} selected. Compatible range and targets were retained.`,
      );
    }
    dialogRef.current?.close();
  }

  function removePrescription(
    dayIndex: number,
    sectionIndex: number,
    prescriptionIndex: number,
    label: string,
  ) {
    try {
      setDraft((current) => removeProgramPrescription(
        current,
        dayIndex,
        sectionIndex,
        prescriptionIndex,
      ));
      setMessage(`${label} removed from this unpublished draft.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The movement could not be removed.");
    }
  }

  async function publish() {
    if (!canMutate || busy) return;
    const publishableDraft = stripLocalProgramPrescriptionIds(
      draft,
      localPrescriptionIdsRef.current,
    );
    const selectionErrors = validateProgramExerciseSelections(publishableDraft, candidates);
    if (selectionErrors.length > 0) {
      setErrors([...selectionErrors]);
      setMessage("The draft has exercise selection errors and was not sent.");
      queueMicrotask(() => errorRef.current?.focus());
      return;
    }
    const checked = programPublishRequestSchema.safeParse(publishableDraft);
    if (!checked.success) {
      const nextErrors = checked.error.issues.map((issue) =>
        `${issue.path.join(" → ") || "Draft"}: ${issue.message}`,
      );
      setErrors(nextErrors);
      setMessage("The draft has validation errors and was not sent.");
      queueMicrotask(() => errorRef.current?.focus());
      return;
    }
    setErrors([]);
    setBusy(true);
    setMessage("Publishing one new immutable revision…");
    try {
      const response = await privateApiMutation<{ profileProgram: ProfileProgramReadModel }>(
        "/api/app/program/publish",
        { body: checked.data, method: "POST" },
      );
      const nextProgram = response.profileProgram.activeProgram;
      if (!nextProgram) throw new Error("The published program is unavailable.");
      const nextDraft = programPublishInputFromReadModel(nextProgram, operationKey());
      setProgram(nextProgram);
      setDraft(nextDraft);
      localPrescriptionIdsRef.current.clear();
      setBaseline(JSON.stringify(nextDraft));
      setMessage(
        `Published revision ${nextProgram.revisionNumber}. Earlier program revisions and workout snapshots were not changed.`,
      );
      queueMicrotask(() => statusRef.current?.focus());
      router.refresh();
    } catch (error) {
      setMessage(publishFailure(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="program-editor-page" aria-labelledby="program-editor-title">
      <header className="program-editor-hero contour-surface">
        <div>
          <span className="eyebrow">Unpublished draft · base revision {program.revisionNumber}</span>
          <h1 id="program-editor-title">Edit your route</h1>
          <p>Publish creates one new revision. Existing workout snapshots keep their original targets, exercises, and equipment meaning.</p>
        </div>
        <Link className="secondary-action" href="/app">
          Back to program
        </Link>
      </header>

      {!canMutate ? (
        <div className="member-inline-notice" role="status">
          Verify your email and sign in again before publishing permanent changes. You can still inspect this draft.
        </div>
      ) : null}

      <div className="program-editor-layout">
        <aside className="program-editor-outline" aria-label="Program days">
          <label className="program-editor-field">
            <span>Program name</span>
            <input
              disabled={busy}
              maxLength={80}
              onChange={(event) => {
                setDraft((current) => ({ ...current, name: event.target.value }));
                setMessage("");
              }}
              value={draft.name}
            />
          </label>
          <div className="program-editor-equipment">
            <span>Equipment profile</span>
            <strong>{EQUIPMENT_PROFILES[program.equipmentProfileKind].label}</strong>
            <p>Equipment substitutions need their own exact preview and confirmation.</p>
            <Link href="/app#equipment-profile">Review equipment</Link>
          </div>
          <ol>
            {draft.days.map((day, dayIndex) => (
              <li key={day.dayKey}>
                <button
                  aria-current={selectedDay === dayIndex ? "step" : undefined}
                  onClick={() => setSelectedDay(dayIndex)}
                  type="button"
                >
                  <span>{String(day.dayNumber).padStart(2, "0")}</span>
                  <strong>{day.displayName}</strong>
                  <small>{day.sections.flatMap(({ prescriptions }) => prescriptions).length} movements</small>
                </button>
              </li>
            ))}
          </ol>
        </aside>

        <div className="program-editor-main">
          <section className="program-editor-day" aria-labelledby={`editor-day-${selected.dayKey}`}>
            <header>
              <span className="eyebrow">Day {selected.dayNumber}</span>
              <h2 id={`editor-day-${selected.dayKey}`}>{selected.displayName}</h2>
              <label className="program-editor-field">
                <span>Day name</span>
                <input
                  disabled={busy}
                  maxLength={120}
                  onChange={(event) => updateDay(selectedDay, (day) => ({ ...day, displayName: event.target.value }))}
                  value={selected.displayName}
                />
              </label>
            </header>

            {selected.sections.map((section, sectionIndex) => (
              <fieldset className="program-editor-section" disabled={busy} key={section.kind}>
                <legend>{section.title}</legend>
                <ol>
                  {section.prescriptions.map((prescription, prescriptionIndex) => {
                    const meaning = meaningForPrescription(prescription);
                    const duration = meaning?.measurementKind === "duration" || meaning?.measurementKind === "distance_duration";
                    return (
                      <li className="program-editor-prescription" key={prescription.sourcePrescriptionId ?? `${section.kind}-${prescriptionIndex}`}>
                        <header>
                          <div>
                            <span>{section.kind} · {meaning?.measurementKind.replaceAll("_", " ") ?? "exercise"}</span>
                            <h3>{meaning?.label ?? prescription.displayName ?? "Exercise"}</h3>
                          </div>
                          <div className="program-editor-prescription-actions">
                            <div className="program-editor-reorder" aria-label={`Reorder ${meaning?.label ?? "exercise"}`}>
                              <button
                                disabled={prescriptionIndex === 0}
                                onClick={() => move(selectedDay, sectionIndex, prescriptionIndex, -1)}
                                type="button"
                              >Up</button>
                              <button
                                disabled={prescriptionIndex === section.prescriptions.length - 1}
                                onClick={() => move(selectedDay, sectionIndex, prescriptionIndex, 1)}
                                type="button"
                              >Down</button>
                            </div>
                            <button
                              disabled={!meaning}
                              onClick={() => {
                                if (!meaning) return;
                                openChooser({
                                  currentLoggingKind: meaning.measurementKind,
                                  dayIndex: selectedDay,
                                  mode: "replace",
                                  prescriptionIndex,
                                  sectionIndex,
                                });
                              }}
                              type="button"
                            >Replace</button>
                            <button
                              disabled={section.prescriptions.length <= 1}
                              onClick={() => removePrescription(
                                selectedDay,
                                sectionIndex,
                                prescriptionIndex,
                                meaning?.label ?? "Exercise",
                              )}
                              type="button"
                            >Remove</button>
                          </div>
                        </header>
                        <div className="program-editor-grid">
                          <label><span>Sets</span><input min={1} max={20} onChange={(event) => updatePrescription(selectedDay, sectionIndex, prescriptionIndex, { setCount: Number(event.target.value) })} type="number" value={prescription.setCount} /></label>
                          <label><span>Rest seconds</span><input min={0} max={900} onChange={(event) => updatePrescription(selectedDay, sectionIndex, prescriptionIndex, { restSeconds: Number(event.target.value) })} type="number" value={prescription.restSeconds} /></label>
                          {duration ? (
                            <>
                              <label><span>Minimum seconds</span><input min={1} onChange={(event) => updatePrescription(selectedDay, sectionIndex, prescriptionIndex, { minimumSeconds: optionalNumber(event.target.value) })} type="number" value={prescription.minimumSeconds ?? ""} /></label>
                              <label><span>Maximum seconds</span><input min={1} onChange={(event) => updatePrescription(selectedDay, sectionIndex, prescriptionIndex, { maximumSeconds: optionalNumber(event.target.value) })} type="number" value={prescription.maximumSeconds ?? ""} /></label>
                            </>
                          ) : (
                            <>
                              <label><span>Minimum reps</span><input min={1} onChange={(event) => updatePrescription(selectedDay, sectionIndex, prescriptionIndex, { minimumReps: optionalNumber(event.target.value) })} type="number" value={prescription.minimumReps ?? ""} /></label>
                              <label><span>Maximum reps</span><input min={1} onChange={(event) => updatePrescription(selectedDay, sectionIndex, prescriptionIndex, { maximumReps: optionalNumber(event.target.value) })} type="number" value={prescription.maximumReps ?? ""} /></label>
                            </>
                          )}
                          {meaning?.measurementKind === "weight_reps" ? (
                            <label><span>Target kg (optional)</span><input min={0} onChange={(event) => updatePrescription(selectedDay, sectionIndex, prescriptionIndex, { targetWeightKg: optionalNumber(event.target.value) })} step="0.25" type="number" value={prescription.targetWeightKg ?? ""} /></label>
                          ) : null}
                          {meaning?.measurementKind === "distance_duration" ? (
                            <label><span>Target metres</span><input min={1} onChange={(event) => updatePrescription(selectedDay, sectionIndex, prescriptionIndex, { targetDistanceM: optionalNumber(event.target.value) })} type="number" value={prescription.targetDistanceM ?? ""} /></label>
                          ) : null}
                          <label className="program-editor-wide"><span>Notes</span><textarea maxLength={2000} onChange={(event) => updatePrescription(selectedDay, sectionIndex, prescriptionIndex, { notes: event.target.value })} value={prescription.notes ?? ""} /></label>
                        </div>
                      </li>
                    );
                  })}
                </ol>
                <button
                  className="program-editor-add"
                  onClick={() => openChooser({
                    dayIndex: selectedDay,
                    mode: "add",
                    sectionIndex,
                  })}
                  type="button"
                >Add movement</button>
              </fieldset>
            ))}

            <fieldset className="program-editor-section program-editor-cardio" disabled={busy}>
              <legend>Walker / runner cardio</legend>
              <div className="program-editor-cardio-grid">
                {selected.cardio.map((cardio, cardioIndex) => (
                  <section key={cardio.mode} aria-labelledby={`cardio-${selected.dayKey}-${cardio.mode}`}>
                    <h3 id={`cardio-${selected.dayKey}-${cardio.mode}`}>{cardio.mode}</h3>
                    <div className="program-editor-grid">
                      <label><span>Duration seconds</span><input min={1} onChange={(event) => updateCardio(selectedDay, cardioIndex, { durationSeconds: Number(event.target.value) })} type="number" value={cardio.durationSeconds} /></label>
                      <label><span>Distance metres</span><input min={0} onChange={(event) => updateCardio(selectedDay, cardioIndex, { distanceM: optionalNumber(event.target.value) })} type="number" value={cardio.distanceM ?? ""} /></label>
                      <label><span>Pace seconds / km</span><input min={1} onChange={(event) => updateCardio(selectedDay, cardioIndex, { paceSecondsPerKm: optionalNumber(event.target.value) })} type="number" value={cardio.paceSecondsPerKm ?? ""} /></label>
                      <label><span>Incline %</span><input min={0} max={100} onChange={(event) => updateCardio(selectedDay, cardioIndex, { inclinePercent: optionalNumber(event.target.value) })} step="0.1" type="number" value={cardio.inclinePercent ?? ""} /></label>
                      <label className="program-editor-wide"><span>Notes</span><textarea maxLength={2000} onChange={(event) => updateCardio(selectedDay, cardioIndex, { notes: event.target.value })} value={cardio.notes ?? ""} /></label>
                    </div>
                  </section>
                ))}
              </div>
            </fieldset>
          </section>

          {errors.length > 0 ? (
            <div className="program-editor-errors" ref={errorRef} role="alert" tabIndex={-1}>
              <strong>Resolve these draft errors</strong>
              <ul>{errors.map((error, index) => <li key={`${index}-${error}`}>{error}</li>)}</ul>
            </div>
          ) : null}
          <footer className="program-editor-footer">
            <div>
              <strong>{dirty ? "Unpublished changes" : "Draft matches the active revision"}</strong>
              <p>Loads stay in canonical kilograms; unit conversion happens only when values are presented.</p>
            </div>
            <button className="primary-action" disabled={!canMutate || busy || !dirty} onClick={() => void publish()} type="button">
              {busy ? "Publishing…" : "Publish new revision"}<Icon name="arrow-right" />
            </button>
          </footer>
          <div aria-live="polite" className="member-save-status" ref={statusRef} role="status" tabIndex={-1}>{message}</div>
        </div>
      </div>

      {chooser ? (
        <dialog
          aria-labelledby="exercise-chooser-title"
          className="program-exercise-chooser"
          onClick={(event) => {
            if (event.target === event.currentTarget) event.currentTarget.close();
          }}
          onClose={dismissChooser}
          ref={dialogRef}
        >
          <div className="program-exercise-chooser-sheet">
            <header>
              <div>
                <span className="eyebrow">Compatible with this program</span>
                <h2 id="exercise-chooser-title">
                  {chooser.mode === "add" ? "Add movement" : "Replace movement"}
                </h2>
              </div>
              <button
                aria-label="Close exercise chooser"
                onClick={() => dialogRef.current?.close()}
                type="button"
              >Close</button>
            </header>
            <label className="program-exercise-search">
              <span>Search compatible movements</span>
              <input
                maxLength={120}
                onChange={(event) => setCandidateQuery(event.target.value)}
                placeholder="Name, equipment, or logging type"
                ref={searchRef}
                type="search"
                value={candidateQuery}
              />
            </label>
            <p className="program-exercise-result-count" aria-live="polite">
              {filteredCandidates.length} compatible result{filteredCandidates.length === 1 ? "" : "s"}
            </p>
            {filteredCandidates.length > 0 ? (
              <ul className="program-exercise-results">
                {filteredCandidates.map((candidate) => (
                  <li key={`${candidate.kind}-${candidate.id}`}>
                    <button onClick={() => chooseCandidate(candidate)} type="button">
                      <span>
                        <strong>{candidate.name}</strong>
                        <small>
                          {candidate.loggingKind.replaceAll("_", " ")} · {candidate.requiredEquipment.join(" + ")}
                        </small>
                      </span>
                      <span>{candidate.kind === "custom" ? "Private" : "Canonical"}</span>
                      <Icon name="chevron-right" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="program-exercise-empty">
                <strong>No compatible match</strong>
                <p>Try a broader search, or create a private exercise for this equipment profile.</p>
                <Link href="/app/library/custom/new">Create private exercise</Link>
              </div>
            )}
            <footer>
              <p>Choosing a movement changes only this unpublished draft.</p>
              <button onClick={() => dialogRef.current?.close()} type="button">Cancel</button>
            </footer>
          </div>
        </dialog>
      ) : null}
    </section>
  );
}
