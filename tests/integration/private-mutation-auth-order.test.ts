import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ViewerContext } from "@/server/auth/viewer";

const auth = vi.hoisted(() => ({
  getCurrentViewer: vi.fn(),
}));

vi.mock("@/server/auth/viewer", () => ({
  getCurrentViewer: auth.getCurrentViewer,
}));

import { POST as changeEquipment } from "@/app/api/app/profile-program/equipment/route";
import { POST as createCustomExercise } from "@/app/api/app/custom-exercises/route";
import { PATCH as updateCustomExercise, DELETE as deleteCustomExercise } from "@/app/api/app/custom-exercises/[id]/route";
import { PATCH as updatePreferences } from "@/app/api/app/preferences/route";
import { POST as publishProgram } from "@/app/api/app/program/publish/route";
import { PUT as replacePersonalGuidance } from "@/app/api/app/personal-guidance/route";
import { PRIVATE_JSON_BODY_LIMIT_BYTES } from "@/server/http/custom-exercise-api";
import { CSRF_COOKIE_NAME } from "@/server/auth/cookies";
import { HARNESS_CSRF_COOKIE_NAME } from "../fixtures/authenticated-app/server/csrf";
import { POST as fixtureChangeEquipment } from "../fixtures/authenticated-app/app/api/app/profile-program/equipment/route";
import { POST as fixtureCreateCustomExercise } from "../fixtures/authenticated-app/app/api/app/custom-exercises/route";
import {
  PATCH as fixtureUpdateCustomExercise,
  DELETE as fixtureDeleteCustomExercise,
} from "../fixtures/authenticated-app/app/api/app/custom-exercises/[id]/route";
import { PATCH as fixtureUpdatePreferences } from "../fixtures/authenticated-app/app/api/app/preferences/route";
import { POST as fixturePublishProgram } from "../fixtures/authenticated-app/app/api/app/program/publish/route";
import {
  HARNESS_SCENARIO_HEADER,
  HARNESS_SCOPE_HEADER,
  HARNESS_VIEWER_HEADER,
} from "../fixtures/authenticated-app/server/harness-context";

const origin = "http://127.0.0.1:3000";
const customExerciseId = "00000000-0000-4000-8000-000000000001";
const unverifiedViewer: ViewerContext = {
  authTimeSeconds: 1_787_681_000,
  displayName: "Unverified owner",
  eligibleForPermanentMutations: false,
  email: "unverified@example.test",
  emailVerified: false,
  provider: "password",
  uid: "unverified-owner",
};

type BodyKind = "malformed" | "oversized";
type MutationHandler = (request: NextRequest) => Promise<Response>;
type CustomExerciseMutationHandler = (
  request: NextRequest,
  context: Readonly<{ params: Promise<{ id: string }> }>,
) => Promise<Response>;

type MutationCase = Readonly<{
  handler: MutationHandler | CustomExerciseMutationHandler;
  method: "DELETE" | "PATCH" | "POST" | "PUT";
  name: string;
  pathname: string;
}>;

function request(
  pathname: string,
  method: MutationCase["method"],
  bodyKind: BodyKind,
  fixture: boolean,
): NextRequest {
  const body = bodyKind === "malformed" ? "{" : "{}";
  const token = fixture ? "fixture-auth-order-csrf" : "production-auth-order-csrf";
  return new NextRequest(`${origin}${pathname}`, {
    body,
    headers: {
      "Content-Length": bodyKind === "oversized"
        ? String(PRIVATE_JSON_BODY_LIMIT_BYTES + 1)
        : String(body.length),
      "Content-Type": "application/json",
      Cookie: `${fixture ? HARNESS_CSRF_COOKIE_NAME : CSRF_COOKIE_NAME}=${token}`,
      Host: "127.0.0.1:3000",
      Origin: origin,
      "X-CSRF-Token": token,
      ...(fixture
        ? {
            [HARNESS_SCENARIO_HEADER]: "ready",
            [HARNESS_SCOPE_HEADER]: "auth-order",
            [HARNESS_VIEWER_HEADER]: "alice-unverified",
          }
        : {}),
    },
    method,
  });
}

