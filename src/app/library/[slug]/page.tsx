import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PublicShell } from "@/components/layout/public-shell";
import { Icon } from "@/components/ui/icon";
import { EQUIPMENT_PROFILES, supportsEquipment, type EquipmentProfileKind } from "@/domain/equipment";
import { CATALOG_EXERCISES, getCatalogExercise } from "@/domain/exercises/catalog";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ equipment?: string; from?: string }>;
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
  const profile: EquipmentProfileKind = query.equipment === "barbell" ? "barbell" : "dumbbells";
  const compatible = supportsEquipment(EQUIPMENT_PROFILES[profile], exercise.requiredEquipment);

  return (
    <PublicShell current="library">
      <header className="exercise-hero contour-surface">
        <Link className="back-link" href={`/library?equipment=${profile}`}>
          <Icon name="arrow-left" /> Library
        </Link>
        <div className="exercise-title-row">
          <div>
            <span className="eyebrow">{exercise.role.replace("-", " ")}</span>
            <h1>{exercise.name}</h1>
          </div>
          <span className={compatible ? "compatibility-ok" : "compatibility-miss"}>
            {compatible ? `Compatible with ${EQUIPMENT_PROFILES[profile].label}` : `Needs ${exercise.requiredEquipment.join(" + ")}`}
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
          <h3 className="field-note-heading">Route cues</h3>
          <ol className="exercise-cues">
            {exercise.instructions.map((instruction) => <li key={instruction}>{instruction}</li>)}
          </ol>
          <p className="safety-note">Use a load and range of motion you can control. My Workout Pal never auto-prescribes weight and does not provide medical advice.</p>
        </section>

        <section className="video-field" aria-labelledby="demo-heading">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Two-source technique check</span>
              <h2 id="demo-heading">Curated demos</h2>
            </div>
            <span className="status-stamp">Approval gate</span>
          </div>
          <div className="video-slots">
            {[1, 2].map((slot) => (
              <article className="video-unavailable" key={slot}>
                <span>Demo {slot}</span>
                <h3>Manual review pending</h3>
                <p>No placeholder video is shown. This slot opens only after the exact movement and equipment variation is watched in full and approved.</p>
              </article>
            ))}
          </div>
          <p className="temporary-note">The catalog record is ready, but the required YouTube API credential and human review have not been completed. Direct links and embeds will be verified together.</p>
        </section>
      </div>
    </PublicShell>
  );
}
