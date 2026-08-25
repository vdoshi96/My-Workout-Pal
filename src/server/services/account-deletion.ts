import type { Auth } from "firebase-admin/auth";

import {
  classifyFirebaseDeletionError,
  type AccountDeletionRequest,
  type FirebaseDeletionFailure,
} from "@/domain/account-deletion";
import type { ViewerContext } from "@/server/auth/viewer";
import type {
  AccountDeletionJobView,
  BeginAccountDeletionResult,
} from "@/server/repositories/account-deletion";

export type AccountDeletionOperations = Readonly<{
  begin: (
    viewer: ViewerContext | null | undefined,
    input: unknown,
    now?: Date,
  ) => Promise<BeginAccountDeletionResult>;
  complete: (
    viewer: ViewerContext | null | undefined,
    now?: Date,
  ) => Promise<AccountDeletionJobView>;
  recordFailure: (
    viewer: ViewerContext | null | undefined,
    failure: FirebaseDeletionFailure,
    now?: Date,
  ) => Promise<AccountDeletionJobView>;
}>;

type FirebaseAccountDeletion = Pick<Auth, "deleteUser">;

export type AccountDeletionServiceDependencies = Readonly<{
  getFirebaseAuth: () => FirebaseAccountDeletion;
  getRepository: () => AccountDeletionOperations;
}>;

export type AccountDeletionExecutionResult = Readonly<
  | {
      databaseDeleted: true;
      duplicate: boolean;
      identityDeletion: "deleted_or_absent";
      job: AccountDeletionJobView;
      status: "completed";
    }
  | {
      databaseDeleted: true;
      duplicate: boolean;
      errorCode: FirebaseDeletionFailure["code"];
      identityDeletion: "unknown";
      job: AccountDeletionJobView;
      retryable: boolean;
      status: "identity_deletion_failed";
    }
>;

/**
 * Orchestrates the external Firebase step around the durable database saga.
 * Firebase configuration is resolved first so an unconfigured deployment can
 * never erase database data and then discover that identity deletion is
 * unavailable.
 */
export async function executeAccountDeletion(
  dependencies: AccountDeletionServiceDependencies,
  viewer: ViewerContext,
  input: AccountDeletionRequest,
  now = new Date(),
): Promise<AccountDeletionExecutionResult> {
  const firebaseAuth = dependencies.getFirebaseAuth();
  const repository = dependencies.getRepository();
  const begun = await repository.begin(viewer, input, now);

  if (begun.action === "completed") {
    return {
      databaseDeleted: true,
      duplicate: true,
      identityDeletion: "deleted_or_absent",
      job: begun.job,
      status: "completed",
    };
  }

  try {
    await firebaseAuth.deleteUser(viewer.uid);
  } catch (error) {
    const failure = classifyFirebaseDeletionError(error);
    const job = await repository.recordFailure(viewer, failure, now);
    if (failure.alreadyDeleted) {
      return {
        databaseDeleted: true,
        duplicate: begun.duplicate,
        identityDeletion: "deleted_or_absent",
        job,
        status: "completed",
      };
    }
    return {
      databaseDeleted: true,
      duplicate: begun.duplicate,
      errorCode: failure.code,
      identityDeletion: "unknown",
      job,
      retryable: failure.retryable,
      status: "identity_deletion_failed",
    };
  }

  // Keep this persistence call outside the provider-error catch. A database
  // completion-write failure must leave the durable Firebase-phase job intact
  // for reconciliation and must not be mislabeled as a provider failure.
  const job = await repository.complete(viewer, now);
  return {
    databaseDeleted: true,
    duplicate: begun.duplicate,
    identityDeletion: "deleted_or_absent",
    job,
    status: "completed",
  };
}
