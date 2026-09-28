import type { Frame, Page } from "@playwright/test";

export function captureWebKitVideoTeardown(page: Page): (error: Error) => boolean {
  const embeds = new Map<Frame, string>();
  let mainUrl = page.url();
  let navigation: { from: string; to: string; at: number } | undefined;
  let detached: { destination: string; at: number } | undefined;

  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) {
      navigation = { from: mainUrl, to: frame.url(), at: performance.now() };
      mainUrl = frame.url();
      detached = undefined;
      return;
    }
    embeds.delete(frame);
    if (
      frame.parentFrame() === page.mainFrame() &&
      /^https:\/\/www\.youtube-nocookie\.com\/embed\/[\w-]{11}(?:\?|$)/u.test(frame.url())
    ) {
      embeds.set(frame, mainUrl);
    }
  });

  page.on("framedetached", (frame) => {
    const source = embeds.get(frame);
    embeds.delete(frame);
    if (!source || !navigation || navigation.from !== source) return;
    const from = new URL(source);
    const to = new URL(navigation.to);
    if (
      from.hostname !== "127.0.0.1" ||
      !/^\/library\/[^/]+$/u.test(from.pathname) ||
      from.origin !== to.origin ||
      `${from.pathname}${from.search}` === `${to.pathname}${to.search}` ||
      page.url() !== navigation.to ||
      performance.now() - navigation.at > 100
    ) return;
    detached = { destination: navigation.to, at: performance.now() };
  });

  return (error) => {
    const departure = detached;
    detached = undefined;
    return (
      page.context().browser()?.browserType().name() === "webkit" &&
      departure !== undefined &&
      page.url() === departure.destination &&
      performance.now() - departure.at <= 100 &&
      error.message === "Context is stopped" &&
      error.stack?.split("\n")[0] === "Cache API operation failed: Context is stopped"
    );
  };
}

export function isSupersededWebKitFlightPageError(input: Readonly<{
  browserName: string;
  currentUrl: string;
  message: string;
}>): boolean {
  if (input.browserName !== "webkit") return false;

  let current: URL;
  try {
    current = new URL(input.currentUrl);
  } catch {
    return false;
  }
  if (current.hostname !== "127.0.0.1") return false;

  const suffix = " due to access control checks.";
  const sameOriginPrefix = `/${current.host}`;
  if (
    !input.message.startsWith(sameOriginPrefix) ||
    !input.message.endsWith(suffix)
  ) {
    return false;
  }

  let requested: URL;
  try {
    requested = new URL(
      input.message.slice(sameOriginPrefix.length, -suffix.length),
      current.origin,
    );
  } catch {
    return false;
  }
  if (requested.origin !== current.origin || !requested.searchParams.has("_rsc")) {
    return false;
  }
  requested.searchParams.delete("_rsc");

  return (
    `${requested.pathname}${requested.search}` !==
    `${current.pathname}${current.search}`
  );
}
