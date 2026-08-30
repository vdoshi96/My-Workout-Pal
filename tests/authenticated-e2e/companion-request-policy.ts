import type { Request } from "@playwright/test";

export function isSupersededCompanionImageRequest(request: Request): boolean {
  // WebKit may cancel a lazy decorative image when navigation wins before the
  // image finishes. The image is failure-safe and non-semantic, so only this
  // exact cancellation is non-fatal; every other first-party failure remains
  // visible to the authenticated harness.
  const url = new URL(request.url());
  return (
    request.method() === "GET" &&
    /^\/illustrations\/companions\/preparing-fox(?:-512)?\.webp$/u.test(url.pathname) &&
    ["net::ERR_ABORTED", "cancelled"].includes(request.failure()?.errorText ?? "")
  );
}
