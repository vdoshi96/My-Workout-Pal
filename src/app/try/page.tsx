import type { Metadata } from "next";

import { PublicShell } from "@/components/layout/public-shell";
import { SceneStage } from "@/components/ui/scene-stage";
import { TestDrive, type TestDriveMovement } from "@/components/workout/test-drive";
import { getDatabase } from "@/db/client";
import { CATALOG_EXERCISES } from "@/domain/exercises/catalog";
import { getApprovedCuratedVideoPairBySlug } from "@/server/repositories/curated-videos";

export const metadata: Metadata = {
  title: "Take a test drive",
  description: "Try a short workout with demos, logging and rest. No account needed, and nothing is saved.",
};
export const dynamic = "force-dynamic";

async function approvedDemo(slug: string) {
  // The test drive still works without demos; a missing pair shows "No demo yet".
  try { return await getApprovedCuratedVideoPairBySlug(getDatabase(), slug); } catch { return undefined; }
}

function movement(slug: string, kind: TestDriveMovement["kind"], target: string, videos: TestDriveMovement["videos"]): TestDriveMovement {
  const exercise = CATALOG_EXERCISES[slug];
  if (!exercise) throw new Error(`Missing catalog movement ${slug}`);
  return { slug, name: exercise.name, kind, target, steps: exercise.instructions, videos };
}

export default async function TryPage() {
  const [squatVideos, plankVideos] = await Promise.all([approvedDemo("goblet-squat"), approvedDemo("front-plank")]);
  return (
    <PublicShell current="home" tone="pal">
      <SceneStage scene="workout" />
      <TestDrive movements={[
        movement("goblet-squat", "reps", "3 sets of 8–12 reps", squatVideos),
        movement("front-plank", "time", "2 sets of 20–45 seconds", plankVideos),
      ]} />
    </PublicShell>
  );
}
