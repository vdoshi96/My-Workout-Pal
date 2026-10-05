import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { BackLink } from "@/components/navigation/back-link";
import { SceneStage } from "@/components/ui/scene-stage";
import { MovementDemo } from "@/components/video/demo-sheet";
import { StartWorkoutControl } from "@/components/workout/start-workout-control";
import { getDatabase } from "@/db/client";
import { EQUIPMENT_PROFILES } from "@/domain/equipment";
import { fromParam, resolveBackTarget, withFrom } from "@/domain/navigation/back-target";
import { getCurrentViewer } from "@/server/auth/viewer";
import { loadApprovedDemosBySlug } from "@/server/read-models/approved-demos";
import {
  getViewerProfileProgram,
  RepositoryNotFoundError,
  type ActiveProgramPrescriptionReadModel,
} from "@/server/repositories/profile-program";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ params }: Readonly<{ params: Promise<{ day: string }> }>) {
  const viewer = await getCurrentViewer();
  if (!viewer) return { title: "Routine" };
  const { day } = await params;
  try { const model = await getViewerProfileProgram(getDatabase(), viewer); return { title: model.activeProgram?.days.find((item) => item.dayKey === day)?.displayName ?? "Routine" }; }
  catch { return { title: "Routine" }; }
}

function range(minimum: number | null, maximum: number | null) {
  if (minimum === null) return null;
  return maximum === null || maximum === minimum ? `${minimum}` : `${minimum}–${maximum}`;
}

/** "3 sets · 8–12 reps · 90 sec rest", in the same words Today uses. */
function targetLabel(prescription: ActiveProgramPrescriptionReadModel) {
  const sets = `${prescription.setCount} ${prescription.setCount === 1 ? "set" : "sets"}`;
  const reps = range(prescription.minimumReps, prescription.maximumReps);
  const seconds = range(prescription.minimumSeconds, prescription.maximumSeconds);
  const work = reps ? `${reps} reps` : seconds ? `${seconds} sec` : null;
  return [sets, work, `${prescription.restSeconds} sec rest`].filter(Boolean).join(" · ");
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
  const heading = day.displayName === `Day ${day.dayNumber}` ? day.displayName : `Day ${day.dayNumber} · ${day.displayName}`;

  return (
    <section className="pal-dayplan" aria-labelledby="member-day-title">
      <SceneStage scene="workout" />
      <header className="pal-page-head">
        <BackLink target={back} />
        <h1 id="member-day-title">{heading}</h1>
        <p>{day.prescriptions.length} {day.prescriptions.length === 1 ? "movement" : "movements"} · {EQUIPMENT_PROFILES[program.equipmentProfileKind].label}</p>
        <div className="pal-actions">
          <StartWorkoutControl
            dayId={day.id}
            eligible={viewer.eligibleForPermanentMutations}
            label={`Start ${day.displayName}`}
            programId={program.id}
          />
        </div>
      </header>
      <div className="pal-page-body">
        {day.sections.map((section) => (
          <section aria-labelledby={`day-section-${section.id}`} key={section.id}>
            <h2 id={`day-section-${section.id}`}>{section.title}</h2>
            <ol className="pal-moves">
              {section.prescriptions.map((prescription) => {
                const position = positions.get(prescription.id) ?? 0;
                const anchor = `movement-${position}`;
                const from = `${dayHref}#${anchor}`;
                return (
                  <li className="pal-move" id={anchor} key={prescription.id}>
                    <span aria-hidden="true" className="pal-move-number">{position}</span>
                    <div>
                      {prescription.exercise.kind === "catalog" ? (
                        <Link className="pal-move-name" href={withFrom(`/app/library/${prescription.exercise.slug}`, from)} prefetch={false}>{prescription.label}</Link>
                      ) : (
                        <Link className="pal-move-name" href={withFrom(`/app/library/custom/${prescription.exercise.id}`, from)} prefetch={false}>{prescription.label}</Link>
                      )}
                      <small>{targetLabel(prescription)}</small>
                    </div>
                    <MovementDemo
                      movementName={prescription.label}
                      videos={prescription.exercise.kind === "catalog" ? demos[prescription.exercise.slug] : undefined}
                    />
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
        {day.cardio.length > 0 ? (
          <section aria-labelledby="day-cardio-title" className="pal-dayplan-cardio">
            <h2 id="day-cardio-title">Cardio finish</h2>
            {day.cardio.length > 1 ? <p>Pick one when you get there.</p> : null}
            <ul>
              {day.cardio.map((cardio) => (
                <li key={cardio.id}><strong>{cardio.mode === "walker" ? "Walker" : "Runner"}</strong> <span>{Math.round(cardio.durationSeconds / 60)} minutes</span></li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </section>
  );
}
