import { normalizeYouTubeVideoId } from "@/domain/youtube/normalization";
import type { CuratedVideoSeed } from "@/domain/youtube/types";

export type CuratedVideoPair = readonly [CuratedVideoSeed, CuratedVideoSeed];

export function buildYouTubeEmbedUrl(videoId: string): string {
  const normalizedVideoId = normalizeYouTubeVideoId(videoId);
  const url = new URL(
    `/embed/${normalizedVideoId}`,
    "https://www.youtube-nocookie.com",
  );
  url.searchParams.set("autoplay", "0");
  url.searchParams.set("controls", "1");
  url.searchParams.set("playsinline", "1");
  url.searchParams.set("rel", "0");
  return url.toString();
}

export function buildYouTubeWatchUrl(videoId: string): string {
  const normalizedVideoId = normalizeYouTubeVideoId(videoId);
  const url = new URL("https://www.youtube.com/watch");
  url.searchParams.set("v", normalizedVideoId);
  return url.toString();
}

export function createCuratedVideoPair(
  videos: readonly CuratedVideoSeed[],
): CuratedVideoPair {
  if (videos.length !== 2) {
    throw new Error("A curated exercise variation needs exactly two videos.");
  }

  const [firstInput, secondInput] = videos;
  if (!firstInput || !secondInput) {
    throw new Error("A curated exercise variation needs exactly two videos.");
  }

  const variationKey = `${firstInput.canonicalExerciseSlug}::${firstInput.variationId}`;
  if (
    `${secondInput.canonicalExerciseSlug}::${secondInput.variationId}` !==
    variationKey
  ) {
    throw new Error("Both curated videos must belong to the same variation.");
  }

  const normalizedIds = videos.map(({ videoId }) =>
    normalizeYouTubeVideoId(videoId),
  );
  if (new Set(normalizedIds).size !== 2) {
    throw new Error("A curated pair cannot contain a duplicate video ID.");
  }

  for (const video of videos) {
    if (video.approvalState !== "approved") {
      throw new Error("Every curated video must be approved.");
    }
    if (!video.fullWatchConfirmed) {
      throw new Error("Every curated video must be watched in full.");
    }
    if (!video.reviewer.trim() || Number.isNaN(Date.parse(video.reviewedAt))) {
      throw new Error("Every curated video needs durable review metadata.");
    }
    if (!video.title.trim() || !video.channelTitle.trim()) {
      throw new Error("Every curated video needs title and channel attribution.");
    }
    if (video.displayOrder !== 1 && video.displayOrder !== 2) {
      throw new Error("Curated videos must use display order one and two.");
    }
  }

  const ordered = videos
    .map((video, index) => ({
      ...video,
      videoId: normalizedIds[index]!,
    }))
    .sort((left, right) => left.displayOrder - right.displayOrder);
  if (ordered[0]?.displayOrder !== 1 || ordered[1]?.displayOrder !== 2) {
    throw new Error("Curated videos must use display order one and two.");
  }

  return Object.freeze([
    Object.freeze(ordered[0]),
    Object.freeze(ordered[1]),
  ]) as CuratedVideoPair;
}
