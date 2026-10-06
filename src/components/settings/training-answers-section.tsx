"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { privateApiMutation, PrivateApiClientError } from "@/client/private-api";
import {
  buildRoutineFromAnswers,
  createRetryStableKey,
  saveTrainingProfile,
} from "@/client/training-profile";
import { parseProgramCollectionResponse } from "@/components/program/program-collection-model";
import {
  DAYS_PER_WEEK_CHOICES,
  EXPERIENCE_OPTIONS,
  TRAINING_GOAL_OPTIONS,
} from "@/components/settings/training-answer-options";
import { Icon } from "@/components/ui/icon";
import type { EquipmentProfileKind } from "@/domain/equipment";
import type { DaysPerWeek, ExperienceLevel, TrainingGoal } from "@/domain/programs/generate-routine";
import type {
  ProgramSummaryReadModel,
  TrainingProfileReadModel,
} from "@/server/repositories/profile-program";

type Busy = "save" | "build" | "activate" | null;

function failureFor(error: unknown, fallback: string): Readonly<{ conflict: boolean; text: string }> {
  if (error instanceof PrivateApiClientError) {
    if (error.code === "conflict") {
      return { conflict: true, text: "Your answers changed somewhere else. Reload to see the latest, then try again." };
    }
    if (error.code === "email_unverified") return { conflict: false, text: "Verify your email to save changes." };
  }
  return { conflict: false, text: fallback };
}

/**
 * Settings "Your training": the saved onboarding answers, editable with choice tiles.
 * Saving answers never touches the active routine. Building a routine adds it to the
 * member's routines first, then asks before making it active.
 */
