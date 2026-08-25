import type {
  CustomExerciseVideoErrorCode,
  YouTubeReferenceErrorCode,
  YouTubeReferenceParseResult,
} from "@/domain/youtube/types";

export const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

const YOUTUBE_WATCH_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com"]);
const YOUTUBE_SHORT_HOSTS = new Set(["youtu.be", "www.youtu.be"]);
const YOUTUBE_EMBED_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);

export class YouTubeReferenceError extends Error {
  readonly code: YouTubeReferenceErrorCode | CustomExerciseVideoErrorCode;

  constructor(code: YouTubeReferenceErrorCode | CustomExerciseVideoErrorCode, message: string) {
    super(message);
    this.name = "YouTubeReferenceError";
    this.code = code;
  }
}

function failure(
  code: YouTubeReferenceErrorCode,
  message: string,
): YouTubeReferenceParseResult {
  return { ok: false, code, message };
}

function normalizeRawVideoId(input: string): YouTubeReferenceParseResult {
  if (!YOUTUBE_VIDEO_ID_PATTERN.test(input)) {
    return failure("invalid-video-id", "YouTube video ID must contain exactly 11 URL-safe characters.");
  }

  return { ok: true, videoId: input, kind: "id" };
}

function parsePathVideoId(pathname: string, kind: "short-link" | "embed"): YouTubeReferenceParseResult {
  const segments = pathname.split("/").filter(Boolean);
  const videoId = segments.at(-1);

  if (segments[0]?.toLowerCase() === "shorts") {
    return failure("shorts-not-allowed", "YouTube shorts references are not allowed.");
  }
  if (!videoId || segments.length !== 1) {
    return failure("missing-video-id", "The YouTube URL does not contain one video ID.");
  }

  const parsed = normalizeRawVideoId(videoId);
  return parsed.ok ? { ...parsed, kind } : parsed;
}

export function parseYouTubeReference(input: string): YouTubeReferenceParseResult {
  const trimmed = input.trim();
  if (!trimmed) return failure("empty-reference", "A YouTube reference is required.");

  if (YOUTUBE_VIDEO_ID_PATTERN.test(trimmed)) return normalizeRawVideoId(trimmed);

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return failure("invalid-url", "The YouTube reference is not a valid URL.");
  }

  if (url.protocol !== "https:") {
    return failure("unsupported-protocol", "YouTube references must use HTTPS.");
  }
  if (url.username || url.password || url.port) {
    return failure("unsupported-host", "The YouTube URL cannot contain credentials or a port.");
  }

  const host = url.hostname.toLowerCase();
  const pathname = url.pathname.replace(/\/+/g, "/");
  if (YOUTUBE_SHORT_HOSTS.has(host)) return parsePathVideoId(pathname, "short-link");

  if (!YOUTUBE_WATCH_HOSTS.has(host) && !YOUTUBE_EMBED_HOSTS.has(host)) {
    return failure("unsupported-host", "Only approved YouTube hosts are supported.");
  }

  if (pathname.toLowerCase().startsWith("/shorts/")) {
    return failure("shorts-not-allowed", "YouTube shorts references are not allowed.");
  }

  if (pathname.toLowerCase() === "/watch" && YOUTUBE_WATCH_HOSTS.has(host)) {
    const ids = url.searchParams.getAll("v");
    if (ids.length === 0 || !ids[0]) {
      return failure("missing-video-id", "A YouTube watch URL must include a video ID.");
    }
    if (ids.length !== 1) {
      return failure("ambiguous-video-id", "A YouTube watch URL must include exactly one video ID.");
    }
    const parsed = normalizeRawVideoId(ids[0]);
    return parsed.ok ? { ...parsed, kind: "watch" } : parsed;
  }

  if (pathname.toLowerCase().startsWith("/embed/") && YOUTUBE_EMBED_HOSTS.has(host)) {
    return parsePathVideoId(pathname.slice("/embed".length), "embed");
  }

  return failure("unsupported-path", "Only YouTube watch, short-link, and embed URLs are supported.");
}

export function normalizeYouTubeReference(input: string): string {
  const result = parseYouTubeReference(input);
  if (!result.ok) throw new YouTubeReferenceError(result.code, result.message);
  return result.videoId;
}

export function normalizeYouTubeVideoId(input: string): string {
  const result = normalizeRawVideoId(input.trim());
  if (!result.ok) throw new YouTubeReferenceError(result.code, result.message);
  return result.videoId;
}

export function normalizeYouTubeUrl(input: string): string {
  const result = parseYouTubeReference(input);
  if (!result.ok || result.kind === "id") {
    if (!result.ok) throw new YouTubeReferenceError(result.code, result.message);
    throw new YouTubeReferenceError("invalid-url", "A YouTube URL is required instead of a raw video ID.");
  }
  return result.videoId;
}

export const normalizeYouTubeVideoUrl = normalizeYouTubeUrl;

export function validateYouTubeReference(input: string): YouTubeReferenceParseResult {
  return parseYouTubeReference(input);
}

export function getYouTubeEmbedUrl(videoId: string): string {
  const normalized = normalizeYouTubeReference(videoId);
  return `https://www.youtube.com/embed/${normalized}`;
}

export function validateCustomExerciseVideoIds(
  inputs: readonly string[],
): Readonly<
  | { ok: true; videoIds: readonly string[] }
  | { ok: false; code: CustomExerciseVideoErrorCode; message: string }
> {
  if (!Array.isArray(inputs)) {
    return {
      ok: false,
      code: "invalid-url",
      message: "Custom exercise videos must be supplied as a list of YouTube references.",
    };
  }
  const uniqueIds: string[] = [];
  const seen = new Set<string>();

  for (const input of inputs) {
    const parsed = parseYouTubeReference(input);
    if (!parsed.ok) return parsed;
    if (seen.has(parsed.videoId)) continue;
    seen.add(parsed.videoId);
    uniqueIds.push(parsed.videoId);
  }

  if (uniqueIds.length > 2) {
    return {
      ok: false,
      code: "too-many-videos",
      message: "A custom exercise can contain at most two unique YouTube videos.",
    };
  }

  return { ok: true, videoIds: uniqueIds };
}

export function normalizeCustomExerciseVideoIds(inputs: readonly string[]): readonly string[] {
  const result = validateCustomExerciseVideoIds(inputs);
  if (!result.ok) throw new YouTubeReferenceError(result.code, result.message);
  return result.videoIds;
}

export const normalizeCustomExerciseVideos = normalizeCustomExerciseVideoIds;
