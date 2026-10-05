import { DecorativeCompanion } from "@/components/ui/decorative-companion";
import Link from "next/link";

import {
  formatHistoryDate,
  formatPersonalRecord,
} from "@/components/insights/training-insights-presenters";
import { BackLink } from "@/components/navigation/back-link";
import { Icon } from "@/components/ui/icon";
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
  return (
    <section className="insights-page" aria-labelledby="records-title">
      <header className="insights-heading contour-surface companion-heading">
        <div>
          <BackLink target={back} />
          <h1 id="records-title">Personal records</h1>
          <p>
            Your best lifts, reps and times.
          </p>
        </div>
        <DecorativeCompanion variant="history" />
      </header>

      {records.length === 0 ? (
        <div className="member-empty-sheet">
          <h2>No records yet</h2>
          <p>
            Log a few workouts and your bests will show up here.
          </p>
          <Link href="/app/history">Review history</Link>
        </div>
      ) : (
        <ol className="records-grid">
          {records.map((record) => {
            const presentation = formatPersonalRecord(record.type, record.value, unitSystem);
            const anchor = recordAnchor(record);
            return (
              <li id={anchor} key={`${record.type}:${record.sourceSetLogIds.join(":")}`}>
                <span className="eyebrow">{presentation.label}</span>
                <strong>{presentation.value}</strong>
                <h2>{record.exerciseName}</h2>
                <p>{formatHistoryDate(record.achievedAt, timezone)}</p>
                {record.isTie ? (
                  <>
                    <p className="record-tie">
                      Tied best ({record.totalTieCount} times)
                    </p>
                    {record.hasMoreSources ? (
                      <p>
                        Showing sources from the newest {record.sourceSetLogIds.length} tied sets.
                      </p>
                    ) : null}
                  </>
                ) : null}
                <div className="record-sources">
                  {[...new Set(record.sourceSessionIds)].map((sourceSessionId, index) => (
                    <Link href={withFrom(`/app/history/${sourceSessionId}`, `/app/prs#${anchor}`)} key={sourceSessionId}>
                      {record.isTie ? `View tied workout ${index + 1}` : "View source workout"}{" "}
                      <Icon name="chevron-right" />
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
