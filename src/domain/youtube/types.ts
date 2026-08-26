export type YouTubeReferenceKind = "id" | "watch" | "short-link" | "embed";

export type YouTubeReferenceErrorCode =
  | "empty-reference"
  | "invalid-video-id"
  | "invalid-url"
  | "unsupported-protocol"
  | "unsupported-host"
  | "unsupported-path"
  | "missing-video-id"
  | "ambiguous-video-id"
  | "shorts-not-allowed";

export type YouTubeReferenceParseResult =
  | Readonly<{
      ok: true;
      videoId: string;
      kind: YouTubeReferenceKind;
    }>
  | Readonly<{
      ok: false;
      code: YouTubeReferenceErrorCode;
      message: string;
    }>;

export type CustomExerciseVideoErrorCode =
  | YouTubeReferenceErrorCode
  | "raw-video-id-not-allowed"
  | "duplicate-video-id"
  | "too-many-videos";

export type YouTubeCandidateSource = "relevance" | "viewCount";

export type YouTubeCandidate = Readonly<{
  videoId: string;
  url?: string;
  title: string;
  description?: string | undefined;
  channelTitle?: string | undefined;
  channelId?: string | undefined;
  duration?: string | number | undefined;
  durationSeconds?: number | undefined;
  privacyStatus?: "public" | "private" | "unlisted" | string | undefined;
  uploadStatus?: "processed" | "processing" | "failed" | "rejected" | string | undefined;
  available?: boolean | undefined;
  embeddable?: boolean | undefined;
  syndicated?: boolean | undefined;
  syndicationEvidence?: "search-filter" | "verified" | "unknown" | undefined;
  regionAvailable?: boolean | undefined;
  liveBroadcastContent?: "none" | "live" | "upcoming" | string | undefined;
  isLive?: boolean | undefined;
  isShort?: boolean | undefined;
  language?: string | undefined;
  defaultLanguage?: string | undefined;
  defaultAudioLanguage?: string | undefined;
  viewCount?: number | undefined;
  publishedAt?: string | undefined;
  searchSources?: readonly YouTubeCandidateSource[] | undefined;
  queryKeys?: readonly string[] | undefined;
  materialFingerprint?: string | undefined;
  nearDuplicateOf?: string | undefined;
  humanReview?: YouTubeHumanReview | undefined;
}>;

export type YouTubeCurationTarget = Readonly<{
  canonicalExerciseSlug: string;
  exerciseName: string;
  movementTerms?: readonly string[] | undefined;
  aliases?: readonly string[] | undefined;
  movement?: string | undefined;
  requiredEquipmentTerms?: readonly string[] | undefined;
  equipment?: string | undefined;
  disallowedEquipmentTerms?: readonly string[] | undefined;
}>;

export type YouTubeHumanReview = Readonly<{
  approved: boolean;
  reviewer?: string | undefined;
  reviewedAt?: string | undefined;
  fullWatchConfirmed: boolean;
  exactVariation: boolean;
  conciseInstruction: boolean;
  safeInstruction: boolean;
  addsMaterialValue?: boolean | undefined;
}>;

export type YouTubeRejectionCode =
  | "invalid-video-id"
  | "video-unavailable"
  | "private-video"
  | "unlisted-video"
  | "upload-not-processed"
  | "not-embeddable"
  | "not-syndicated"
  | "duration-missing"
  | "duration-too-short"
  | "duration-too-long"
  | "shorts-not-allowed"
  | "wrong-movement"
  | "wrong-equipment-variation"
  | "unsafe-or-misleading"
  | "disallowed-title-category"
  | "live-or-upcoming"
  | "non-english"
  | "region-unavailable"
  | "duplicate-video-id"
  | "near-duplicate"
  | "human-review-missing"
  | "human-review-rejected"
  | "not-fully-watched";

export type YouTubeCandidateDecision = Readonly<{
  eligible: boolean;
  rejectionCodes: readonly YouTubeRejectionCode[];
  durationSeconds: number | undefined;
  relevanceScore: number;
  normalizedVideoId: string | undefined;
}>;

export type RankedYouTubeCandidate = Readonly<{
  candidate: YouTubeCandidate;
  decision: YouTubeCandidateDecision;
}>;

export type RequiredVideoVariation = Readonly<{
  canonicalExerciseSlug: string;
  variationId: string;
}>;

export type CuratedVideoSeed = Readonly<{
  canonicalExerciseSlug: string;
  variationId: string;
  videoId: string;
  displayOrder: number;
  title: string;
  channelTitle: string;
  approvalState: "approved" | "pending" | "rejected";
  reviewer: string;
  reviewedAt: string;
  fullWatchConfirmed: boolean;
  replacementOf?: string | undefined;
  lastAvailabilityCheckAt?: string | undefined;
  /** View counts are ephemeral candidate metadata, never durable seed truth. */
  viewCount?: number | undefined;
}>;

