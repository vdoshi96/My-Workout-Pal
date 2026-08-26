import { and, asc, eq, inArray, sql } from "drizzle-orm";

import type { Database } from "@/db/client";
import {
  accountDeletionJobs,
  cardioLogs,
  customExerciseAliases,
  customExerciseEquipment,
  customExercises,
  customExerciseVideos,
  idempotencyKeys,
  personalRecords,
  programCardioPrescriptions,
  programDays,
  programPrescriptions,
  programRevisions,
  programSections,
  progressSummaries,
  progressSummarySources,
  setLogs,
  userEquipmentProfiles,
  userPreferences,
  userProfiles,
  userPrograms,
  workoutExerciseSnapshots,
  workoutExerciseStates,
  workoutSessions,
} from "@/db/schema";
import {
  accountDeletionRequestHash,
  accountDeletionRequestSchema,
  transitionAccountDeletionJob,
  type AccountDeletionJobState,
  type AccountDeletionRequest,
  type FirebaseDeletionFailure,
} from "@/domain/account-deletion";
import type { ViewerContext } from "@/server/auth/viewer";

const RECENT_AUTH_MAXIMUM_SECONDS = 300;

export type AccountDeletionRepositoryCode =
  | "unauthenticated"
  | "verification_required"
  | "reauth_required"
  | "provider_unsupported"
  | "not_found"
  | "conflict";

export class AccountDeletionRepositoryError extends Error {
  readonly code: AccountDeletionRepositoryCode;
  readonly status: number;

  constructor(code: AccountDeletionRepositoryCode, message: string, status: number) {
    super(message);
    this.name = "AccountDeletionRepositoryError";
    this.code = code;
    this.status = status;
  }
}

export type AccountDeletionJobView = Readonly<{
  attemptCount: number;
  completedAt: Date | null;
  lastErrorCode: string | null;
  phase: AccountDeletionJobState["phase"];
  requestedAt: Date;
  status: AccountDeletionJobState["status"];
  updatedAt: Date;
}>;

export type BeginAccountDeletionResult = Readonly<{
  action: "completed" | "delete_firebase";
  duplicate: boolean;
  job: AccountDeletionJobView;
}>;

type RepositoryDatabase = Database;
type JobRow = typeof accountDeletionJobs.$inferSelect;

export type AccountDeletionReconciliationCandidate = Readonly<{
  ownerUid: string;
  status: "blocked" | "failed" | "running";
  updatedAt: Date;
}>;

function isReconciliationStatus(
  status: JobRow["status"],
): status is AccountDeletionReconciliationCandidate["status"] {
  return status === "running" || status === "failed" || status === "blocked";
}

function requireDeletionViewer(
  viewer: ViewerContext | null | undefined,
  now: Date,
): ViewerContext {
  if (!viewer) {
    throw new AccountDeletionRepositoryError(
      "unauthenticated",
      "A signed-in account is required.",
      401,
    );
  }
  if (!viewer.emailVerified || !viewer.eligibleForPermanentMutations) {
    throw new AccountDeletionRepositoryError(
      "verification_required",
      "Verify your email before deleting permanent account data.",
      403,
    );
  }
  if (viewer.provider !== "google" && viewer.provider !== "password") {
    throw new AccountDeletionRepositoryError(
      "provider_unsupported",
      "This sign-in provider cannot complete account deletion yet.",
      409,
    );
  }
  const nowSeconds = Math.floor(now.getTime() / 1_000);
  if (
    viewer.authTimeSeconds === undefined ||
    viewer.authTimeSeconds > nowSeconds ||
    nowSeconds - viewer.authTimeSeconds > RECENT_AUTH_MAXIMUM_SECONDS
  ) {
    throw new AccountDeletionRepositoryError(
      "reauth_required",
      "Sign in again before deleting your account.",
      401,
    );
  }
  return viewer;
}

