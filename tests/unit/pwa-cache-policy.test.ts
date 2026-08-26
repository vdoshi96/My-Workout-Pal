import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import {
  PWA_INSTALL_ASSETS,
  isCacheablePublicNavigationPath,
  isCacheableStaticRequest,
  renderServiceWorker,
} from "@/domain/pwa/cache-policy";

describe("PWA public-cache policy", () => {
  it.each([
    "/",
    "/program",
    "/program/push",
    "/library",
    "/library/dead-bug",
    "/sample-progress",
    "/sample-workout",
    "/offline",
  ])("allows the public navigation path %s", (pathname) => {
    expect(isCacheablePublicNavigationPath(pathname)).toBe(true);
  });

  it.each([
    "/api/auth/session",
    "/history",
    "/progress",
    "/settings",
    "/sign-in",
    "/today",
    "/workout/session-1",
  ])("denies the private or mutation path %s", (pathname) => {
    expect(isCacheablePublicNavigationPath(pathname)).toBe(false);
  });

  it("caches only hashed static output and explicit public assets", () => {
    const appOrigin = "https://my-workout-pal.example";
    expect(
      isCacheableStaticRequest({
        appOrigin,
        destination: "script",
        method: "GET",
        url: `${appOrigin}/_next/static/chunks/app.js`,
      }),
    ).toBe(true);
    expect(PWA_INSTALL_ASSETS).toContain(
      "/illustrations/workout-pals-gym-768.webp",
    );
    expect(
      isCacheableStaticRequest({
        appOrigin,
        destination: "image",
        method: "GET",
        url: `${appOrigin}/icon.svg`,
      }),
    ).toBe(true);
    expect(
      isCacheableStaticRequest({
        appOrigin,
        destination: "image",
        method: "GET",
        url: `${appOrigin}/illustrations/workout-pals-gym.webp`,
      }),
    ).toBe(true);

    for (const request of [
      { destination: "image", method: "GET", url: `${appOrigin}/avatars/user.png` },
      { destination: "script", method: "POST", url: `${appOrigin}/_next/static/chunks/app.js` },
      { destination: "script", method: "GET", url: "https://third-party.example/app.js" },
      { destination: "image", method: "GET", url: `${appOrigin}/api/private-image` },
    ]) {
      expect(isCacheableStaticRequest({ appOrigin, ...request })).toBe(false);
    }
  });

  it("keeps the shipped service worker identical to the tested generator", async () => {
    const shipped = await readFile(new URL("../../public/sw.js", import.meta.url), "utf8");
    expect(shipped).toBe(renderServiceWorker());
  });
});
