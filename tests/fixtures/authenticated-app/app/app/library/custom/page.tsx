import { EQUIPMENT_LABELS, LOGGING_KIND_LABELS } from "@/components/exercises/labels";
import { headers } from "next/headers";
import Link from "next/link";

import { Icon } from "@/components/ui/icon";
import { withFrom } from "@/domain/navigation/back-target";
import { getHarnessDatabase } from "../../../../server/database";
import { harnessRequestContext } from "../../../../server/harness-context";
import { listCustomExercises } from "@/server/repositories/custom-exercises";

export const metadata = { title: "Custom movements" };

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HarnessCustomExerciseLibraryPage() {
  const context = harnessRequestContext(await headers());
  if (!context.viewer) return null;
  const { database } = await getHarnessDatabase(context.scope);
  const exercises = await listCustomExercises(database, context.viewer);

  return (
    <section className="member-page">
      <header className="member-page-heading">
        <div>
          <span className="eyebrow">Your private library</span>
          <h1>Custom movements</h1>
          <p>Only you can see these.</p>
        </div>
        <Link className="primary-action" href={withFrom("/app/library/custom/new", "/app/library/custom")}><span>Create exercise</span><Icon name="arrow-right" /></Link>
      </header>

      {exercises.length === 0 ? (
        <div className="member-empty-sheet">
          <h2>No custom movements yet</h2>
          <p>{"Add one when the library doesn't have what you need."}</p>
          <Link className="back-link" href="/app/library"><Icon name="library" /> Browse the library</Link>
        </div>
      ) : (
        <ul className="custom-exercise-list">
          {exercises.map((exercise) => (
            <li id={`movement-${exercise.id}`} key={exercise.id}>
              <Link href={withFrom(`/app/library/custom/${exercise.id}`, `/app/library/custom#movement-${exercise.id}`)}>
                <span>
                  <strong>{exercise.name}</strong>
                  <small>{LOGGING_KIND_LABELS[exercise.loggingKind]} · {exercise.equipmentIds.map((id) => EQUIPMENT_LABELS[id]).join(", ")}</small>
                </span>
                <span>{exercise.youtubeVideoIds.length} video{exercise.youtubeVideoIds.length === 1 ? "" : "s"}</span>
                <Icon name="chevron-right" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