export type SeedValidationErrorCode =
  | "required-video-count"
  | "unsupported-canonical-exercise"
  | "missing-required-variation"
  | "duplicate-required-variation"
  | "wrong-required-variation"
  | "wrong-variation"
  | "invalid-video-id"
  | "duplicate-video-id"
  | "invalid-display-order"
  | "duplicate-display-order"
  | "not-approved"
  | "missing-reviewer"
  | "missing-review-timestamp"
  | "not-fully-watched"
  | "missing-title"
  | "missing-channel"
  | "view-count-not-allowed";

export type SeedValidationError = Readonly<{
  code: SeedValidationErrorCode;
  message: string;
  canonicalExerciseSlug?: string;
  variationId?: string;
  videoId?: string;
}>;

export type SeedValidationResult = Readonly<{
  valid: boolean;
  errors: readonly SeedValidationError[];
}>;

export type CurationQueryOrder = "relevance" | "viewCount";

export type CurationQueryCheckpoint = Readonly<{
  queryKey: string;
  pageToken: string | null;
}>;

export type CurationReviewStatus = "pending" | "approved" | "rejected";

export type CurationCheckpoint = {
  schemaVersion: 3;
  updatedAt: string;
  completedQueries: CurationQueryCheckpoint[];
  pageTokens: Record<string, string | null>;
  queryPageCounts: Record<string, number>;
  hydratedVideoIds: string[];
  unavailableVideoIds: string[];
  hydratedCandidates: Record<string, YouTubeCandidate>;
  discoveredCandidates: Record<
    string,
    {
      target: YouTubeCurationTarget & RequiredVideoVariation;
      queryKeys: string[];
      item: YouTubeCandidate;
    }
  >;
  rejectionCodes: Record<string, YouTubeRejectionCode[]>;
  quota: {
    searchRequests: number;
    hydrateRequests: number;
    unitsEstimated: number;
  };
  reviewStatus: Record<string, CurationReviewStatus>;
  blockedReason?: string | undefined;
};

export type CurationRunBudget = Readonly<{
  maxQuotaUnits: number;
  maxSearchRequests: number;
  maxHydrateRequests: number;
  maxPagesPerQuery: number;
}>;

export type YouTubeSearchRequest = Readonly<{
  queryKey: string;
  query: string;
  order: CurationQueryOrder;
  pageToken?: string | undefined;
  maxResults?: number | undefined;
  regionCode?: string | undefined;
}>;

export type YouTubeSearchItem = Readonly<{
  videoId: string;
  title: string;
  description?: string | undefined;
  channelTitle?: string | undefined;
  channelId?: string | undefined;
  publishedAt?: string | undefined;
}>;

export type YouTubeSearchResponse = Readonly<{
  items: readonly YouTubeSearchItem[];
  nextPageToken?: string | undefined;
  quotaUnits?: number | undefined;
}>;

export type YouTubeHydrateResponse = Readonly<{
  items: readonly YouTubeCandidate[];
  quotaUnits?: number | undefined;
}>;

export type YouTubeDataApi = Readonly<{
  searchVideos(request: YouTubeSearchRequest): Promise<YouTubeSearchResponse>;
  hydrateVideos(videoIds: readonly string[], regionCode?: string): Promise<YouTubeHydrateResponse>;
}>;

export type CurationReportCandidate = Readonly<{
  videoId: string;
  target: RequiredVideoVariation;
  queryKeys: readonly string[];
  candidate: YouTubeCandidate;
  decision: YouTubeCandidateDecision;
  reviewStatus: CurationReviewStatus;
  rank?: number | undefined;
}>;

export type ProposedPairReason =
  | "fewer-than-two-eligible-candidates"
  | "materially-redundant-second";

export type ProposedVideoPair = Readonly<{
  target: RequiredVideoVariation;
  status: "ready-for-review" | "needs-second-candidate";
  videoIds: readonly string[];
  distinctChannels: boolean;
  reason?: ProposedPairReason | undefined;
}>;

export type CurationQuotaSummary = Readonly<{
  searchRequests: number;
  hydrateRequests: number;
  unitsEstimated: number;
  budget: CurationRunBudget;
}>;

export type CurationReport = Readonly<{
  generatedAt: string;
  status: "ready-for-review" | "blocked" | "quota-blocked" | "page-limit" | "complete";
  candidates: readonly CurationReportCandidate[];
  rankedEligibleCandidates?: readonly CurationReportCandidate[] | undefined;
  proposedPairs?: readonly ProposedVideoPair[] | undefined;
  quota?: CurationQuotaSummary | undefined;
  blockedReason?: string | undefined;
  nextPageTokens?: Readonly<Record<string, string | null>> | undefined;
}>;

export type ApprovedVideoReference = Readonly<{
  videoId: string;
  displayOrder: number;
}>;

export type RefreshVideoStatus =
  | "available"
  | "missing"
  | "private"
  | "restricted"
  | "not-embeddable"
  | "not-syndicated"
  | "unavailable";

export type RefreshVideoAssessment = Readonly<{
  videoId: string;
  displayOrder: number;
  status: RefreshVideoStatus;
  available: boolean;
}>;

export type RefreshPairAssessment = Readonly<{
  videos: readonly RefreshVideoAssessment[];
  fallbackVideoId: string | undefined;
  replacementRequired: boolean;
  proposal: Readonly<{
    action: "none" | "replacement-required";
    reason: string | undefined;
  }>;
}>;
