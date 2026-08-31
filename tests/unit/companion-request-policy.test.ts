import type { Request } from "@playwright/test";
import { describe, expect, it } from "vitest";

import {
  isSupersededCompanionImageRequest,
  isSupersededSameOriginRouteChunkRequest,
  sameOriginNextFlightNavigationTarget,
} from "../authenticated-e2e/companion-request-policy";

function requestStub(
  overrides: Readonly<{
    currentFrameUrl?: string;
    detached?: boolean;
    errorText?: string;
    frameUnavailable?: boolean;
    method?: string;
    path?: string;
    referrer?: string;
  }> = {},
): Request {
  return {
    failure: () => ({ errorText: overrides.errorText ?? "net::ERR_ABORTED" }),
    frame: () => {
      if (overrides.frameUnavailable) throw new Error("Frame was retired.");
      return {
        isDetached: () => overrides.detached ?? false,
        url: () => overrides.currentFrameUrl ?? "http://127.0.0.1:4173/app/program/edit",
      };
    },
    headers: () => ({
      referer: overrides.referrer ?? "http://127.0.0.1:4173/app/library",
    }),
    method: () => overrides.method ?? "GET",
    url: () =>
      `http://127.0.0.1:4173${overrides.path ?? "/illustrations/companions/cataloging-otter.webp"}`,
  } as unknown as Request;
}

describe("authenticated companion request cancellation policy", () => {
  it("recognizes only a same-origin, non-prefetch Next flight route change", () => {
    const flightRequest = {
      headers: () => ({
        referer: "http://127.0.0.1:4173/workout/fixture-session",
        rsc: "1",
      }),
      method: () => "GET",
      url: () =>
        "http://127.0.0.1:4173/app/history/fixture-session?_rsc=navigation-token",
    } as unknown as Request;

    expect(sameOriginNextFlightNavigationTarget(flightRequest)).toBe(
      "http://127.0.0.1:4173/app/history/fixture-session",
    );
    expect(
      sameOriginNextFlightNavigationTarget({
        ...flightRequest,
        headers: () => ({
          referer: "http://127.0.0.1:4173/workout/fixture-session",
          rsc: "1",
          "next-router-prefetch": "1",
        }),
      } as unknown as Request),
    ).toBeUndefined();
    expect(
      sameOriginNextFlightNavigationTarget({
        ...flightRequest,
        url: () =>
          "https://example.invalid/app/history/fixture-session?_rsc=navigation-token",
      } as unknown as Request),
    ).toBeUndefined();
    expect(
      sameOriginNextFlightNavigationTarget({
        ...flightRequest,
        url: () => "http://127.0.0.1:4173/workout/fixture-session?_rsc=refresh-token",
      } as unknown as Request),
    ).toBeUndefined();
  });

  it("allows only same-origin image cancellations superseded by a new navigation", () => {
    expect(isSupersededCompanionImageRequest(requestStub())).toBe(true);
    expect(
      isSupersededCompanionImageRequest(
        requestStub({ currentFrameUrl: "http://127.0.0.1:4173/app/library" }),
      ),
    ).toBe(false);
    expect(
      isSupersededCompanionImageRequest(
        requestStub({ referrer: "https://example.invalid/app/library" }),
      ),
    ).toBe(false);
  });

  it("accepts a detached same-origin frame as demonstrably superseded", () => {
    expect(
      isSupersededCompanionImageRequest(
        requestStub({
          currentFrameUrl: "http://127.0.0.1:4173/app/library",
          detached: true,
        }),
      ),
    ).toBe(true);
  });

  it("accepts only a same-origin main-frame navigation that has already superseded the referrer", () => {
    const request = requestStub({
      currentFrameUrl: "http://127.0.0.1:4173/app/library",
    });

    expect(
      isSupersededCompanionImageRequest(
        request,
        "http://127.0.0.1:4173/workout/fixture-session",
      ),
    ).toBe(true);
    expect(
      isSupersededCompanionImageRequest(
        requestStub({
          currentFrameUrl: "http://127.0.0.1:4173/app/library",
          frameUnavailable: true,
        }),
        "http://127.0.0.1:4173/workout/fixture-session",
      ),
    ).toBe(true);
    expect(
      isSupersededCompanionImageRequest(
        request,
        "https://example.invalid/workout/fixture-session",
      ),
    ).toBe(false);
    expect(
      isSupersededCompanionImageRequest(
        request,
        "http://127.0.0.1:4173/app/library",
      ),
    ).toBe(false);
  });

  it("rejects unrelated methods, paths, and failure classes", () => {
    expect(isSupersededCompanionImageRequest(requestStub({ method: "POST" }))).toBe(false);
    expect(
      isSupersededCompanionImageRequest(
        requestStub({ path: "/illustrations/companions/unknown.webp" }),
      ),
    ).toBe(false);
    expect(
      isSupersededCompanionImageRequest(
        requestStub({ errorText: "net::ERR_FAILED" }),
      ),
    ).toBe(false);
  });

  it("allows only canceled same-origin route chunks after their frame is superseded", () => {
    const routeChunk = requestStub({
      currentFrameUrl: "http://127.0.0.1:4173/app/program/edit",
      errorText: "cancelled",
      path: "/_next/static/chunks/app/app/history/%5BsessionId%5D/page.js",
      referrer: "http://127.0.0.1:4173/app/history/fixture-session",
    });
    const routeChunkRequest = {
      ...routeChunk,
      resourceType: () => "script",
    } as unknown as Request;

    expect(isSupersededSameOriginRouteChunkRequest(routeChunkRequest)).toBe(true);
    expect(
      isSupersededSameOriginRouteChunkRequest({
        ...routeChunkRequest,
        resourceType: () => "image",
      } as unknown as Request),
    ).toBe(false);
    expect(
      isSupersededSameOriginRouteChunkRequest(
        {
          ...requestStub({
            currentFrameUrl: "http://127.0.0.1:4173/app/history/fixture-session",
            errorText: "cancelled",
            path: "/_next/static/chunks/app/app/history/page.js",
            referrer: "http://127.0.0.1:4173/app/history/fixture-session",
          }),
          resourceType: () => "script",
        } as unknown as Request,
      ),
    ).toBe(false);
  });
});
