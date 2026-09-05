"use client";

import { DecorativeCompanion } from "@/components/ui/decorative-companion";
import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { privateApiMutation, PrivateApiClientError } from "@/client/private-api";
import { parseOnboardingResponse } from "@/components/program/program-mutation-response";
import { EquipmentIllustration } from "@/components/ui/equipment-illustration";
import { Icon } from "@/components/ui/icon";
import { EQUIPMENT_PROFILES, supportsEquipment, type EquipmentProfileKind } from "@/domain/equipment";
import { CATALOG_EXERCISES } from "@/domain/exercises/catalog";

type OnboardingMode = "example" | "blank";

function operationKey(): string {
  return globalThis.crypto.randomUUID();
}

function failedMessage(error: unknown): string {
  return error instanceof PrivateApiClientError
    ? error.message
    : "Your routine was not created. Try again.";
}

export function OnboardingForm({ canMutate }: Readonly<{ canMutate: boolean }>) {
  const router = useRouter();
  const [mode, setMode] = useState<OnboardingMode>("example");
  const [equipmentProfileKind, setEquipmentProfileKind] = useState<EquipmentProfileKind>("dumbbells");
  const [unitSystem, setUnitSystem] = useState<"metric" | "imperial">("imperial");
  const [timezone, setTimezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  const [reducedMotion, setReducedMotion] = useState(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const saveKey = useRef<string | undefined>(undefined);

  const [step, setStep] = useState(0);
  const [firstExerciseSlug, setFirstExerciseSlug] = useState("");
  const [search, setSearch] = useState("");
  const submitLock = useRef(false);
  const choices = Object.values(CATALOG_EXERCISES).filter((exercise) =>
    supportsEquipment(EQUIPMENT_PROFILES[equipmentProfileKind], exercise.requiredEquipment) &&
    `${exercise.name} ${exercise.aliases.join(" ")}`.toLowerCase().includes(search.toLowerCase()));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canMutate || busy || submitLock.current || step !== 2) return;
    if (mode === "blank" && !firstExerciseSlug) { setMessage("Add your first movement before saving."); return; }
    submitLock.current = true;
    const idempotencyKey = saveKey.current ?? operationKey();
    saveKey.current = idempotencyKey;
    setBusy(true);
    setMessage(mode === "example"
      ? "Creating your private example routine…"
      : "Creating your private blank routine…");
    try {
      const response = await privateApiMutation<unknown>(
        "/api/app/profile-program/onboard",
        {
          body: {
            equipmentProfileKind,
            idempotencyKey,
            mode,
            ...(mode === "blank" ? { firstExerciseSlug } : {}),
            reducedMotion,
            timezone,
            unitSystem,
          },
          method: "POST",
        },
      );
      parseOnboardingResponse(response, {
        equipmentProfileKind,
        mode,
        reducedMotion,
        timezone,
        unitSystem,
      });
      saveKey.current = undefined;
      setMessage(mode === "example" ? "Example routine created." : "Blank routine created.");
      if (mode === "blank") router.push("/app/program/edit");
      else router.refresh();
    } catch (error) {
      setMessage(failedMessage(error));
    } finally {
      setBusy(false);
      submitLock.current = false;
    }
  }

  return (
    <section className="member-onboarding" aria-labelledby="onboarding-title">
      <header className="member-onboarding-copy companion-heading">
        <h1 id="onboarding-title">Make room for your routine.</h1>
        <p>Choose a starting point. Make it yours as you go.</p>
        <DecorativeCompanion variant="member-home" />
      </header>
      {!canMutate ? <p role="status">Verify your email and sign in again before saving a routine.</p> : null}
      <form className="onboarding-form" onSubmit={(event) => void submit(event)}>
        <p className="quiet-step">Step {step + 1} of 3 · {step === 0 ? "Your routine" : step === 1 ? "Your preferences" : "Equipment and review"}</p>
        {step === 0 ? <fieldset disabled={!canMutate || busy}>
          <legend>Where would you like to start?</legend>
          <div className="onboarding-profile-grid">
            {(["example", "blank"] as const).map((choice) => <label key={choice}>
              <input type="radio" name="onboarding-mode" checked={mode === choice} onChange={() => {setMode(choice); saveKey.current = undefined;}} />
              <span><strong>{choice === "example" ? "Example routine" : "Blank routine"}</strong><small>{choice === "example" ? "Five editable days, with movements and targets ready to explore." : "An empty draft. Add your first movement before anything is saved."}</small></span>
            </label>)}
          </div>
        </fieldset> : null}
        {step === 1 ? <fieldset disabled={!canMutate || busy} className="onboarding-preferences">
          <legend>Your preferences</legend>
          <label htmlFor="onboarding-units">Display units</label>
          <select id="onboarding-units" value={unitSystem} onChange={(event) => {setUnitSystem(event.target.value === "metric" ? "metric" : "imperial"); saveKey.current = undefined;}}><option value="imperial">Pounds and miles</option><option value="metric">Kilograms and kilometers</option></select>
          <details><summary>Time zone and motion</summary>
            <label htmlFor="onboarding-timezone">Time zone</label>
            <input id="onboarding-timezone" value={timezone} required maxLength={64} onChange={(event) => {setTimezone(event.target.value); saveKey.current = undefined;}} />
            <label className="onboarding-check"><input type="checkbox" checked={reducedMotion} onChange={(event) => {setReducedMotion(event.target.checked); saveKey.current = undefined;}} />Reduce interface motion</label>
          </details>
        </fieldset> : null}
        {step === 2 ? <fieldset disabled={!canMutate || busy}>
          <legend>Equipment</legend>
          <div className="onboarding-profile-grid">{(Object.keys(EQUIPMENT_PROFILES) as EquipmentProfileKind[]).map((profile) => <label key={profile}>
            <input type="radio" name="equipment-profile" checked={equipmentProfileKind === profile} onChange={() => {setEquipmentProfileKind(profile); setFirstExerciseSlug(""); saveKey.current = undefined;}} />
            <span><EquipmentIllustration kind={profile === "barbell" ? "barbell" : "dumbbell"} /><strong>{EQUIPMENT_PROFILES[profile].label}</strong><small>{EQUIPMENT_PROFILES[profile].description}</small></span>
          </label>)}</div>
          {mode === "blank" ? <section className="quiet-empty-draft" aria-labelledby="first-movement-title">
            <h2 id="first-movement-title">{firstExerciseSlug ? "Your first movement" : "Add your first movement"}</h2>
            <p>{firstExerciseSlug ? "Day 1 · You can edit its sets and targets after saving." : "Day 1 is empty. This draft has not been saved."}</p>
            {firstExerciseSlug ? <div className="quiet-selected-movement"><strong>{CATALOG_EXERCISES[firstExerciseSlug]?.name}</strong><button type="button" onClick={() => {setFirstExerciseSlug(""); saveKey.current = undefined;}}>Remove movement</button></div> : <>
              <label htmlFor="first-movement-search">Search movements</label><input id="first-movement-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Try push-up or dumbbell row" />
              <ul className="quiet-movement-results">{choices.slice(0, 12).map((exercise) => <li key={exercise.slug}><button type="button" onClick={() => {setFirstExerciseSlug(exercise.slug); saveKey.current = undefined;}}><strong>{exercise.name}</strong><span>{exercise.requiredEquipment.join(", ")}</span><Icon name="plus" /></button></li>)}</ul>
              {choices.length === 0 ? <p>No matching movements for this equipment. Try another search.</p> : null}
            </>}
          </section> : <p>Creates five editable days using {EQUIPMENT_PROFILES[equipmentProfileKind].label.toLowerCase()}. Review any substitutions in your routine before training.</p>}
        </fieldset> : null}
        <div className="onboarding-submit">
          {step > 0 ? <button key="back" type="button" className="secondary-action" disabled={busy} onClick={() => setStep(step - 1)}>Back</button> : null}
          {step < 2 ? <button key={`continue-${step}`} className="primary-action" disabled={!canMutate || busy} type="button" onClick={(event) => {event.preventDefault(); setStep(step + 1);}}>Continue <Icon name="arrow-right" /></button> : <button key="create-routine" className="primary-action" disabled={!canMutate || busy || (mode === "blank" && !firstExerciseSlug)} type="submit">{busy ? "Creating…" : "Save routine"}<Icon name="check" /></button>}
          <p aria-live="polite" role="status">{message}</p>
        </div>
      </form>
    </section>
  );
}
