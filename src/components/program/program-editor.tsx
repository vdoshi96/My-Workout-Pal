"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { privateApiMutation, PrivateApiClientError } from "@/client/private-api";
import { MovementChooserAdapter } from "@/components/exercises/movement-chooser";
import { EquipmentProfileControl } from "@/components/program/equipment-profile-control";
import { parseProgramPublishResponse } from "@/components/program/program-mutation-response";
import { reconcileProgramRevisionMutation } from "@/components/program/program-revision-reconciliation";
import { DecorativeCompanion } from "@/components/ui/decorative-companion";
import {
  addProgramPrescription,
  addProgramCardio,
  addProgramDay,
  addProgramSection,
  duplicateProgramDay,
  programEditorCanonicalValue,
  programEditorDisplayValue,
  programEditorDraftFromReadModel,
  programEditorExerciseCandidateKey,
  programEditorUnitLabels,
  removeProgramCardio,
  removeProgramDay,
  removeProgramPrescription,
  removeProgramSection,
  replaceProgramPrescription,
  renameProgramDay,
  renameProgramSection,
  reorderProgramDay,
  reorderProgramCardio,
  reorderProgramSection,
  reorderProgramPrescription,
  reviewProgramDayRemoval,
  reviewProgramPrescriptionRemoval,
  reviewProgramSectionRemoval,
  stripLocalProgramPrescriptionIds,
  validateProgramExerciseSelections,
  PROGRAM_SECTION_KINDS,
  type ProgramEditorDraft,
  type ProgramDayRemovalReview,
  type ProgramEditorMeasurement,
  type ProgramExerciseCandidate,
  type ProgramCardioMode,
  type ProgramEditorUnitSystem,
  type ProgramPrescriptionRemovalReview,
  type ProgramSectionKind,
  type ProgramSectionRemovalReview,
} from "@/components/program/program-editor-model";
import { Icon } from "@/components/ui/icon";
import {
  movementChooserSelectionSchema,
  type MovementChooserError,
  type MovementChooserRequest,
  type MovementSelection,
} from "@/domain/exercises/movement-chooser-contract";
import { canShowRoutineEditorCompanion } from "@/domain/companions/visibility";
import {
  programPublishRequestSchema,
  type ProgramPublishInput,
} from "@/domain/programs/publication";
import type {
  ActiveProgramReadModel,
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

function CanonicalMeasurementInput({
  canonicalValue,
  max,
  measurement,
  min,
  onCommit,
  onPendingChange,
  pendingKey,
  step,
  unitSystem,
}: Readonly<{
  canonicalValue: number | null | undefined;
  max?: number | string;
  measurement: ProgramEditorMeasurement;
  min: number | string;
  onCommit: (value: number | null) => void;
  onPendingChange: (key: string, pending: boolean) => void;
  pendingKey: string;
  step: number | string;
  unitSystem: ProgramEditorUnitSystem;
}>) {
  const canonicalDisplayValue = programEditorDisplayValue(
    canonicalValue,
    measurement,
    unitSystem,
  );
  const [displayValue, setDisplayValue] = useState(canonicalDisplayValue);
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setDisplayValue(canonicalDisplayValue);
  }, [canonicalDisplayValue]);

  useEffect(
    () => () => {
      onPendingChange(pendingKey, false);
    },
    [onPendingChange, pendingKey],
  );

  function commit() {
    focused.current = false;
    const nextCanonicalValue = programEditorCanonicalValue(
      displayValue,
      measurement,
      unitSystem,
    );
    onCommit(nextCanonicalValue);
    onPendingChange(pendingKey, false);
    setDisplayValue(
      programEditorDisplayValue(nextCanonicalValue, measurement, unitSystem),
    );
  }

  return (
    <input
      max={max}
      min={min}
      onBlur={commit}
      onChange={(event) => {
        const nextDisplayValue = event.currentTarget.value;
        setDisplayValue(nextDisplayValue);
        onPendingChange(pendingKey, nextDisplayValue !== canonicalDisplayValue);
      }}
      onFocus={() => {
        focused.current = true;
      }}
      step={step}
      type="number"
      value={displayValue}
    />
  );
}

type Prescription = ProgramPublishInput["days"][number]["sections"][number]["prescriptions"][number];
type Cardio = ProgramPublishInput["days"][number]["cardio"][number];
type MovementChooserRequestFor<Intent extends MovementChooserRequest["intent"]> =
  MovementChooserRequest & Readonly<{ intent: Intent }>;
type ExerciseChooser = Readonly<
  | {
      dayIndex: number;
      request: MovementChooserRequestFor<"add">;
      sectionIndex: number;
    }
  | {
      request: MovementChooserRequestFor<"seed-day">;
    }
  | {
      dayIndex: number;
      prescriptionIndex: number;
      request: MovementChooserRequestFor<"replace">;
      sectionIndex: number;
  }
>;

function movementSelectionFromPrescription(
  prescription: Prescription,
  name: string,
  loggingKind: ProgramExerciseCandidate["loggingKind"],
): MovementSelection | null {
  const source = prescription.catalogExerciseId
    ? { id: prescription.catalogExerciseId, kind: "catalog" as const }
    : prescription.customExerciseId
      ? { id: prescription.customExerciseId, kind: "custom" as const }
      : null;
  if (!source) return null;
  const parsed = movementChooserSelectionSchema.safeParse({ loggingKind, name, source });
  return parsed.success ? parsed.data : null;
}

const CHOOSER_ERROR_MESSAGES: Readonly<Record<MovementChooserError["code"], string>> = {
  authentication_required: "Sign in again before choosing a movement.",
  create_failed: "The private movement could not be created. Your routine draft is unchanged.",
  guidance_failed: "The private guidance could not be saved. Your routine draft is unchanged.",
  invalid_selection: "That movement selection is unavailable. Choose another movement.",
  load_failed: "Movements could not be loaded. Try again without leaving this draft.",
};

type SectionRemoval = Readonly<{
  dayIndex: number;
  review: ProgramSectionRemovalReview;
  sectionIndex: number;
}>;

type DayRemoval = Readonly<{
  review: ProgramDayRemovalReview;
}>;

type PrescriptionRemoval = Readonly<{
  dayIndex: number;
  prescriptionIndex: number;
  review: ProgramPrescriptionRemovalReview;
  sectionIndex: number;
}>;

