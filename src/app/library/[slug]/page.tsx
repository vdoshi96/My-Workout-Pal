import { notFound } from "next/navigation";
import { PublicShell } from "@/components/layout/public-shell";
import { ExerciseGuide } from "@/components/exercises/exercise-guide";
import { getDatabase } from "@/db/client";
import { EQUIPMENT_PROFILES } from "@/domain/equipment";
import { CATALOG_EXERCISES } from "@/domain/exercises/catalog";
import { fromParam, resolveBackTarget } from "@/domain/navigation/back-target";
import { getApprovedCuratedVideoPairBySlug } from "@/server/repositories/curated-videos";

export const dynamic = "force-dynamic";
export const revalidate = 0;
type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ equipment?: string | string[]; from?: string | string[]; returnTo?: string | string[] }>;
};
export async function generateMetadata({ params }: PageProps) {
  return { title: CATALOG_EXERCISES[(await params).slug]?.name ?? "Exercise" };
}
export default async function ExercisePage({ params, searchParams }: PageProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const exercise = CATALOG_EXERCISES[slug];
  if (!exercise) notFound();
  const profile = query.equipment === "barbell" ? "barbell" : "dumbbells";
  // `returnTo` is the older name for the same origin; keep shared links working.
  const back = resolveBackTarget(fromParam(query.from) ?? fromParam(query.returnTo), {
    area: "public",
    fallback: { href: `/library?equipment=${profile}`, label: "Back to Library" },
  });
  // The tab bar follows where the person came from.
  const current = back.href.startsWith("/program")
    ? "program"
    : back.href.startsWith("/progress")
      ? "progress"
      : back.href.startsWith("/library")
        ? "library"
        : null;
  const videos = await getApprovedCuratedVideoPairBySlug(getDatabase(), slug).catch(() => undefined);
  return <PublicShell current={current}><ExerciseGuide exercise={{ ...exercise, videos }} profileLabel={EQUIPMENT_PROFILES[profile].label} backHref={back.href} backLabel={back.label} /></PublicShell>;
}
