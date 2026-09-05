"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";

export function TryOneSet() {
  const [reps, setReps] = useState("");
  const [logged, setLogged] = useState<number | null>(null);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(30);
  const [paused, setPaused] = useState(false);
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!deadline || paused) return;
    const tick = () => setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    tick();
    const interval = window.setInterval(tick, 250);
    return () => window.clearInterval(interval);
  }, [deadline, paused]);
  function reset() {setReps(""); setLogged(null); setDeadline(null); setRemaining(30); setPaused(false); setFinished(false); setError("");}
  return <section className={`quiet-trial${finished ? " quiet-trial--complete" : ""}`} aria-labelledby="trial-heading">
    <p className="quiet-disclosure">Practice only · Nothing is saved to an account. Refresh resets this trial.</p>
    <h1 id="trial-heading">{finished ? "That’s the rhythm." : logged !== null ? "Take a moment." : "Try one set."}</h1>
    {finished ? <>
      <p>You practiced logging {logged} push-up reps and moving through rest.</p>
      <Link href="/app" className="primary-action" prefetch={false}>Save my routine <Icon name="arrow-right" /></Link>
      <Link href="/program">Explore the five-day example</Link>
    </> : logged !== null ? <>
      <p role="status">Practice entry: {logged} reps. Not saved.</p>
      <div className="quiet-trial-timer" role="timer" aria-label={`${remaining} seconds of practice rest`}>{String(Math.floor(remaining / 60)).padStart(2, "0")}:{String(remaining % 60).padStart(2, "0")}</div>
      <div className="quiet-trial-controls">
        <button className="secondary-action" type="button" onClick={() => {if (paused) setDeadline(Date.now() + remaining * 1000); setPaused(!paused);}}>{paused ? "Resume timer" : "Pause timer"}</button>
        <button className="secondary-action" type="button" onClick={() => {setRemaining(remaining + 30); setDeadline((deadline ?? Date.now()) + 30000);}}>Add 30 seconds</button>
      </div>
      <button className="primary-action" type="button" onClick={() => setFinished(true)}>Finish practice <Icon name="check" /></button>
      <button className="quiet-text-button" type="button" onClick={() => {setLogged(null); setDeadline(null); setPaused(false); setRemaining(30);}}>Edit practice entry</button>
    </> : <form onSubmit={(event) => {event.preventDefault(); const count = Number(reps); if (!/^\d+$/.test(reps) || !Number.isSafeInteger(count) || count < 1 || count > 1000) {setError("Enter 1 to 1,000 repetitions."); return;} setLogged(count); setDeadline(Date.now() + 30000); setError("");}}>
      <h2>Push-up</h2><p>Practice target: 10 reps · No added weight</p>
      <label htmlFor="practice-reps">Repetitions</label><input id="practice-reps" inputMode="numeric" type="number" min="1" max="1000" step="1" value={reps} onChange={(event) => setReps(event.target.value)} aria-describedby={error ? "practice-error" : undefined} required />
      {error ? <p id="practice-error" role="alert">{error}</p> : null}
      <button type="submit" className="primary-action">Log set &amp; rest <Icon name="check" /></button>
      <p>Enter a practice number to explore the interaction. You don’t need to exercise to try it.</p>
    </form>}
    <button className="quiet-text-button" type="button" onClick={reset}><Icon name="undo" /> Reset practice</button>
  </section>;
}
