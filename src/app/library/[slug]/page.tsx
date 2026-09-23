import { notFound } from "next/navigation";
import { PublicShell } from "@/components/layout/public-shell";
import { ExerciseGuide } from "@/components/exercises/exercise-guide";
import { getDatabase } from "@/db/client";
import { EQUIPMENT_PROFILES } from "@/domain/equipment";
import { CATALOG_EXERCISES } from "@/domain/exercises/catalog";
import { getApprovedCuratedVideoPairBySlug } from "@/server/repositories/curated-videos";

export const dynamic = "force-dynamic";
export const revalidate = 0;
type PageProps = { params: Promise<{ slug: string }>; searchParams: Promise<{ equipment?: string | string[] }> };
export async function generateMetadata({ params }: PageProps) {
  return { title: CATALOG_EXERCISES[(await params).slug]?.name ?? "Exercise" };
}
export default async function ExercisePage({ params, searchParams }: PageProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const exercise = CATALOG_EXERCISES[slug];
  if (!exercise) notFound();
  const profile = query.equipment === "barbell" ? "barbell" : "dumbbells";
  const videos = await getApprovedCuratedVideoPairBySlug(getDatabase(), slug).catch(() => undefined);
  return <PublicShell current="library"><ExerciseGuide exercise={{ ...exercise, videos }} profileLabel={EQUIPMENT_PROFILES[profile].label} backHref={`/library?equipment=${profile}`} backLabel="Exercise library" /></PublicShell>;
}
