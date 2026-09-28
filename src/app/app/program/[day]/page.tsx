import { DecorativeCompanion } from "@/components/ui/decorative-companion";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Icon } from "@/components/ui/icon";
import { StartWorkoutControl } from "@/components/workout/start-workout-control";
import { getDatabase } from "@/db/client";
import { getCurrentViewer } from "@/server/auth/viewer";
import { getViewerProfileProgram, RepositoryNotFoundError } from "@/server/repositories/profile-program";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ params }: Readonly<{ params: Promise<{ day: string }> }>) {
  const viewer = await getCurrentViewer();
  if (!viewer) return { title: "Routine" };
  const { day } = await params;
  try { const model = await getViewerProfileProgram(getDatabase(), viewer); return { title: model.activeProgram?.days.find((item) => item.dayKey === day)?.displayName ?? "Routine" }; }
  catch { return { title: "Routine" }; }
}

export default async function MemberDayPage({ params }: Readonly<{ params: Promise<{ day: string }> }>) {
  const [{ day: dayKey }, viewer] = await Promise.all([params, getCurrentViewer()]);
  if (!viewer) return null;
  const model = await getViewerProfileProgram(getDatabase(), viewer).catch((error: unknown) => { if (error instanceof RepositoryNotFoundError) redirect("/app"); throw error; });
  const program = model.activeProgram;
  const day = program?.days.find((candidate) => candidate.dayKey === dayKey);
  if (!program || !day) notFound();

  return (
    <section className="member-day" aria-labelledby="member-day-title">
      <header className="member-day-heading contour-surface companion-heading">
        <Link className="back-link" href="/app"><Icon name="arrow-left" /> Today</Link>
        <span className="eyebrow">Day {day.dayNumber}</span>
        <h1 id="member-day-title">{day.displayName}</h1>
        <p>{day.prescriptions.length} {day.prescriptions.length === 1 ? "movement" : "movements"} · {day.cardio.length === 0
          ? "no cardio finish"
          : `${day.cardio.length} cardio option${day.cardio.length === 1 ? "" : "s"}`}</p>
        <DecorativeCompanion variant="workout" />
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
                      <small>{prescription.setCount} × {prescription.minimumReps ?? prescription.minimumSeconds}–{prescription.maximumReps ?? prescription.maximumSeconds}{prescription.minimumSeconds ? " sec" : " reps"} · {prescription.restSeconds}s rest</small>
                    </span>
                    {prescription.exercise.kind === "catalog" ? (
                      <Link href={`/app/library/${prescription.exercise.slug}`} prefetch={false}>Details <Icon name="chevron-right" /></Link>
                    ) : (
                      <Link href={`/app/library/custom/${prescription.exercise.id}`} prefetch={false}>Private details <Icon name="chevron-right" /></Link>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
        <aside className="member-cardio-card">
          <span className="eyebrow">{day.cardio.length === 0 ? "No cardio" : day.cardio.length === 1 ? "Cardio option" : "Cardio options"}</span>
          <h2>{day.cardio.length === 0 ? "Strength only" : day.cardio.length === 1 ? "Cardio finish" : "Choose a finish"}</h2>
          {day.cardio.length > 0 ? (
            <ul>
              {day.cardio.map((cardio) => (
                <li key={cardio.id}><strong>{cardio.mode === "walker" ? "Walker" : "Runner"}</strong><span>{Math.round(cardio.durationSeconds / 60)} minutes</span></li>
              ))}
            </ul>
          ) : (
            <p>This day has no configured cardio segment.</p>
          )}
          <StartWorkoutControl
            dayId={day.id}
            eligible={viewer.eligibleForPermanentMutations}
            programId={program.id}
          />
        </aside>
      </div>
    </section>
  );
}
