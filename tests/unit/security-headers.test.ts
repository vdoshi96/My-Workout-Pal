import { describe, expect, it } from "vitest";

import {
  buildContentSecurityPolicy,
  buildSecurityHeaders,
} from "@/server/security/headers";

describe("response security headers", () => {
  it("builds a strict production nonce policy for Firebase and YouTube", () => {
    const policy = buildContentSecurityPolicy("fixtureNonce123", false, true);

    expect(policy).toContain("script-src 'self' 'nonce-fixtureNonce123' 'strict-dynamic'");
    expect(policy).toContain(
      'frame-src https://www.youtube.com https://www.youtube-nocookie.com https://accounts.google.com https://*.firebaseapp.com',
    );
    expect(policy).toContain("worker-src 'self'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("upgrade-insecure-requests");
    expect(policy).not.toContain("'unsafe-inline'");
    expect(policy).not.toContain("'unsafe-eval'");
    expect(policy).not.toMatch(/[\r\n]/);
  });

  it("allows React development evaluation without weakening production", () => {
    expect(buildContentSecurityPolicy("fixtureNonce123", true, false)).toContain("'unsafe-eval'");
    expect(buildContentSecurityPolicy("fixtureNonce123", false, true)).not.toContain("'unsafe-eval'");
  });

  it("uses a YouTube-compliant referrer policy and popup-safe opener policy", () => {
    const headers = Object.fromEntries(buildSecurityHeaders("fixtureNonce123", false, true));

    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["Cross-Origin-Opener-Policy"]).toBe("same-origin-allow-popups");
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["Permissions-Policy"]).toContain("autoplay=()");
  });

  it("keeps HTTP production checks strict without forcing unavailable TLS", () => {
    const policy = buildContentSecurityPolicy("fixtureNonce123", false, false);
    const headers = Object.fromEntries(
      buildSecurityHeaders("fixtureNonce123", false, false),
    );

    expect(policy).toContain("'strict-dynamic'");
    expect(policy).not.toContain("'unsafe-eval'");
    expect(policy).not.toContain("upgrade-insecure-requests");
    expect(headers).not.toHaveProperty("Strict-Transport-Security");
  });

  it("refuses a caller-controlled nonce with directive characters", () => {
    expect(() =>
      buildContentSecurityPolicy("safe'; img-src *", false, true),
    ).toThrow("nonce");
  });
});
