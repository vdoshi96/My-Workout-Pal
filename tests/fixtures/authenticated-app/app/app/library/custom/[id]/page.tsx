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

  return (
    <CustomExerciseEditor
      canMutate={context.viewer.eligibleForPermanentMutations}
      exercise={exercise}
      mode="edit"
    />
  );
}
