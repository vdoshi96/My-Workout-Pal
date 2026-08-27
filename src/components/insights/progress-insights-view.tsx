import Link from "next/link";

import {
  formatInsightDistance,
  formatInsightDuration,
  formatInsightVolume,
  formatProgressDate,
} from "@/components/insights/training-insights-presenters";
import { Icon } from "@/components/ui/icon";
import type { ProgressInsightsReadModel } from "@/server/repositories/training-insights";

export function ProgressInsightsView({
  progress,
}: Readonly<{ progress: ProgressInsightsReadModel }>) {
  const unitSystem = progress.preferences.unitSystem;
  const maximumVolume = Math.max(0, ...progress.series.map(({ volumeKg }) => volumeKg ?? 0));

  return (
    <section className="insights-page" aria-labelledby="progress-title">
      <header className="insights-heading contour-surface">
        <div>
          <span className="eyebrow">Saved training signals</span>
          <h1 id="progress-title">Progress</h1>
          <p>
            Completed workouts only, grouped in {progress.preferences.timezone}. Abandoned
            workouts stay visible in History; resumable workouts return through the runner.
            Neither inflates these totals.
          </p>
        </div>
        <Link className="insight-action" href="/app/prs">
          Personal records <Icon name="arrow-right" />
        </Link>
      </header>

      <dl className="progress-totals">
        <div>
          <dt>Completed workouts</dt>
          <dd>{progress.totals.completedSessions}</dd>
        </div>
        <div>
          <dt>Training volume</dt>
          <dd>{formatInsightVolume(progress.totals.volumeKg, unitSystem)}</dd>
        </div>
        <div>
          <dt>Logged duration</dt>
          <dd>{formatInsightDuration(progress.totals.durationSeconds)}</dd>
        </div>
        <div>
          <dt>Logged distance</dt>
          <dd>{formatInsightDistance(progress.totals.distanceMeters, unitSystem)}</dd>
        </div>
      </dl>

      <aside className="progress-integrity">
        <strong>
          {progress.projection.state === "persisted"
            ? "Saved rollups detected."
            : "Calculated from saved logs."}
        </strong>{" "}
        The chart below is rebuilt from your completed set and cardio logs.{" "}
        {progress.totals.abandonedSessions} interrupted workout
        {progress.totals.abandonedSessions === 1 ? " is" : "s are"} excluded.
      </aside>

      {progress.series.length === 0 ? (
        <div className="member-empty-sheet">
          <span className="eyebrow">No completed data</span>
          <h2>Finish a workout to begin your timeline.</h2>
          <p>
            No sample points are mixed into account analytics. Any interrupted session remains
            recoverable or archived separately.
          </p>
          <Link href="/app">Open your program</Link>
        </div>
      ) : (
        <section className="progress-timeline" aria-labelledby="progress-timeline-title">
          <header className="section-heading">
            <div>
              <span className="eyebrow">Daily series</span>
              <h2 id="progress-timeline-title">Training timeline</h2>
              <p>
                {progress.scope.truncated ? (
                  <>
                    Showing the newest {progress.scope.maxSessions} of {progress.scope.sessionCount}{" "}
                    completed workouts. All-time totals above include all {progress.scope.sessionCount}.
                  </>
                ) : (
                  <>
                    Timeline includes all {progress.scope.sessionCount} completed workout
                    {progress.scope.sessionCount === 1 ? "" : "s"}.
                  </>
                )}
              </p>
            </div>
            <Link href="/app/history">Open history</Link>
          </header>
          <ol>
            {progress.series.map((point) => {
              const volume = point.volumeKg ?? 0;
              return (
                <li key={point.date}>
                  <div className="progress-row-heading">
                    <strong>{formatProgressDate(point.date)}</strong>
                    <span>
                      {point.sessionCount} workout{point.sessionCount === 1 ? "" : "s"}
                    </span>
                  </div>
                  <meter
                    aria-label={`${formatProgressDate(point.date)} training volume: ${formatInsightVolume(volume, unitSystem)}`}
                    className="progress-bar"
                    max={maximumVolume > 0 ? maximumVolume : 1}
                    value={volume}
                  >
                    {formatInsightVolume(volume, unitSystem)}
                  </meter>
                  <dl>
                    <div>
                      <dt>Volume</dt>
                      <dd>{formatInsightVolume(volume, unitSystem)}</dd>
                    </div>
                    <div>
                      <dt>Duration</dt>
                      <dd>{formatInsightDuration(point.durationSeconds ?? undefined)}</dd>
                    </div>
                    <div>
                      <dt>Distance</dt>
                      <dd>{formatInsightDistance(point.distanceMeters ?? 0, unitSystem)}</dd>
                    </div>
                  </dl>
                  <div className="progress-sources">
                    {point.sourceIds.map((sessionId, sourceIndex) => (
                      <Link
                        href={`/app/history/${sessionId}`}
                        key={sessionId}
                        aria-label={`Open saved workout ${sourceIndex + 1} of ${point.sourceIds.length} from ${formatProgressDate(point.date)}`}
                      >
                        <Icon name="history" />
                      </Link>
                    ))}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      )}
    </section>
  );
}