function jobState(row: JobRow): AccountDeletionJobState {
  return {
    attemptCount: row.attemptCount,
    completedAt: row.completedAt,
    lastErrorCode: row.lastErrorCode,
    phase: row.phase,
    status: row.status,
  };
}

function jobView(row: JobRow): AccountDeletionJobView {
  return {
    ...jobState(row),
    requestedAt: row.requestedAt,
    updatedAt: row.updatedAt,
  };
}

async function lockJob(database: RepositoryDatabase, ownerUid: string): Promise<void> {
  await database.execute(
    sql`SELECT owner_firebase_uid FROM account_deletion_jobs WHERE owner_firebase_uid = ${ownerUid} FOR UPDATE`,
  );
}

async function loadJob(
  database: RepositoryDatabase,
  ownerUid: string,
): Promise<JobRow | undefined> {
  return (
    await database
      .select()
      .from(accountDeletionJobs)
      .where(eq(accountDeletionJobs.ownerFirebaseUid, ownerUid))
      .limit(1)
  )[0];
}

async function saveJobState(
  database: RepositoryDatabase,
  ownerUid: string,
  state: AccountDeletionJobState,
  now: Date,
): Promise<JobRow> {
  const rows = await database
    .update(accountDeletionJobs)
    .set({
      attemptCount: state.attemptCount,
      completedAt: state.completedAt,
      lastErrorCode: state.lastErrorCode,
      phase: state.phase,
      status: state.status,
      updatedAt: now,
    })
    .where(eq(accountDeletionJobs.ownerFirebaseUid, ownerUid))
    .returning();
  const row = rows[0];
  if (!row) {
    throw new AccountDeletionRepositoryError(
      "not_found",
      "The account deletion request is unavailable.",
      404,
    );
  }
  return row;
}

async function deleteOwnedData(
  database: RepositoryDatabase,
  ownerUid: string,
  now: Date,
): Promise<void> {
  await database.execute(
    sql`SELECT set_config('my_workout_pal.account_deletion_uid', ${ownerUid}, true)`,
  );
  await database.delete(progressSummarySources).where(eq(progressSummarySources.ownerFirebaseUid, ownerUid));
  await database.delete(personalRecords).where(eq(personalRecords.ownerFirebaseUid, ownerUid));
  await database.delete(progressSummaries).where(eq(progressSummaries.ownerFirebaseUid, ownerUid));
  await database.delete(idempotencyKeys).where(eq(idempotencyKeys.ownerFirebaseUid, ownerUid));
  await database.delete(setLogs).where(eq(setLogs.ownerFirebaseUid, ownerUid));
  await database.delete(cardioLogs).where(eq(cardioLogs.ownerFirebaseUid, ownerUid));
  await database.delete(workoutExerciseStates).where(eq(workoutExerciseStates.ownerFirebaseUid, ownerUid));
  await database.delete(workoutExerciseSnapshots).where(eq(workoutExerciseSnapshots.ownerFirebaseUid, ownerUid));
  await database.delete(workoutSessions).where(eq(workoutSessions.ownerFirebaseUid, ownerUid));
  await database.delete(programCardioPrescriptions).where(eq(programCardioPrescriptions.ownerFirebaseUid, ownerUid));
  await database.delete(programPrescriptions).where(eq(programPrescriptions.ownerFirebaseUid, ownerUid));
  await database.delete(programSections).where(eq(programSections.ownerFirebaseUid, ownerUid));
  await database.delete(programDays).where(eq(programDays.ownerFirebaseUid, ownerUid));
  await database
    .update(userPrograms)
    .set({ activeRevisionId: null, updatedAt: now })
    .where(eq(userPrograms.ownerFirebaseUid, ownerUid));
  await database.delete(programRevisions).where(eq(programRevisions.ownerFirebaseUid, ownerUid));
  await database.delete(userPrograms).where(eq(userPrograms.ownerFirebaseUid, ownerUid));
  await database.delete(customExerciseVideos).where(eq(customExerciseVideos.ownerFirebaseUid, ownerUid));
  await database.delete(customExerciseAliases).where(eq(customExerciseAliases.ownerFirebaseUid, ownerUid));
  await database.delete(customExerciseEquipment).where(eq(customExerciseEquipment.ownerFirebaseUid, ownerUid));
  await database.delete(customExercises).where(eq(customExercises.ownerFirebaseUid, ownerUid));
  await database.delete(userPreferences).where(eq(userPreferences.ownerFirebaseUid, ownerUid));
  await database.delete(userEquipmentProfiles).where(eq(userEquipmentProfiles.ownerFirebaseUid, ownerUid));
  await database.delete(userProfiles).where(eq(userProfiles.firebaseUid, ownerUid));
}

