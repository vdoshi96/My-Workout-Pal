import process from "node:process";

import { DEFAULT_YOUTUBE_CURATION_STATE_DIR } from "../src/domain/youtube/curation.ts";
import { recordManualYouTubeReview } from "../src/domain/youtube/manual-review.ts";
import { normalizeYouTubeReference } from "../src/domain/youtube/normalization.ts";
import type {
  ManualYouTubeInstructionEvidence,
  ManualYouTubeReviewBlocker,
  ManualYouTubeReviewDecision,
  ManualYouTubeRejectionReason,
} from "../src/domain/youtube/types.ts";

function optionValue(args: readonly string[], name: string): string | undefined {
  const occurrences: Array<string | undefined> = [];
  const equalsPrefix = `${name}=`;
  args.forEach((argument, index) => {
    if (argument === name) {
      const following = args[index + 1];
      occurrences.push(following && !following.startsWith("--") ? following : undefined);
    } else if (argument.startsWith(equalsPrefix)) {
      occurrences.push(argument.slice(equalsPrefix.length));
    }
  });
  if (occurrences.length > 1) throw new Error(`youtube:review received duplicate ${name} values.`);
  return occurrences[0];
}

function requiredOption(args: readonly string[], name: string): string {
  const value = optionValue(args, name)?.trim();
  if (!value) throw new Error(`youtube:review requires ${name}.`);
  return value;
}

function decision(value: string): ManualYouTubeReviewDecision {
  if (value === "pending" || value === "approved" || value === "rejected") return value;
  throw new Error("youtube:review --decision must be pending, approved, or rejected.");
}

function rejectionReason(value: string | undefined): ManualYouTubeRejectionReason | undefined {
  if (value === undefined) return undefined;
  const allowed: readonly ManualYouTubeRejectionReason[] = [
    "wrong-movement",
    "wrong-equipment",
    "unsafe-instruction",
    "not-concise",
    "no-material-value",
    "unavailable",
    "non-english",
    "shorts-content",
    "other-policy-rejection",
  ];
  if (allowed.includes(value as ManualYouTubeRejectionReason)) return value as ManualYouTubeRejectionReason;
  throw new Error(`youtube:review --rejection-reason must be one of: ${allowed.join(", ")}.`);
}

function blockerReason(value: string | undefined): ManualYouTubeReviewBlocker | undefined {
  if (value === undefined) return undefined;
  const allowed: readonly ManualYouTubeReviewBlocker[] = [
    "review-in-progress",
    "playback-interrupted",
    "visual-evidence-unavailable",
    "audio-evidence-unavailable",
  ];
  if (allowed.includes(value as ManualYouTubeReviewBlocker)) return value as ManualYouTubeReviewBlocker;
  throw new Error(`youtube:review --blocker-reason must be one of: ${allowed.join(", ")}.`);
}

function instructionEvidence(value: string | undefined): ManualYouTubeInstructionEvidence | undefined {
  if (value === undefined) return undefined;
  if (value === "narration" || value === "captions" || value === "visual") return value;
  throw new Error("youtube:review --instruction-evidence must be narration, captions, or visual.");
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const stateDirectory = optionValue(args, "--state-dir")
    ?? process.env["YOUTUBE_CURATION_STATE_DIR"]
    ?? DEFAULT_YOUTUBE_CURATION_STATE_DIR;
  const reviewDecision = decision(requiredOption(args, "--decision"));
  const instructionBasis = instructionEvidence(optionValue(args, "--instruction-evidence"));
  const savedPath = await recordManualYouTubeReview({
    stateDirectory,
    replaceApproved: args.includes("--replace-approved"),
    review: {
      canonicalExerciseSlug: requiredOption(args, "--target"),
      variationId: requiredOption(args, "--variation"),
      videoId: normalizeYouTubeReference(requiredOption(args, "--video")),
      decision: reviewDecision,
      reviewer: requiredOption(args, "--reviewer"),
      ...(optionValue(args, "--reviewed-at") ? { reviewedAt: optionValue(args, "--reviewed-at") } : {}),
      ...(optionValue(args, "--playback-completed-at")
        ? { playbackCompletedAt: optionValue(args, "--playback-completed-at") }
        : {}),
      fullWatchConfirmed: args.includes("--full-watch-confirmed"),
      visualReviewConfirmed: args.includes("--visual-review-confirmed"),
      ...(instructionBasis ? { instructionEvidence: instructionBasis } : {}),
      exactVariation: args.includes("--exact-variation"),
      conciseInstruction: args.includes("--concise-instruction"),
      safeInstruction: args.includes("--safe-instruction"),
      addsMaterialValue: args.includes("--adds-material-value"),
      ...(rejectionReason(optionValue(args, "--rejection-reason"))
        ? { rejectionReason: rejectionReason(optionValue(args, "--rejection-reason")) }
        : {}),
      ...(blockerReason(optionValue(args, "--blocker-reason"))
        ? { blockerReason: blockerReason(optionValue(args, "--blocker-reason")) }
        : {}),
    },
  });
  console.log(`Manual YouTube review saved to ${savedPath}.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "youtube:review failed safely.");
  process.exitCode = 1;
});