function runMutation(
  mutation: MutationCase,
  nextRequest: NextRequest,
): Promise<Response> {
  if (mutation.name.includes("custom update") || mutation.name.includes("custom delete")) {
    return (mutation.handler as CustomExerciseMutationHandler)(nextRequest, {
      params: Promise.resolve({ id: customExerciseId }),
    });
  }
  return (mutation.handler as MutationHandler)(nextRequest);
}

async function expectUnverified(response: Response): Promise<void> {
  expect(response.status).toBe(403);
  expect(response.headers.get("cache-control")).toBe("private, no-store, max-age=0");
  expect(response.headers.get("vary")).toBe("Cookie");
  await expect(response.json()).resolves.toMatchObject({ error: "email_unverified" });
}

const productionMutations: readonly MutationCase[] = [
  {
    handler: changeEquipment,
    method: "POST",
    name: "production equipment change",
    pathname: "/api/app/profile-program/equipment",
  },
  {
    handler: updatePreferences,
    method: "PATCH",
    name: "production preference change",
    pathname: "/api/app/preferences",
  },
  {
    handler: publishProgram,
    method: "POST",
    name: "production program publication",
    pathname: "/api/app/program/publish",
  },
  {
    handler: createCustomExercise,
    method: "POST",
    name: "production custom create",
    pathname: "/api/app/custom-exercises",
  },
  {
    handler: replacePersonalGuidance,
    method: "PUT",
    name: "production personal guidance replacement",
    pathname: "/api/app/personal-guidance",
  },
  {
    handler: updateCustomExercise,
    method: "PATCH",
    name: "production custom update",
    pathname: `/api/app/custom-exercises/${customExerciseId}`,
  },
  {
    handler: deleteCustomExercise,
    method: "DELETE",
    name: "production custom delete",
    pathname: `/api/app/custom-exercises/${customExerciseId}`,
  },
];

const fixtureMutations: readonly MutationCase[] = [
  {
    handler: fixtureChangeEquipment,
    method: "POST",
    name: "fixture equipment change",
    pathname: "/api/app/profile-program/equipment",
  },
  {
    handler: fixtureUpdatePreferences,
    method: "PATCH",
    name: "fixture preference change",
    pathname: "/api/app/preferences",
  },
  {
    handler: fixturePublishProgram,
    method: "POST",
    name: "fixture program publication",
    pathname: "/api/app/program/publish",
  },
  {
    handler: fixtureCreateCustomExercise,
    method: "POST",
    name: "fixture custom create",
    pathname: "/api/app/custom-exercises",
  },
  {
    handler: fixtureUpdateCustomExercise,
    method: "PATCH",
    name: "fixture custom update",
    pathname: `/api/app/custom-exercises/${customExerciseId}`,
  },
  {
    handler: fixtureDeleteCustomExercise,
    method: "DELETE",
    name: "fixture custom delete",
    pathname: `/api/app/custom-exercises/${customExerciseId}`,
  },
];

beforeEach(() => {
  auth.getCurrentViewer.mockResolvedValue(unverifiedViewer);
});

describe("private mutation authentication precedence", () => {
  for (const [fixture, mutations] of [
    [false, productionMutations],
    [true, fixtureMutations],
  ] as const) {
    for (const mutation of mutations) {
      for (const bodyKind of ["malformed", "oversized"] as const) {
        it(`${mutation.name} returns verification_required before ${bodyKind} body parsing`, async () => {
          const response = await runMutation(
            mutation,
            request(mutation.pathname, mutation.method, bodyKind, fixture),
          );
          await expectUnverified(response);
        });
      }
    }
  }
});
