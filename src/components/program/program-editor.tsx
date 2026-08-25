"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { privateApiMutation, PrivateApiClientError } from "@/client/private-api";
import {
  programPublishInputFromReadModel,
  reorderProgramPrescription,
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

export function ProgramEditor({
  canMutate,
  initialProgram,
}: Readonly<{
  canMutate: boolean;
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
    const name = prescription?.sourcePrescriptionId
      ? meaningBySourceId.get(prescription.sourcePrescriptionId)?.label
      : "Exercise";
    setMessage(`${name ?? "Exercise"} moved ${direction < 0 ? "up" : "down"}.`);
  }

  async function publish() {
    if (!canMutate || busy) return;
    const checked = programPublishRequestSchema.safeParse(draft);
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
                    const meaning = prescription.sourcePrescriptionId
                      ? meaningBySourceId.get(prescription.sourcePrescriptionId)
                      : undefined;
                    const duration = meaning?.measurementKind === "duration" || meaning?.measurementKind === "distance_duration";
                    return (
                      <li className="program-editor-prescription" key={prescription.sourcePrescriptionId ?? `${section.kind}-${prescriptionIndex}`}>
                        <header>
                          <div>
                            <span>{section.kind} · {meaning?.measurementKind.replaceAll("_", " ") ?? "exercise"}</span>
                            <h3>{meaning?.label ?? prescription.displayName ?? "Exercise"}</h3>
                          </div>
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
    </section>
  );
}
