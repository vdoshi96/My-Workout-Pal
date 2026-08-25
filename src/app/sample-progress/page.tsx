import type { Metadata } from "next";
import Link from "next/link";

import { PublicShell } from "@/components/layout/public-shell";
import { Icon } from "@/components/ui/icon";

export const metadata: Metadata = { title: "Read-only sample progress" };

const sampleSessions = [
  { date: "Week 1 · Monday", day: "Push", detail: "6 movements · walker 20 min", completion: "Complete" },
  { date: "Week 1 · Wednesday", day: "Pull", detail: "6 movements · runner 20 min", completion: "Complete" },
  { date: "Week 2 · Monday", day: "Push", detail: "6 movements · walker 22 min", completion: "Complete" },
] as const;

export default function SampleProgressPage() {
  return (
    <PublicShell current="sample">
      <section className="public-hero sample-hero contour-surface">
        <div>
          <span className="eyebrow">Read-only demonstration</span>
          <h1>Sample progress</h1>
          <p>See how completed workouts, personal records, and trends will read before you create an account.</p>
        </div>
        <div className="sample-warning"><strong>Sample data</strong><span>Not your history · never saved</span></div>
      </section>

      <section className="sample-metrics" aria-label="Sample analytics">
        <article><span>Sample workouts</span><strong>3</strong><small>Across two weeks</small></article>
        <article><span>Sample consistency</span><strong>3 / 3</strong><small>Planned sessions completed</small></article>
        <article><span>Sample cardio</span><strong>62 min</strong><small>Walker + runner time</small></article>
      </section>

      <div className="sample-grid">
        <section className="sample-history" aria-labelledby="sample-history-heading">
          <div className="section-heading">
            <div><span className="eyebrow">Immutable snapshots</span><h2 id="sample-history-heading">Workout history</h2></div>
            <span className="status-stamp">Sample only</span>
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

        <aside className="sample-chart" aria-labelledby="sample-chart-heading">
          <span className="eyebrow">Illustrative trend</span>
          <h2 id="sample-chart-heading">Bench press volume</h2>
          <div className="bar-chart" role="img" aria-label="Sample bench press volume rises from 1,440 to 1,620 kilograms over three sessions">
            <i style={{ height: "58%" }}><span>1,440</span></i>
            <i style={{ height: "72%" }}><span>1,530</span></i>
            <i style={{ height: "88%" }}><span>1,620</span></i>
          </div>
          <p>This chart is labeled sample because no signed-in workout data exists. Persisted analytics will be derived only from completed set snapshots.</p>
        </aside>
      </div>

      <section className="sample-cta">
        <div><span className="eyebrow">Practice without persistence</span><h2>Open a starter day</h2><p>Guest changes remain temporary and will never be presented as saved.</p></div>
        <Link className="primary-action" href="/sample-workout?day=push&equipment=dumbbells"><span>Open sample workout</span><Icon name="arrow-right" /></Link>
      </section>
    </PublicShell>
  );
}
