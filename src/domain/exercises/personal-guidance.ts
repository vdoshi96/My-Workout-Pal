import { parseYouTubeReference } from "@/domain/youtube/normalization";
import type { YouTubeReferenceErrorCode } from "@/domain/youtube/types";

export const PERSONAL_GUIDANCE_MAX_LINKS = 2 as const;
export const PERSONAL_GUIDANCE_MAX_URL_LENGTH = 2_048 as const;

// Readable aliases keep the boundary convenient for callers that use a
// max-first naming convention without creating a second source of truth.
export const MAX_PERSONAL_GUIDANCE_LINKS = PERSONAL_GUIDANCE_MAX_LINKS;
export const MAX_PERSONAL_GUIDANCE_URL_LENGTH = PERSONAL_GUIDANCE_MAX_URL_LENGTH;

const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/u;
const MALFORMED_PERCENT_ESCAPE_PATTERN = /%(?![0-9a-f]{2})/iu;

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "www.youtu.be",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);

export type PersonalGuidanceKind = "youtube" | "external";

export type PersonalGuidanceLink = Readonly<
  | {
      kind: "youtube";
      canonicalUrl: string;
      videoId: string;
      embedUrl: string;
    }
  | {
      kind: "external";
      canonicalUrl: string;
    }
>;

export type PersonalGuidanceUrl = PersonalGuidanceLink;
export type NormalizedPersonalGuidance = readonly PersonalGuidanceLink[];

export type PersonalGuidanceValidationCode =
  | "invalid_input"
  | "blank_url"
  | "invalid_url"
  | "url_too_long"
  | "control_character"
  | "https_required"
  | "credentials_not_allowed"
  | "fragment_not_allowed"
  | "port_not_allowed"
  | "unsafe_host"
  | "youtube_unsupported_path"
  | "youtube_invalid"
  | "too_many_links";

export type PersonalGuidanceUrlValidationCode = PersonalGuidanceValidationCode;

export type PersonalGuidanceValidationFailure = Readonly<{
  ok: false;
  code: PersonalGuidanceValidationCode;
  message: string;
}>;

export type PersonalGuidanceLinkValidationResult =
  | Readonly<{ ok: true; link: PersonalGuidanceLink }>
  | PersonalGuidanceValidationFailure;

export type PersonalGuidanceValidationResult =
  | Readonly<{ ok: true; links: NormalizedPersonalGuidance }>
  | PersonalGuidanceValidationFailure;

const VALIDATION_MESSAGES: Readonly<
  Record<PersonalGuidanceValidationCode, string>
> = Object.freeze({
  invalid_input: "Personal guidance links must be supplied as a list.",
  blank_url: "A personal guidance URL is required.",
  invalid_url: "Personal guidance links must be valid HTTPS URLs.",
  url_too_long: `Personal guidance URLs must be ${PERSONAL_GUIDANCE_MAX_URL_LENGTH} encoded characters or fewer.`,
  control_character: "Personal guidance URLs cannot contain control characters.",
  https_required: "Personal guidance URLs must use HTTPS.",
  credentials_not_allowed: "Personal guidance URLs cannot contain credentials.",
  fragment_not_allowed: "Personal guidance URLs cannot contain fragments.",
  port_not_allowed: "Personal guidance URLs cannot use a non-standard port.",
  unsafe_host: "Personal guidance links cannot target local or private hosts.",
  youtube_unsupported_path: "This YouTube URL path is not supported for personal guidance.",
  youtube_invalid: "This YouTube URL is not a supported video reference.",
  too_many_links: `Personal guidance can contain at most ${PERSONAL_GUIDANCE_MAX_LINKS} links.`,
});

export const PERSONAL_GUIDANCE_VALIDATION_MESSAGES = VALIDATION_MESSAGES;

export class PersonalGuidanceValidationError extends Error {
  readonly code: PersonalGuidanceValidationCode;

  constructor(code: PersonalGuidanceValidationCode, message = VALIDATION_MESSAGES[code]) {
    super(message);
    this.name = "PersonalGuidanceValidationError";
    this.code = code;
  }
}

function failure(code: PersonalGuidanceValidationCode): PersonalGuidanceValidationFailure {
  return Object.freeze({
    ok: false,
    code,
    message: VALIDATION_MESSAGES[code],
  });
}

