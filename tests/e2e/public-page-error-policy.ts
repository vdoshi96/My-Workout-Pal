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
