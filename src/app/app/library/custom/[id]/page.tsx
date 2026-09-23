import { and, eq } from "drizzle-orm";
import { programPrescriptions, workoutExerciseSnapshots } from "@/db/schema";
import { notFound, redirect } from "next/navigation";

import { CustomExerciseEditor } from "@/components/exercises/custom-exercise-editor";
import { getDatabase } from "@/db/client";
import { getCurrentViewer } from "@/server/auth/viewer";
import { customExerciseIdSchema } from "@/server/http/custom-exercise-api";
import {
  CustomExerciseRepositoryError,
  getCustomExercise,
} from "@/server/repositories/custom-exercises";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = Readonly<{ params: Promise<{ id: string }> }>;

export async function generateMetadata({ params }: PageProps) {
  const viewer = await getCurrentViewer();
  if (!viewer) return { title: "Custom movement" };
  const id = customExerciseIdSchema.safeParse((await params).id);
  if (!id.success) return { title: "Custom movement" };
  try { return { title: (await getCustomExercise(getDatabase(), viewer, id.data)).name }; }
  catch { return { title: "Custom movement" }; }
}

export default async function EditCustomExercisePage({ params }: PageProps) {
  const viewer = await getCurrentViewer();
  if (!viewer) redirect("/sign-in?returnTo=%2Fapp%2Flibrary%2Fcustom");
  const id = customExerciseIdSchema.safeParse((await params).id);
  if (!id.success) notFound();
  let exercise;
  try {
    exercise = await getCustomExercise(getDatabase(), viewer, id.data);
  } catch (error) {
    if (error instanceof CustomExerciseRepositoryError && error.code === "not_found") notFound();
    throw error;
  }
  const [routineReferences, workoutReferences] = await Promise.all([
    getDatabase().select({ id: programPrescriptions.id }).from(programPrescriptions).where(and(eq(programPrescriptions.ownerFirebaseUid, viewer.uid), eq(programPrescriptions.customExerciseId, id.data))).limit(1),
    getDatabase().select({ id: workoutExerciseSnapshots.id }).from(workoutExerciseSnapshots).where(and(eq(workoutExerciseSnapshots.ownerFirebaseUid, viewer.uid), eq(workoutExerciseSnapshots.customExerciseId, id.data))).limit(1),
  ]);
  return (
    <CustomExerciseEditor
      canMutate={viewer.eligibleForPermanentMutations}
      exercise={exercise}
      referenced={routineReferences.length + workoutReferences.length > 0}
      mode="edit"
    />
  );
}
