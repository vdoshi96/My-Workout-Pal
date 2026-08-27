import { describe, expect, it } from "vitest";

import {
  browserZoomEvidenceIsExact,
  cleanupPostconditionIsConfirmed,
  HostedAuthenticatedMediaQaConfigurationError,
  mediaEvidenceIsComplete,
  parseHostedAuthenticatedMediaQaConfig,
  type HostedAuthenticatedMediaQaConfigurationCode,
} from "@/domain/hosted-authenticated-media-qa";

const validEnvironment = {
  DATABASE_URL: "postgresql://fixture.invalid/database",
  FIREBASE_CLIENT_EMAIL: "firebase-admin@example.iam.gserviceaccount.com",
  FIREBASE_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\nfixture-not-a-real-private-key-value\n-----END PRIVATE KEY-----",
  FIREBASE_PROJECT_ID: "my-workout-pal-92819",
  MWP_HOSTED_AUTHENTICATED_MEDIA_APPROVED: "1",
  MWP_HOSTED_AUTHENTICATED_MEDIA_NATIVE_ZOOM: "1",
  MWP_HOSTED_AUTH_ORIGIN: "https://my-workout-pal-chi.vercel.app",
  NEXT_PUBLIC_FIREBASE_API_KEY: "fixture-public-api-key",
  NEXT_PUBLIC_FIREBASE_APP_ID: "1:381810672975:web:fixture",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "my-workout-pal-92819.firebaseapp.com",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "my-workout-pal-92819",
} as const;

const invalidCases: readonly Readonly<[
  name: string,
  override: Readonly<Record<string, string | undefined>>,
  code: HostedAuthenticatedMediaQaConfigurationCode,
]>[] = [
  ["approval missing", { MWP_HOSTED_AUTHENTICATED_MEDIA_APPROVED: undefined }, "approval_required"],
  ["native zoom approval missing", { MWP_HOSTED_AUTHENTICATED_MEDIA_NATIVE_ZOOM: undefined }, "native_zoom_required"],
  ["database missing", { DATABASE_URL: undefined }, "database_unavailable"],
  ["HTTP origin", { MWP_HOSTED_AUTH_ORIGIN: "http://my-workout-pal-chi.vercel.app" }, "origin_invalid"],
  ["unknown project", { FIREBASE_PROJECT_ID: "another-project" }, "project_mismatch"],
  ["Firebase key missing", { FIREBASE_PRIVATE_KEY: undefined }, "firebase_unavailable"],
];

describe("hosted authenticated media QA boundary", () => {
  it("accepts only the approved production, Firebase, and Neon boundary", () => {
    expect(parseHostedAuthenticatedMediaQaConfig(validEnvironment)).toEqual({
      origin: "https://my-workout-pal-chi.vercel.app",
      projectId: "my-workout-pal-92819",
    });
  });

  it.each(invalidCases)("rejects %s before provider or browser work", (_name, override, code) => {
    expect(() => parseHostedAuthenticatedMediaQaConfig({
      ...validEnvironment,
      ...override,
    })).toThrowError(
      expect.objectContaining<Partial<HostedAuthenticatedMediaQaConfigurationError>>({ code }),
    );
  });

  it("requires two distinct valid videos, one iframe, both playing observations, and fallbacks", () => {
    const complete = {
      activeIframeCount: 1,
      directFallbackVideoIds: ["abcdefghijk", "lmnopqrstuv"],
      playingVideoIds: ["abcdefghijk", "lmnopqrstuv"],
      selectedVideoId: "lmnopqrstuv",
      videos: [
        { displayOrder: 1, videoId: "abcdefghijk" },
        { displayOrder: 2, videoId: "lmnopqrstuv" },
      ],
    } as const;

    expect(mediaEvidenceIsComplete(complete)).toBe(true);
    expect(mediaEvidenceIsComplete({ ...complete, activeIframeCount: 2 })).toBe(false);
    expect(mediaEvidenceIsComplete({
      ...complete,
      playingVideoIds: ["lmnopqrstuv"],
    })).toBe(false);
    expect(mediaEvidenceIsComplete({
      ...complete,
      videos: [
        { displayOrder: 1, videoId: "abcdefghijk" },
        { displayOrder: 2, videoId: "abcdefghijk" },
      ],
    })).toBe(false);
  });

  it("accepts only browser-reported 200-percent zoom without emulation", () => {
    const exact = {
      devicePixelRatioAfter: 4,
      devicePixelRatioBefore: 2,
      emulationUsed: false,
      reportedPercent: 200,
      restoredPercent: 100,
    } as const;

    expect(browserZoomEvidenceIsExact(exact)).toBe(true);
    expect(browserZoomEvidenceIsExact({ ...exact, emulationUsed: true })).toBe(false);
    expect(browserZoomEvidenceIsExact({ ...exact, reportedPercent: 175 })).toBe(false);
    expect(browserZoomEvidenceIsExact({ ...exact, restoredPercent: 110 })).toBe(false);
  });

  it("confirms cleanup only after Firebase, owned rows, deletion state, and globals agree", () => {
    const complete = {
      firebaseCountAfter: 3,
      firebaseCountBefore: 3,
      globalDigestAfter: "stable-global-digest",
      globalDigestBefore: "stable-global-digest",
      identityAbsent: true,
      ownerRowCount: 0,
      terminalDeletionJob: true,
    } as const;

    expect(cleanupPostconditionIsConfirmed(complete)).toBe(true);
    expect(cleanupPostconditionIsConfirmed({ ...complete, ownerRowCount: 1 })).toBe(false);
    expect(cleanupPostconditionIsConfirmed({
      ...complete,
      globalDigestAfter: "changed-global-digest",
    })).toBe(false);
  });
});
