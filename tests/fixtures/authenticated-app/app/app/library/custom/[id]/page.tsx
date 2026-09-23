import { and, eq } from "drizzle-orm";
import { programPrescriptions, workoutExerciseSnapshots } from "@/db/schema";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { CustomExerciseEditor } from "@/components/exercises/custom-exercise-editor";
import { customExerciseIdSchema } from "@/server/http/custom-exercise-api";
import {
  CustomExerciseRepositoryError,
  getCustomExercise,
} from "@/server/repositories/custom-exercises";
import { getHarnessDatabase } from "../../../../../server/database";
import { harnessRequestContext } from "../../../../../server/harness-context";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = Readonly<{ params: Promise<{ id: string }> }>;

export async function generateMetadata({ params }: PageProps) {
  const context = harnessRequestContext(await headers());
  if (!context.viewer) return { title: "Custom movement" };
  const { database } = await getHarnessDatabase(context.scope);
  const id = customExerciseIdSchema.safeParse((await params).id);
  if (!id.success) return { title: "Custom movement" };
  try { return { title: (await getCustomExercise(database, context.viewer, id.data)).name }; }
  catch { return { title: "Custom movement" }; }
}

export default async function HarnessEditCustomExercisePage({ params }: PageProps) {
  const context = harnessRequestContext(await headers());
  if (!context.viewer) return null;
  const id = customExerciseIdSchema.safeParse((await params).id);
  if (!id.success) notFound();
  const { database } = await getHarnessDatabase(context.scope);
  let exercise;
  try {
    exercise = await getCustomExercise(database, context.viewer, id.data);
  } catch (error) {
    if (error instanceof CustomExerciseRepositoryError && error.code === "not_found") notFound();
    throw error;
  }

  const [routineReferences, workoutReferences] = await Promise.all([
    database.select({ id: programPrescriptions.id }).from(programPrescriptions).where(and(eq(programPrescriptions.ownerFirebaseUid, context.viewer.uid), eq(programPrescriptions.customExerciseId, id.data))).limit(1),
    database.select({ id: workoutExerciseSnapshots.id }).from(workoutExerciseSnapshots).where(and(eq(workoutExerciseSnapshots.ownerFirebaseUid, context.viewer.uid), eq(workoutExerciseSnapshots.customExerciseId, id.data))).limit(1),
  ]);
  return (
    <CustomExerciseEditor
      canMutate={context.viewer.eligibleForPermanentMutations}
      exercise={exercise}
      referenced={routineReferences.length + workoutReferences.length > 0}
      mode="edit"
    />
  );
}
