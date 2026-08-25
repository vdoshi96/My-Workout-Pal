import { normalizeYouTubeReference } from "./normalization.ts";
import { YOUTUBE_VIDEO_ID_PATTERN } from "./normalization.ts";
import type {
  RankedYouTubeCandidate,
  YouTubeCandidate,
  YouTubeCandidateDecision,
  YouTubeCurationTarget,
  YouTubeHumanReview,
  YouTubeRejectionCode,
} from "./types.ts";

export const MIN_YOUTUBE_DURATION_SECONDS = 30;
export const MAX_YOUTUBE_DURATION_SECONDS = 6 * 60;

const EQUIPMENT_MARKERS = [
  "dumbbell",
  "dumbbells",
  "barbell",
  "barbells",
  "kettlebell",
  "kettlebells",
  "cable",
  "cables",
  "machine",
  "machines",
  "resistance band",
  "resistance bands",
  "band",
  "bands",
  "smith machine",
  "bodyweight",
  "body weight",
  "no equipment",
] as const;

const DISALLOWED_EQUIPMENT_MARKERS = [
  "barbell",
  "barbells",
  "dumbbell",
  "dumbbells",
  "kettlebell",
  "kettlebells",
  "cable",
  "cables",
  "machine",
  "machines",
  "resistance band",
  "resistance bands",
  "band",
  "bands",
  "smith machine",
  "bodyweight",
  "body weight",
  "no equipment",
] as const;

const DISALLOWED_TITLE_PATTERNS: readonly RegExp[] = [
  /\b(?:mistake|mistakes|wrong|fail|fails|failure|dangerous|unsafe)\b/i,
  /\b(?:challenge|reaction|reacts?|podcast|interview|follow[ -]?along|routine|compilation|discussion|lecture)\b/i,
  /\b(?:top|best|ranking|ranked|listicle)\s+\d+/i,
  /\b(?:clickbait|shocking|guaranteed|cure|fix your pain|medical claim)\b/i,
  /#?shorts?\b/i,
];

const UNSAFE_OR_MISLEADING_PATTERNS: readonly RegExp[] = [
  /\b(?:cure|heal|treat|diagnos|guaranteed|instant|pain[- ]?free|pain relief|injury[- ]?proof|medical)\b/i,
  /\b(?:dangerous|unsafe|do this wrong|avoid this mistake)\b/i,
];

const EQUIPMENT_WORDS = new Set(EQUIPMENT_MARKERS.flatMap((marker) => marker.split(" ")));

