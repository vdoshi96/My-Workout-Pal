import { headers } from "next/headers";
import Link from "next/link";
import { withFrom } from "@/domain/navigation/back-target";
import { redirect } from "next/navigation";

import { Icon } from "@/components/ui/icon";
import { PalSticker, SceneStage } from "@/components/ui/scene-stage";
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

export const metadata = { title: "History" };

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
  const historyHref = `/app/history${cursor || state ? `?${new URLSearchParams({
    ...(cursor ? { cursor } : {}),
    ...(state ? { state } : {}),
  }).toString()}` : ""}`;

  return (
    <section className="pal-insights" aria-labelledby="history-title">
      <SceneStage scene="progress" />
      <header className="pal-page-head">
        <h1 id="history-title">History</h1>
        <p>{"Every workout you've finished or stopped."}</p>
        <div className="pal-actions">
          <Link className="pal-insights-pill" href="/app/progress" prefetch={false}>See your progress <Icon name="arrow-right" /></Link>
        </div>
      </header>

      <div className="pal-page-body">
        <form className="pal-insights-filter" method="get">
          <label htmlFor="history-state">Show workouts</label>
          <div>
            <select defaultValue={state ?? "all"} id="history-state" name="state">
              <option value="all">All workouts</option>
              <option value="completed">Finished</option>
              <option value="abandoned">Not finished</option>
            </select>
            <button className="secondary-action" type="submit">Apply filter</button>
          </div>
          <p>Times shown in {timezone}.</p>
        </form>

        {history.sessions.length === 0 ? (
          <div className="pal-insights-empty">
            <PalSticker pose="ready" />
            <div>
              <h2>{state ? `No ${state === "abandoned" ? "unfinished" : "finished"} workouts yet.` : "Your history starts after your first workout."}</h2>
              <p>Every workout you finish or stop shows up here.</p>
              {state ? <Link className="secondary-action" href="/app/history" prefetch={false}>Clear filter</Link> : <Link className="primary-action" href="/app" prefetch={false}>Go to Today <Icon name="arrow-right" /></Link>}
            </div>
          </div>
        ) : (
          <ol className="pal-list pal-history-list">
            {history.sessions.map((session) => (
              <li id={`session-${session.id}`} key={session.id}>
                <Link href={withFrom(`/app/history/${session.id}`, `${historyHref}#session-${session.id}`)} prefetch={false}>
                  <span className="pal-history-main">
                    <strong>{session.dayName}</strong>
                    <small>{formatHistoryDate(session.occurredAt, timezone)}</small>
                    <small className="pal-history-facts">
                      <span>{session.completedExerciseCount}/{session.exerciseCount} exercises</span>
                      <span>{session.setCount} set{session.setCount === 1 ? "" : "s"}</span>
                      <span>{formatInsightDuration(session.durationSeconds)}</span>
                      {session.cardio?.distanceMeters !== undefined ? (
                        <span>{formatInsightDistance(session.cardio.distanceMeters, unitSystem)} cardio</span>
                      ) : null}
                    </small>
                  </span>
                  <span className="pal-history-end">
                    <span className={`pal-insights-status pal-insights-status--${session.state}`}>
                      {session.state === "completed" ? "Completed" : "Not finished"}
                    </span>
                    <Icon name="chevron-right" />
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}

        {nextHref ? (
          <nav aria-label="History pagination" className="pal-insights-more">
            <Link className="secondary-action" href={nextHref} prefetch={false}>Older workouts <Icon name="arrow-right" /></Link>
          </nav>
        ) : null}
      </div>
    </section>
  );
}
