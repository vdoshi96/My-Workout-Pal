import { afterEach, describe, expect, it, vi } from "vitest";

import { createDatabase } from "@/db/client";

describe("Neon database client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("consumes idle pool errors without logging their potentially sensitive details", async () => {
    const database = createDatabase(
      "postgresql://fixture-user:fixture-password@fixture.invalid/workout-pal",
    );
    const pool = database.$client;
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(pool.listenerCount("error")).toBe(1);
    expect(() =>
      pool.emit(
        "error",
        new Error("secret connection failure detail"),
        undefined,
      ),
    ).not.toThrow();
    expect(errorLog).toHaveBeenCalledOnce();
    expect(errorLog).toHaveBeenCalledWith(
      "A Neon database connection failed while idle; the pool discarded it.",
    );
    expect(errorLog.mock.calls.flat().join(" ")).not.toContain(
      "secret connection failure detail",
    );

    await pool.end();
  });
});
