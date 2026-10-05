"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { useLocaleUnitSystem } from "@/client/locale-units";
import { privateApiMutation, PrivateApiClientError } from "@/client/private-api";
import { parseOnboardingResponse } from "@/components/program/program-mutation-response";
import { EquipmentIllustration } from "@/components/ui/equipment-illustration";
import { Icon } from "@/components/ui/icon";
import { PalSticker, SceneStage } from "@/components/ui/scene-stage";
import { MovementDemo } from "@/components/video/demo-sheet";
import { EQUIPMENT_PROFILES, supportsEquipment, type EquipmentProfileKind } from "@/domain/equipment";
import { CATALOG_EXERCISES } from "@/domain/exercises/catalog";
import {
  generateStarterRoutine,
  type DaysPerWeek,
  type ExperienceLevel,
  type GeneratedRoutineMovement,
  type TrainingGoal,
} from "@/domain/programs/generate-routine";
import type { CuratedVideos } from "@/domain/youtube/embed";

type Mode = "generated" | "example" | "blank";
type Stage = "goal" | "experience" | "days" | "equipment" | "routine" | "tour";
const QUESTIONS: readonly Stage[] = ["goal", "experience", "days", "equipment", "routine"];

const GOALS: ReadonlyArray<readonly [TrainingGoal, string, string]> = [
  ["strength", "Get stronger", "Lift heavier over time."],
  ["muscle", "Build muscle", "Grow and shape your muscles."],
  ["general", "Feel fitter overall", "Move well and feel good."],
  ["fat_loss", "Lose fat", "Lift, plus a walk or run to finish."],
  ["sport", "Train for a sport or event", "Strength with extra core work."],
];
const EXPERIENCE: ReadonlyArray<readonly [ExperienceLevel, string, string]> = [
  ["new", "I'm new to this", "Under 6 months of lifting."],
  ["some", "Some", "6 months to 2 years."],
  ["lots", "Lots", "More than 2 years."],
];
const DAYS: readonly DaysPerWeek[] = [2, 3, 4, 5];
const TOUR = [
  { title: "Your next workout lives on Today.", body: "Open the app at the gym and tap Start. Your pal keeps the plan ready." },
  { title: "Log what you actually did.", body: "Weight and reps in a tap. Your rest timer starts on its own, and the next set is waiting." },
  { title: "Not sure how a move goes?", body: "Watch a quick demo. It opens right where you are, so you never lose your spot." },
  { title: "Every set adds up.", body: "Progress shows your workouts, your records and your gains as they grow." },
] as const;

function targetLabel(movement: GeneratedRoutineMovement) {
  const sets = `${movement.setCount} ${movement.setCount === 1 ? "set" : "sets"}`;
  if (movement.minimumReps !== null) return `${sets} · ${movement.minimumReps}–${movement.maximumReps} reps`;
  if (movement.minimumSeconds !== null) return `${sets} · ${movement.minimumSeconds}–${movement.maximumSeconds} sec`;
  return sets;
}

function failedMessage(error: unknown) {
  return error instanceof PrivateApiClientError ? error.message : "Your routine wasn't saved. Check your connection and try again.";
}

