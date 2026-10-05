import { EQUIPMENT_LABELS, LOGGING_KIND_LABELS } from "@/components/exercises/labels";
import { BackLink } from "@/components/navigation/back-link";
import { SceneStage } from "@/components/ui/scene-stage";
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
  return <>
    <SceneStage scene="library" />
    <article className="pal-guide">
      <header className="pal-page-head">
        <BackLink target={{ href: backHref, label: backLabel }} />
        <h1>{exercise.name}</h1>
        <p><span className={compatible ? "pal-tag" : "pal-tag pal-tag--warn"}>{compatible ? `Works with ${profileLabel}` : `Needs ${missing}`}</span></p>
      </header>
      <div className="pal-page-body pal-guide-body">
        <ExerciseVideoField videos={exercise.videos} />
        <div className="pal-guide-notes">
          <section aria-labelledby="guide-steps-heading"><h2 id="guide-steps-heading">How to do it</h2><ol className="pal-steps-list">{exercise.instructions.map((instruction) => <li key={instruction}>{instruction}</li>)}</ol></section>
          <section aria-labelledby="guide-details-heading" className="pal-group"><h2 id="guide-details-heading">Details</h2><dl className="pal-details">
            <div><dt>Starting point</dt><dd>{roleDefaults[exercise.role]}</dd></div>
            <div><dt>You log</dt><dd>{LOGGING_KIND_LABELS[exercise.loggingKind]}</dd></div>
            <div><dt>Equipment</dt><dd>{exercise.requiredEquipment.map((item) => EQUIPMENT_LABELS[item]).join(", ")}</dd></div>
            <div><dt>Main muscles</dt><dd>{exercise.primaryMuscles.join(", ")}</dd></div>
          </dl></section>
          <p className="pal-note">Pick a weight and range you can control.</p>
        </div>
      </div>
    </article>
  </>;
}
