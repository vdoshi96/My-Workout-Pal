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
  return (
    <CustomExerciseEditor
      canMutate={viewer.eligibleForPermanentMutations}
      exercise={exercise}
      mode="edit"
    />
  );
}