export function TrainingAnswersSection({
  activeProgramId,
  canMutate,
  disabled,
  equipmentProfileKind,
  initialTrainingProfile,
}: Readonly<{
  activeProgramId: string | null;
  canMutate: boolean;
  disabled: boolean;
  equipmentProfileKind: EquipmentProfileKind | null;
  initialTrainingProfile: TrainingProfileReadModel | null;
}>) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialTrainingProfile);
  const [goal, setGoal] = useState<TrainingGoal | null>(initialTrainingProfile?.goal ?? null);
  const [experience, setExperience] = useState<ExperienceLevel | null>(initialTrainingProfile?.experience ?? null);
  const [days, setDays] = useState<DaysPerWeek | null>(initialTrainingProfile?.daysPerWeek ?? null);
  const [busy, setBusy] = useState<Busy>(null);
  const [message, setMessage] = useState("");
  const [failure, setFailure] = useState<Readonly<{ conflict: boolean; text: string }> | null>(null);
  const [built, setBuilt] = useState<ProgramSummaryReadModel | null>(null);
  const [sheetFailure, setSheetFailure] = useState("");
  const [kept, setKept] = useState(false);
  const saveKey = useRef(createRetryStableKey());
  const buildKey = useRef(createRetryStableKey());
  const activateKey = useRef(createRetryStableKey());
  const sheet = useRef<HTMLDialogElement>(null);
  const sheetHeading = useRef<HTMLHeadingElement>(null);
  const buildButton = useRef<HTMLButtonElement>(null);

  if (!activeProgramId || !equipmentProfileKind) {
    return (
      <section className="pal-settings-section" aria-labelledby="training-title">
        <h2 id="training-title">Your training</h2>
        <p>Answer a few quick questions and we&apos;ll build a routine that fits you.</p>
        <Link className="primary-action" href="/app">Set up your routine <Icon name="arrow-right" /></Link>
      </section>
    );
  }

  const locked = !canMutate || disabled || busy !== null;
  const dirty = goal !== (saved?.goal ?? null) || experience !== (saved?.experience ?? null) || days !== (saved?.daysPerWeek ?? null);
  const complete = goal !== null && experience !== null && days !== null;

  function change(apply: () => void) {
    apply();
    saveKey.current.settle();
    setMessage("");
    setFailure(null);
  }

  async function save() {
    if (locked || goal === null || experience === null || days === null || !dirty) return;
    setBusy("save");
    setFailure(null);
    setMessage("Saving…");
    try {
      const result = await saveTrainingProfile({
        expectedUpdatedAt: saved?.updatedAt ?? null,
        idempotencyKey: saveKey.current.current(),
        trainingProfile: { daysPerWeek: days, experience, goal },
      });
      saveKey.current.settle();
      setSaved(result);
      setMessage("Saved. Your current routine hasn't changed.");
    } catch (error) {
      setMessage("");
      setFailure(failureFor(error, "Your answers weren't saved. Check your connection and try again."));
    } finally {
      setBusy(null);
    }
  }

  async function build() {
    if (locked || !saved || dirty || !equipmentProfileKind) return;
    setBusy("build");
    setFailure(null);
    setMessage("Building your new routine…");
    try {
      const result = await buildRoutineFromAnswers({
        activate: false,
        equipmentProfileKind,
        idempotencyKey: buildKey.current.current(),
        trainingProfile: { daysPerWeek: saved.daysPerWeek, experience: saved.experience, goal: saved.goal },
      });
      buildKey.current.settle();
      activateKey.current.settle();
      setBuilt(result.program);
      setKept(false);
      setMessage(`${result.program.name} is saved in your routines.`);
      setSheetFailure("");
      sheet.current?.showModal();
      globalThis.requestAnimationFrame(() => sheetHeading.current?.focus());
    } catch (error) {
      setMessage("");
      setFailure(failureFor(error, "Your new routine wasn't built. Check your connection and try again."));
    } finally {
      setBusy(null);
    }
  }

  async function activate() {
    if (!built || !activeProgramId || busy !== null || !canMutate) return;
    setBusy("activate");
    setSheetFailure("");
    try {
      const raw = await privateApiMutation<unknown>("/api/app/programs/activate", {
        body: {
          expectedActiveProgramId: activeProgramId,
          idempotencyKey: activateKey.current.current(),
          programId: built.id,
          revisionId: built.revisionId,
        },
        method: "POST",
      });
      parseProgramCollectionResponse(raw, { kind: "activate", programId: built.id, revisionId: built.revisionId });
      activateKey.current.settle();
      setBuilt(null);
      sheet.current?.close();
      setMessage(`${built.name} is now your active routine. Opening Today…`);
      router.push("/app");
    } catch (error) {
      setSheetFailure(
        error instanceof PrivateApiClientError && error.code === "conflict"
          ? "Your routines changed somewhere else. Keep your current one for now, then check Your routines."
          : "We couldn't switch your routine. Try again, or keep your current one.",
      );
    } finally {
      setBusy(null);
    }
  }

  function keepCurrent() {
    sheet.current?.close();
  }

  const choiceGroup = <T extends string | number>(
    name: string,
    legend: string,
    options: ReadonlyArray<readonly [T, string, string]>,
    value: T | null,
    set: (value: T) => void,
    modifier = "",
  ) => (
    <fieldset className="pal-settings-question" disabled={locked}>
      <legend>{legend}</legend>
      <div className={`pal-choices${modifier}`}>
        {options.map(([option, label, detail]) => (
          <label className="pal-choice" key={String(option)}>
            <input checked={value === option} name={name} onChange={() => change(() => set(option))} type="radio" />
            <span><strong>{label}</strong>{detail ? <small>{detail}</small> : null}</span>
            <Icon className="pal-choice-check" name="check" />
          </label>
        ))}
      </div>
    </fieldset>
  );

  return (
    <section className="pal-settings-section" aria-labelledby="training-title">
      <h2 id="training-title">Your training</h2>
      <p>Changing these answers won&apos;t change your current routine.</p>
      {choiceGroup("training-goal", "What are you training for?", TRAINING_GOAL_OPTIONS, goal, setGoal)}
      {choiceGroup("training-experience", "How much lifting have you done?", EXPERIENCE_OPTIONS, experience, setExperience)}
      {choiceGroup("training-days", "How many days a week can you train?", DAYS_PER_WEEK_CHOICES, days, setDays, " pal-settings-days")}

      <div className="pal-actions">
        <button className="primary-action" disabled={locked || !complete || !dirty} onClick={() => void save()} type="button">
          {busy === "save" ? "Saving…" : "Save answers"}
        </button>
        <button
          className="secondary-action"
          disabled={locked || !saved || dirty}
          onClick={() => void build()}
          ref={buildButton}
          type="button"
        >
          {busy === "build" ? "Building…" : "Build a new routine from these answers"}
        </button>
      </div>
      {dirty && saved ? <p className="pal-settings-hint">Save your answers first to build a routine from them.</p> : null}
      {!saved && !complete ? <p className="pal-settings-hint">Answer all three to save.</p> : null}
      {failure ? (
        <div className="pal-settings-failure" role="alert">
          <p>{failure.text}</p>
          {failure.conflict ? (
            <button className="secondary-action" onClick={() => window.location.reload()} type="button">Reload</button>
          ) : null}
        </div>
      ) : null}
      <p aria-live="polite" className="pal-status" role="status">{message}</p>
      {built && kept ? (
        <p className="pal-settings-hint">
          You can make it active any time from <Link href="/app/programs">Your routines</Link>.
        </p>
      ) : null}

      <dialog
        aria-describedby="training-routine-sheet-body"
        aria-labelledby="training-routine-sheet-title"
        className="pal-sheet pal-settings-sheet"
        onCancel={(event) => {
          if (busy === "activate") event.preventDefault();
        }}
        onClose={() => {
          setKept(true);
          buildButton.current?.focus();
        }}
        ref={sheet}
      >
        <h2 id="training-routine-sheet-title" ref={sheetHeading} tabIndex={-1}>Make it your active routine?</h2>
        <p id="training-routine-sheet-body">
          {built ? `${built.name} is ready in your routines. ` : ""}If you make it active, Today uses it from now on. Your past workouts stay just as they are.
        </p>
        {sheetFailure ? <p className="pal-settings-failure" role="alert">{sheetFailure}</p> : null}
        <div className="pal-actions">
          <button className="primary-action" disabled={busy === "activate" || !canMutate} onClick={() => void activate()} type="button">
            {busy === "activate" ? "Switching…" : "Make it active"}
          </button>
          <button className="secondary-action" disabled={busy === "activate"} onClick={keepCurrent} type="button">Not now</button>
        </div>
      </dialog>
    </section>
  );
}
