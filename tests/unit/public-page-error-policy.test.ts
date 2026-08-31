import { describe, expect, it } from "vitest";

import { isSupersededWebKitFlightPageError } from "../e2e/public-page-error-policy";

describe("public page-error policy", () => {
  const cancelledFlight =
    "/127.0.0.1:3108/sample-workout?day=push&_rsc=flight-token due to access control checks.";

  it("allows a same-origin WebKit Flight error only after navigation supersedes it", () => {
    expect(
      isSupersededWebKitFlightPageError({
        browserName: "webkit",
        currentUrl: "http://127.0.0.1:3108/sign-in?returnTo=%2Fapp",
        message: cancelledFlight,
      }),
    ).toBe(true);
    expect(
      isSupersededWebKitFlightPageError({
        browserName: "webkit",
        currentUrl: "http://127.0.0.1:3108/sample-workout?day=push",
        message: cancelledFlight,
      }),
    ).toBe(false);
  });

  it("rejects other engines and cross-origin or non-Flight failures", () => {
    expect(
      isSupersededWebKitFlightPageError({
        browserName: "chromium",
        currentUrl: "http://127.0.0.1:3108/sign-in",
        message: cancelledFlight,
      }),
    ).toBe(false);
    expect(
      isSupersededWebKitFlightPageError({
        browserName: "webkit",
        currentUrl: "http://127.0.0.1:3108/sign-in",
        message:
          "/example.invalid/sample-workout?_rsc=flight-token due to access control checks.",
      }),
    ).toBe(false);
    expect(
      isSupersededWebKitFlightPageError({
        browserName: "webkit",
        currentUrl: "http://127.0.0.1:3108/sign-in",
        message:
          "/127.0.0.1:3108/sample-workout due to access control checks.",
      }),
    ).toBe(false);
  });
});