async function createInitialJob(
  database: RepositoryDatabase,
  ownerUid: string,
  input: AccountDeletionRequest,
  requestHash: string,
  now: Date,
): Promise<Readonly<{ duplicate: boolean; row: JobRow }>> {
  await database.execute(
    sql`SELECT firebase_uid FROM user_profiles WHERE firebase_uid = ${ownerUid} FOR UPDATE`,
  );

  // A missing account-deletion job cannot be gap-locked. Another transaction
  // may therefore have waited on the profile lock above while the first
  // transaction created the durable job and deleted the profile. Re-read the
  // job after acquiring that shared serialization point before treating a
  // missing profile as a new-account error.
  const concurrentJob = await loadJob(database, ownerUid);
  if (concurrentJob) return { duplicate: true, row: concurrentJob };

  const profile = (
    await database
      .select({ accountStatus: userProfiles.accountStatus })
      .from(userProfiles)
      .where(eq(userProfiles.firebaseUid, ownerUid))
      .limit(1)
  )[0];
  if (!profile) {
    throw new AccountDeletionRepositoryError(
      "not_found",
      "The account deletion request is unavailable.",
      404,
    );
  }
  if (profile.accountStatus !== "active") {
    throw new AccountDeletionRepositoryError(
      "conflict",
      "The account is already in a restricted lifecycle state.",
      409,
    );
  }
  const rows = await database
    .insert(accountDeletionJobs)
    .values({
      attemptCount: 0,
      completedAt: null,
      idempotencyKey: input.idempotencyKey,
      lastErrorCode: null,
      ownerFirebaseUid: ownerUid,
      phase: "database",
      requestHash,
      requestedAt: now,
      status: "pending",
      updatedAt: now,
    })
    .returning();
  const row = rows[0];
  if (!row) {
    throw new AccountDeletionRepositoryError(
      "conflict",
      "The account deletion request could not be reserved.",
      409,
    );
  }
  return { duplicate: false, row };
}

