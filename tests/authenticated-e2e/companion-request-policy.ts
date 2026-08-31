import type { Request } from "@playwright/test";

const supersededCompanionPaths = new Set([
  "/illustrations/companions/cataloging-otter-512.webp",
  "/illustrations/companions/cataloging-otter.webp",
  "/illustrations/companions/history-archive-tortoise-512.webp",
  "/illustrations/companions/history-archive-tortoise.webp",
  "/illustrations/companions/preparing-fox-512.webp",
  "/illustrations/companions/preparing-fox.webp",
  "/illustrations/companions/routine-drafting-beaver-512.webp",
  "/illustrations/companions/routine-drafting-beaver.webp",
  "/illustrations/companions/settings-packing-hare-512.webp",
  "/illustrations/companions/settings-packing-hare.webp",
  "/illustrations/companions/workout-corner-bear-512.webp",
  "/illustrations/companions/workout-corner-bear.webp",
]);

export function sameOriginNextFlightNavigationTarget(
  request: Request,
): string | undefined {
  const headers = request.headers();
  if (
    request.method() !== "GET" ||
    headers["rsc"] !== "1" ||
    headers["next-router-prefetch"] !== undefined
  ) {
    return undefined;
  }

  const referrerValue = headers["referer"];
  if (!referrerValue) return undefined;

  try {
    const referrer = new URL(referrerValue);
    const target = new URL(request.url());
    if (target.origin !== referrer.origin) return undefined;
    target.searchParams.delete("_rsc");
    if (
      `${target.pathname}${target.search}` ===
      `${referrer.pathname}${referrer.search}`
    ) {
      return undefined;
    }
    return target.href;
  } catch {
    return undefined;
  }
}

export function isSupersededCompanionImageRequest(
  request: Request,
  supersedingMainFrameNavigationUrl?: string,
): boolean {
  // WebKit may cancel a lazy decorative image when navigation wins before the
  // image finishes. The image is failure-safe and non-semantic, so only this
  // exact cancellation is non-fatal; every other first-party failure remains
  // visible to the authenticated harness.
  if (!isSameOriginCompanionImageCancellation(request)) return false;

  const assetUrl = new URL(request.url());
  const referrerValue = request.headers()["referer"]!;
  const referrer = new URL(referrerValue);

  const navigationSuperseded =
    isSameOriginNavigationSupersedingCompanionRequest(
      request,
      supersedingMainFrameNavigationUrl,
    );

  let frameSuperseded = false;
  try {
    const frame = request.frame();
    const currentFrameUrl = new URL(frame.url());
    frameSuperseded =
      frame.isDetached() ||
      (currentFrameUrl.origin === assetUrl.origin &&
        `${currentFrameUrl.pathname}${currentFrameUrl.search}` !==
          `${referrer.pathname}${referrer.search}`);
  } catch {
    // WebKit can retire the frame before reporting the failed image. A
    // separately observed main-frame navigation may still prove supersession.
  }

  return frameSuperseded || navigationSuperseded;
}

export function isSameOriginCompanionImageCancellation(
  request: Request,
): boolean {
  let assetUrl: URL;
  try {
    assetUrl = new URL(request.url());
  } catch {
    return false;
  }
  const referrerValue = request.headers()["referer"];
  if (!referrerValue) return false;

  let referrer: URL;
  try {
    referrer = new URL(referrerValue);
  } catch {
    return false;
  }
  if (assetUrl.origin !== referrer.origin) return false;

  return (
    request.method() === "GET" &&
    supersededCompanionPaths.has(assetUrl.pathname) &&
    ["net::ERR_ABORTED", "cancelled"].includes(request.failure()?.errorText ?? "")
  );
}

export function isSameOriginNavigationSupersedingCompanionRequest(
  request: Request,
  supersedingMainFrameNavigationUrl?: string,
): boolean {
  if (!supersedingMainFrameNavigationUrl) return false;

  try {
    const assetUrl = new URL(request.url());
    const referrerValue = request.headers()["referer"];
    if (!referrerValue) return false;
    const referrer = new URL(referrerValue);
    const pendingNavigation = new URL(supersedingMainFrameNavigationUrl);
    return (
      assetUrl.origin === referrer.origin &&
      pendingNavigation.origin === assetUrl.origin &&
      `${pendingNavigation.pathname}${pendingNavigation.search}` !==
        `${referrer.pathname}${referrer.search}`
    );
  } catch {
    return false;
  }
}

export function isSupersededSameOriginRouteChunkRequest(
  request: Request,
): boolean {
  let assetUrl: URL;
  let referrer: URL;
  try {
    assetUrl = new URL(request.url());
    const referrerValue = request.headers()["referer"];
    if (!referrerValue) return false;
    referrer = new URL(referrerValue);
  } catch {
    return false;
  }
  if (
    request.method() !== "GET" ||
    request.resourceType() !== "script" ||
    request.failure()?.errorText !== "cancelled" ||
    assetUrl.origin !== referrer.origin ||
    !/^\/_next\/static\/chunks\/app\/.+\.js$/u.test(assetUrl.pathname)
  ) {
    return false;
  }

  try {
    const frame = request.frame();
    const currentFrameUrl = new URL(frame.url());
    return (
      frame.isDetached() ||
      (currentFrameUrl.origin === assetUrl.origin &&
        `${currentFrameUrl.pathname}${currentFrameUrl.search}` !==
          `${referrer.pathname}${referrer.search}`)
    );
  } catch {
    return false;
  }
}
