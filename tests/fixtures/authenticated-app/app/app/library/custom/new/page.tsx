import { headers } from "next/headers";

import { CustomExerciseEditor } from "@/components/exercises/custom-exercise-editor";
import { fromParam, resolveBackTarget } from "@/domain/navigation/back-target";
import { harnessRequestContext } from "../../../../../server/harness-context";

export const metadata = { title: "New movement" };

export const dynamic = "force-dynamic";

type PageProps = Readonly<{ searchParams: Promise<{ from?: string | string[] }> }>;

export default async function HarnessNewCustomExercisePage({ searchParams }: PageProps) {
  const context = harnessRequestContext(await headers());
  if (!context.viewer) return null;
  const back = resolveBackTarget(fromParam((await searchParams).from), {
    area: "member",
    fallback: { href: "/app/library/custom", label: "Back to your movements" },
  });
  return (
    <CustomExerciseEditor
      back={back}
      canMutate={context.viewer.eligibleForPermanentMutations}
      mode="create"
    />
  );
}
