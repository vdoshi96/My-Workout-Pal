/**
 * One resolver for every "Back to …" control.
 *
 * Drill-down links carry the page they came from in a `from` query parameter.
 * The destination passes that raw value here; only allowlisted origins survive,
 * and they are rebuilt from validated parts so nothing unexpected is echoed
 * back into an href. Anything else returns the caller's fallback parent.
 */

export type BackTarget = Readonly<{ href: string; label: string }>;
export type BackTargetDay = Readonly<{ dayKey: string; dayNumber: number; displayName: string }>;
export type BackTargetContext = Readonly<{
  area: "public" | "member";
  fallback: BackTarget;
  /** Member routine days, used to label day origins ("Back to Day 2 · Push"). */
  days?: ReadonlyArray<BackTargetDay> | undefined;
}>;

type Candidate = Readonly<{ pathname: string; params: URLSearchParams; hash: string }>;
type Rule = (candidate: Candidate, context: BackTargetContext) => BackTarget | undefined;

const MAX_FROM_LENGTH = 1_024;
const MAX_QUERY_LENGTH = 120;
const VALIDATION_ORIGIN = "https://back-target.invalid";
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/u;
const ENCODED_CONTROL_PATTERN = /%(?:0[0-9a-f]|1[0-9a-f]|7f)/iu;
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const UUID_PATTERN = new RegExp(`^${UUID}$`, "u");
const DAY_KEY_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/u;
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,119}$/u;
const POSITION_PATTERN = /^[1-9][0-9]{0,2}$/u;
const CURSOR_PATTERN = /^[A-Za-z0-9_-]{1,512}$/u;
const PUBLIC_DAYS = { push: "Push", pull: "Pull", legs: "Legs", upper: "Upper", lower: "Lower" } as const;
type PublicDay = keyof typeof PUBLIC_DAYS;

function isPublicDay(value: string | null): value is PublicDay {
  return value !== null && Object.hasOwn(PUBLIC_DAYS, value);
}

/** Every name appears at most once and belongs to the allowlist. */
function onlyParams(params: URLSearchParams, allowed: readonly string[]): boolean {
  for (const name of new Set(params.keys())) {
    if (!allowed.includes(name) || params.getAll(name).length !== 1) return false;
  }
  return true;
}

function cleanText(value: string | null): string | undefined | false {
  if (value === null) return undefined;
  const trimmed = value.trim();
  if (trimmed.length > MAX_QUERY_LENGTH || CONTROL_CHARACTER_PATTERN.test(trimmed)) return false;
  return trimmed || undefined;
}

function equipment(params: URLSearchParams): string | undefined | false {
  const value = params.get("equipment");
  if (value === null) return undefined;
  return value === "dumbbells" || value === "barbell" ? value : false;
}

/** Validates `#prefix-<value>`; an empty hash is always fine. */
function anchor(hash: string, prefix: string, pattern: RegExp): string | false {
  if (!hash) return "";
  const value = hash.startsWith(`#${prefix}-`) ? hash.slice(prefix.length + 2) : undefined;
  return value !== undefined && pattern.test(value) ? hash : false;
}

function build(pathname: string, entries: ReadonlyArray<readonly [string, string | undefined]>, hash = ""): string {
  const params = new URLSearchParams();
  for (const [name, value] of entries) if (value !== undefined) params.set(name, value);
  const search = params.size > 0 ? `?${params.toString()}` : "";
  return `${pathname}${search}${hash}`;
}