export function OnboardingForm({
  canMutate,
  demos = {},
  displayName = "",
}: Readonly<{ canMutate: boolean; demos?: Readonly<Record<string, CuratedVideos>>; displayName?: string }>) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("goal");
  const [goal, setGoal] = useState<TrainingGoal | null>(null);
  const [experience, setExperience] = useState<ExperienceLevel | null>(null);
  const [daysPerWeek, setDaysPerWeek] = useState<DaysPerWeek | null>(null);
  const [equipment, setEquipment] = useState<EquipmentProfileKind | null>(null);
  const [mode, setMode] = useState<Mode>("generated");
  const [firstExerciseSlug, setFirstExerciseSlug] = useState("");
  const [search, setSearch] = useState("");
  const localeUnitSystem = useLocaleUnitSystem();
  const [unitChoice, setUnitSystem] = useState<"metric" | "imperial" | null>(null);
  const unitSystem = unitChoice ?? localeUnitSystem;
  const [missing, setMissing] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [tourIndex, setTourIndex] = useState(0);
  const saveKey = useRef<string | undefined>(undefined);
  const heading = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);
  const firstName = displayName.trim().split(/\s+/u)[0] ?? "";

  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    heading.current?.focus();
  }, [stage, tourIndex]);

  const routine = useMemo(
    () => goal && experience && daysPerWeek && equipment ? generateStarterRoutine({ goal, experience, daysPerWeek, equipment }) : null,
    [goal, experience, daysPerWeek, equipment],
  );
  const choices = equipment ? Object.values(CATALOG_EXERCISES).filter((exercise) =>
    supportsEquipment(EQUIPMENT_PROFILES[equipment], exercise.requiredEquipment) &&
    `${exercise.name} ${exercise.aliases.join(" ")}`.toLowerCase().includes(search.toLowerCase())) : [];
  const answered: Record<Stage, boolean> = { goal: goal !== null, experience: experience !== null, days: daysPerWeek !== null, equipment: equipment !== null, routine: true, tour: true };
  const questionNumber = QUESTIONS.indexOf(stage) + 1;
  const firstMovement = routine?.days[0]?.sections.flatMap((section) => section.movements)[0];

  function change(update: () => void) { update(); saveKey.current = undefined; setMissing(""); }
  function next() {
    if (!answered[stage]) { setMissing("Pick one to continue."); return; }
    setMissing("");
    setStage(QUESTIONS[QUESTIONS.indexOf(stage) + 1] ?? "routine");
  }
  function back() { setMissing(""); setStage(QUESTIONS[QUESTIONS.indexOf(stage) - 1] ?? "goal"); }

  async function save() {
    if (!canMutate || busy || !equipment || !goal || !experience || !daysPerWeek) return;
    if (mode === "blank" && !firstExerciseSlug) { setMessage("Add your first movement before saving."); return; }
    const idempotencyKey = saveKey.current ?? globalThis.crypto.randomUUID();
    saveKey.current = idempotencyKey;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const trainingProfile = { goal, experience, daysPerWeek };
    setBusy(true);
    setMessage("Saving your routine…");
    try {
      const response = await privateApiMutation<unknown>("/api/app/profile-program/onboard", {
        body: {
          equipmentProfileKind: equipment,
          idempotencyKey,
          mode,
          ...(mode === "blank" ? { firstExerciseSlug } : {}),
          ...(mode === "generated" ? { trainingProfile } : {}),
          reducedMotion,
          timezone,
          unitSystem,
        },
        method: "POST",
      });
      parseOnboardingResponse(response, { equipmentProfileKind: equipment, mode, reducedMotion, timezone, unitSystem, ...(mode === "generated" ? { trainingProfile } : {}) });
      saveKey.current = undefined;
      setMessage("Your routine is saved.");
      if (mode === "blank") { router.push("/app/program/edit"); return; }
      setStage("tour");
    } catch (error) {
      setMessage(failedMessage(error));
    } finally {
      setBusy(false);
    }
  }

  function finishTour() { router.refresh(); }

  const choiceList = <T extends string | number>(name: string, options: ReadonlyArray<readonly [T, string, string]>, value: T | null, set: (value: T) => void) => (
    <div className="pal-choices" role="radiogroup" aria-labelledby="onboarding-heading" aria-describedby={missing ? "onboarding-missing" : undefined}>
      {options.map(([option, label, detail]) => <label className="pal-choice" key={String(option)}>
        <input checked={value === option} disabled={busy} name={name} onChange={() => change(() => set(option))} type="radio" />
        <span><strong>{label}</strong>{detail ? <small>{detail}</small> : null}</span>
        <Icon name="check" />
      </label>)}
    </div>
  );

  return (
    <section className="pal-onboarding" aria-labelledby="onboarding-heading">
      <SceneStage priority />
      <div className="pal-onboarding-body">
        {stage !== "tour" ? <div className="pal-drive-top">
          <p className="pal-step-count">Step {questionNumber} of {QUESTIONS.length}</p>
          <ol aria-hidden="true" className="pal-steps">{QUESTIONS.map((name, index) => <li className={index < questionNumber ? "is-done" : undefined} key={name} />)}</ol>
        </div> : null}
        {!canMutate ? <p className="pal-notice" role="status">Verify your email and sign in again before saving a routine. You can still look around.</p> : null}

        {stage === "goal" ? <>
          <p className="pal-onboarding-hello">{firstName ? `Hi ${firstName}! ` : "Hi! "}Let&apos;s build a routine that fits you.</p>
          <h1 id="onboarding-heading" ref={heading} tabIndex={-1}>What are you training for?</h1>
          {choiceList("goal", GOALS, goal, setGoal)}
        </> : null}
        {stage === "experience" ? <>
          <h1 id="onboarding-heading" ref={heading} tabIndex={-1}>How much lifting have you done?</h1>
          {choiceList("experience", EXPERIENCE, experience, setExperience)}
        </> : null}
        {stage === "days" ? <>
          <h1 id="onboarding-heading" ref={heading} tabIndex={-1}>How many days a week can you train?</h1>
          <p className="pal-drive-lead">Pick what you can keep up. You can change it later.</p>
          {choiceList("days", DAYS.map((count) => [count, `${count} days`, ""] as const), daysPerWeek, setDaysPerWeek)}
        </> : null}
        {stage === "equipment" ? <>
          <h1 id="onboarding-heading" ref={heading} tabIndex={-1}>What do you have to work with?</h1>
          <div className="pal-choices pal-choices--art" role="radiogroup" aria-labelledby="onboarding-heading" aria-describedby={missing ? "onboarding-missing" : undefined}>
            {(Object.keys(EQUIPMENT_PROFILES) as EquipmentProfileKind[]).map((profile) => <label className="pal-choice" key={profile}>
              <input checked={equipment === profile} disabled={busy} name="equipment-profile" onChange={() => change(() => { setEquipment(profile); setFirstExerciseSlug(""); })} type="radio" />
              <EquipmentIllustration kind={profile === "barbell" ? "barbell" : "dumbbell"} />
              <span><strong>{profile === "barbell" ? "A full gym with a barbell and rack" : "Dumbbells, a bench and bodyweight"}</strong><small>{EQUIPMENT_PROFILES[profile].description}</small></span>
              <Icon name="check" />
            </label>)}
          </div>
        </> : null}

        {stage === "routine" && routine && equipment ? <>
          <h1 id="onboarding-heading" ref={heading} tabIndex={-1}>{mode === "generated" ? "Here's your routine." : mode === "example" ? "The five-day example." : "Start with one movement."}</h1>
          {mode === "generated" ? <>
            <p className="pal-drive-lead">{routine.name}. Built from your answers, and you can change anything later.</p>
            <ol className="pal-routine-preview">
              {routine.days.map((day) => <li key={day.dayNumber}>
                <h2>Day {day.dayNumber} · {day.name}</h2>
                <ol className="pal-moves">
                  {day.sections.flatMap((section) => section.movements).map((movement, index) => <li className="pal-move" key={`${movement.exerciseSlug}-${index}`}>
                    <span aria-hidden="true" className="pal-move-number">{index + 1}</span>
                    <div><strong className="pal-move-name">{movement.displayName}</strong><small>{targetLabel(movement)}</small></div>
                    <MovementDemo movementName={movement.displayName} videos={demos[movement.exerciseSlug]} />
                  </li>)}
                </ol>
                {day.cardio.length ? <p className="pal-note">Finish with a {Math.round((day.cardio[0]?.durationSeconds ?? 0) / 60)}-minute walk or run.</p> : null}
              </li>)}
            </ol>
          </> : null}
          {mode === "example" ? <p className="pal-drive-lead">Five ready days (Push, Pull, Legs, Upper and Lower) using {EQUIPMENT_PROFILES[equipment].label.toLowerCase()}. You can change anything later.</p> : null}
          {mode === "blank" ? <div className="pal-blank-start">
            <p className="pal-drive-lead">{firstExerciseSlug ? "Day 1 · You can add more and set targets after saving." : "Pick your first movement. Nothing is saved until you do."}</p>
            {firstExerciseSlug ? <div className="pal-move"><span aria-hidden="true" className="pal-move-number">1</span><div><strong className="pal-move-name">{CATALOG_EXERCISES[firstExerciseSlug]?.name}</strong></div><button className="secondary-action" onClick={() => change(() => setFirstExerciseSlug(""))} type="button">Remove movement</button></div> : <>
              <label htmlFor="first-movement-search">Search movements</label>
              <input id="first-movement-search" onChange={(event) => setSearch(event.target.value)} placeholder="Try push-up or dumbbell row" value={search} />
              <ul className="pal-search-results">{choices.slice(0, 12).map((exercise) => <li key={exercise.slug}><button onClick={() => change(() => setFirstExerciseSlug(exercise.slug))} type="button"><strong>{exercise.name}</strong><Icon name="plus" /></button></li>)}</ul>
              {choices.length > 12 ? <p className="pal-note">Showing 12 of {choices.length}. Keep typing to narrow it down.</p> : null}
              {choices.length === 0 ? <p className="pal-note">No movements match for this equipment. Try another word.</p> : null}
            </>}
          </div> : null}
          <div className="pal-units">
            <span>Weights in {unitSystem === "imperial" ? "pounds" : "kilograms"}.</span>
            <button className="pal-text-button" disabled={busy} onClick={() => change(() => setUnitSystem(unitSystem === "imperial" ? "metric" : "imperial"))} type="button">Use {unitSystem === "imperial" ? "kilograms" : "pounds"}</button>
          </div>
          <div className="pal-actions">
            <button className="primary-action" disabled={!canMutate || busy || (mode === "blank" && !firstExerciseSlug)} onClick={() => void save()} type="button">{busy ? "Saving…" : "Save my routine"} <Icon name="check" /></button>
            <button className="secondary-action" disabled={busy} onClick={back} type="button">Back</button>
          </div>
          <details className="pal-other-starts">
            <summary>Prefer a different start?</summary>
            <div className="pal-actions">
              {mode !== "generated" ? <button className="pal-text-button" onClick={() => change(() => setMode("generated"))} type="button">Use my answers</button> : null}
              {mode !== "example" ? <button className="pal-text-button" onClick={() => change(() => setMode("example"))} type="button">Use the five-day example</button> : null}
              {mode !== "blank" ? <button className="pal-text-button" onClick={() => change(() => setMode("blank"))} type="button">Start blank</button> : null}
            </div>
          </details>
        </> : null}

        {stage !== "routine" && stage !== "tour" ? <div className="pal-actions">
          <button className="primary-action" disabled={busy} onClick={next} type="button">Continue <Icon name="arrow-right" /></button>
          {stage !== "goal" ? <button className="secondary-action" disabled={busy} onClick={back} type="button">Back</button> : null}
        </div> : null}
        {missing ? <p className="pal-field-error" id="onboarding-missing" role="alert">{missing}</p> : null}

        {stage === "tour" ? <div className="pal-tour" aria-roledescription="tour">
          <div className="pal-drive-top">
            <p className="pal-step-count">Quick tour · {tourIndex + 1} of {TOUR.length}</p>
            <button className="pal-text-button" onClick={finishTour} type="button">Skip tour</button>
          </div>
          <PalSticker pose={tourIndex === TOUR.length - 1 ? "complete" : "ready"} />
          <h1 id="onboarding-heading" ref={heading} tabIndex={-1}>{TOUR[tourIndex]!.title}</h1>
          <p className="pal-drive-lead">{TOUR[tourIndex]!.body}</p>
          <div className="pal-tour-sample" aria-hidden={tourIndex === 2 ? undefined : true}>
            {tourIndex === 0 ? <div className="pal-peek"><span className="pal-chip pal-chip--selected"><Icon name="check" />Day 1 · {routine?.days[0]?.name ?? "Day 1"}</span><span className="pal-chip pal-chip--sun">Start {routine?.days[0]?.name ?? "workout"}</span></div> : null}
            {tourIndex === 1 ? <div className="pal-peek"><span className="pal-chip">{firstMovement?.displayName ?? "Goblet squat"} · Set 2</span><span className="pal-chip pal-chip--sun"><Icon name="check" />{unitSystem === "imperial" ? "25 lb" : "12 kg"} × 10</span><span className="pal-chip">Rest 1:30</span></div> : null}
            {tourIndex === 2 && firstMovement ? <MovementDemo movementName={firstMovement.displayName} videos={demos[firstMovement.exerciseSlug]} /> : null}
            {tourIndex === 3 ? <div className="pal-peek"><span className="pal-bars pal-bars--wide"><span /><span /><span /><span /><span /></span><span className="pal-tag">Example</span></div> : null}
          </div>
          <div className="pal-actions">
            {tourIndex < TOUR.length - 1
              ? <button className="primary-action" onClick={() => setTourIndex(tourIndex + 1)} type="button">Next <Icon name="arrow-right" /></button>
              : <button className="primary-action" onClick={finishTour} type="button">Go to Today <Icon name="arrow-right" /></button>}
            {tourIndex > 0 ? <button className="secondary-action" onClick={() => setTourIndex(tourIndex - 1)} type="button">Back</button> : null}
          </div>
        </div> : null}
        <p aria-live="polite" className="pal-status" role="status">{message}</p>
      </div>
    </section>
  );
}
