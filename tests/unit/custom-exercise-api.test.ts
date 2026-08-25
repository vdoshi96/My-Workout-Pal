import { describe, expect, it } from "vitest";

import {
  PRIVATE_JSON_BODY_LIMIT_BYTES,
  PrivateApiBodyError,
  customExerciseApiError,
  customExerciseIdSchema,
  privateJson,
  readBoundedJson,
} from "@/server/http/custom-exercise-api";
import { CustomExerciseRepositoryError } from "@/server/repositories/custom-exercises";

describe("private custom-exercise API boundaries", () => {
  it("parses bounded JSON and rejects malformed or oversized bodies", async () => {
    await expect(
      readBoundedJson(new Request("https://example.test", { body: JSON.stringify({ ok: true }), method: "POST" })),
    ).resolves.toEqual({ ok: true });

    await expect(
      readBoundedJson(new Request("https://example.test", { body: "{", method: "POST" })),
    ).rejects.toMatchObject({ code: "invalid_json", status: 400 } satisfies Partial<PrivateApiBodyError>);

    await expect(
      readBoundedJson(
        new Request("https://example.test", {
          body: "x",
          headers: { "Content-Length": String(PRIVATE_JSON_BODY_LIMIT_BYTES + 1) },
          method: "POST",
        }),
      ),
    ).rejects.toMatchObject({ code: "request_too_large", status: 413 } satisfies Partial<PrivateApiBodyError>);
  });

  it("validates opaque exercise identifiers before a database query", () => {
    expect(customExerciseIdSchema.safeParse("client-controlled").success).toBe(false);
    expect(customExerciseIdSchema.safeParse("00000000-0000-4000-8000-000000000001").success).toBe(true);
  });

  it("keeps repository failures stable and private responses uncacheable", async () => {
    const response = customExerciseApiError(
      new CustomExerciseRepositoryError("not_found", "This custom exercise is not available.", 404),
    );
    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("private, no-store, max-age=0");
    expect(response.headers.get("vary")).toBe("Cookie");
    await expect(response.json()).resolves.toEqual({
      error: "not_found",
      message: "This custom exercise is not available.",
    });

    const success = privateJson({ ok: true });
    expect(success.headers.get("cache-control")).toBe("private, no-store, max-age=0");
  });
});
