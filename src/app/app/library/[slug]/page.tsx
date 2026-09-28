import { notFound } from "next/navigation";
import { ExerciseGuide } from "@/components/exercises/exercise-guide";
import { EQUIPMENT_PROFILES } from "@/domain/equipment";
import { CATALOG_EXERCISES } from "@/domain/exercises/catalog";
import { getViewerProfileProgram, RepositoryNotFoundError } from "@/server/repositories/profile-program";
import { getApprovedCuratedVideoPairBySlug } from "@/server/repositories/curated-videos";
import { getCurrentViewer } from "@/server/auth/viewer";
import { getDatabase } from "@/db/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;
type PageProps = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: PageProps) {
  return { title: CATALOG_EXERCISES[(await params).slug]?.name ?? "Exercise" };
}
export default async function MemberExercisePage({ params }: PageProps) {
  const { slug } = await params;
  const exercise = CATALOG_EXERCISES[slug];
  if (!exercise) notFound();
  const viewer = await getCurrentViewer();
  if (!viewer) return null;
  const database = getDatabase();
  const data = await getViewerProfileProgram(database, viewer).catch((error: unknown) => {
    if (error instanceof RepositoryNotFoundError) return undefined;
    throw error;
  });
  const profile = EQUIPMENT_PROFILES[data?.equipment.profileKind ?? "dumbbells"];
  const videos = await getApprovedCuratedVideoPairBySlug(database, slug).catch(() => undefined);
  return <ExerciseGuide exercise={{ ...exercise, videos }} profileLabel={profile.label} backHref="/app/library" backLabel="Library" />;
}