export async function beginAccountDeletion(
  database: Database,
  viewerInput: ViewerContext | null | undefined,
  requestInput: unknown,
  now = new Date(),
): Promise<BeginAccountDeletionResult> {
  const viewer = requireDeletionViewer(viewerInput, now);
  const input = accountDeletionRequestSchema.parse(requestInput);
  const requestHash = accountDeletionRequestHash(input);
  return database.transaction(async (transaction) => {
    const tx = transaction as unknown as Database;
    await lockJob(tx, viewer.uid);
    let row = await loadJob(tx, viewer.uid);
    let duplicate = row !== undefined;
    if (!row) {
      const initialJob = await createInitialJob(tx, viewer.uid, input, requestHash, now);
      duplicate = initialJob.duplicate;
      row = initialJob.row;
    }
    if (row.requestHash !== requestHash) {
      throw new AccountDeletionRepositoryError(
        "conflict",
        "The deletion request does not match the reserved operation.",
        409,
      );
    }
    if (row.status === "completed") {
      return { action: "completed", duplicate: true, job: jobView(row) };
    }
    if (row.phase === "firebase") {
      if (row.status === "failed" || row.status === "blocked") {
        row = await saveJobState(
          tx,
          viewer.uid,
          transitionAccountDeletionJob(jobState(row), { type: "begin_firebase" }, now),
          now,
        );
      } else if (row.status !== "running") {
        throw new AccountDeletionRepositoryError(
          "conflict",
          "The deletion retry state is invalid.",
          409,
        );
      }
      return { action: "delete_firebase", duplicate: true, job: jobView(row) };
    }
    if (row.phase !== "database" || (row.status !== "pending" && row.status !== "failed")) {
      throw new AccountDeletionRepositoryError(
        "conflict",
        "The database deletion state is already in progress.",
        409,
      );
    }
    row = await saveJobState(
      tx,
      viewer.uid,
      transitionAccountDeletionJob(jobState(row), { type: "begin_database" }, now),
      now,
    );
    await tx
      .update(userProfiles)
      .set({ accountStatus: "deletion_pending", updatedAt: now })
      .where(
        and(
          eq(userProfiles.firebaseUid, viewer.uid),
          eq(userProfiles.accountStatus, "active"),
        ),
      );
    await deleteOwnedData(tx, viewer.uid, now);
    row = await saveJobState(
      tx,
      viewer.uid,
      transitionAccountDeletionJob(jobState(row), { type: "database_committed" }, now),
      now,
    );
    return { action: "delete_firebase", duplicate, job: jobView(row) };
  });
}

export async function completeAccountDeletion(
  database: Database,
  viewerInput: ViewerContext | null | undefined,
  now = new Date(),
): Promise<AccountDeletionJobView> {
  const viewer = requireDeletionViewer(viewerInput, now);
  return database.transaction(async (transaction) => {
    const tx = transaction as unknown as Database;
    await lockJob(tx, viewer.uid);
    const row = await loadJob(tx, viewer.uid);
    if (!row) {
      throw new AccountDeletionRepositoryError(
        "not_found",
        "The account deletion request is unavailable.",
        404,
      );
    }
    if (row.status === "completed") return jobView(row);
    const completed = transitionAccountDeletionJob(
      jobState(row),
      { type: "firebase_completed" },
      now,
    );
    return jobView(await saveJobState(tx, viewer.uid, completed, now));
  });
}

export async function recordAccountDeletionFailure(
  database: Database,
  viewerInput: ViewerContext | null | undefined,
  failure: FirebaseDeletionFailure,
  now = new Date(),
): Promise<AccountDeletionJobView> {
  const viewer = requireDeletionViewer(viewerInput, now);
  if (failure.alreadyDeleted) return completeAccountDeletion(database, viewer, now);
  return database.transaction(async (transaction) => {
    const tx = transaction as unknown as Database;
    await lockJob(tx, viewer.uid);
    const row = await loadJob(tx, viewer.uid);
    if (!row) {
      throw new AccountDeletionRepositoryError(
        "not_found",
        "The account deletion request is unavailable.",
        404,
      );
    }
    const failed = transitionAccountDeletionJob(
      jobState(row),
      {
        errorCode: failure.code,
        retryable: failure.retryable,
        type: "firebase_failed",
      },
      now,
    );
    return jobView(await saveJobState(tx, viewer.uid, failed, now));
  });
}

function requireReconciliationSelection(
  selection: Readonly<{ limit: number; ownerUid?: string }>,
): void {
  if (!Number.isSafeInteger(selection.limit) || selection.limit < 1 || selection.limit > 100) {
    throw new RangeError("The reconciliation limit must be between 1 and 100.");
  }
  if (
    selection.ownerUid !== undefined &&
    (
      selection.ownerUid.trim() !== selection.ownerUid ||
      selection.ownerUid.length < 1 ||
      selection.ownerUid.length > 128 ||
      /[\u0000-\u001f\u007f]/u.test(selection.ownerUid)
    )
  ) {
    throw new RangeError("The reconciliation owner UID is invalid.");
  }
}

