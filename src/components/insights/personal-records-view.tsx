import Link from "next/link";

import {
  formatHistoryDate,
  formatPersonalRecord,
  newestRecordKey,
  recordKey,
} from "@/components/insights/training-insights-presenters";
import { BackLink } from "@/components/navigation/back-link";
import { Icon } from "@/components/ui/icon";
import { PalSticker, SceneStage } from "@/components/ui/scene-stage";
import { withFrom, type BackTarget } from "@/domain/navigation/back-target";
import type { PersonalRecordView } from "@/server/repositories/training-insights";

/** A stable, unique anchor for one record row. */
export function recordAnchor(record: PersonalRecordView): string {
  const source = record.sourceSetLogIds[0] ?? record.exerciseName.toLowerCase().replace(/[^a-z0-9]+/gu, "-");
  return `record-${record.type.replaceAll("_", "-")}-${source}`.slice(0, 127);
}

export function PersonalRecordsView({
  back = { href: "/app/progress", label: "Back to Progress" },
  records,
  timezone,
  unitSystem,
}: Readonly<{
  back?: BackTarget;
  records: readonly PersonalRecordView[];
  timezone: string;
  unitSystem: "imperial" | "metric";
}>) {
  // Mark the most recent best only when there is more than one to compare.
  const newest = records.length > 1 ? newestRecordKey(records) : undefined;
  return (
    <section className="pal-insights" aria-labelledby="records-title">
      <SceneStage scene="progress" />
      <header className="pal-page-head">
        <BackLink target={back} />
        <h1 id="records-title">Personal records</h1>
        <p>Your best lifts, reps and times.</p>
      </header>

      <div className="pal-page-body">
        {records.length === 0 ? (
          <div className="pal-insights-empty">
            <PalSticker pose="ready" />
            <div>
              <h2>No records yet</h2>
              <p>Log a few workouts and your bests show up here.</p>
              <Link className="secondary-action" href="/app/history">Review history</Link>
            </div>
          </div>
        ) : (
          <ol className="pal-records">
            {records.map((record) => {
              const presentation = formatPersonalRecord(record.type, record.value, unitSystem);
              const anchor = recordAnchor(record);
              const isNewest = recordKey(record) === newest;
              return (
                <li className={isNewest ? "pal-record pal-record--newest" : "pal-record"} id={anchor} key={recordKey(record)}>
                  <span aria-hidden="true" className="pal-record-medal" />
                  <div className="pal-record-what">
                    <p className="pal-record-label">
                      {presentation.label}
                      {isNewest ? <span className="pal-insights-newest">Newest</span> : null}
                    </p>
                    <h2>{record.exerciseName}</h2>
                    <small>{formatHistoryDate(record.achievedAt, timezone)}</small>
                    {record.isTie ? (
                      <small className="pal-record-tie">
                        Tied best ({record.totalTieCount} times)
                        {record.hasMoreSources ? `. Showing sources from the newest ${record.sourceSetLogIds.length} tied sets.` : null}
                      </small>
                    ) : null}
                  </div>
                  <strong className="pal-record-value">{presentation.value}</strong>
                  <div className="pal-record-sources">
                    {[...new Set(record.sourceSessionIds)].map((sourceSessionId, index) => (
                      <Link href={withFrom(`/app/history/${sourceSessionId}`, `/app/prs#${anchor}`)} key={sourceSessionId}>
                        {record.isTie ? `View tied workout ${index + 1}` : "View source workout"}
                        <Icon name="chevron-right" />
                      </Link>
                    ))}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}
