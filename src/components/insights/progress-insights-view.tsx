import Link from "next/link";

import {
  formatInsightDistance,
  formatInsightDuration,
  formatInsightVolume,
  formatProgressDate,
} from "@/components/insights/training-insights-presenters";
import { Icon } from "@/components/ui/icon";
import { PalSticker, SceneStage } from "@/components/ui/scene-stage";
import { withFrom } from "@/domain/navigation/back-target";
import type { ProgressInsightsReadModel } from "@/server/repositories/training-insights";

export function ProgressInsightsView({
  progress,
}: Readonly<{ progress: ProgressInsightsReadModel }>) {
  const unitSystem = progress.preferences.unitSystem;
  const maximumVolume = Math.max(0, ...progress.series.map(({ volumeKg }) => volumeKg ?? 0));
  const { totals } = progress;

  return (
    <section className="pal-insights" aria-labelledby="progress-title">
      <SceneStage scene="progress" />
      <header className="pal-page-head">
        <h1 id="progress-title">Progress</h1>
        <p>Every finished workout adds up here. Workouts you didn&apos;t finish stay in History.</p>
        <div className="pal-actions">
          <Link className="pal-insights-pill" href={withFrom("/app/prs", "/app/progress")} prefetch={false}>
            Personal records <Icon name="arrow-right" />
          </Link>
        </div>
      </header>

      <div className="pal-page-body">
        <section aria-labelledby="progress-totals-title">
          <h2 id="progress-totals-title">Your totals</h2>
          <dl className="pal-glance pal-insights-totals">
            <div><dt>Workouts</dt><dd>{totals.completedSessions}</dd></div>
            <div><dt>Sets</dt><dd>{totals.completedWorkSets}</dd></div>
            <div><dt>Reps</dt><dd>{totals.repetitions}</dd></div>
            {totals.volumeKg > 0 ? <div><dt>Lifted</dt><dd>{formatInsightVolume(totals.volumeKg, unitSystem)}</dd></div> : null}
            {totals.durationSeconds > 0 ? <div><dt>Time</dt><dd>{formatInsightDuration(totals.durationSeconds)}</dd></div> : null}
            {totals.distanceMeters > 0 ? <div><dt>Distance</dt><dd>{formatInsightDistance(totals.distanceMeters, unitSystem)}</dd></div> : null}
          </dl>
        </section>

        {progress.series.length === 0 ? (
          <div className="pal-insights-empty">
            <PalSticker pose="ready" />
            <div>
              <h2>Finish a workout to see your progress.</h2>
              <p>Your sets, reps and records start adding up after your first one.</p>
              <Link className="primary-action" href="/app" prefetch={false}>Go to Today <Icon name="arrow-right" /></Link>
            </div>
          </div>
        ) : (
          <section aria-labelledby="progress-timeline-title">
            <div className="pal-section-head">
              <h2 id="progress-timeline-title">Day by day</h2>
              <Link href="/app/history" prefetch={false}>See all history</Link>
            </div>
            {progress.scope.truncated ? (
              <p className="pal-insights-lead">
                Showing your newest {progress.scope.maxSessions} of {progress.scope.sessionCount} completed workouts.
                All-time totals above include all {progress.scope.sessionCount}.
              </p>
            ) : null}
            <ol className="pal-insights-timeline">
              {progress.series.map((point) => {
                const volume = point.volumeKg ?? 0;
                const date = formatProgressDate(point.date);
                return (
                  <li key={point.date}>
                    <div className="pal-insights-day">
                      <strong>{date}</strong>
                      <span>{point.sessionCount} workout{point.sessionCount === 1 ? "" : "s"}</span>
                    </div>
                    {volume > 0 ? (
                      <meter
                        aria-label={`${date} training volume: ${formatInsightVolume(volume, unitSystem)}`}
                        className="pal-insights-meter"
                        max={maximumVolume > 0 ? maximumVolume : 1}
                        value={volume}
                      >
                        {formatInsightVolume(volume, unitSystem)}
                      </meter>
                    ) : null}
                    <dl className="pal-insights-facts">
                      {volume > 0 ? <div><dt>Lifted</dt><dd>{formatInsightVolume(volume, unitSystem)}</dd></div> : null}
                      {(point.durationSeconds ?? 0) > 0 ? <div><dt>Time</dt><dd>{formatInsightDuration(point.durationSeconds ?? undefined)}</dd></div> : null}
                      {(point.distanceMeters ?? 0) > 0 ? <div><dt>Distance</dt><dd>{formatInsightDistance(point.distanceMeters ?? 0, unitSystem)}</dd></div> : null}
                    </dl>
                    <div className="pal-insights-sources">
                      {point.sourceIds.map((sessionId, sourceIndex) => (
                        <Link
                          aria-label={`Open saved workout ${sourceIndex + 1} of ${point.sourceIds.length} from ${date}`}
                          href={withFrom(`/app/history/${sessionId}`, `/app/progress#session-${sessionId}`)}
                          id={`session-${sessionId}`}
                          key={sessionId}
                          prefetch={false}
                        >
                          <Icon name="history" />
                          <span>Workout {sourceIndex + 1}</span>
                        </Link>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        )}
      </div>
    </section>
  );
}