function hasControlCharacter(value: string): boolean {
  if (CONTROL_CHARACTER_PATTERN.test(value)) return true;
  if (!value.includes("%")) return false;

  try {
    return CONTROL_CHARACTER_PATTERN.test(decodeURIComponent(value));
  } catch {
    // A malformed escape is handled as an invalid URL by the caller. It is
    // not a reason to expose parser details or the submitted value.
    return false;
  }
}

function encodedLength(value: string): number | undefined {
  try {
    return encodeURI(value).length;
  } catch {
    return undefined;
  }
}

function normalizedHostname(url: URL): string {
  let hostname = url.hostname.toLowerCase();
  if (hostname.startsWith("[") && hostname.endsWith("]")) {
    hostname = hostname.slice(1, -1);
  }
  return hostname.replace(/\.+$/u, "");
}

function parseIPv4(hostname: string): readonly [number, number, number, number] | undefined {
  const parts = hostname.split(".");
  if (parts.length !== 4 || parts.some((part) => !/^\d+$/u.test(part))) return undefined;

  const octets = parts.map((part) => Number(part));
  if (octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return undefined;
  }

  const [first, second, third, fourth] = octets;
  if (first === undefined || second === undefined || third === undefined || fourth === undefined) {
    return undefined;
  }
  return [first, second, third, fourth];
}

function unsafeIPv4([first, second]: readonly [number, number, number, number]): boolean {
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
}

function parseIPv6Part(part: string): readonly number[] | undefined {
  if (!part) return [];
  const segments = part.split(":");
  const groups: number[] = [];

  for (const [index, segment] of segments.entries()) {
    if (segment.includes(".")) {
      if (index !== segments.length - 1) return undefined;
      const ipv4 = parseIPv4(segment);
      if (!ipv4) return undefined;
      groups.push((ipv4[0] << 8) | ipv4[1], (ipv4[2] << 8) | ipv4[3]);
      continue;
    }
    if (!/^[0-9a-f]{1,4}$/iu.test(segment)) return undefined;
    groups.push(Number.parseInt(segment, 16));
  }
  return groups;
}

function parseIPv6(hostname: string): readonly number[] | undefined {
  if (!hostname.includes(":")) return undefined;
  const halves = hostname.split("::");
  if (halves.length > 2) return undefined;

  const left = parseIPv6Part(halves[0] ?? "");
  const right = parseIPv6Part(halves.length === 2 ? halves[1] ?? "" : "");
  if (!left || !right) return undefined;

  if (halves.length === 1) {
    return left.length === 8 ? left : undefined;
  }

  const missing = 8 - left.length - right.length;
  if (missing < 1) return undefined;
  return [...left, ...Array.from({ length: missing }, () => 0), ...right];
}

function unsafeIPv6(groups: readonly number[]): boolean {
  if (groups.length !== 8) return false;
  const first = groups[0];
  if (first === undefined) return false;

  const unspecified = groups.every((group) => group === 0);
  const loopback = groups.slice(0, 7).every((group) => group === 0) && groups[7] === 1;
  const uniqueLocal = (first & 0xfe00) === 0xfc00;
  const linkLocal = (first & 0xffc0) === 0xfe80;
  const deprecatedSiteLocal = (first & 0xffc0) === 0xfec0;
  const ipv4Mapped =
    groups[0] === 0 &&
    groups[1] === 0 &&
    groups[2] === 0 &&
    groups[3] === 0 &&
    groups[4] === 0 &&
    groups[5] === 0xffff;

  if (unspecified || loopback || uniqueLocal || linkLocal || deprecatedSiteLocal) return true;
  if (!ipv4Mapped) return false;

  const ipv4: [number, number, number, number] = [
    (groups[6] ?? 0) >> 8,
    (groups[6] ?? 0) & 0xff,
    (groups[7] ?? 0) >> 8,
    (groups[7] ?? 0) & 0xff,
  ];
  return unsafeIPv4(ipv4);
}

function unsafeHost(hostname: string): boolean {
  if (hostname === "localhost" || hostname.endsWith(".localhost")) return true;
  const ipv4 = parseIPv4(hostname);
  if (ipv4) return unsafeIPv4(ipv4);
  const ipv6 = parseIPv6(hostname);
  return ipv6 ? unsafeIPv6(ipv6) : false;
}