function normalizeSearchText(value: string): string {
  return value
    .toLocaleLowerCase("en-US")
    .replaceAll("&", " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function phraseVariants(value: string): readonly string[] {
  const normalized = normalizeSearchText(value);
  if (!normalized) return [];
  const words = normalized.split(" ");
  const withoutEquipment = words.filter((word) => !EQUIPMENT_WORDS.has(word)).join(" ").trim();
  return withoutEquipment && withoutEquipment !== normalized
    ? [normalized, withoutEquipment]
    : [normalized];
}

function targetMovementTerms(target: YouTubeCurationTarget): readonly string[] {
  const values = [
    target.exerciseName,
    target.movement,
    ...(target.movementTerms ?? []),
    ...(target.aliases ?? []),
  ].filter((value): value is string => Boolean(value?.trim()));
  const terms = values.flatMap(phraseVariants);
  return [...new Set(terms)];
}

function targetEquipmentTerms(target: YouTubeCurationTarget): readonly string[] {
  const explicit = target.requiredEquipmentTerms ?? (target.equipment ? [target.equipment] : []);
  const inferred = target.exerciseName
    .split(/[^a-zA-Z]+/)
    .map((word) => word.toLocaleLowerCase("en-US"))
    .filter((word) => ["dumbbell", "dumbbells", "barbell", "barbells", "kettlebell", "kettlebells", "bodyweight"].includes(word));
  return [...new Set([...explicit, ...inferred].map(normalizeSearchText).filter(Boolean))];
}

function equipmentMatches(text: string, term: string): boolean {
  const normalizedTerm = normalizeSearchText(term);
  if (normalizedTerm === "dumbbells") return text.includes("dumbbell");
  if (normalizedTerm === "barbells") return text.includes("barbell");
  if (normalizedTerm === "kettlebells") return text.includes("kettlebell");
  if (normalizedTerm === "body weight") return text.includes("bodyweight") || text.includes("body weight");
  return text.includes(normalizedTerm);
}

function opposingEquipmentTerms(required: readonly string[], target: YouTubeCurationTarget): readonly string[] {
  const explicit = target.disallowedEquipmentTerms ?? [];
  if (explicit.length > 0) return explicit.map(normalizeSearchText);

  const requiredText = required.join(" ");
  if (required.some((term) => term.includes("dumbbell"))) {
    return DISALLOWED_EQUIPMENT_MARKERS.filter((term) => !term.includes("dumbbell"));
  }
  if (required.some((term) => term.includes("barbell"))) {
    return DISALLOWED_EQUIPMENT_MARKERS.filter((term) => !term.includes("barbell"));
  }
  if (required.some((term) => term.includes("bodyweight") || term.includes("body weight"))) {
    return DISALLOWED_EQUIPMENT_MARKERS.filter(
      (term) => !term.includes("bodyweight") && !term.includes("body weight") && !term.includes("no equipment"),
    );
  }
  return requiredText ? [] : [];
}

export function parseYouTubeDuration(value: string): number | undefined {
  const match = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/.exec(value);
  if (!match || (!match[1] && !match[2] && !match[3] && !match[4])) return undefined;

  const days = Number(match[1] ?? 0);
  const hours = Number(match[2] ?? 0);
  const minutes = Number(match[3] ?? 0);
  const seconds = Number(match[4] ?? 0);
  const total = days * 86_400 + hours * 3_600 + minutes * 60 + seconds;
  return Number.isFinite(total) ? total : undefined;
}

function candidateDuration(candidate: YouTubeCandidate): number | undefined {
  if (typeof candidate.durationSeconds === "number") {
    return Number.isFinite(candidate.durationSeconds) ? candidate.durationSeconds : undefined;
  }
  if (typeof candidate.duration === "number") {
    return Number.isFinite(candidate.duration) ? candidate.duration : undefined;
  }
  if (typeof candidate.duration === "string") return parseYouTubeDuration(candidate.duration);
  return undefined;
}

function reviewRejectionCodes(review: YouTubeHumanReview | undefined): YouTubeRejectionCode[] {
  if (!review) return ["human-review-missing"];
  const failures: YouTubeRejectionCode[] = [];
  if (!review.approved || !review.exactVariation || !review.conciseInstruction || !review.safeInstruction) {
    failures.push("human-review-rejected");
  }
  if (!review.fullWatchConfirmed) failures.push("not-fully-watched");
  return failures;
}

function baseDecision(candidate: YouTubeCandidate, target: YouTubeCurationTarget): {
  normalizedVideoId: string | undefined;
  durationSeconds: number | undefined;
  relevanceScore: number;
  rejectionCodes: YouTubeRejectionCode[];
} {
  const rejectionCodes: YouTubeRejectionCode[] = [];
  let normalizedVideoId: string | undefined;
  try {
    normalizedVideoId = normalizeYouTubeReference(candidate.videoId);
  } catch {
    rejectionCodes.push("invalid-video-id");
  }
  if (normalizedVideoId && !YOUTUBE_VIDEO_ID_PATTERN.test(normalizedVideoId)) {
    rejectionCodes.push("invalid-video-id");
  }

  if (candidate.url) {
    try {
      const urlVideoId = normalizeYouTubeReference(candidate.url);
      if (normalizedVideoId && urlVideoId !== normalizedVideoId) rejectionCodes.push("invalid-video-id");
    } catch (error) {
      if (error instanceof Error && error.message.toLocaleLowerCase("en-US").includes("shorts")) {
        rejectionCodes.push("shorts-not-allowed");
      } else {
        rejectionCodes.push("invalid-video-id");
      }
    }
  }

  const text = normalizeSearchText(
    [candidate.title, candidate.description ?? "", candidate.channelTitle ?? ""].join(" "),
  );
  const titleAndDescription = normalizeSearchText([candidate.title, candidate.description ?? ""].join(" "));
  const movementTerms = targetMovementTerms(target);
  const movementMatches = movementTerms.filter((term) => titleAndDescription.includes(term));
  const requiredEquipment = targetEquipmentTerms(target);
  const hasRequiredEquipment = requiredEquipment.length === 0 || requiredEquipment.some((term) => equipmentMatches(titleAndDescription, term));
  const opposingEquipment = opposingEquipmentTerms(requiredEquipment, target);
  const hasOpposingEquipment = opposingEquipment.some((term) => equipmentMatches(text, term));

  if (movementTerms.length > 0 && movementMatches.length === 0) rejectionCodes.push("wrong-movement");
  if (requiredEquipment.length > 0 && (!hasRequiredEquipment || hasOpposingEquipment)) {
    rejectionCodes.push("wrong-equipment-variation");
  }

  const durationSeconds = candidateDuration(candidate);
  if (durationSeconds === undefined) rejectionCodes.push("duration-missing");
  else if (durationSeconds < MIN_YOUTUBE_DURATION_SECONDS) rejectionCodes.push("duration-too-short");
  else if (durationSeconds > MAX_YOUTUBE_DURATION_SECONDS) rejectionCodes.push("duration-too-long");

  const privacyStatus = candidate.privacyStatus?.toLocaleLowerCase("en-US");
  const unavailable = candidate.available === false;
  if (unavailable) rejectionCodes.push("video-unavailable");
  if (candidate.regionAvailable === false || (!unavailable && candidate.regionAvailable !== true)) {
    rejectionCodes.push("region-unavailable");
  }
  if (privacyStatus === "private") rejectionCodes.push("private-video");
  else if (privacyStatus === "unlisted") rejectionCodes.push("unlisted-video");
  else if (privacyStatus !== undefined && privacyStatus !== "public") rejectionCodes.push("video-unavailable");
  else if (!unavailable && privacyStatus !== "public") rejectionCodes.push("video-unavailable");
  if (candidate.uploadStatus !== undefined && candidate.uploadStatus !== "processed") rejectionCodes.push("upload-not-processed");
  else if (!unavailable && candidate.uploadStatus !== "processed") rejectionCodes.push("upload-not-processed");
  if (candidate.embeddable === false || (!unavailable && candidate.embeddable !== true)) rejectionCodes.push("not-embeddable");
  if (candidate.syndicated === false || (!unavailable && candidate.syndicated !== true)) rejectionCodes.push("not-syndicated");
  if (candidate.isLive || candidate.liveBroadcastContent === "live" || candidate.liveBroadcastContent === "upcoming") {
    rejectionCodes.push("live-or-upcoming");
  }

  const language = candidate.language ?? candidate.defaultAudioLanguage ?? candidate.defaultLanguage;
  if (language && !language.toLocaleLowerCase("en-US").startsWith("en")) rejectionCodes.push("non-english");
  if (candidate.isShort || /(?:^|[\s/])#?shorts?(?:$|[\s/])/i.test(text)) {
    rejectionCodes.push("shorts-not-allowed");
  }
  if (candidate.nearDuplicateOf) rejectionCodes.push("near-duplicate");
  if (DISALLOWED_TITLE_PATTERNS.some((pattern) => pattern.test(text))) {
    rejectionCodes.push("disallowed-title-category");
  }
  if (UNSAFE_OR_MISLEADING_PATTERNS.some((pattern) => pattern.test(text))) {
    rejectionCodes.push("unsafe-or-misleading");
  }

  const relevanceScore =
    movementMatches.length * 10 +
    (movementTerms.some((term) => normalizeSearchText(candidate.title).includes(term)) ? 5 : 0) +
    (requiredEquipment.some((term) => equipmentMatches(normalizeSearchText(candidate.title), term)) ? 4 : 0) +
    (candidate.description && movementMatches.some((term) => normalizeSearchText(candidate.description ?? "").includes(term))
      ? 1
      : 0);

  return {
    normalizedVideoId,
    durationSeconds,
    relevanceScore,
    rejectionCodes: [...new Set(rejectionCodes)],
  };
}

export function evaluateYouTubeCandidate(
  candidate: YouTubeCandidate,
  target: YouTubeCurationTarget,
  options: Readonly<{ requireHumanReview?: boolean }> = {},
): YouTubeCandidateDecision {
  const base = baseDecision(candidate, target);
  if (options.requireHumanReview) base.rejectionCodes.push(...reviewRejectionCodes(candidate.humanReview));

  return {
    eligible: base.rejectionCodes.length === 0,
    rejectionCodes: [...new Set(base.rejectionCodes)],
    durationSeconds: base.durationSeconds,
    relevanceScore: base.relevanceScore,
    normalizedVideoId: base.normalizedVideoId,
  };
}

export const checkYouTubeCandidateEligibility = evaluateYouTubeCandidate;
export const checkCandidateEligibility = evaluateYouTubeCandidate;

export function rankEligibleCandidates(
  candidates: readonly YouTubeCandidate[],
  target: YouTubeCurationTarget,
  options: Readonly<{ requireHumanReview?: boolean }> = {},
): readonly RankedYouTubeCandidate[] {
  const ranked = candidates.flatMap((candidate): RankedYouTubeCandidate[] => {
    const decision = evaluateYouTubeCandidate(candidate, target, options);
    return decision.eligible ? [{ candidate, decision }] : [];
  }).sort((left, right) => {
    if (right.decision.relevanceScore !== left.decision.relevanceScore) {
      return right.decision.relevanceScore - left.decision.relevanceScore;
    }
    const leftViews = Number.isFinite(left.candidate.viewCount) ? left.candidate.viewCount ?? 0 : 0;
    const rightViews = Number.isFinite(right.candidate.viewCount) ? right.candidate.viewCount ?? 0 : 0;
    if (rightViews !== leftViews) return rightViews - leftViews;
    return (left.decision.normalizedVideoId ?? "").localeCompare(right.decision.normalizedVideoId ?? "");
  });

  const seenIds = new Set<string>();
  const seenFingerprints = new Set<string>();
  return ranked.filter((item) => {
    const normalizedId = item.decision.normalizedVideoId;
    if (normalizedId && seenIds.has(normalizedId)) return false;
    if (normalizedId) seenIds.add(normalizedId);
    const fingerprint = item.candidate.materialFingerprint;
    if (fingerprint && seenFingerprints.has(fingerprint)) return false;
    if (fingerprint) seenFingerprints.add(fingerprint);
    return true;
  });
}

export const rankYouTubeCandidates = rankEligibleCandidates;
export const rankCandidates = rankEligibleCandidates;
