import type { NextRequest } from "next/server";
import { z } from "zod";

import { getDatabase } from "@/db/client";
import { accountDeletionRequestSchema, type AccountDeletionRequest } from "@/domain/account-deletion";
import {
  CSRF_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  secureCookieOptions,
} from "@/server/auth/cookies";
import { AuthPolicyError } from "@/server/auth/policy";
import { assertValidMutationRequest } from "@/server/auth/request";
import { getCurrentViewer, type ViewerContext } from "@/server/auth/viewer";
import { FirebaseConfigurationError, getFirebaseAdminAuth } from "@/server/firebase/admin";
import {
  privateJson,
  PrivateApiBodyError,
  readBoundedJson,
  requirePrivateViewer,
} from "@/server/http/custom-exercise-api";
import {
  AccountDeletionRepositoryError,
  createAccountDeletionRepository,
} from "@/server/repositories/account-deletion";
import {
  executeAccountDeletion,
  type AccountDeletionExecutionResult,
} from "@/server/services/account-deletion";

const ACCOUNT_DELETION_BODY_LIMIT_BYTES = 2_048;

type AccountDeletionRouteDependencies = Readonly<{
  execute: (
    viewer: ViewerContext,
    input: AccountDeletionRequest,
    now: Date,
  ) => Promise<AccountDeletionExecutionResult>;
  getViewer: () => Promise<ViewerContext | null>;
  now: () => Date;
}>;

function safeDeletionResult(result: AccountDeletionExecutionResult) {
  const shared = {
    attemptCount: result.job.attemptCount,
    databaseDeleted: result.databaseDeleted,
    duplicate: result.duplicate,
    identityDeletion: result.identityDeletion,
    status: result.status,
  };
  return result.status === "completed"
    ? shared
    : {
        ...shared,
        errorCode: result.errorCode,
        retryable: result.retryable,
      };
}

function deletionError(error: unknown): Response {
  if (error instanceof AccountDeletionRepositoryError) {
    return privateJson({ error: error.code, message: error.message }, { status: error.status });
  }
  if (error instanceof AuthPolicyError) {
    return privateJson({ error: error.code, message: error.message }, { status: error.status });
  }
  if (error instanceof FirebaseConfigurationError) {
    return privateJson(
      { error: "auth_unavailable", message: "Account deletion is not configured." },
      { status: 503 },
    );
  }
  if (error instanceof PrivateApiBodyError) {
    return privateJson({ error: error.code, message: error.message }, { status: error.status });
  }
  if (error instanceof z.ZodError) {
    return privateJson(
      { error: "invalid_request", message: "The deletion request is invalid." },
      { status: 400 },
    );
  }
  return privateJson(
    { error: "server_error", message: "Account deletion could not be confirmed." },
    { status: 500 },
  );
}

function clearAccountCookies(response: ReturnType<typeof privateJson>): void {
  const expired = { ...secureCookieOptions(), maxAge: 0 };
  response.cookies.set(SESSION_COOKIE_NAME, "", expired);
  response.cookies.set(CSRF_COOKIE_NAME, "", expired);
}

const defaultDependencies: AccountDeletionRouteDependencies = {
  execute: (viewer, input, now) => executeAccountDeletion(
    {
      getFirebaseAuth: getFirebaseAdminAuth,
      getRepository: () => createAccountDeletionRepository(getDatabase()),
    },
    viewer,
    input,
    now,
  ),
  getViewer: getCurrentViewer,
  now: () => new Date(),
};

export function createAccountDeletionHandler(
  dependencies: AccountDeletionRouteDependencies = defaultDependencies,
) {
  return async function deleteAccount(request: NextRequest): Promise<Response> {
    try {
      assertValidMutationRequest(request);
      const viewer = requirePrivateViewer(await dependencies.getViewer());
      const input = accountDeletionRequestSchema.parse(
        await readBoundedJson(request, ACCOUNT_DELETION_BODY_LIMIT_BYTES),
      );
      const result = await dependencies.execute(viewer, input, dependencies.now());
      if (result.status === "identity_deletion_failed") {
        const message = result.retryable
          ? "Your fitness data is deleted, but identity deletion is not confirmed. Retry after signing in again."
          : "Your fitness data is deleted, but identity deletion is blocked until the identity service is repaired.";
        return privateJson(
          {
            deletion: safeDeletionResult(result),
            error: "identity_deletion_pending",
            message,
          },
          { status: 503 },
        );
      }

      const response = privateJson({ deletion: safeDeletionResult(result) });
      clearAccountCookies(response);
      return response;
    } catch (error) {
      return deletionError(error);
    }
  };
}
