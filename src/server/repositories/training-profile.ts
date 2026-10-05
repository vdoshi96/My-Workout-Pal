import { eq } from "drizzle-orm";

import type { Database } from "@/db/client";
import { userTrainingProfiles } from "@/db/schema";
import {
  DAYS_PER_WEEK_OPTIONS,
  type DaysPerWeek,
  type ExperienceLevel,
  type TrainingGoal,
} from "@/domain/programs/generate-routine";

/** The saved onboarding answers for one member, as the app reads them. */
export type TrainingProfileReadModel = Readonly<{
  goal: TrainingGoal;
  experience: ExperienceLevel;
  daysPerWeek: DaysPerWeek;
  updatedAt: string;
}>;

export type TrainingProfileRow = typeof userTrainingProfiles.$inferSelect;

function daysPerWeek(value: number): DaysPerWeek {
  if ((DAYS_PER_WEEK_OPTIONS as readonly number[]).includes(value)) {
    return value as DaysPerWeek;
  }
  throw new RangeError("A saved training profile has an unsupported day count.");
}

export function trainingProfileModel(row: TrainingProfileRow): TrainingProfileReadModel {
  return {
    goal: row.trainingGoal,
    experience: row.experienceLevel,
    daysPerWeek: daysPerWeek(row.daysPerWeek),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Owner-scoped read. Members who onboarded before answers existed get null. */
export async function readTrainingProfileRow(
  database: Database,
  ownerFirebaseUid: string,
): Promise<TrainingProfileRow | undefined> {
  return (
    await database
      .select()
      .from(userTrainingProfiles)
      .where(eq(userTrainingProfiles.ownerFirebaseUid, ownerFirebaseUid))
      .limit(1)
  )[0];
}

export async function readTrainingProfile(
  database: Database,
  ownerFirebaseUid: string,
): Promise<TrainingProfileReadModel | null> {
  const row = await readTrainingProfileRow(database, ownerFirebaseUid);
  return row ? trainingProfileModel(row) : null;
}
