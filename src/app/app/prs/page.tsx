import Link from "next/link";
import { redirect } from "next/navigation";

import {
  formatHistoryDate,
  formatPersonalRecord,
} from "@/components/insights/training-insights-presenters";
import { Icon } from "@/components/ui/icon";
import { getDatabase } from "@/db/client";
import { getCurrentViewer } from "@/server/auth/viewer";
import {
  getViewerProfileProgram,
  RepositoryNotFoundError,
} from "@/server/repositories/profile-program";
import { loadPersonalRecords } from "@/server/repositories/training-insights";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function loadRecordsPageData(
  viewer: NonNullable<Awaited<ReturnType<typeof getCurrentViewer>>>,
) {
  const database = getDatabase();
  try {
    const [profile, records] = await Promise.all([
      getViewerProfileProgram(database, viewer),
      loadPersonalRecords(database, viewer),
    ]);
    if (!profile.activeProgram) redirect("/app");
    return { profile, records };
  } catch (error) {
    if (error instanceof RepositoryNotFoundError) redirect("/app");
    throw error;
  }
}

export default async function PersonalRecordsPage() {
  const viewer = await getCurrentViewer();
  if (!viewer) return null;
  const { profile, records } = await loadRecordsPageData(viewer);
  const { timezone, unitSystem } = profile.preferences;

  return (
    <section className="insights-page" aria-labelledby="records-title">
        <header className="insights-heading contour-surface">
          <div>
            <Link className="back-link" href="/app/progress"><Icon name="arrow-left" /> Back to progress</Link>
            <span className="eyebrow">Persisted milestones</span>
            <h1 id="records-title">Personal records</h1>
            <p>Records come from your saved sets. Equal bests are kept as ties instead of silently choosing one source.</p>
          </div>
        </header>

        {records.length === 0 ? (
          <div className="member-empty-sheet">
            <span className="eyebrow">No record rows yet</span>
            <h2>Your first verified milestone will appear here.</h2>
            <p>Completing a workout does not guarantee a record. This page only shows personal-record rows saved from your own set logs.</p>
            <Link href="/app/history">Review history</Link>
          </div>
        ) : (
          <ol className="records-grid">
            {records.map((record) => {
              const presentation = formatPersonalRecord(record.type, record.value, unitSystem);
              return (
                <li key={`${record.type}:${record.sourceSetLogIds.join(":")}`}>
                  <span className="eyebrow">{presentation.label}</span>
                  <strong>{presentation.value}</strong>
                  <h2>{record.exerciseName}</h2>
                  <p>{formatHistoryDate(record.achievedAt, timezone)}</p>
                  {record.isTie ? <p className="record-tie">Tied best · {record.sourceSessionIds.length} source sets</p> : null}
                  <div className="record-sources">
                    {[...new Set(record.sourceSessionIds)].map((sourceSessionId, index) => (
                      <Link href={`/app/history/${sourceSessionId}`} key={sourceSessionId}>
                        {record.isTie ? `View tied workout ${index + 1}` : "View source workout"} <Icon name="chevron-right" />
                      </Link>
                    ))}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
    </section>
  );
}
