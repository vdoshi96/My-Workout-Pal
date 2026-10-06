import { EQUIPMENT_LABELS, LOGGING_KIND_LABELS } from "@/components/exercises/labels";
import { headers } from "next/headers";
import Link from "next/link";

import { Icon } from "@/components/ui/icon";
import { SceneStage } from "@/components/ui/scene-stage";
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
    <section className="member-page" aria-labelledby="custom-movements-title">
      <SceneStage scene="library" />
      <header className="pal-page-head">
        <h1 id="custom-movements-title">Custom movements</h1>
        <p>Only you can see these.</p>
        <div className="pal-actions"><Link className="primary-action" href={withFrom("/app/library/custom/new", "/app/library/custom")}><span>Create exercise</span><Icon name="plus" /></Link></div>
      </header>

      <div className="pal-page-body">
        {exercises.length === 0 ? (
          <div className="pal-empty">
            <h2>No custom movements yet</h2>
            <p>{"Add one when the library doesn't have what you need."}</p>
            <Link className="pal-back-link" href="/app/library"><Icon name="library" /> Browse the library</Link>
          </div>
        ) : (
          <ul className="pal-list">
            {exercises.map((exercise) => (
              <li id={`movement-${exercise.id}`} key={exercise.id}>
                <Link href={withFrom(`/app/library/custom/${exercise.id}`, `/app/library/custom#movement-${exercise.id}`)}>
                  <span>
                    <strong>{exercise.name}</strong>
                    <small>{LOGGING_KIND_LABELS[exercise.loggingKind]} · {exercise.equipmentIds.map((id) => EQUIPMENT_LABELS[id]).join(", ")} · {exercise.youtubeVideoIds.length} video{exercise.youtubeVideoIds.length === 1 ? "" : "s"}</small>
                  </span>
                  <Icon name="chevron-right" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