/**
 * Internal operator boundary. This deliberately has no viewer overload and is
 * not exported by an application route. Callers must obtain operator-level
 * database and Firebase Admin capability before selecting these rows.
 */
export async function listAccountDeletionReconciliationCandidates(
  database: Database,
  selection: Readonly<{ limit: number; ownerUid?: string }>,
): Promise<readonly AccountDeletionReconciliationCandidate[]> {
  requireReconciliationSelection(selection);
  const firebasePhase = and(
    eq(accountDeletionJobs.phase, "firebase"),
    inArray(accountDeletionJobs.status, ["running", "failed", "blocked"]),
  );
  const predicate = selection.ownerUid === undefined
    ? firebasePhase
    : and(
        firebasePhase,
        eq(accountDeletionJobs.ownerFirebaseUid, selection.ownerUid),
      );
  const rows = await database
    .select({
      ownerUid: accountDeletionJobs.ownerFirebaseUid,
      status: accountDeletionJobs.status,
      updatedAt: accountDeletionJobs.updatedAt,
    })
    .from(accountDeletionJobs)
    .where(predicate)
    .orderBy(
      asc(accountDeletionJobs.requestedAt),
      asc(accountDeletionJobs.ownerFirebaseUid),
    )
    .limit(selection.limit);
  return rows.map((row) => {
    if (!isReconciliationStatus(row.status)) {
      throw new AccountDeletionRepositoryError(
        "conflict",
        "The account deletion request cannot be reconciled.",
        409,
      );
    }
    return { ...row, status: row.status };
  });
}

export async function completeAccountDeletionReconciliation(
  database: Database,
  candidate: AccountDeletionReconciliationCandidate,
  now = new Date(),
): Promise<AccountDeletionJobView> {
  requireReconciliationSelection({ limit: 1, ownerUid: candidate.ownerUid });
  if (!isReconciliationStatus(candidate.status)) {
    throw new RangeError("The reconciliation job status is invalid.");
  }
  return database.transaction(async (transaction) => {
    const tx = transaction as unknown as Database;
    await lockJob(tx, candidate.ownerUid);
    const row = await loadJob(tx, candidate.ownerUid);
    if (!row) {
      throw new AccountDeletionRepositoryError(
        "not_found",
        "The account deletion request is unavailable.",
        404,
      );
    }
    if (row.status === "completed") return jobView(row);
    if (
      row.phase !== "firebase" ||
      row.status !== candidate.status ||
      row.updatedAt.getTime() !== candidate.updatedAt.getTime()
    ) {
      throw new AccountDeletionRepositoryError(
        "conflict",
        "The account deletion request changed before reconciliation.",
        409,
      );
    }

    let state = jobState(row);
    if (state.status === "failed" || state.status === "blocked") {
      state = transitionAccountDeletionJob(state, { type: "begin_firebase" }, now);
    }
    if (state.status !== "running") {
      throw new AccountDeletionRepositoryError(
        "conflict",
        "The account deletion request cannot be reconciled.",
        409,
      );
    }
    state = transitionAccountDeletionJob(state, { type: "firebase_completed" }, now);
    return jobView(await saveJobState(tx, candidate.ownerUid, state, now));
  });
}

export function createAccountDeletionRepository(database: Database) {
  return {
    begin: (
      viewer: ViewerContext | null | undefined,
      input: unknown,
      now?: Date,
    ) => beginAccountDeletion(database, viewer, input, now),
    complete: (
      viewer: ViewerContext | null | undefined,
      now?: Date,
    ) => completeAccountDeletion(database, viewer, now),
    recordFailure: (
      viewer: ViewerContext | null | undefined,
      failure: FirebaseDeletionFailure,
      now?: Date,
    ) => recordAccountDeletionFailure(database, viewer, failure, now),
  };
}
