import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PublicShell } from "@/components/layout/public-shell";
import { Icon } from "@/components/ui/icon";
import { ExerciseVideoField } from "@/components/video/exercise-video-field";
import { getDatabase } from "@/db/client";
import { EQUIPMENT_PROFILES, supportsEquipment, type EquipmentProfileKind } from "@/domain/equipment";
import { CATALOG_EXERCISES, getCatalogExercise } from "@/domain/exercises/catalog";
import { resolvePublicExerciseReturn } from "@/domain/navigation/public-exercise-return";
import { getApprovedCuratedVideoPairBySlug } from "@/server/repositories/curated-videos";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    equipment?: string | string[];
    returnTo?: string | string[];
  }>;
};

const roleDefaults = {
  compound: "3 work sets · 8–12 reps · 90s rest",
  accessory: "2 work sets · 10–15 reps · 60s rest",
  "core-reps": "2 work sets · 8–15 reps · 60s rest",
  "core-timed": "2 work sets · 20–45 seconds · 60s rest",
} as const;

const loggingLabels = {
  weight_reps: "Load and reps",
  bodyweight_reps: "Bodyweight reps",
  duration: "Duration",
  distance_duration: "Distance and duration",
} as const;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const exercise = CATALOG_EXERCISES[slug];
  return { title: exercise?.name ?? "Exercise" };
}

export default async function ExercisePage({ params, searchParams }: PageProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  if (!CATALOG_EXERCISES[slug]) notFound();
  const exercise = getCatalogExercise(slug);
  const videos = await getApprovedCuratedVideoPairBySlug(getDatabase(), slug)
    .catch(() => undefined);
  const profile: EquipmentProfileKind = query.equipment === "barbell" ? "barbell" : "dumbbells";
  const compatible = supportsEquipment(EQUIPMENT_PROFILES[profile], exercise.requiredEquipment);
  const returnContext = resolvePublicExerciseReturn(query.returnTo, profile);

  return (
    <PublicShell current="library">
      <header className="exercise-hero contour-surface">
        <Link className="back-link" href={returnContext.href}>
          <Icon name="arrow-left" /> {returnContext.label}
        </Link>
        <div className="exercise-title-row">
          <div>
            <span className="eyebrow">{exercise.role.replace("-", " ")}</span>
            <h1>{exercise.name}</h1>
          </div>
          <span className={compatible ? "compatibility-ok" : "compatibility-miss"}>
            {compatible ? `Fits your ${EQUIPMENT_PROFILES[profile].label} profile` : `Needs ${exercise.requiredEquipment.join(" + ")}`}
          </span>
        </div>
      </header>

      <div className="exercise-grid">
        <section className="exercise-facts" aria-labelledby="exercise-facts-heading">
          <span className="eyebrow">Starter prescription</span>
          <h2 id="exercise-facts-heading">Field notes</h2>
          <dl>
            <div><dt>Default</dt><dd>{roleDefaults[exercise.role]}</dd></div>
            <div><dt>Track</dt><dd>{loggingLabels[exercise.loggingKind]}</dd></div>
            <div><dt>Equipment</dt><dd>{exercise.requiredEquipment.join(", ")}</dd></div>
            <div><dt>Primary muscles</dt><dd>{exercise.primaryMuscles.join(", ")}</dd></div>
          </dl>
          <h3 className="field-note-heading">Movement cues</h3>
          <ol className="exercise-cues">
            {exercise.instructions.map((instruction) => <li key={instruction}>{instruction}</li>)}
          </ol>
          <p className="safety-note">Use a load and range of motion you can control. My Workout Pal never auto-prescribes weight and does not provide medical advice.</p>
        </section>

        <ExerciseVideoField videos={videos} />
      </div>
    </PublicShell>
  );
}
