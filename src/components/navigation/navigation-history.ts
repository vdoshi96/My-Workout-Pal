/**
 * Same-tab navigation memory for BackLink.
 *
 * NavigationTracker records the page the person just left and the page they are
 * on. BackLink uses that record to decide whether the browser's previous entry is
 * exactly its target, in which case `history.back()` restores scroll natively.
 */

export const NAVIGATION_RECORD_KEY = "mwp:navigation";
export const PENDING_FOCUS_KEY = "mwp:navigation-focus";

export type NavigationRecord = Readonly<{ previous: string | null; current: string }>;
export type PendingFocus = Readonly<{ page: string; id: string }>;

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const BASE = "https://navigation.invalid";

/** Path plus sorted query, without the hash or the `from` breadcrumb. */
export function comparablePage(href: string): string {
  try {
    const url = new URL(href, BASE);
    if (url.origin !== BASE) return "";
    url.searchParams.delete("from");
    url.searchParams.sort();
    const search = url.searchParams.size > 0 ? `?${url.searchParams.toString()}` : "";
    return `${url.pathname}${search}`;
  } catch {
    return "";
  }
}

export function nextNavigationRecord(record: NavigationRecord | null, location: string): NavigationRecord {
  if (!record) return { previous: null, current: location };
  if (record.current === location) return record;
  return { previous: record.current, current: location };
}

export function shouldUseHistoryBack(input: Readonly<{
  record: NavigationRecord | null;
  location: string;
  targetHref: string;
  historyLength: number;
  /** A page has pushed a guard entry (unsaved routine edits); stepping back would hit it. */
  guarded?: boolean;
}>): boolean {
  const { record, location, targetHref, historyLength, guarded = false } = input;
  if (guarded || !record?.previous || historyLength < 2) return false;
  if (comparablePage(record.current) !== comparablePage(location)) return false;
  const target = comparablePage(targetHref);
  return target !== "" && comparablePage(record.previous) === target;
}

/** The element id a target anchors to, when it is one of ours. */
export function anchorId(href: string): string | undefined {
  const hash = href.includes("#") ? href.slice(href.indexOf("#") + 1) : "";
  return /^(?:movement|session|record|exercise)-[A-Za-z0-9-]{1,120}$/u.test(hash) ? hash : undefined;
}

function storage(): StorageLike | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.sessionStorage;
  } catch {
    return undefined;
  }
}

function readJson<T>(key: string, isValid: (value: unknown) => value is T): T | null {
  try {
    const raw = storage()?.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    storage()?.setItem(key, JSON.stringify(value));
  } catch {
    // Private browsing or a full quota: fall back to plain links.
  }
}

function isRecord(value: unknown): value is NavigationRecord {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate["current"] === "string" &&
    (candidate["previous"] === null || typeof candidate["previous"] === "string");
}

function isPendingFocus(value: unknown): value is PendingFocus {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate["page"] === "string" && typeof candidate["id"] === "string";
}

export function currentLocation(): string {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

export function readNavigationRecord(): NavigationRecord | null {
  return readJson(NAVIGATION_RECORD_KEY, isRecord);
}

export function recordNavigation(location: string): void {
  writeJson(NAVIGATION_RECORD_KEY, nextNavigationRecord(readNavigationRecord(), location));
}

/**
 * Keeps `current` exact just before leaving a page. Client navigations that only
 * change the query (pagination, filters) do not remount the tracker.
 */
export function refreshCurrentLocation(location: string): void {
  const record = readNavigationRecord();
  if (record && record.current !== location) {
    writeJson(NAVIGATION_RECORD_KEY, { previous: record.previous, current: location });
  }
}

export function requestFocusAfterNavigation(href: string): void {
  const id = anchorId(href);
  if (id) writeJson(PENDING_FOCUS_KEY, { page: comparablePage(href), id });
}

export function takePendingFocus(location: string): PendingFocus | null {
  const pending = readJson(PENDING_FOCUS_KEY, isPendingFocus);
  if (!pending || pending.page !== comparablePage(location)) return null;
  try {
    storage()?.removeItem(PENDING_FOCUS_KEY);
  } catch {
    // Ignore; the stale request is ignored on other pages anyway.
  }
  return pending;
}
