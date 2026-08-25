import Link from "next/link";
import { redirect } from "next/navigation";

import { Icon } from "@/components/ui/icon";
import { getDatabase } from "@/db/client";
import { getCurrentViewer } from "@/server/auth/viewer";
import { listCustomExercises } from "@/server/repositories/custom-exercises";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CustomExerciseLibraryPage() {
  const viewer = await getCurrentViewer();
  if (!viewer) redirect("/sign-in?returnTo=%2Fapp%2Flibrary%2Fcustom");
  const exercises = await listCustomExercises(getDatabase(), viewer);

  return (
    <section className="member-page">
      <header className="member-page-heading">
        <div>
          <span className="eyebrow">Your private library</span>
          <h1>Custom movements</h1>
          <p>Private exercises can join owned programs and workout snapshots. They never appear in another member’s search.</p>
        </div>
        <Link className="primary-action" href="/app/library/custom/new"><span>Create exercise</span><Icon name="arrow-right" /></Link>
      </header>

      {exercises.length === 0 ? (
        <div className="member-empty-sheet">
          <span className="eyebrow">No custom movements</span>
          <h2>The canonical catalog is still available.</h2>
          <p>Create a movement only when the seeded library does not describe the logging and equipment you need.</p>
          <Link className="back-link" href="/library"><Icon name="library" /> Browse canonical exercises</Link>
        </div>
      ) : (
        <ul className="custom-exercise-list">
          {exercises.map((exercise) => (
            <li key={exercise.id}>
              <Link href={`/app/library/custom/${exercise.id}`}>
                <span>
                  <strong>{exercise.name}</strong>
                  <small>{exercise.loggingKind.replaceAll("_", " ")} · {exercise.equipmentIds.map((id) => equipmentLabel(id)).join(", ")}</small>
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

function equipmentLabel(id: string): string {
  return id === "bodyweight" ? "bodyweight" : id === "bench" ? "bench" : id;
}
