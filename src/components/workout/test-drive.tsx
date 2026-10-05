"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

import { useLocaleUnitSystem } from "@/client/locale-units";
import { Icon } from "@/components/ui/icon";
import { PalSticker } from "@/components/ui/scene-stage";
import { MovementDemo } from "@/components/video/demo-sheet";
import type { CuratedVideos } from "@/domain/youtube/embed";

export type TestDriveMovement = Readonly<{
  slug: string;
  name: string;
  kind: "reps" | "time";
  target: string;
  steps: readonly string[];
  videos: CuratedVideos | undefined;
}>;

type Step = "plan" | "squat" | "rest" | "plank" | "done";
const ORDER: readonly Step[] = ["plan", "squat", "rest", "plank", "done"];
const REST_SECONDS = 45;

function clock(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/**
 * A guided taste of a real workout: the plan, an approved demo, logging a set, resting, a timed movement,
 * and a peek at progress. Everything lives in this page's memory; nothing is sent or saved.
 */
export function TestDrive({ movements }: Readonly<{ movements: readonly [TestDriveMovement, TestDriveMovement] }>) {
  const [squat, plank] = movements;
  const [step, setStep] = useState<Step>("plan");
  const unit = useLocaleUnitSystem() === "imperial" ? "lb" : "kg";
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [seconds, setSeconds] = useState("");
  const [error, setError] = useState<{ field: string; message: string } | null>(null);
  const [logged, setLogged] = useState<{ weight: number; reps: number; seconds: number }>({ weight: 0, reps: 0, seconds: 0 });
  const [restEnds, setRestEnds] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(REST_SECONDS);
  const heading = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    heading.current?.focus();
  }, [step]);

  useEffect(() => {
    if (restEnds === null) return;
    const tick = () => setRemaining(Math.max(0, Math.ceil((restEnds - Date.now()) / 1000)));
    tick();
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
  }, [restEnds]);

  function logSquat(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const repCount = Number(reps);
    const load = weight === "" ? 0 : Number(weight);
    if (!Number.isInteger(repCount) || repCount < 1 || repCount > 1000) { setError({ field: "reps", message: "Enter how many reps you did, from 1 to 1,000." }); return; }
    if (!Number.isFinite(load) || load < 0 || load > 2000) { setError({ field: "weight", message: `Enter a weight from 0 to 2,000 ${unit}, or leave it empty.` }); return; }
    setError(null);
    setLogged((current) => ({ ...current, reps: repCount, weight: load }));
    setRestEnds(Date.now() + REST_SECONDS * 1000);
    setStep("rest");
  }

  function logPlank(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const held = Number(seconds);
    if (!Number.isInteger(held) || held < 1 || held > 3600) { setError({ field: "seconds", message: "Enter how many seconds you held it, from 1 to 3,600." }); return; }
    setError(null);
    setLogged((current) => ({ ...current, seconds: held }));
    setStep("done");
  }

  const stepNumber = ORDER.indexOf(step) + 1;
  const fieldProps = (field: string) => error?.field === field ? { "aria-invalid": true as const, "aria-describedby": `${field}-error` } : {};
  const fieldError = (field: string) => error?.field === field ? <p className="pal-field-error" id={`${field}-error`}>{error.message}</p> : null;

  return (
    <section className="pal-drive" aria-labelledby="drive-heading">
      <div className="pal-drive-top">
        <p className="pal-note">Test drive. Nothing is saved.</p>
        <p className="pal-step-count">Step {stepNumber} of {ORDER.length}</p>
        <ol aria-hidden="true" className="pal-steps">
          {ORDER.map((name, index) => <li className={index < stepNumber ? "is-done" : undefined} key={name} />)}
        </ol>
      </div>

      {step === "plan" ? <div className="pal-drive-step">
        <h1 id="drive-heading" ref={heading} tabIndex={-1}>Here&apos;s today&apos;s workout.</h1>
        <p className="pal-drive-lead">Two moves, about three minutes. This is what a day in your routine looks like.</p>
        <ol className="pal-moves">
          {movements.map((movement, index) => <li className="pal-move" key={movement.slug}>
            <span aria-hidden="true" className="pal-move-number">{index + 1}</span>
            <div><strong className="pal-move-name">{movement.name}</strong><small>{movement.target}</small></div>
            <MovementDemo movementName={movement.name} videos={movement.videos} />
          </li>)}
        </ol>
        <ul className="pal-explain">
          <li><strong>Your plan.</strong> Each day lists your moves in order.</li>
          <li><strong>Targets.</strong> Sets and reps are a guide, not a rule. Log what you actually do.</li>
          <li><strong>Demos.</strong> Not sure how a move goes? Watch one right here.</li>
        </ul>
        <button className="primary-action" onClick={() => setStep("squat")} type="button">Let&apos;s go <Icon name="arrow-right" /></button>
      </div> : null}

      {step === "squat" ? <div className="pal-drive-step">
        <h1 id="drive-heading" ref={heading} tabIndex={-1}>{squat.name}</h1>
        <p className="pal-drive-lead">Target: {squat.target}. For the test drive, one set is plenty.</p>
        <div className="pal-drive-demo"><MovementDemo movementName={squat.name} videos={squat.videos} /></div>
        <details className="pal-steps-text"><summary>How to do it</summary><ol>{squat.steps.map((line) => <li key={line}>{line}</li>)}</ol></details>
        <form className="pal-set-entry" noValidate onSubmit={logSquat}>
          <p className="pal-set-entry-title">Set 1 · Log what you did</p>
          <div className="pal-set-fields">
            <label>Weight ({unit})<input inputMode="decimal" name="weight" onChange={(event) => setWeight(event.target.value)} type="number" min="0" step="0.5" value={weight} {...fieldProps("weight")} /></label>
            <label>Repetitions<input inputMode="numeric" name="reps" onChange={(event) => setReps(event.target.value)} type="number" min="1" step="1" value={reps} {...fieldProps("reps")} /></label>
          </div>
          {fieldError("weight")}{fieldError("reps")}
          <button className="primary-action" type="submit">Log set &amp; rest <Icon name="check" /></button>
        </form>
      </div> : null}

      {step === "rest" ? <div className="pal-drive-step pal-drive-rest">
        <PalSticker pose="resting" />
        <h1 id="drive-heading" ref={heading} tabIndex={-1}>Catch your breath.</h1>
        <p className="pal-drive-lead">Logged: {logged.weight > 0 ? `${logged.weight} ${unit} × ` : ""}{logged.reps} reps. In the app, your rest timer starts on its own.</p>
        <div className="pal-timer" role="timer" aria-label={`${remaining} seconds of rest left`}>{clock(remaining)}</div>
        <div className="pal-actions">
          <button className="secondary-action" onClick={() => setRestEnds(Math.max(Date.now(), restEnds ?? Date.now()) + 30_000)} type="button">Add 30 seconds</button>
          <button className="primary-action" onClick={() => { setRestEnds(null); setStep("plank"); }} type="button">{remaining === 0 ? "Next move" : "Skip rest"} <Icon name="arrow-right" /></button>
        </div>
      </div> : null}

      {step === "plank" ? <div className="pal-drive-step">
        <h1 id="drive-heading" ref={heading} tabIndex={-1}>{plank.name}</h1>
        <p className="pal-drive-lead">Target: {plank.target}. Some moves are timed instead of counted.</p>
        <div className="pal-drive-demo"><MovementDemo movementName={plank.name} videos={plank.videos} /></div>
        <details className="pal-steps-text"><summary>How to do it</summary><ol>{plank.steps.map((line) => <li key={line}>{line}</li>)}</ol></details>
        <form className="pal-set-entry" noValidate onSubmit={logPlank}>
          <p className="pal-set-entry-title">Set 1 · How long did you hold it?</p>
          <label>Seconds<input inputMode="numeric" name="seconds" onChange={(event) => setSeconds(event.target.value)} type="number" min="1" step="1" value={seconds} {...fieldProps("seconds")} /></label>
          {fieldError("seconds")}
          <button className="primary-action" type="submit">Finish workout <Icon name="check" /></button>
        </form>
      </div> : null}

      {step === "done" ? <div className="pal-drive-step pal-drive-done">
        <div className="pal-confetti" aria-hidden="true">{Array.from({ length: 14 }, (_, index) => <i key={index} />)}</div>
        <PalSticker pose="complete" />
        <h1 id="drive-heading" ref={heading} tabIndex={-1}>Workout done! Nice work.</h1>
        <p className="pal-drive-lead">That&apos;s the whole loop: plan, demo, log, rest, repeat.</p>
        <dl className="pal-glance">
          <div><dt>{squat.name}</dt><dd>{logged.weight > 0 ? `${logged.weight} ${unit} × ${logged.reps}` : `${logged.reps} reps`}</dd></div>
          <div><dt>{plank.name}</dt><dd>{logged.seconds}s</dd></div>
        </dl>
        <figure className="pal-progress-peek">
          <figcaption><strong>How it adds up in Progress</strong> <span className="pal-tag">Example</span></figcaption>
          <div className="pal-bars pal-bars--wide" aria-hidden="true"><span /><span /><span /><span /><span /></div>
          <p>Each workout you save adds to your totals and records. The last bar is today.</p>
        </figure>
        <div className="pal-actions">
          <Link className="primary-action" href="/app" prefetch={false}>Make my routine <Icon name="arrow-right" /></Link>
          <Link className="secondary-action" href="/library">Look around first</Link>
        </div>
      </div> : null}
    </section>
  );
}
