import { describe, expect, it } from "vitest";

import { resolveLocalQaFetchEndpoint } from "@/db/client";

describe("local Neon HTTP QA boundary", () => {
  it("stays inactive without an endpoint", () => {
    expect(resolveLocalQaFetchEndpoint({})).toBeUndefined();
  });

  it("requires the explicit local database QA flag", () => {
    expect(() =>
      resolveLocalQaFetchEndpoint({
        MWP_LOCAL_NEON_HTTP_ENDPOINT: "http://127.0.0.1:55440/sql",
      }),
    ).toThrow(/MWP_LOCAL_DATABASE_QA=1/u);
  });

  it.each([
    "https://127.0.0.1:55440/sql",
    "http://database.example.com/sql",
    "http://user:secret@127.0.0.1:55440/sql",
    "http://127.0.0.1:55440/sql?target=remote",
  ])("rejects a non-loopback or credential-bearing endpoint: %s", (endpoint) => {
    expect(() =>
      resolveLocalQaFetchEndpoint({
        MWP_LOCAL_DATABASE_QA: "1",
        MWP_LOCAL_NEON_HTTP_ENDPOINT: endpoint,
      }),
    ).toThrow(/uncredentialed loopback HTTP URL/u);
  });

  it.each([
    "http://127.0.0.1:55440/sql",
    "http://localhost:55440/sql",
    "http://[::1]:55440/sql",
  ])("accepts an uncredentialed loopback endpoint: %s", (endpoint) => {
    expect(
      resolveLocalQaFetchEndpoint({
        MWP_LOCAL_DATABASE_QA: "1",
        MWP_LOCAL_NEON_HTTP_ENDPOINT: endpoint,
      }),
    ).toBe(endpoint);
  });
});
