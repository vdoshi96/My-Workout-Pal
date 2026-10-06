import { redirect } from "next/navigation";

import { CustomExerciseEditor } from "@/components/exercises/custom-exercise-editor";
import { fromParam, resolveBackTarget } from "@/domain/navigation/back-target";
import { getCurrentViewer } from "@/server/auth/viewer";

export const metadata = { title: "New movement" };

export const dynamic = "force-dynamic";

type PageProps = Readonly<{ searchParams: Promise<{ from?: string | string[] }> }>;

export default async function NewCustomExercisePage({ searchParams }: PageProps) {
  const viewer = await getCurrentViewer();
  if (!viewer) redirect("/sign-in?returnTo=%2Fapp%2Flibrary%2Fcustom%2Fnew");
  const back = resolveBackTarget(fromParam((await searchParams).from), {
    area: "member",
    fallback: { href: "/app/library/custom", label: "Back to your movements" },
  });
  return <CustomExerciseEditor back={back} canMutate={viewer.eligibleForPermanentMutations} mode="create" />;
}
