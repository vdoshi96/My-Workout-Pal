import Link from "next/link";
import { EQUIPMENT_LABELS, LOGGING_KIND_LABELS } from "@/components/exercises/labels";
import { ExerciseVideoField } from "@/components/video/exercise-video-field";
import { EQUIPMENT_PROFILES, supportsEquipment } from "@/domain/equipment";
import type { CatalogExercise } from "@/domain/exercises/catalog";
import type { CuratedVideos } from "@/domain/youtube/embed";

const roleDefaults = {
  compound: "3 work sets · 8–12 reps · 90s rest",
  accessory: "2 work sets · 10–15 reps · 60s rest",
  "core-reps": "2 work sets · 8–15 reps · 60s rest",
  "core-timed": "2 work sets · 20–45 seconds · 60s rest",
} as const;

type Props = Readonly<{ exercise: CatalogExercise & { videos?: CuratedVideos | undefined }; profileLabel: string; backHref: string; backLabel: string }>;
export function ExerciseGuide({ exercise, profileLabel, backHref, backLabel }: Props) {
  const profile = Object.values(EQUIPMENT_PROFILES).find((candidate) => candidate.label === profileLabel) ?? EQUIPMENT_PROFILES.dumbbells;
  const compatible = supportsEquipment(profile, exercise.requiredEquipment);
  const missing = exercise.requiredEquipment.filter((item) => !(profile.equipment as readonly string[]).includes(item)).map((item) => EQUIPMENT_LABELS[item]).join(", ");
  return <article className="exercise-guide">
    <Link className="back-link" href={backHref}>{backLabel}</Link>
    <header><h1>{exercise.name}</h1><p>{compatible ? `Works with ${profileLabel}` : `Needs ${missing}`}</p></header>
    <ExerciseVideoField videos={exercise.videos} />
    <section><h2>How to do it</h2><ol className="exercise-cues">{exercise.instructions.map((instruction) => <li key={instruction}>{instruction}</li>)}</ol></section>
    <section><h2>Details</h2><dl>
      <div><dt>Default</dt><dd>{roleDefaults[exercise.role]}</dd></div>
      <div><dt>Tracks</dt><dd>{LOGGING_KIND_LABELS[exercise.loggingKind]}</dd></div>
      <div><dt>Equipment</dt><dd>{exercise.requiredEquipment.map((item) => EQUIPMENT_LABELS[item]).join(", ")}</dd></div>
      <div><dt>Main muscles</dt><dd>{exercise.primaryMuscles.join(", ")}</dd></div>
    </dl></section>
    <p>Pick a weight and range you can control.</p>
  </article>;
}
