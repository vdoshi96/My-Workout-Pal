import { headers } from "next/headers";

import { CustomExerciseEditor } from "@/components/exercises/custom-exercise-editor";
import { harnessRequestContext } from "../../../../../server/harness-context";

export const dynamic = "force-dynamic";

export default async function HarnessNewCustomExercisePage() {
  const context = harnessRequestContext(await headers());
  if (!context.viewer) return null;
  return (
    <CustomExerciseEditor
      canMutate={context.viewer.eligibleForPermanentMutations}
      mode="create"
    />
  );
}
