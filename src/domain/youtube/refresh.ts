import { normalizeYouTubeVideoId } from "./normalization.ts";
import type {
  ApprovedVideoReference,
  RefreshPairAssessment,
  RefreshVideoAssessment,
  YouTubeCandidate,
} from "./types.ts";

type CandidateLookup = ReadonlyMap<string, YouTubeCandidate> | Readonly<Record<string, YouTubeCandidate>>;

function findCandidate(lookup: CandidateLookup, videoId: string): YouTubeCandidate | undefined {
  if (lookup instanceof Map) return lookup.get(videoId);
  return (lookup as Readonly<Record<string, YouTubeCandidate>>)[videoId];
}

function assessVideo(video: ApprovedVideoReference, lookup: CandidateLookup): RefreshVideoAssessment {
  let videoId: string;
  try {
    videoId = normalizeYouTubeVideoId(video.videoId);
  } catch {
    return { videoId: video.videoId, displayOrder: video.displayOrder, status: "missing", available: false };
  }

  const candidate = findCandidate(lookup, videoId);
  if (!candidate) return { videoId, displayOrder: video.displayOrder, status: "missing", available: false };
  if (candidate.privacyStatus === "private" || candidate.privacyStatus === "unlisted") {
    return { videoId, displayOrder: video.displayOrder, status: "private", available: false };
  }
  if (
    candidate.available === false
    || candidate.regionAvailable !== true
    || candidate.privacyStatus !== "public"
    || candidate.uploadStatus !== "processed"
  ) {
    return { videoId, displayOrder: video.displayOrder, status: "restricted", available: false };
  }
  if (candidate.embeddable !== true) {
    return { videoId, displayOrder: video.displayOrder, status: "not-embeddable", available: false };
  }
  if (candidate.syndicated !== true || (candidate.syndicationEvidence !== "search-filter" && candidate.syndicationEvidence !== "verified")) {
    return { videoId, displayOrder: video.displayOrder, status: "not-syndicated", available: false };
  }
  if (candidate.liveBroadcastContent === "live" || candidate.liveBroadcastContent === "upcoming") {
    return { videoId, displayOrder: video.displayOrder, status: "unavailable", available: false };
  }
  return { videoId, displayOrder: video.displayOrder, status: "available", available: true };
}

export function assessApprovedVideoPair(
  approvedVideos: readonly ApprovedVideoReference[],
  lookup: CandidateLookup,
): RefreshPairAssessment {
  const videos = approvedVideos.map((video) => assessVideo(video, lookup));
  const fallbackVideoId = videos.find((video) => video.available)?.videoId;
  const replacementRequired = videos.some((video) => !video.available);
  const unavailableStatuses = videos.filter((video) => !video.available).map((video) => video.status);
  return {
    videos,
    fallbackVideoId,
    replacementRequired,
    proposal: {
      action: replacementRequired ? "replacement-required" : "none",
      reason: replacementRequired ? `Unavailable approved video status: ${[...new Set(unavailableStatuses)].join(", ")}.` : undefined,
    },
  };
}

export const assessYouTubeRefresh = assessApprovedVideoPair;
