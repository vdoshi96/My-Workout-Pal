import { redirect } from "next/navigation";

import { CustomExerciseEditor } from "@/components/exercises/custom-exercise-editor";
import { getCurrentViewer } from "@/server/auth/viewer";

export const dynamic = "force-dynamic";

export default async function NewCustomExercisePage() {
  const viewer = await getCurrentViewer();
  if (!viewer) redirect("/sign-in?returnTo=%2Fapp%2Flibrary%2Fcustom%2Fnew");
  return <CustomExerciseEditor canMutate={viewer.eligibleForPermanentMutations} mode="create" />;
}
