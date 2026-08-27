import { NextResponse, type NextRequest } from "next/server";
import { count, eq } from "drizzle-orm";

import {
  customExercises,
  personalRecords,
  programPrescriptions,
  programRevisions,
  programSections,
  progressSummarySources,
  userPreferences,
  userPrograms,
  workoutExerciseSnapshots,
} from "@/db/schema";
import { getViewerProfileProgram } from "@/server/repositories/profile-program";
import { closeHarnessDatabase, getHarnessDatabase } from "../../../../server/database";
import { resetHarnessFaults } from "../../../../server/fault-injection";
import { harnessRequestContext } from "../../../../server/harness-context";

function unavailable() {
  return NextResponse.json(
    { error: "harness_unavailable", message: "The local harness is unavailable." },
    { headers: { "Cache-Control": "no-store" }, status: 404 },
  );
}

export async function GET(request: NextRequest): Promise<Response> {
  if (process.env["MWP_AUTHENTICATED_HARNESS"] !== "1") return unavailable();
  const context = harnessRequestContext(request.headers);
  if (!context.viewer) {
    return NextResponse.json(
      { error: "auth_required", message: "A synthetic viewer is required." },
      { headers: { "Cache-Control": "no-store" }, status: 401 },
    );
  }
  const { database } = await getHarnessDatabase(context.scope);
  const profileProgram = await getViewerProfileProgram(database, context.viewer);
  const ownerUid = context.viewer.uid;
  const [
    programRoots,
    revisions,
    sections,
    prescriptions,
    privateExercises,
    preferences,
    workoutSnapshots,
    records,
    progressSources,
  ] = await Promise.all([
    database.select({ value: count() }).from(userPrograms).where(eq(userPrograms.ownerFirebaseUid, ownerUid)),
    database.select({ value: count() }).from(programRevisions).where(eq(programRevisions.ownerFirebaseUid, ownerUid)),
    database.select({ value: count() }).from(programSections).where(eq(programSections.ownerFirebaseUid, ownerUid)),
    database.select({ value: count() }).from(programPrescriptions).where(eq(programPrescriptions.ownerFirebaseUid, ownerUid)),
    database.select({ value: count() }).from(customExercises).where(eq(customExercises.ownerFirebaseUid, ownerUid)),
    database.select({ value: count() }).from(userPreferences).where(eq(userPreferences.ownerFirebaseUid, ownerUid)),
    database.select({ value: count() }).from(workoutExerciseSnapshots).where(eq(workoutExerciseSnapshots.ownerFirebaseUid, ownerUid)),
    database.select({ value: count() }).from(personalRecords).where(eq(personalRecords.ownerFirebaseUid, ownerUid)),
    database.select({ value: count() }).from(progressSummarySources).where(eq(progressSummarySources.ownerFirebaseUid, ownerUid)),
  ]);
  return NextResponse.json(
    {
      counts: {
        customExercises: privateExercises[0]?.value ?? 0,
        personalRecords: records[0]?.value ?? 0,
        preferences: preferences[0]?.value ?? 0,
        prescriptions: prescriptions[0]?.value ?? 0,
        programRevisions: revisions[0]?.value ?? 0,
        programRoots: programRoots[0]?.value ?? 0,
        programSections: sections[0]?.value ?? 0,
        progressSources: progressSources[0]?.value ?? 0,
        workoutSnapshots: workoutSnapshots[0]?.value ?? 0,
      },
      programs: profileProgram.programs.length,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function DELETE(request: NextRequest): Promise<Response> {
  if (process.env["MWP_AUTHENTICATED_HARNESS"] !== "1") return unavailable();
  const context = harnessRequestContext(request.headers);
  if (!context.viewer) {
    return NextResponse.json(
      { error: "auth_required", message: "A synthetic viewer is required." },
      { headers: { "Cache-Control": "no-store" }, status: 401 },
    );
  }
  await closeHarnessDatabase(context.scope);
  resetHarnessFaults(context.scope);
  return NextResponse.json(
    { cleared: true },
    { headers: { "Cache-Control": "no-store" }, status: 200 },
  );
}
