import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Icon } from "@/components/ui/icon";
import {
  formatHistoryDate,
  formatInsightDistance,
  formatInsightDuration,
} from "@/components/insights/training-insights-presenters";
import { getHarnessDatabase } from "../../../server/database";
import { harnessRequestContext } from "../../../server/harness-context";
import {
  getViewerProfileProgram,
  RepositoryNotFoundError,
} from "@/server/repositories/profile-program";
import { loadTrainingHistory } from "@/server/repositories/training-insights";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = Readonly<{
  searchParams: Promise<{ cursor?: string | string[]; state?: string | string[] }>;
}>;

function singleValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

async function loadHistoryPageData(
  scope: string,
  viewer: NonNullable<ReturnType<typeof harnessRequestContext>["viewer"]>,
  input: Readonly<{ cursor?: string; state?: "abandoned" | "completed" }>,
) {
  const { database } = await getHarnessDatabase(scope);
  try {
    const [profile, history] = await Promise.all([
      getViewerProfileProgram(database, viewer),
      loadTrainingHistory(database, viewer, input),
    ]);
    if (!profile.activeProgram) redirect("/app");
    return { history, profile };
  } catch (error) {
    if (error instanceof RepositoryNotFoundError) redirect("/app");
    throw error;
  }
}

export default async function HarnessTrainingHistoryPage({ searchParams }: PageProps) {
  const context = harnessRequestContext(await headers());
  if (!context.viewer) return null;
  const params = await searchParams;
  const selectedState = singleValue(params.state);
  const cursor = singleValue(params.cursor);
  const state = selectedState === "completed" || selectedState === "abandoned"
    ? selectedState
    : undefined;
  const { history, profile } = await loadHistoryPageData(context.scope, context.viewer, {
    ...(cursor ? { cursor } : {}),
    ...(state ? { state } : {}),
  });
  const { timezone, unitSystem } = profile.preferences;
  const nextHref = history.nextCursor
    ? `/app/history?${new URLSearchParams({
        cursor: history.nextCursor,
        ...(state ? { state } : {}),
      }).toString()}`
    : undefined;

  return (
    <section className="insights-page" aria-labelledby="history-title">
      <header className="insights-heading contour-surface">
        <div>
          <span className="eyebrow">Immutable training archive</span>
          <h1 id="history-title">History</h1>
          <p>Completed and interrupted workouts exactly as they were saved. Later program edits never rewrite these snapshots.</p>
        </div>
        <Link className="insight-action" href="/app/progress">View progress <Icon name="arrow-right" /></Link>
      </header>

      <form className="history-filter" method="get">
        <label htmlFor="history-state">Show workouts</label>
        <div>
          <select defaultValue={state ?? "all"} id="history-state" name="state">
            <option value="all">Completed and interrupted</option>
            <option value="completed">Completed only</option>
            <option value="abandoned">Interrupted only</option>
          </select>
          <button type="submit">Apply filter</button>
        </div>
        <p>Dates use {timezone}. The archive is read-only.</p>
      </form>

      {history.sessions.length === 0 ? (
        <div className="member-empty-sheet">
          <span className="eyebrow">No saved match</span>
          <h2>{state ? `No ${state === "abandoned" ? "interrupted" : "completed"} workouts yet.` : "Your history starts after a workout ends."}</h2>
          <p>Active workouts remain in the runner so they can be resumed. This page never invents sample activity.</p>
          {state ? <Link href="/app/history">Clear filter</Link> : <Link href="/app">Open your program</Link>}
        </div>
      ) : (
        <ol className="history-list">
          {history.sessions.map((session) => (
            <li key={session.id}>
              <Link href={`/app/history/${session.id}`}>
                <span className={`history-state history-state--${session.state}`}>
                  {session.state === "completed" ? "Completed" : "Interrupted"}
                </span>
                <span className="history-main">
                  <strong>{session.dayName}</strong>
                  <small>{formatHistoryDate(session.occurredAt, timezone)}</small>
                </span>
                <span className="history-facts">
                  <span>{session.completedExerciseCount}/{session.exerciseCount} exercises</span>
                  <span>{session.setCount} set{session.setCount === 1 ? "" : "s"}</span>
                  <span>{formatInsightDuration(session.durationSeconds)}</span>
                  {session.cardio?.distanceMeters !== undefined ? (
                    <span>{formatInsightDistance(session.cardio.distanceMeters, unitSystem)} cardio</span>
                  ) : null}
                </span>
                <Icon name="chevron-right" />
              </Link>
            </li>
          ))}
        </ol>
      )}

      {nextHref ? (
        <nav aria-label="History pagination" className="insight-pagination">
          <Link href={nextHref}>Older workouts <Icon name="arrow-right" /></Link>
        </nav>
      ) : null}
    </section>
  );
}