export function ProgramEditor({
  canMutate,
  candidates,
  initialProgram,
  unitSystem = "metric",
}: Readonly<{
  canMutate: boolean;
  candidates: readonly ProgramExerciseCandidate[];
  initialProgram: ActiveProgramReadModel;
  unitSystem?: ProgramEditorUnitSystem;
}>) {
  const router = useRouter();
  const [program, setProgram] = useState(initialProgram);
  const [draft, setDraft] = useState<ProgramEditorDraft>(() =>
    programEditorDraftFromReadModel(initialProgram, operationKey()),
  );
  const [undoDraft, setUndoDraft] = useState<{ before: ProgramEditorDraft; after: ProgramEditorDraft } | null>(null);
  const [baseline, setBaseline] = useState(() => JSON.stringify(draft));
  const [selectedDayKey, setSelectedDayKey] = useState(initialProgram.days[0]?.dayKey ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [saveFailed, setSaveFailed] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [chooser, setChooser] = useState<ExerciseChooser | null>(null);
  const [dayCreatorOpen, setDayCreatorOpen] = useState(false);
  const [selectionHints, setSelectionHints] = useState<ReadonlyMap<string, MovementSelection>>(
    () => new Map(),
  );
  const [newDayName, setNewDayName] = useState("");
  const [newDaySectionName, setNewDaySectionName] = useState("");
  const [newDaySectionKind, setNewDaySectionKind] = useState<ProgramSectionKind>("strength");
  const [sectionRemoval, setSectionRemoval] = useState<SectionRemoval | null>(null);
  const [dayRemoval, setDayRemoval] = useState<DayRemoval | null>(null);
  const [prescriptionRemoval, setPrescriptionRemoval] = useState<PrescriptionRemoval | null>(null);
  const [equipmentReviewOpen, setEquipmentReviewOpen] = useState(false);
  const [pendingMeasurementKeys, setPendingMeasurementKeys] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const dayNameRef = useRef<HTMLInputElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const sectionRemovalDialogRef = useRef<HTMLDialogElement>(null);
  const sectionRemovalConfirmRef = useRef<HTMLButtonElement>(null);
  const sectionRemovalReturnFocusRef = useRef<HTMLElement | null>(null);
  const dayRemovalDialogRef = useRef<HTMLDialogElement>(null);
  const dayRemovalConfirmRef = useRef<HTMLButtonElement>(null);
  const dayRemovalReturnFocusRef = useRef<HTMLElement | null>(null);
  const prescriptionRemovalDialogRef = useRef<HTMLDialogElement>(null);
  const prescriptionRemovalConfirmRef = useRef<HTMLButtonElement>(null);
  const prescriptionRemovalReturnFocusRef = useRef<HTMLElement | null>(null);
  const draftHistoryGuardActiveRef = useRef(false);
  const draftHistoryGuardLeavingRef = useRef(false);
  const draftHistoryGuardRestoringRef = useRef(false);
  const draftHistoryGuardRemovingRef = useRef(false);
  const dirtyRef = useRef(false);
  const localPrescriptionIdsRef = useRef(new Set<string>());
  const errorRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const dirty = useMemo(
    () => JSON.stringify(draft) !== baseline || pendingMeasurementKeys.size > 0,
    [baseline, draft, pendingMeasurementKeys],
  );
  const selectedDay = Math.max(
    0,
    draft.days.findIndex((day) => day.dayKey === selectedDayKey),
  );
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
  const candidateByKey = useMemo(
    () => new Map(candidates.map((candidate) => [
      programEditorExerciseCandidateKey(candidate.kind, candidate.id),
      candidate,
    ] as const)),
    [candidates],
  );
  const unitLabels = programEditorUnitLabels(unitSystem);

  const markMeasurementPending = useCallback((key: string, pending: boolean) => {
    setPendingMeasurementKeys((current) => {
      const hasKey = current.has(key);
      if (hasKey === pending) return current;
      const next = new Set(current);
      if (pending) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);

  function meaningForPrescription(prescription: Prescription) {
    const candidateKey = prescription.catalogExerciseId !== null
      ? programEditorExerciseCandidateKey("catalog", prescription.catalogExerciseId)
      : prescription.customExerciseId !== null
        ? programEditorExerciseCandidateKey("custom", prescription.customExerciseId)
        : undefined;
    const source = prescription.sourcePrescriptionId
      ? meaningBySourceId.get(prescription.sourcePrescriptionId)
      : undefined;
    const sourceKey = source?.catalogExerciseId !== null && source?.catalogExerciseId !== undefined
      ? programEditorExerciseCandidateKey("catalog", source.catalogExerciseId)
      : source?.customExerciseId !== null && source?.customExerciseId !== undefined
        ? programEditorExerciseCandidateKey("custom", source.customExerciseId)
        : undefined;
    if (source && candidateKey === sourceKey) {
      return { label: source.label, measurementKind: source.measurementKind };
    }
    const selectionHint = candidateKey ? selectionHints.get(candidateKey) : undefined;
    if (selectionHint) {
      return { label: selectionHint.name, measurementKind: selectionHint.loggingKind };
    }
    const candidate = candidateKey ? candidateByKey.get(candidateKey) : undefined;
    return candidate
      ? { label: candidate.name, measurementKind: candidate.loggingKind }
      : undefined;
  }

  function dismissChooser() {
    setChooser(null);
    queueMicrotask(() => returnFocusRef.current?.focus());
  }

  function dismissDayRemoval() {
    setDayRemoval(null);
    window.setTimeout(() => dayRemovalReturnFocusRef.current?.focus(), 0);
  }

  function dismissSectionRemoval() {
    setSectionRemoval(null);
    // Native dialog close focus restoration runs after the close event in WebKit.
    // Defer our explicit destination until that browser work has settled so both
    // cancel and confirmed removal land on the intended surviving control.
    window.setTimeout(() => sectionRemovalReturnFocusRef.current?.focus(), 0);
  }

  function dismissPrescriptionRemoval() {
    setPrescriptionRemoval(null);
    window.setTimeout(() => prescriptionRemovalReturnFocusRef.current?.focus(), 0);
  }

  function openChooser(next: ExerciseChooser) {
    returnFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    setChooser(next);
  }

  useEffect(() => {
    if (dayCreatorOpen) queueMicrotask(() => dayNameRef.current?.focus());
  }, [dayCreatorOpen]);

  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  useEffect(() => {
    const protectHistoryTraversal = (event: PopStateEvent) => {
      if (draftHistoryGuardRemovingRef.current) {
        draftHistoryGuardRemovingRef.current = false;
        draftHistoryGuardActiveRef.current = false;
        event.stopImmediatePropagation();
        return;
      }
      if (draftHistoryGuardRestoringRef.current) {
        draftHistoryGuardRestoringRef.current = false;
        event.stopImmediatePropagation();
        return;
      }
      if (draftHistoryGuardLeavingRef.current) {
        draftHistoryGuardLeavingRef.current = false;
        return;
      }
      if (!dirtyRef.current || !draftHistoryGuardActiveRef.current) return;

      event.stopImmediatePropagation();
      if (window.confirm("Discard this unpublished program draft?")) {
        draftHistoryGuardActiveRef.current = false;
        draftHistoryGuardLeavingRef.current = true;
        window.history.back();
      } else {
        draftHistoryGuardRestoringRef.current = true;
        window.history.forward();
      }
    };

    window.addEventListener("popstate", protectHistoryTraversal, true);
    return () => {
      window.removeEventListener("popstate", protectHistoryTraversal, true);
    };
  }, []);

  useEffect(() => {
    if (dirty && !draftHistoryGuardActiveRef.current) {
      window.history.pushState(
        { ...window.history.state, mwpProgramDraftGuard: true },
        "",
        window.location.href,
      );
      draftHistoryGuardActiveRef.current = true;
      return;
    }
    if (
      !dirty &&
      draftHistoryGuardActiveRef.current &&
      !draftHistoryGuardLeavingRef.current &&
      !draftHistoryGuardRestoringRef.current &&
      !draftHistoryGuardRemovingRef.current
    ) {
      draftHistoryGuardRemovingRef.current = true;
      window.history.back();
    }
  }, [dirty]);

  useEffect(() => {
    const dialog = sectionRemovalDialogRef.current;
    if (!sectionRemoval || !dialog || dialog.open) return;
    dialog.showModal();
    queueMicrotask(() => sectionRemovalConfirmRef.current?.focus());
  }, [sectionRemoval]);

  useEffect(() => {
    const dialog = dayRemovalDialogRef.current;
    if (!dayRemoval || !dialog || dialog.open) return;
    dialog.showModal();
    queueMicrotask(() => dayRemovalConfirmRef.current?.focus());
  }, [dayRemoval]);

  useEffect(() => {
    const dialog = prescriptionRemovalDialogRef.current;
    if (!prescriptionRemoval || !dialog || dialog.open) return;
    dialog.showModal();
    queueMicrotask(() => prescriptionRemovalConfirmRef.current?.focus());
  }, [prescriptionRemoval]);

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
    update: (day: ProgramEditorDraft["days"][number]) => ProgramEditorDraft["days"][number],
  ) {
    setDraft((current) => ({
      ...current,
      days: current.days.map((day, index) => (index === dayIndex ? update(day) : day)),
    }));
    setMessage("");
  }

  function acceptEquipmentRevision(nextProgram: ActiveProgramReadModel) {
    const nextDraft = programEditorDraftFromReadModel(nextProgram, operationKey());
    setProgram(nextProgram);
    setDraft(nextDraft);
    setBaseline(JSON.stringify(nextDraft));
    setPendingMeasurementKeys(new Set());
    localPrescriptionIdsRef.current.clear();
    setSelectedDayKey((current) =>
      nextDraft.days.some((day) => day.dayKey === current)
        ? current
        : nextDraft.days[0]?.dayKey ?? "",
    );
    setErrors([]);
    setMessage(
      `Equipment revision ${nextProgram.revisionNumber} is now the clean editor baseline. No unpublished editor changes were included.`,
    );
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

  function updateCardio(dayIndex: number, cardioKey: string, update: Partial<Cardio>) {
    updateDay(dayIndex, (day) => ({
      ...day,
      cardio: day.cardio.map((cardio) =>
        cardio.cardioKey === cardioKey ? { ...cardio, ...update } : cardio,
      ) as ProgramPublishInput["days"][number]["cardio"],
    }));
  }

  function openDayCreator() {
    returnFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    setNewDayName(`Day ${draft.days.length + 1}`);
    setNewDaySectionName("Strength");
    setNewDaySectionKind("strength");
    setDayCreatorOpen(true);
  }

  function chooseFirstDayMovement() {
    if (newDayName.trim().length === 0 || newDaySectionName.trim().length === 0) {
      setMessage("Give the new day and first section a name before choosing a movement.");
      dayNameRef.current?.focus();
      return;
    }
    setDayCreatorOpen(false);
    setChooser({ request: { intent: "seed-day" } });
  }

  function addDayFromSelection(selection: MovementSelection) {
    const displayName = newDayName.trim();
    const sectionTitle = newDaySectionName.trim();
    if (displayName.length === 0 || sectionTitle.length === 0) {
      setMessage("Give the new day and first section a name before choosing a movement.");
      return;
    }
    const dayKey = operationKey();
    try {
      setDraft((current) => addProgramDay(current, {
        candidate: selection,
        dayKey,
        displayName,
        sectionKind: newDaySectionKind,
        sectionTitle,
      }));
      setSelectedDayKey(dayKey);
      setMessage(`${displayName} added with ${selection.name}. This day is still unpublished.`);
      setErrors([]);
      setChooser(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The day could not be added.");
    }
  }

  function moveDay(dayKey: string, direction: -1 | 1) {
    try {
      setDraft((current) => reorderProgramDay(current, dayKey, direction));
      setSelectedDayKey(dayKey);
      setMessage(`Day moved ${direction < 0 ? "up" : "down"}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The day could not be moved.");
    }
  }

  function duplicateDay(dayKey: string) {
    const duplicateKey = operationKey();
    try {
      setDraft((current) => duplicateProgramDay(current, dayKey, { dayKey: duplicateKey }));
      setSelectedDayKey(duplicateKey);
      setMessage("Day duplicated with independent topology keys. The duplicate is still unpublished.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The day could not be duplicated.");
    }
  }

  function openDayRemoval(dayKey: string, returnFocusTarget: HTMLElement) {
    try {
      const day = draft.days.find((candidate) => candidate.dayKey === dayKey);
      if (!day) throw new RangeError("The requested program day is unavailable.");
      const review = reviewProgramDayRemoval(
        draft,
        dayKey,
        day.sections.flatMap(({ prescriptions }) => prescriptions.map((prescription) =>
          meaningForPrescription(prescription)?.label ?? prescription.displayName ?? "Exercise",
        )),
      );
      dayRemovalReturnFocusRef.current = returnFocusTarget;
      setDayRemoval({ review });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The day could not be reviewed.");
    }
  }

  function confirmDayRemoval() {
    if (!dayRemoval) return;
    const dayIndex = draft.days.findIndex((day) => day.dayKey === dayRemoval.review.dayKey);
    try {
      const next = removeProgramDay(draft, dayRemoval.review.dayKey, {
        ...dayRemoval.review,
        confirmed: true,
      });
      const focusDay = next.days[Math.min(Math.max(dayIndex, 0), next.days.length - 1)];
      setDraft(next);
      setSelectedDayKey(focusDay?.dayKey ?? "");
      setMessage(
        `${dayRemoval.review.exerciseNames.join(", ") || "The empty day"} removed from this unpublished draft.`,
      );
      dayRemovalReturnFocusRef.current = focusDay
        ? document.getElementById(`program-day-${focusDay.dayKey}`)
        : null;
      dayRemovalDialogRef.current?.close();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The day could not be removed.");
    }
  }

  function addCardio(mode: ProgramCardioMode) {
    try {
      setDraft((current) => addProgramCardio(current, selected.dayKey, mode, operationKey()));
      setMessage(`${mode} cardio added to ${selected.displayName}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The cardio choice could not be added.");
    }
  }

  function removeCardio(cardioKey: string, mode: ProgramCardioMode) {
    try {
      setDraft((current) => removeProgramCardio(current, selected.dayKey, cardioKey));
      setMessage(`${mode} cardio removed from this unpublished draft.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The cardio choice could not be removed.");
    }
  }

  function moveCardio(cardioKey: string, mode: ProgramCardioMode, direction: -1 | 1) {
    try {
      setDraft((current) => reorderProgramCardio(
        current,
        selected.dayKey,
        cardioKey,
        direction,
      ));
      setMessage(`${mode} cardio moved ${direction < 0 ? "up" : "down"}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The cardio choice could not be moved.");
    }
  }

  function move(dayIndex: number, sectionIndex: number, prescriptionIndex: number, direction: -1 | 1) {
    setDraft((current) =>
      reorderProgramPrescription(current, dayIndex, sectionIndex, prescriptionIndex, direction),
    );
    const prescription = draft.days[dayIndex]?.sections[sectionIndex]?.prescriptions[prescriptionIndex];
    const name = prescription ? meaningForPrescription(prescription)?.label : "Exercise";
    setMessage(`${name ?? "Exercise"} moved ${direction < 0 ? "up" : "down"}.`);
  }

  function moveSection(dayIndex: number, sectionIndex: number, direction: -1 | 1) {
    const section = draft.days[dayIndex]?.sections[sectionIndex];
    if (!section) return;
    setDraft((current) => reorderProgramSection(current, dayIndex, sectionIndex, direction));
    setMessage(`${section.title || section.kind} section moved ${direction < 0 ? "up" : "down"}.`);
  }

  function addSection(kind: (typeof PROGRAM_SECTION_KINDS)[number]) {
    try {
      setDraft((current) => addProgramSection(current, selectedDay, kind, operationKey()));
      setMessage(
        `${kind[0]!.toUpperCase() + kind.slice(1)} section added as an empty unpublished draft. Add a movement before publishing, or remove the section after review.`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The section could not be added.");
    }
  }

  function openSectionRemoval(
    dayIndex: number,
    sectionIndex: number,
    returnFocusTarget: HTMLElement,
  ) {
    const section = draft.days[dayIndex]?.sections[sectionIndex];
    if (!section) return;
    try {
      const review = reviewProgramSectionRemoval(
        draft,
        dayIndex,
        sectionIndex,
        section.prescriptions.map((prescription) =>
          meaningForPrescription(prescription)?.label ?? prescription.displayName ?? "Exercise",
        ),
      );
      // Mobile WebKit does not focus a button merely because it was tapped.
      // Capture the actual disclosure control instead of relying on activeElement.
      sectionRemovalReturnFocusRef.current = returnFocusTarget;
      setSectionRemoval({ dayIndex, review, sectionIndex });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The section could not be reviewed.");
    }
  }

  function confirmSectionRemoval() {
    if (!sectionRemoval) return;
    try {
      const next = removeProgramSection(draft, sectionRemoval.dayIndex, sectionRemoval.sectionIndex, {
        ...sectionRemoval.review,
        confirmed: true,
      });
      const remainingSections = next.days[sectionRemoval.dayIndex]?.sections;
      const focusSection = remainingSections?.[
        Math.min(sectionRemoval.sectionIndex, (remainingSections.length ?? 1) - 1)
      ];
      sectionRemovalReturnFocusRef.current = focusSection
        ? document.getElementById(`program-section-name-${focusSection.draftKey}`)
        : null;
      setDraft(next);
      setMessage(
        `${sectionRemoval.review.exerciseNames.join(", ") || "The empty section"} removed from this unpublished draft.`,
      );
      sectionRemovalDialogRef.current?.close();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The section could not be removed.");
    }
  }

  function handleChooserError(error: MovementChooserError) {
    setMessage(CHOOSER_ERROR_MESSAGES[error.code]);
  }

  function chooseMovement(selection: MovementSelection) {
    if (!chooser) return;
    const selectionKey = programEditorExerciseCandidateKey(
      selection.source.kind,
      selection.source.id,
    );
    setSelectionHints((current) => {
      const next = new Map(current);
      next.set(selectionKey, selection);
      return next;
    });
    if (chooser.request.intent === "seed-day") {
      addDayFromSelection(selection);
      return;
    } else if (chooser.request.intent === "add") {
      if (!("dayIndex" in chooser)) return;
      const localId = operationKey();
      localPrescriptionIdsRef.current.add(localId);
      setDraft((current) => {
        const next = addProgramPrescription(
          current,
          chooser.dayIndex,
          chooser.sectionIndex,
          selection,
        );
        const added = next.days[chooser.dayIndex]
          ?.sections[chooser.sectionIndex]
          ?.prescriptions.at(-1);
        if (!added) return next;
        added.sourcePrescriptionId = localId;
        return next;
      });
      setMessage(`${selection.name} added with editable defaults. This draft is still unpublished.`);
    } else {
      if (!("prescriptionIndex" in chooser) || !("currentSelection" in chooser.request)) return;
      const reset = chooser.request.currentSelection.loggingKind !== selection.loggingKind;
      setDraft((current) => replaceProgramPrescription(
        current,
        chooser.dayIndex,
        chooser.sectionIndex,
        chooser.prescriptionIndex,
        selection,
        chooser.request.currentSelection.loggingKind,
      ));
      setMessage(
        reset
          ? `${selection.name} selected. Sets, rest, and notes were retained; the range and incompatible targets were reset.`
          : `${selection.name} selected. Compatible range and targets were retained.`,
      );
    }
    setChooser(null);
  }

  function openPrescriptionRemoval(
    dayIndex: number,
    sectionIndex: number,
    prescriptionIndex: number,
    label: string,
    returnFocusTarget: HTMLElement,
  ) {
    try {
      const review = reviewProgramPrescriptionRemoval(
        draft,
        dayIndex,
        sectionIndex,
        prescriptionIndex,
        label,
      );
      prescriptionRemovalReturnFocusRef.current = returnFocusTarget;
      setPrescriptionRemoval({ dayIndex, prescriptionIndex, review, sectionIndex });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The movement could not be reviewed.");
    }
  }

  function confirmPrescriptionRemoval() {
    if (!prescriptionRemoval) return;
    try {
      const next = removeProgramPrescription(
        draft,
        prescriptionRemoval.dayIndex,
        prescriptionRemoval.sectionIndex,
        prescriptionRemoval.prescriptionIndex,
        { ...prescriptionRemoval.review, confirmed: true },
      );
      const remaining = next.days[prescriptionRemoval.dayIndex]
        ?.sections[prescriptionRemoval.sectionIndex]
        ?.prescriptions;
      const focusPrescription = remaining?.[
        Math.min(prescriptionRemoval.prescriptionIndex, (remaining.length ?? 1) - 1)
      ];
      prescriptionRemovalReturnFocusRef.current = focusPrescription
        ? document.getElementById(`program-prescription-${focusPrescription.prescriptionKey}`)
        : null;
      setDraft(next);
      setUndoDraft({ before: draft, after: next });
      setMessage(
        `${prescriptionRemoval.review.exerciseName} removed from this unpublished draft.`,
      );
      prescriptionRemovalDialogRef.current?.close();
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
    const selectionErrors = validateProgramExerciseSelections(
      publishableDraft,
      candidates,
      [...selectionHints.values()],
    );
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
    setSaveFailed(false);
    setMessage("Saving your routine…");
    try {
      const raw = await privateApiMutation<unknown>(
        "/api/app/program/publish",
        { body: checked.data, method: "POST" },
      );
      const response = parseProgramPublishResponse(raw, checked.data);
      const reconciliation = reconcileProgramRevisionMutation(program, response);
      if (reconciliation.kind === "stored-inactive") {
        setErrors([
          `${reconciliation.affectedProgramName}'s published revision is stored, but ${reconciliation.activeProgramName} remains active. Return to Your routes before editing again.`,
        ]);
        setMessage("The stored publication was reconciled without replacing this editor with another program.");
        queueMicrotask(() => errorRef.current?.focus());
        return;
      }
      const nextProgram = reconciliation.program;
      const nextDraft = programEditorDraftFromReadModel(nextProgram, operationKey());
      setProgram(nextProgram);
      setDraft(nextDraft);
      localPrescriptionIdsRef.current.clear();
      setBaseline(JSON.stringify(nextDraft));
      setMessage(
        "Routine saved. Past workouts stay as they were.",
      );
      queueMicrotask(() => statusRef.current?.focus());
      router.refresh();
    } catch (error) {
      setSaveFailed(true);
      setMessage(publishFailure(error));
    } finally {
      setBusy(false);
    }
  }

  const removingSection = sectionRemoval
    ? draft.days[sectionRemoval.dayIndex]?.sections[sectionRemoval.sectionIndex]
    : undefined;
  const removingSectionLabel = removingSection?.title.trim() || "program section";
  const showRoutineEditorCompanion = canShowRoutineEditorCompanion({
    busy,
    canMutate,
    dirty,
    hasErrors: errors.length > 0,
    hasOpenReview:
      chooser !== null ||
      dayCreatorOpen ||
      equipmentReviewOpen ||
      sectionRemoval !== null ||
      dayRemoval !== null ||
      prescriptionRemoval !== null,
    hasStatusMessage: saveFailed,
  });

  return (
    <section className="program-editor-page" aria-labelledby="program-editor-title">
      <header className="program-editor-hero companion-heading contour-surface">
        <div>
          <h1 id="program-editor-title">Your routine</h1>
          <p className="quiet-save-state" role="status">{busy ? "Saving…" : saveFailed ? "Save failed" : dirty ? "Unsaved changes" : "Saved"}</p>
          <p>Changes apply to future workouts. A workout already started keeps its original movements and targets.</p>
        </div>
        <nav className="quiet-routine-tools" aria-label="Routine tools"><Link className="secondary-action" href="/app/programs">Manage routines</Link>
        <Link className="secondary-action" href="/app/library">Browse movements</Link>
        <Link className="secondary-action" href="/app">
          Back to Today
        </Link></nav>
        {showRoutineEditorCompanion ? (
          <DecorativeCompanion variant="routine-editor" />
        ) : null}
      </header>

      {!canMutate ? (
        <div className="member-inline-notice" role="status">
          Verify your email and sign in again before publishing permanent changes. You can still inspect this draft.
        </div>
      ) : null}

      <details className="quiet-equipment-details"><summary>Equipment and substitutions</summary>
      <EquipmentProfileControl
        canMutate={canMutate}
        disabled={busy}
        draftDirty={dirty}
        onBusyChange={setBusy}
        onReviewChange={setEquipmentReviewOpen}
        onSaved={acceptEquipmentRevision}
        placement="editor"
        program={program}
      />
      </details>

      <div className="program-editor-layout">
        <aside className="program-editor-outline" aria-label="Program days">
          <label className="program-editor-field">
            <span>Routine name</span>
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
          <ol>
            {draft.days.map((day, dayIndex) => (
              <li key={day.dayKey}>
                <button
                  id={`program-day-${day.dayKey}`}
                  aria-current={selectedDay === dayIndex ? "step" : undefined}
                  onClick={() => setSelectedDayKey(day.dayKey)}
                  type="button"
                >
                  <span>{String(day.dayNumber).padStart(2, "0")}</span>
                  <strong>{day.displayName}</strong>
                  <small>{day.sections.flatMap(({ prescriptions }) => prescriptions).length} movements</small>
                </button>
                <div className="program-editor-day-actions" aria-label={`Actions for ${day.displayName}`}>
                  <button
                    aria-label={`Move ${day.displayName} up`}
                    disabled={busy || dayIndex === 0}
                    onClick={() => moveDay(day.dayKey, -1)}
                    type="button"
                  >Up</button>
                  <button
                    aria-label={`Move ${day.displayName} down`}
                    disabled={busy || dayIndex === draft.days.length - 1}
                    onClick={() => moveDay(day.dayKey, 1)}
                    type="button"
                  >Down</button>
                  <button
                    aria-label={`Duplicate ${day.displayName}`}
                    disabled={busy || draft.days.length >= 14}
                    onClick={() => duplicateDay(day.dayKey)}
                    type="button"
                  >Duplicate</button>
                  <button
                    aria-label={`Remove ${day.displayName}`}
                    disabled={busy || draft.days.length <= 1}
                    onClick={(event) => openDayRemoval(day.dayKey, event.currentTarget)}
                    type="button"
                  >Remove</button>
                </div>
              </li>
            ))}
          </ol>
          <button
            className="program-editor-add"
            disabled={busy || draft.days.length >= 14}
            onClick={openDayCreator}
            type="button"
          >Add day</button>
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
                  onChange={(event) => setDraft((current) =>
                    renameProgramDay(current, selected.dayKey, event.target.value),
                  )}
                  value={selected.displayName}
                />
              </label>
            </header>

            {selected.sections.map((section, sectionIndex) => {
              const sectionLabel = section.title.trim() || `${section.kind} section`;
              return (
              <fieldset className="program-editor-section" disabled={busy} key={section.draftKey}>
                <legend>
                  <span>{section.kind}</span>
                  <input
                    aria-label={`Section name for ${section.kind}`}
                    disabled={busy}
                    id={`program-section-name-${section.draftKey}`}
                    maxLength={120}
                    onChange={(event) => setDraft((current) =>
                      renameProgramSection(current, selectedDay, sectionIndex, event.target.value),
                    )}
                    value={section.title}
                  />
                </legend>
                <div className="program-editor-section-actions">
                  <div aria-label={`Reorder ${sectionLabel} section`} className="program-editor-reorder">
                    <button
                      aria-label={`Move ${sectionLabel} section up`}
                      disabled={sectionIndex === 0}
                      onClick={() => moveSection(selectedDay, sectionIndex, -1)}
                      type="button"
                    >Up</button>
                    <button
                      aria-label={`Move ${sectionLabel} section down`}
                      disabled={sectionIndex === selected.sections.length - 1}
                      onClick={() => moveSection(selectedDay, sectionIndex, 1)}
                      type="button"
                    >Down</button>
                  </div>
                  <button
                    aria-label={`Remove ${sectionLabel} section`}
                    disabled={selected.sections.length <= 1}
                    onClick={(event) => openSectionRemoval(
                      selectedDay,
                      sectionIndex,
                      event.currentTarget,
                    )}
                    type="button"
                  >Remove section</button>
                </div>
                {section.prescriptions.length === 0 ? (
                  <p className="program-editor-empty-section">
                    This section is empty. Add a movement before publishing, or remove it after reviewing the draft movements.
                  </p>
                ) : null}
                <ol>
                  {section.prescriptions.map((prescription, prescriptionIndex) => {
                    const meaning = meaningForPrescription(prescription);
                    const movementLabel = meaning?.label ?? prescription.displayName ?? "Exercise";
                    const duration = meaning?.measurementKind === "duration" || meaning?.measurementKind === "distance_duration";
                    const prescriptionDraftIdentity = prescription.prescriptionKey;
                    return (
                      <li
                        className="program-editor-prescription"
                        id={`program-prescription-${prescriptionDraftIdentity}`}
                        key={prescriptionDraftIdentity}
                        tabIndex={-1}
                      >
                        <header>
                          <div>
                            <span>{section.kind} · {meaning?.measurementKind.replaceAll("_", " ") ?? "exercise"}</span>
                            <h3>{movementLabel}</h3>
                          </div>
                          <div className="program-editor-prescription-actions">
                            <div className="program-editor-reorder" aria-label={`Reorder ${meaning?.label ?? "exercise"}`}>
                              <button
                                aria-label={`Move ${movementLabel} up`}
                                disabled={prescriptionIndex === 0}
                                onClick={() => move(selectedDay, sectionIndex, prescriptionIndex, -1)}
                                type="button"
                              >Up</button>
                              <button
                                aria-label={`Move ${movementLabel} down`}
                                disabled={prescriptionIndex === section.prescriptions.length - 1}
                                onClick={() => move(selectedDay, sectionIndex, prescriptionIndex, 1)}
                                type="button"
                              >Down</button>
                            </div>
                            <button
                              aria-label={`Replace ${movementLabel}`}
                              disabled={!meaning}
                              onClick={() => {
                                if (!meaning) return;
                                const currentSelection = movementSelectionFromPrescription(
                                  prescription,
                                  movementLabel,
                                  meaning.measurementKind,
                                );
                                if (!currentSelection) {
                                  handleChooserError({
                                    code: "invalid_selection",
                                    message: "This movement cannot be replaced until its saved identity is recovered.",
                                    retryable: false,
                                  });
                                  return;
                                }
                                openChooser({
                                  dayIndex: selectedDay,
                                  prescriptionIndex,
                                  request: { intent: "replace", currentSelection },
                                  sectionIndex,
                                });
                              }}
                              type="button"
                            >Replace</button>
                            <button
                              aria-label={`Remove ${movementLabel}`}
                              disabled={busy}
                              onClick={(event) => openPrescriptionRemoval(
                                selectedDay,
                                sectionIndex,
                                prescriptionIndex,
                                movementLabel,
                                event.currentTarget,
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
                            <label><span>Target {unitLabels.weight} (optional)</span><CanonicalMeasurementInput canonicalValue={prescription.targetWeightKg} measurement="weight" min={0} onCommit={(targetWeightKg) => updatePrescription(selectedDay, sectionIndex, prescriptionIndex, { targetWeightKg })} onPendingChange={markMeasurementPending} pendingKey={`${selected.dayKey}:${prescriptionDraftIdentity}:weight`} step={unitSystem === "imperial" ? "0.1" : "0.25"} unitSystem={unitSystem} /></label>
                          ) : null}
                          {meaning?.measurementKind === "distance_duration" ? (
                            <label><span>Target {unitLabels.distance}</span><CanonicalMeasurementInput canonicalValue={prescription.targetDistanceM} measurement="distance" min={unitSystem === "imperial" ? "0.0001" : "0.001"} onCommit={(targetDistanceM) => updatePrescription(selectedDay, sectionIndex, prescriptionIndex, { targetDistanceM })} onPendingChange={markMeasurementPending} pendingKey={`${selected.dayKey}:${prescriptionDraftIdentity}:distance`} step={unitSystem === "imperial" ? "0.0001" : "0.001"} unitSystem={unitSystem} /></label>
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
                    request: { intent: "add" },
                    sectionIndex,
                  })}
                  type="button"
                >Add movement</button>
              </fieldset>
              );
            })}

            <details className="program-editor-add-section"><summary>Add a section</summary>
              <p>Sections can share a classification and start empty. Add a movement before publishing, or remove an empty section after review.</p>
              <div>
                {PROGRAM_SECTION_KINDS.map((kind) => (
                  <button
                    disabled={busy || selected.sections.length >= 12}
                    key={kind}
                    onClick={() => addSection(kind)}
                    type="button"
                  >Add {kind} section</button>
                ))}
              </div>
            </details>

            <fieldset className="program-editor-section program-editor-cardio" disabled={busy}>
              <legend>Optional cardio</legend>
              {selected.cardio.length === 0 ? (
                <p className="program-editor-empty-section">No cardio choices are attached to this day.</p>
              ) : null}
              <div className="program-editor-cardio-grid">
                {selected.cardio.map((cardio) => (
                  <section key={cardio.cardioKey} aria-labelledby={`cardio-${selected.dayKey}-${cardio.cardioKey}`}>
                    <header>
                      <h3 id={`cardio-${selected.dayKey}-${cardio.cardioKey}`}>{cardio.mode}</h3>
                      <div className="program-editor-cardio-actions">
                        <div
                          aria-label={`Reorder ${cardio.mode} cardio`}
                          className="program-editor-reorder"
                        >
                          <button
                            aria-label={`Move ${cardio.mode} cardio up`}
                            disabled={selected.cardio[0]?.cardioKey === cardio.cardioKey}
                            onClick={() => moveCardio(cardio.cardioKey, cardio.mode, -1)}
                            type="button"
                          >Up</button>
                          <button
                            aria-label={`Move ${cardio.mode} cardio down`}
                            disabled={selected.cardio.at(-1)?.cardioKey === cardio.cardioKey}
                            onClick={() => moveCardio(cardio.cardioKey, cardio.mode, 1)}
                            type="button"
                          >Down</button>
                        </div>
                        <button
                          aria-label={`Remove ${cardio.mode} cardio`}
                          onClick={() => removeCardio(cardio.cardioKey, cardio.mode)}
                          type="button"
                        >Remove cardio</button>
                      </div>
                    </header>
                    <div className="program-editor-grid">
                      <label><span>Duration seconds</span><input min={1} onChange={(event) => updateCardio(selectedDay, cardio.cardioKey, { durationSeconds: Number(event.target.value) })} type="number" value={cardio.durationSeconds} /></label>
                      <label><span>Distance {unitLabels.distance}</span><CanonicalMeasurementInput canonicalValue={cardio.distanceM} measurement="distance" min={unitSystem === "imperial" ? 0.0001 : 0.001} onCommit={(distanceM) => updateCardio(selectedDay, cardio.cardioKey, { distanceM })} onPendingChange={markMeasurementPending} pendingKey={`${selected.dayKey}:${cardio.cardioKey}:distance`} step={unitSystem === "imperial" ? "0.0001" : "0.001"} unitSystem={unitSystem} /></label>
                      <label><span>Pace {unitLabels.pace}</span><CanonicalMeasurementInput canonicalValue={cardio.paceSecondsPerKm} measurement="pace" min={1} onCommit={(paceSecondsPerKm) => updateCardio(selectedDay, cardio.cardioKey, { paceSecondsPerKm })} onPendingChange={markMeasurementPending} pendingKey={`${selected.dayKey}:${cardio.cardioKey}:pace`} step="1" unitSystem={unitSystem} /></label>
                      <label><span>Incline %</span><input min={0} max={100} onChange={(event) => updateCardio(selectedDay, cardio.cardioKey, { inclinePercent: optionalNumber(event.target.value) })} step="0.1" type="number" value={cardio.inclinePercent ?? ""} /></label>
                      <label className="program-editor-wide"><span>Notes</span><textarea maxLength={2000} onChange={(event) => updateCardio(selectedDay, cardio.cardioKey, { notes: event.target.value })} value={cardio.notes ?? ""} /></label>
                    </div>
                  </section>
                ))}
              </div>
              <div className="program-editor-add-section">
                {(["walker", "runner"] as const).filter((mode) =>
                  !selected.cardio.some((cardio) => cardio.mode === mode),
                ).map((mode) => (
                  <button key={mode} onClick={() => addCardio(mode)} type="button">
                    Add {mode} cardio
                  </button>
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
              <strong>{dirty ? "Unsaved changes" : "Saved"}</strong>
              <p>Save when your routine is ready. You can keep editing afterward.</p>
            </div>
            <div className="program-editor-footer-actions">
              {undoDraft && undoDraft.after === draft ? <button type="button" className="secondary-action" disabled={busy} onClick={() => {setDraft(undoDraft.before); setUndoDraft(null); setMessage("Movement restored to your draft.");}}>Undo removal</button> : null}
              {!dirty ? (
                <Link
                  className="secondary-action"
                  href={`/app/program/${selected.dayKey}`}
                  prefetch={false}
                >Open saved day</Link>
              ) : null}
              <button className="primary-action" disabled={!canMutate || busy || !dirty} onClick={() => void publish()} type="button">
                {busy ? "Saving…" : "Save routine"}<Icon name="arrow-right" />
              </button>
            </div>
          </footer>
          <div aria-live="polite" className="member-save-status" ref={statusRef} role="status" tabIndex={-1}>{message}</div>
        </div>
      </div>

      {dayCreatorOpen ? (
        <section
          aria-labelledby="program-day-creator-title"
          className="program-editor-day-creation-fields program-editor-day-setup"
        >
          <header>
            <span className="eyebrow">New unpublished day</span>
            <h2 id="program-day-creator-title">Name the day before choosing its first movement</h2>
          </header>
          <label className="program-editor-field">
            <span>Day name</span>
            <input
              aria-required="true"
              maxLength={120}
              onChange={(event) => setNewDayName(event.target.value)}
              ref={dayNameRef}
              value={newDayName}
            />
          </label>
          <label className="program-editor-field">
            <span>First section name</span>
            <input
              aria-required="true"
              maxLength={120}
              onChange={(event) => setNewDaySectionName(event.target.value)}
              value={newDaySectionName}
            />
          </label>
          <label className="program-editor-field">
            <span>Section classification</span>
            <select
              onChange={(event) => setNewDaySectionKind(event.target.value as ProgramSectionKind)}
              value={newDaySectionKind}
            >
              {PROGRAM_SECTION_KINDS.map((kind) => <option key={kind} value={kind}>{kind}</option>)}
            </select>
          </label>
          <p>Choosing a movement next creates one new day with fresh topology keys. Cardio is optional.</p>
          <footer>
            <button
              onClick={() => {
                setDayCreatorOpen(false);
                queueMicrotask(() => returnFocusRef.current?.focus());
              }}
              type="button"
            >Cancel</button>
            <button className="primary-action" onClick={chooseFirstDayMovement} type="button">
              Choose first movement
            </button>
          </footer>
        </section>
      ) : null}

      {chooser ? (
        <MovementChooserAdapter
          onDismiss={dismissChooser}
          onError={handleChooserError}
          onSelect={chooseMovement}
          request={chooser.request}
        />
      ) : null}

      {dayRemoval ? (
        <dialog
          aria-labelledby="day-removal-title"
          className="program-section-removal"
          onClick={(event) => {
            if (event.target === event.currentTarget) event.currentTarget.close();
          }}
          onClose={dismissDayRemoval}
          ref={dayRemovalDialogRef}
        >
          <div className="program-section-removal-sheet">
            <header>
              <div>
                <span className="eyebrow">Review unpublished changes</span>
                <h2 id="day-removal-title">Remove this day?</h2>
              </div>
              <button
                aria-label="Close day removal review"
                onClick={() => dayRemovalDialogRef.current?.close()}
                type="button"
              >Close</button>
            </header>
            <div className="program-section-removal-content">
              <p>
                Removing this day removes its sections, movements, and optional cardio from the next publication. Earlier revisions and completed workouts remain unchanged.
              </p>
              {dayRemoval.review.exerciseNames.length > 0 ? (
                <ul>
                  {dayRemoval.review.exerciseNames.map((name, index) => (
                    <li key={`${dayRemoval.review.prescriptionKeys[index] ?? name}-${index}`}>{name}</li>
                  ))}
                </ul>
              ) : (
                <p>This day has no draft movements yet.</p>
              )}
            </div>
            <footer>
              <button onClick={() => dayRemovalDialogRef.current?.close()} type="button">
                Keep day
              </button>
              <button
                className="primary-action"
                onClick={confirmDayRemoval}
                ref={dayRemovalConfirmRef}
                type="button"
              >
                Remove day
              </button>
            </footer>
          </div>
        </dialog>
      ) : null}

      {prescriptionRemoval ? (
        <dialog
          aria-labelledby="prescription-removal-title"
          className="program-section-removal"
          onClick={(event) => {
            if (event.target === event.currentTarget) event.currentTarget.close();
          }}
          onClose={dismissPrescriptionRemoval}
          ref={prescriptionRemovalDialogRef}
        >
          <div className="program-section-removal-sheet">
            <header>
              <div>
                <span className="eyebrow">Review unpublished changes</span>
                <h2 id="prescription-removal-title">
                  Remove {prescriptionRemoval.review.exerciseName}?
                </h2>
              </div>
              <button
                aria-label="Close movement removal review"
                onClick={() => prescriptionRemovalDialogRef.current?.close()}
                type="button"
              >Close</button>
            </header>
            <div className="program-section-removal-content">
              <p>
                Removing this movement omits it from the next publication. Earlier revisions and workout snapshots remain unchanged.
              </p>
            </div>
            <footer>
              <button
                onClick={() => prescriptionRemovalDialogRef.current?.close()}
                type="button"
              >Keep movement</button>
              <button
                className="primary-action"
                onClick={confirmPrescriptionRemoval}
                ref={prescriptionRemovalConfirmRef}
                type="button"
              >Remove movement</button>
            </footer>
          </div>
        </dialog>
      ) : null}

      {sectionRemoval ? (
        <dialog
          aria-labelledby="section-removal-title"
          className="program-section-removal"
          onClick={(event) => {
            if (event.target === event.currentTarget) event.currentTarget.close();
          }}
          onClose={dismissSectionRemoval}
          ref={sectionRemovalDialogRef}
        >
          <div className="program-section-removal-sheet">
            <header>
              <div>
                <span className="eyebrow">Review unpublished changes</span>
                <h2 id="section-removal-title">Remove {removingSectionLabel}?</h2>
              </div>
              <button
                aria-label="Close section removal review"
                onClick={() => sectionRemovalDialogRef.current?.close()}
                type="button"
              >Close</button>
            </header>
            <div className="program-section-removal-content">
              <p>
                Removing this section will also remove these draft movements from the next publication. Earlier revisions and completed workouts remain unchanged.
              </p>
              {sectionRemoval.review.exerciseNames.length > 0 ? (
                <ul>
                  {sectionRemoval.review.exerciseNames.map((name, index) => (
                    <li key={`${sectionRemoval.review.prescriptionKeys[index] ?? name}-${index}`}>{name}</li>
                  ))}
                </ul>
              ) : (
                <p>This section has no draft movements yet.</p>
              )}
            </div>
            <footer>
              <button onClick={() => sectionRemovalDialogRef.current?.close()} type="button">
                Keep section
              </button>
              <button
                className="primary-action"
                onClick={confirmSectionRemoval}
                ref={sectionRemovalConfirmRef}
                type="button"
              >
                Remove section and movements
              </button>
            </footer>
          </div>
        </dialog>
      ) : null}
    </section>
  );
}
