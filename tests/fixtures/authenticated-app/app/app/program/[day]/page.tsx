import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { Icon } from "@/components/ui/icon";
import { StartWorkoutControl } from "@/components/workout/start-workout-control";
import { getViewerProfileProgram } from "@/server/repositories/profile-program";
import { getHarnessDatabase } from "../../../../server/database";
import { harnessRequestContext } from "../../../../server/harness-context";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HarnessMemberDayPage({
  params,
}: Readonly<{ params: Promise<{ day: string }> }>) {
  const [{ day: dayKey }, context] = await Promise.all([
    params,
    headers().then(harnessRequestContext),
  ]);
  if (!context.viewer) return null;
  const { database } = await getHarnessDatabase(context.scope);
  const model = await getViewerProfileProgram(database, context.viewer);
  const program = model.activeProgram;
  const day = program?.days.find((candidate) => candidate.dayKey === dayKey);
  if (!program || !day) notFound();

  return (
    <section className="member-day" aria-labelledby="member-day-title">
      <header className="member-day-heading contour-surface">
        <Link className="back-link" href="/app">
          <Icon name="arrow-left" /> Program
        </Link>
        <span className="eyebrow">
          Day {day.dayNumber} · revision {program.revisionNumber}
        </span>
        <h1 id="member-day-title">{day.displayName}</h1>
        <p>
          {day.prescriptions.length} movements with a configurable walker or runner finish.
        </p>
      </header>
      <div className="member-day-layout">
        <div>
          {day.sections.map((section) => (
            <section className="member-day-section" key={section.id}>
              <h2>{section.title}</h2>
              <ol>
                {section.prescriptions.map((prescription) => (
                  <li key={prescription.id}>
                    <span>
                      <strong>{prescription.label}</strong>
                      <small>
                        {prescription.setCount} ×{" "}
                        {prescription.minimumReps ?? prescription.minimumSeconds}–
                        {prescription.maximumReps ?? prescription.maximumSeconds}
                        {prescription.minimumSeconds ? " sec" : " reps"} ·{" "}
                        {prescription.restSeconds}s rest
                      </small>
                    </span>
                    {prescription.exercise.kind === "catalog" ? (
                      <Link href={`/library/${prescription.exercise.slug}`}>
                        Details <Icon name="chevron-right" />
                      </Link>
                    ) : (
                      <Link href={`/app/library/custom/${prescription.exercise.id}`}>
                        Private details <Icon name="chevron-right" />
                      </Link>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
        <aside className="member-cardio-card">
          <span className="eyebrow">Cardio choice</span>
          <h2>Walk or run</h2>
          <ul>
            {day.cardio.map((cardio) => (
              <li key={cardio.id}>
                <strong>{cardio.mode === "walker" ? "Walker" : "Runner"}</strong>
                <span>{Math.round(cardio.durationSeconds / 60)} minutes</span>
              </li>
            ))}
          </ul>
          <p>
            The server snapshots this exact revision before the runner opens. A duplicate
            start resumes the existing active workout.
          </p>
          <StartWorkoutControl
            dayId={day.id}
            eligible={context.viewer.eligibleForPermanentMutations}
            programId={program.id}
          />
        </aside>
      </div>
    </section>
  );
}