const memberRules: readonly Rule[] = [
  ({ pathname, params, hash }) => {
    if (pathname !== "/app" || !onlyParams(params, ["day"])) return undefined;
    const day = params.get("day");
    if (day !== null && !DAY_KEY_PATTERN.test(day)) return undefined;
    // Today lists the chosen day's movements, so a movement anchor needs that day.
    const movement = day === null ? (hash ? false : "") : anchor(hash, "movement", POSITION_PATTERN);
    if (movement === false) return undefined;
    return { href: build("/app", [["day", day ?? undefined]], movement), label: "Back to Today" };
  },
  ({ pathname, params, hash }, context) => {
    const match = /^\/app\/program\/([^/]+)$/u.exec(pathname);
    const dayKey = match?.[1];
    if (!dayKey || dayKey === "edit" || !DAY_KEY_PATTERN.test(dayKey) || params.size > 0) return undefined;
    const movement = anchor(hash, "movement", POSITION_PATTERN);
    if (movement === false) return undefined;
    let label = "Back to your day";
    if (context.days) {
      const day = context.days.find((candidate) => candidate.dayKey === dayKey);
      if (!day) return undefined;
      label = `Back to Day ${day.dayNumber} · ${day.displayName}`;
    }
    return { href: `${pathname}${movement}`, label };
  },
  ({ pathname, params, hash }) => {
    if (pathname !== "/app/library" || !onlyParams(params, ["q"])) return undefined;
    const query = cleanText(params.get("q"));
    const movement = anchor(hash, "movement", SLUG_PATTERN);
    if (query === false || movement === false) return undefined;
    return { href: build(pathname, [["q", query]], movement), label: "Back to Library" };
  },
  ({ pathname, params, hash }) => {
    if (pathname !== "/app/library/custom" || params.size > 0) return undefined;
    const movement = anchor(hash, "movement", SLUG_PATTERN);
    return movement === false ? undefined : { href: `${pathname}${movement}`, label: "Back to your movements" };
  },
  ({ pathname, params, hash }) => {
    if (pathname !== "/app/progress" || params.size > 0) return undefined;
    const session = anchor(hash, "session", UUID_PATTERN);
    return session === false ? undefined : { href: `${pathname}${session}`, label: "Back to Progress" };
  },
  ({ pathname, params, hash }) => {
    if (pathname !== "/app/prs" || params.size > 0) return undefined;
    const record = anchor(hash, "record", SLUG_PATTERN);
    return record === false ? undefined : { href: `${pathname}${record}`, label: "Back to your records" };
  },
  ({ pathname, params, hash }) => {
    if (pathname !== "/app/history" || !onlyParams(params, ["cursor", "state"])) return undefined;
    const state = params.get("state");
    const cursor = params.get("cursor");
    if (state !== null && state !== "completed" && state !== "abandoned") return undefined;
    if (cursor !== null && !CURSOR_PATTERN.test(cursor)) return undefined;
    const session = anchor(hash, "session", UUID_PATTERN);
    if (session === false) return undefined;
    return {
      href: build(pathname, [["cursor", cursor ?? undefined], ["state", state ?? undefined]], session),
      label: "Back to History",
    };
  },
  ({ pathname, params, hash }) =>
    pathname === "/app/programs" && params.size === 0 && !hash
      ? { href: pathname, label: "Back to Routines" }
      : undefined,
  ({ pathname, params, hash }) => {
    if (pathname !== "/app/program/edit" || hash || !onlyParams(params, ["day"])) return undefined;
    const day = params.get("day");
    if (day !== null && !DAY_KEY_PATTERN.test(day)) return undefined;
    return { href: build(pathname, [["day", day ?? undefined]]), label: "Back to your routine" };
  },
  ({ pathname, params, hash }) => {
    const match = new RegExp(`^/workout/(${UUID})$`, "u").exec(pathname);
    if (!match || params.size > 0) return undefined;
    const exercise = anchor(hash, "exercise", POSITION_PATTERN);
    return exercise === false ? undefined : { href: `${pathname}${exercise}`, label: "Back to your workout" };
  },
];

