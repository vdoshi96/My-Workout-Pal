import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ViewerContext } from "@/server/auth/viewer";

const state = vi.hoisted(() => ({
  activate: vi.fn(),
  clone: vi.fn(),
  create: vi.fn(),
  viewer: null as ViewerContext | null,
}));

vi.mock("@/db/client", () => ({
  getDatabase: vi.fn(() => ({ fixture: "database" })),
}));

vi.mock("@/server/auth/viewer", () => ({
  getCurrentViewer: vi.fn(async () => state.viewer),
}));

vi.mock("@/server/repositories/profile-program", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/server/repositories/profile-program")
  >();
  return {
    ...actual,
    activateViewerProgram: state.activate,
    cloneViewerProgram: state.clone,
    createViewerProgramFromStarter: state.create,
  };
});

import { POST as mutateProgramCollection } from "@/app/api/app/programs/route";
import { POST as activateProgram } from "@/app/api/app/programs/activate/route";
import { getDatabase } from "@/db/client";
import { CSRF_COOKIE_NAME } from "@/server/auth/cookies";
import {
  activateProgramRequestSchema,
  programCollectionMutationRequestSchema,
} from "@/server/http/profile-program-api";

const origin = "http://127.0.0.1:3000";
const fixtureViewer: ViewerContext = {
  authTimeSeconds: 1_787_681_000,
  displayName: "Program owner",
  eligibleForPermanentMutations: true,
  email: "program-owner@example.test",
  emailVerified: true,
  provider: "password",
  uid: "program-owner",
};

function request(
  pathname: string,
  body: unknown,
  options: Readonly<{
    contentLength?: string;
    requestOrigin?: string;
  }> = {},
): NextRequest {
  const token = "program-collection-csrf";
  return new NextRequest(`${origin}${pathname}`, {
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      Cookie: `${CSRF_COOKIE_NAME}=${token}`,
      Host: "127.0.0.1:3000",
      Origin: options.requestOrigin ?? origin,
      "X-CSRF-Token": token,
      ...(options.contentLength
        ? { "Content-Length": options.contentLength }
        : {}),
    },
    method: "POST",
  });
}

beforeEach(() => {
  state.viewer = null;
  state.activate.mockReset();
  state.clone.mockReset();
  state.create.mockReset();
  vi.mocked(getDatabase).mockClear();
});

