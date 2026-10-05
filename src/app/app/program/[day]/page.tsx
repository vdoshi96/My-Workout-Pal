import { DecorativeCompanion } from "@/components/ui/decorative-companion";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { BackLink } from "@/components/navigation/back-link";
import { Icon } from "@/components/ui/icon";
import { MovementDemo } from "@/components/video/demo-sheet";
import { StartWorkoutControl } from "@/components/workout/start-workout-control";
import { getDatabase } from "@/db/client";
import { fromParam, resolveBackTarget, withFrom } from "@/domain/navigation/back-target";
import { getCurrentViewer } from "@/server/auth/viewer";
import { loadApprovedDemosBySlug } from "@/server/read-models/approved-demos";
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

type PageProps = Readonly<{ params: Promise<{ day: string }>; searchParams: Promise<{ from?: string | string[] }> }>;

export default async function MemberDayPage({ params, searchParams }: PageProps) {
  const [{ day: dayKey }, query, viewer] = await Promise.all([params, searchParams, getCurrentViewer()]);
  if (!viewer) return null;
  const database = getDatabase();
  const model = await getViewerProfileProgram(database, viewer).catch((error: unknown) => { if (error instanceof RepositoryNotFoundError) redirect("/app"); throw error; });
  const program = model.activeProgram;
  const day = program?.days.find((candidate) => candidate.dayKey === dayKey);
  if (!program || !day) notFound();
  const back = resolveBackTarget(fromParam(query.from), {
    area: "member",
    fallback: { href: "/app", label: "Back to Today" },
    days: program.days,
  });
  const demos = await loadApprovedDemosBySlug(
    database,
    day.prescriptions.flatMap((prescription) => prescription.exercise.kind === "catalog" ? [prescription.exercise.slug] : []),
  );
  const positions = new Map(day.sections.flatMap((section) => section.prescriptions).map((prescription, index) => [prescription.id, index + 1]));
  const dayHref = `/app/program/${encodeURIComponent(day.dayKey)}`;

  return (
    <section className="member-day" aria-labelledby="member-day-title">
      <header className="member-day-heading contour-surface companion-heading">
        <BackLink target={back} />
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
                {section.prescriptions.map((prescription) => {
                  const anchor = `movement-${positions.get(prescription.id) ?? 0}`;
                  const from = `${dayHref}#${anchor}`;
                  return (
                  <li id={anchor} key={prescription.id}>
                    <span>
                      <strong>{prescription.label}</strong>
                      <small>{prescription.setCount} × {prescription.minimumReps ?? prescription.minimumSeconds}–{prescription.maximumReps ?? prescription.maximumSeconds}{prescription.minimumSeconds ? " sec" : " reps"} · {prescription.restSeconds}s rest</small>
                    </span>
                    {prescription.exercise.kind === "catalog" ? (
                      <>
                        <MovementDemo movementName={prescription.label} videos={demos[prescription.exercise.slug]} />
                        <Link href={withFrom(`/app/library/${prescription.exercise.slug}`, from)} prefetch={false}>Details <Icon name="chevron-right" /></Link>
                      </>
                    ) : (
                      <>
                        <MovementDemo movementName={prescription.label} videos={undefined} />
                        <Link href={withFrom(`/app/library/custom/${prescription.exercise.id}`, from)} prefetch={false}>Private details <Icon name="chevron-right" /></Link>
                      </>
                    )}
                  </li>
                  );
                })}
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
