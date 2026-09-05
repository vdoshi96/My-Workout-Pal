import { DecorativeCompanion } from "@/components/ui/decorative-companion";
import Link from "next/link";

import {
  formatHistoryDate,
  formatPersonalRecord,
} from "@/components/insights/training-insights-presenters";
import { Icon } from "@/components/ui/icon";
import type { PersonalRecordView } from "@/server/repositories/training-insights";

export function PersonalRecordsView({
  records,
  timezone,
  unitSystem,
}: Readonly<{
  records: readonly PersonalRecordView[];
  timezone: string;
  unitSystem: "imperial" | "metric";
}>) {
  return (
    <section className="insights-page" aria-labelledby="records-title">
      <header className="insights-heading contour-surface companion-heading">
        <div>
          <Link className="back-link" href="/app/progress" prefetch={false}>
            <Icon name="arrow-left" /> Back to progress
          </Link>
          <span className="eyebrow">Persisted milestones</span>
          <h1 id="records-title">Personal records</h1>
          <p>
            Records come from your saved sets. Equal bests are kept as ties instead of silently
            choosing one source.
          </p>
        </div>
        <DecorativeCompanion variant="history" />
      </header>

      {records.length === 0 ? (
        <div className="member-empty-sheet">
          <span className="eyebrow">No record rows yet</span>
          <h2>Your first verified milestone will appear here.</h2>
          <p>
            Completing a workout does not guarantee a record. This page only shows personal-record
            rows saved from your own set logs.
          </p>
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
                {record.isTie ? (
                  <>
                    <p className="record-tie">
                      Tied best · {record.totalTieCount} exact source sets
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
                    <Link href={`/app/history/${sourceSessionId}`} key={sourceSessionId}>
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