describe("program collection API", () => {
  it("accepts only strict owner-free create, clone, and activation envelopes", () => {
    expect(
      programCollectionMutationRequestSchema.parse({
        equipmentProfileKind: "dumbbells",
        idempotencyKey: "create-program",
        mode: "starter",
        name: "My starter",
      }),
    ).toMatchObject({ mode: "starter" });
    expect(
      programCollectionMutationRequestSchema.parse({
        idempotencyKey: "clone-program",
        mode: "clone",
        name: "My copy",
        sourceProgramId: "00000000-0000-4000-8000-000000000101",
        sourceRevisionId: "00000000-0000-4000-8000-000000000102",
      }),
    ).toMatchObject({ mode: "clone" });
    expect(() =>
      programCollectionMutationRequestSchema.parse({
        equipmentProfileKind: "barbell",
        idempotencyKey: "hostile-create",
        mode: "starter",
        name: "Hostile",
        ownerUid: "other-user",
      }),
    ).toThrow();
    expect(() =>
      activateProgramRequestSchema.parse({
        expectedActiveProgramId: "00000000-0000-4000-8000-000000000101",
        idempotencyKey: "activate-program",
        isActive: true,
        programId: "00000000-0000-4000-8000-000000000102",
        revisionId: "00000000-0000-4000-8000-000000000103",
      }),
    ).toThrow();
  });

  it.each([
    [mutateProgramCollection, "/api/app/programs"],
    [activateProgram, "/api/app/programs/activate"],
  ])("rejects cross-origin and unauthenticated requests before repository work", async (handler, path) => {
    const crossOrigin = await handler(
      request(path, { ownerUid: "other-user" }, {
        requestOrigin: "https://attacker.example",
      }),
    );
    expect(crossOrigin.status).toBe(403);
    await expect(crossOrigin.json()).resolves.toMatchObject({ error: "csrf_invalid" });

    const unauthenticated = await handler(
      request(path, { ownerUid: "other-user" }),
    );
    expect(unauthenticated.status).toBe(401);
    await expect(unauthenticated.json()).resolves.toMatchObject({
      error: "session_invalid",
    });
    expect(state.create).not.toHaveBeenCalled();
    expect(state.clone).not.toHaveBeenCalled();
    expect(state.activate).not.toHaveBeenCalled();
  });

  it("routes starter and clone creation through verified private mutations", async () => {
    state.viewer = fixtureViewer;
    state.create.mockResolvedValue({
      affectedProgramId: "00000000-0000-4000-8000-000000000201",
      programs: [],
    });
    state.clone.mockResolvedValue({
      affectedProgramId: "00000000-0000-4000-8000-000000000202",
      programs: [],
    });

    const created = await mutateProgramCollection(
      request("/api/app/programs", {
        equipmentProfileKind: "barbell",
        idempotencyKey: "create-route",
        mode: "starter",
        name: "Barbell route",
      }),
    );
    expect(created.status).toBe(201);
    expect(created.headers.get("cache-control")).toBe(
      "private, no-store, max-age=0",
    );
    expect(state.create).toHaveBeenCalledWith(
      expect.anything(),
      fixtureViewer,
      {
        equipmentProfileKind: "barbell",
        idempotencyKey: "create-route",
        name: "Barbell route",
      },
    );

    const cloned = await mutateProgramCollection(
      request("/api/app/programs", {
        idempotencyKey: "clone-route",
        mode: "clone",
        name: "Route copy",
        sourceProgramId: "00000000-0000-4000-8000-000000000101",
        sourceRevisionId: "00000000-0000-4000-8000-000000000102",
      }),
    );
    expect(cloned.status).toBe(201);
    expect(state.clone).toHaveBeenCalledWith(
      expect.anything(),
      fixtureViewer,
      {
        idempotencyKey: "clone-route",
        name: "Route copy",
        sourceProgramId: "00000000-0000-4000-8000-000000000101",
        sourceRevisionId: "00000000-0000-4000-8000-000000000102",
      },
    );
  });

  it("requires a verified mutation viewer and valid body before database construction", async () => {
    state.viewer = {
      ...fixtureViewer,
      eligibleForPermanentMutations: false,
      emailVerified: false,
    };
    const unverified = await mutateProgramCollection(
      request("/api/app/programs", {
        equipmentProfileKind: "dumbbells",
        idempotencyKey: "unverified-create",
        mode: "starter",
        name: "Not saved",
      }),
    );
    expect(unverified.status).toBe(403);
    await expect(unverified.json()).resolves.toMatchObject({
      error: "email_unverified",
    });
    expect(getDatabase).not.toHaveBeenCalled();

    state.viewer = fixtureViewer;
    const invalid = await mutateProgramCollection(
      request("/api/app/programs", {
        idempotencyKey: "invalid-create",
        mode: "starter",
        name: "Missing equipment",
      }),
    );
    expect(invalid.status).toBe(400);
    expect(getDatabase).not.toHaveBeenCalled();
    expect(state.create).not.toHaveBeenCalled();
    expect(state.clone).not.toHaveBeenCalled();
  });

  it("activates a current owned revision and rejects oversized or forged bodies", async () => {
    state.viewer = fixtureViewer;
    state.activate.mockResolvedValue({
      affectedProgramId: "00000000-0000-4000-8000-000000000302",
      programs: [],
    });
    const response = await activateProgram(
      request("/api/app/programs/activate", {
        expectedActiveProgramId: "00000000-0000-4000-8000-000000000301",
        idempotencyKey: "activate-route",
        programId: "00000000-0000-4000-8000-000000000302",
        revisionId: "00000000-0000-4000-8000-000000000303",
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe(
      "private, no-store, max-age=0",
    );
    expect(state.activate).toHaveBeenCalledWith(
      expect.anything(),
      fixtureViewer,
      {
        expectedActiveProgramId: "00000000-0000-4000-8000-000000000301",
        idempotencyKey: "activate-route",
        programId: "00000000-0000-4000-8000-000000000302",
        revisionId: "00000000-0000-4000-8000-000000000303",
      },
    );

    state.activate.mockClear();
    const oversized = await activateProgram(
      request(
        "/api/app/programs/activate",
        {},
        { contentLength: String(32 * 1_024 + 1) },
      ),
    );
    expect(oversized.status).toBe(413);
    expect(state.activate).not.toHaveBeenCalled();

    const forged = await activateProgram(
      request("/api/app/programs/activate", {
        expectedActiveProgramId: "00000000-0000-4000-8000-000000000301",
        idempotencyKey: "activate-hostile",
        ownerUid: "other-user",
        programId: "00000000-0000-4000-8000-000000000302",
        revisionId: "00000000-0000-4000-8000-000000000303",
      }),
    );
    expect(forged.status).toBe(400);
    expect(state.activate).not.toHaveBeenCalled();
  });
});