function youtubeFailure(code: YouTubeReferenceErrorCode): PersonalGuidanceValidationFailure {
  return failure(
    code === "unsupported-path" || code === "shorts-not-allowed"
      ? "youtube_unsupported_path"
      : "youtube_invalid",
  );
}

export function parsePersonalGuidanceLink(
  input: unknown,
): PersonalGuidanceLinkValidationResult {
  if (typeof input !== "string") return failure("invalid_url");
  const trimmed = input.trim();
  if (!trimmed) return failure("blank_url");
  if (hasControlCharacter(input)) return failure("control_character");
  if (MALFORMED_PERCENT_ESCAPE_PATTERN.test(trimmed)) return failure("invalid_url");

  const inputLength = encodedLength(trimmed);
  if (inputLength === undefined) return failure("invalid_url");
  if (inputLength > PERSONAL_GUIDANCE_MAX_URL_LENGTH) return failure("url_too_long");

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return failure("invalid_url");
  }

  if (url.protocol !== "https:") return failure("https_required");
  if (url.username || url.password) return failure("credentials_not_allowed");
  if (trimmed.includes("#") || url.hash) return failure("fragment_not_allowed");
  if (url.port) return failure("port_not_allowed");

  const hostname = normalizedHostname(url);
  if (unsafeHost(hostname)) return failure("unsafe_host");

  const canonicalUrl = url.toString();
  const canonicalLength = encodedLength(canonicalUrl);
  if (canonicalLength === undefined) return failure("invalid_url");
  if (canonicalLength > PERSONAL_GUIDANCE_MAX_URL_LENGTH) return failure("url_too_long");

  if (YOUTUBE_HOSTS.has(hostname)) {
    const parsed = parseYouTubeReference(trimmed);
    if (!parsed.ok) return youtubeFailure(parsed.code);
    if (parsed.kind === "id") return failure("youtube_invalid");

    const videoId = parsed.videoId;
    return {
      ok: true,
      link: Object.freeze({
        kind: "youtube",
        canonicalUrl: `https://www.youtube.com/watch?v=${videoId}`,
        videoId,
        embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}`,
      }),
    };
  }

  return {
    ok: true,
    link: Object.freeze({ kind: "external", canonicalUrl }),
  };
}

export function validatePersonalGuidanceLink(
  input: unknown,
): PersonalGuidanceLinkValidationResult {
  return parsePersonalGuidanceLink(input);
}

export function normalizePersonalGuidanceLink(input: unknown): PersonalGuidanceLink {
  const result = parsePersonalGuidanceLink(input);
  if (!result.ok) throw new PersonalGuidanceValidationError(result.code, result.message);
  return result.link;
}

function personalGuidanceKey(link: PersonalGuidanceLink): string {
  return link.kind === "youtube"
    ? `youtube:${link.videoId}`
    : `external:${link.canonicalUrl}`;
}

export function validatePersonalGuidanceLinks(
  input: unknown,
): PersonalGuidanceValidationResult {
  if (!Array.isArray(input)) return failure("invalid_input");
  if (input.length > PERSONAL_GUIDANCE_MAX_LINKS) return failure("too_many_links");

  const links: PersonalGuidanceLink[] = [];
  const seen = new Set<string>();
  for (const value of input) {
    const result = parsePersonalGuidanceLink(value);
    if (!result.ok) return result;
    const key = personalGuidanceKey(result.link);
    if (seen.has(key)) continue;
    seen.add(key);
    links.push(result.link);
  }

  return Object.freeze({ ok: true, links: Object.freeze(links) });
}

export function normalizePersonalGuidanceLinks(
  input: unknown,
): NormalizedPersonalGuidance {
  const result = validatePersonalGuidanceLinks(input);
  if (!result.ok) throw new PersonalGuidanceValidationError(result.code, result.message);
  return result.links;
}

export const validatePersonalGuidanceUrls = validatePersonalGuidanceLinks;
export const normalizePersonalGuidanceUrls = normalizePersonalGuidanceLinks;
export const normalizePersonalGuidance = normalizePersonalGuidanceLinks;
export const parsePersonalGuidanceUrl = parsePersonalGuidanceLink;
export const validatePersonalGuidanceUrl = validatePersonalGuidanceLink;
export const normalizePersonalGuidanceUrl = normalizePersonalGuidanceLink;
