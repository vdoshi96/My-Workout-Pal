import type { Metadata } from "next";
import Link from "next/link";

import { PublicShell } from "@/components/layout/public-shell";
import { DecorativeCompanion } from "@/components/ui/decorative-companion";
import { Icon } from "@/components/ui/icon";

export const metadata: Metadata = {
  title: "Progress",
  description: "Preview how a personal workout companion turns completed workouts into history and progress.",
};

const sampleSessions = [
  { date: "Week 1 · Monday", day: "Push", detail: "6 movements · walker 20 min", completion: "Complete" },
  { date: "Week 1 · Wednesday", day: "Pull", detail: "6 movements · runner 20 min", completion: "Complete" },
  { date: "Week 2 · Monday", day: "Push", detail: "6 movements · walker 22 min", completion: "Complete" },
] as const;

export default function ProgressPage() {
  return (
    <PublicShell current="progress">
      <section className="public-hero sample-hero contour-surface">
        <div className="sample-hero-copy">

          <h1>Progress</h1>
          <p>An example of what Progress shows after a few workouts.</p>
          <div className="sample-warning"><strong>Example data</strong></div>
        </div>
        <DecorativeCompanion variant="progress-preview" />
      </section>

      <section className="sample-metrics" aria-label="Progress preview">
        <article><span>Workouts</span><strong>3</strong><small>Across two weeks</small></article>
        <article><span>Consistency</span><strong>3 / 3</strong><small>Planned sessions completed</small></article>
        <article><span>Cardio</span><strong>62 min</strong><small>Walker + runner time</small></article>
      </section>

      <div className="sample-grid">
        <section className="sample-history" aria-labelledby="progress-history-heading">
          <div className="section-heading">
            <div><h2 id="progress-history-heading">Workout history</h2></div>
          </div>
          <ol>
            {sampleSessions.map((session, index) => (
              <li key={session.date}>
                <span className="catalog-number">{index + 1}</span>
                <span><small>{session.date}</small><strong>{session.day} day</strong><small>{session.detail}</small></span>
                <span>{session.completion}</span>
              </li>
            ))}
          </ol>
        </section>

        <aside className="sample-chart" aria-labelledby="progress-chart-heading">
          <span className="eyebrow">Illustrative trend</span>
          <h2 id="progress-chart-heading">Bench press volume</h2>
          <div className="bar-chart" role="img" aria-label="Bench press volume rises from 1,440 to 1,620 kilograms over three illustrative sessions">
            <i className="sample-bar-58"><span>1,440</span></i>
            <i className="sample-bar-72"><span>1,530</span></i>
            <i className="sample-bar-88"><span>1,620</span></i>
          </div>

        </aside>
      </div>

      <section className="sample-cta">
        <div><h2>Track your own</h2><p>Sign in to see your real sets, reps and records.</p></div>
        <Link className="primary-action" href="/sign-in"><span>Sign in</span><Icon name="arrow-right" /></Link>
      </section>
    </PublicShell>
  );
}
