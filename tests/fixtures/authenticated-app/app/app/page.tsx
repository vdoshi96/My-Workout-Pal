import { headers } from "next/headers";

import { MemberProgramHome } from "@/components/program/member-program-home";
import { OnboardingForm } from "@/components/program/onboarding-form";
import type { Database } from "@/db/client";
import type { ViewerContext } from "@/server/auth/viewer";
import {
  getViewerProfileProgram,
  RepositoryNotFoundError,
} from "@/server/repositories/profile-program";
import { loadProgressInsights } from "@/server/repositories/training-insights";
import { createWorkoutRepository } from "@/server/repositories/workout-repository";
import { getHarnessDatabase } from "../../server/database";
import { harnessRequestContext } from "../../server/harness-context";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function readProfileProgramOrUndefined(database: Database, viewer: ViewerContext) {
  try {
    return await getViewerProfileProgram(database, viewer);
  } catch (error) {
    if (error instanceof RepositoryNotFoundError) return undefined;
    throw error;
  }
}

export default async function HarnessMemberHomePage() {
  const context = harnessRequestContext(await headers());
  if (!context.viewer) return null;
  const { database } = await getHarnessDatabase(context.scope);
  const model = await readProfileProgramOrUndefined(database, context.viewer);
  if (!model?.activeProgram) {
    return <OnboardingForm canMutate={context.viewer.eligibleForPermanentMutations} />;
  }
  const [progress, resumableWorkout] = await Promise.all([
    loadProgressInsights(database, context.viewer),
    createWorkoutRepository(database).findResumable(context.viewer),
  ]);
  return (
    <MemberProgramHome
      canMutate={context.viewer.eligibleForPermanentMutations}
      displayName={context.viewer.displayName}
      initialProgram={model.activeProgram}
      progress={{
        completedSessions: progress.totals.completedSessions,
        distanceMeters: progress.totals.distanceMeters,
        durationSeconds: progress.totals.durationSeconds,
        unitSystem: progress.preferences.unitSystem,
        volumeKg: progress.totals.volumeKg,
      }}
      resumableWorkout={resumableWorkout ? {
        dayName: resumableWorkout.session.dayName,
        sessionId: resumableWorkout.session.id,
        state: resumableWorkout.session.state as "active" | "completing" | "draft",
      } : null}
    />
  );
}