const publicRules: readonly Rule[] = [
  ({ pathname, params, hash }) => {
    if (pathname !== "/program" || hash || !onlyParams(params, ["equipment"])) return undefined;
    const kit = equipment(params);
    if (kit === false) return undefined;
    return { href: build(pathname, [["equipment", kit]]), label: "Back to the example routine" };
  },
  ({ pathname, params, hash }) => {
    const day = /^\/program\/([a-z]+)$/u.exec(pathname)?.[1] ?? null;
    if (!isPublicDay(day) || !onlyParams(params, ["equipment"])) return undefined;
    const kit = equipment(params);
    const movement = anchor(hash, "movement", POSITION_PATTERN);
    if (kit === false || movement === false) return undefined;
    return { href: build(pathname, [["equipment", kit]], movement), label: `Back to the ${PUBLIC_DAYS[day]} day` };
  },
  ({ pathname, params, hash }) => {
    if (pathname !== "/library" || !onlyParams(params, ["equipment", "q"])) return undefined;
    const kit = equipment(params);
    const query = cleanText(params.get("q"));
    const movement = anchor(hash, "movement", SLUG_PATTERN);
    if (kit === false || query === false || movement === false) return undefined;
    return { href: build(pathname, [["equipment", kit], ["q", query]], movement), label: "Back to Library" };
  },
  ({ pathname, params, hash }) => {
    if (pathname !== "/sample-workout" || !onlyParams(params, ["day", "equipment"])) return undefined;
    const day = params.get("day");
    const kit = equipment(params);
    const movement = anchor(hash, "movement", POSITION_PATTERN);
    if ((day !== null && !isPublicDay(day)) || kit === false || movement === false) return undefined;
    return {
      href: build(pathname, [["day", day ?? undefined], ["equipment", kit]], movement),
      label: "Back to the example workout",
    };
  },
  ({ pathname, params, hash }) =>
    pathname === "/progress" && params.size === 0 && !hash ? { href: pathname, label: "Back to Progress" } : undefined,
  ({ pathname, params, hash }) =>
    pathname === "/try" && params.size === 0 && !hash ? { href: pathname, label: "Back to the test drive" } : undefined,
];

function parseCandidate(raw: string): Candidate | undefined {
  if (
    raw.length === 0 ||
    raw.length > MAX_FROM_LENGTH ||
    raw !== raw.trim() ||
    !raw.startsWith("/") ||
    raw.startsWith("//") ||
    raw.includes("\\") ||
    CONTROL_CHARACTER_PATTERN.test(raw) ||
    ENCODED_CONTROL_PATTERN.test(raw)
  ) {
    return undefined;
  }
  let url: URL;
  try {
    url = new URL(raw, VALIDATION_ORIGIN);
  } catch {
    return undefined;
  }
  if (url.origin !== VALIDATION_ORIGIN) return undefined;
  // The raw path must already be canonical: no dot segments, no percent-encoding.
  const rawPath = raw.split(/[?#]/u, 1)[0];
  if (rawPath !== url.pathname || rawPath.includes("%")) return undefined;
  try {
    for (const value of url.searchParams.values()) {
      if (CONTROL_CHARACTER_PATTERN.test(value)) return undefined;
    }
    decodeURIComponent(url.hash);
  } catch {
    return undefined;
  }
  return { pathname: url.pathname, params: url.searchParams, hash: url.hash };
}

export function resolveBackTarget(
  from: string | readonly string[] | undefined | null,
  context: BackTargetContext,
): BackTarget {
  if (typeof from !== "string") return context.fallback;
  const candidate = parseCandidate(from);
  if (!candidate) return context.fallback;
  const rules = context.area === "member" ? memberRules : publicRules;
  for (const rule of rules) {
    const target = rule(candidate, context);
    if (target) return target;
  }
  return context.fallback;
}

/** Appends `from` to a drill-down href, keeping the destination's own anchor last. */
export function withFrom(href: string, from: string): string {
  const hashIndex = href.indexOf("#");
  const base = hashIndex === -1 ? href : href.slice(0, hashIndex);
  const hash = hashIndex === -1 ? "" : href.slice(hashIndex);
  const queryIndex = base.indexOf("?");
  const pathname = queryIndex === -1 ? base : base.slice(0, queryIndex);
  const params = new URLSearchParams(queryIndex === -1 ? "" : base.slice(queryIndex + 1));
  params.set("from", from);
  return `${pathname}?${params.toString()}${hash}`;
}

/** Reads `from` from a page's searchParams record. */
export function fromParam(value: string | readonly string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}
