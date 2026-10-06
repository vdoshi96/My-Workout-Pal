import type { Metadata } from "next";
import Link from "next/link";

import { PublicShell } from "@/components/layout/public-shell";
import { Icon } from "@/components/ui/icon";
import { PalSticker, SceneStage } from "@/components/ui/scene-stage";

export const metadata: Metadata = {
  title: "Progress",
  description: "See how My Workout Pal turns finished workouts into history, records and progress.",
};

const sampleSessions = [
  { date: "Week 1 · Monday", day: "Push", detail: "6 movements · walk 20 min" },
  { date: "Week 1 · Wednesday", day: "Pull", detail: "6 movements · run 20 min" },
  { date: "Week 2 · Monday", day: "Push", detail: "6 movements · walk 22 min" },
] as const;

export default function ProgressPage() {
  return (
    <PublicShell current="progress">
      <SceneStage scene="progress" />
      <header className="pal-page-head">
        <span className="pal-tag">Example data</span>
        <h1>Progress</h1>
        <p>Here&apos;s what Progress looks like after a few workouts.</p>
      </header>

      <div className="pal-page-body">
        <dl className="pal-glance" aria-label="Progress preview">
          <div><dt>Workouts</dt><dd>3</dd><dd className="pal-glance-note">Across two weeks</dd></div>
          <div><dt>Consistency</dt><dd>3 of 3</dd><dd className="pal-glance-note">Planned workouts done</dd></div>
          <div><dt>Cardio</dt><dd>62 min</dd><dd className="pal-glance-note">Walking and running</dd></div>
        </dl>

        <section aria-labelledby="progress-chart-heading">
          <h2 id="progress-chart-heading">Bench press volume</h2>
          <div className="pal-chart" role="img" aria-label="Bench press volume rises from 1,440 to 1,620 kilograms over three example workouts">
            <span className="pal-chart-bar pal-chart-bar--58"><b>1,440</b></span>
            <span className="pal-chart-bar pal-chart-bar--72"><b>1,530</b></span>
            <span className="pal-chart-bar pal-chart-bar--88 pal-chart-bar--best"><b>1,620</b></span>
          </div>
        </section>

        <section aria-labelledby="progress-history-heading">
          <h2 id="progress-history-heading">Workout history</h2>
          <ol className="pal-moves">
            {sampleSessions.map((session, index) => (
              <li className="pal-move" key={session.date}>
                <span aria-hidden="true" className="pal-move-number">{index + 1}</span>
                <div><strong className="pal-move-name">{session.day} day</strong><small>{session.date} · {session.detail}</small></div>
                <span className="pal-tag">Done</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="pal-closer pal-closer--left" aria-labelledby="progress-cta-heading">
          <PalSticker pose="complete" />
          <div>
            <h2 id="progress-cta-heading">Track your own</h2>
            <p>Sign in to see your real sets, reps and records.</p>
            <div className="pal-actions"><Link className="primary-action" href="/sign-in"><span>Sign in</span><Icon name="arrow-right" /></Link></div>
          </div>
        </section>
      </div>
    </PublicShell>
  );
}
