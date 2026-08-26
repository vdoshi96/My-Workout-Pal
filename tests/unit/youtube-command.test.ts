import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

import {
  createEmptyCurationCheckpoint,
  getYouTubeCandidateStateKey,
  saveCurationCheckpoint,
} from "@/domain/youtube/curation";
import { loadManualYouTubeReviews } from "@/domain/youtube/manual-review";

const execFileAsync = promisify(execFile);
const reviewScript = new URL("../../scripts/youtube-review.ts", import.meta.url);
const leadingHyphenVideoId = "-Zz7dDRkcOQ";

async function seedLeadingHyphenCandidate(directory: string): Promise<void> {
  const checkpoint = createEmptyCurationCheckpoint();
  const target = {
    canonicalExerciseSlug: "bulgarian-split-squat",
    variationId: "canonical",
    exerciseName: "Bulgarian split squat",
    requiredEquipmentTerms: ["dumbbell"],
  } as const;
  const key = getYouTubeCandidateStateKey(
    target.canonicalExerciseSlug,
    target.variationId,
    leadingHyphenVideoId,
  );
  const item = {
    videoId: leadingHyphenVideoId,
    url: `https://www.youtube.com/watch?v=${leadingHyphenVideoId}`,
    title: "Explosive Bulgarian split squat",
    duration: "PT45S",
    privacyStatus: "public" as const,
    uploadStatus: "processed" as const,
    embeddable: true,
    regionAvailable: true,
    liveBroadcastContent: "none" as const,
  };
  checkpoint.discoveredCandidates[key] = {
    target,
    queryKeys: ["bulgarian-split-squat:canonical:relevance:0"],
    item,
  };
  checkpoint.hydratedVideoIds.push(leadingHyphenVideoId);
  checkpoint.hydratedCandidates[leadingHyphenVideoId] = item;
  await saveCurationCheckpoint(directory, checkpoint);
}

describe("YouTube curation command", () => {
  it("loads the ignored local environment file before starting curation", async () => {
    const packageJson = JSON.parse(
      await readFile(new URL("../../package.json", import.meta.url), "utf8"),
    ) as { scripts?: Record<string, string> };

    expect(packageJson.scripts?.["youtube:curate"]).toBe(
      "node --env-file-if-exists=.env.local --import tsx scripts/youtube-curate.ts",
    );
    expect(packageJson.scripts?.["youtube:import-browser"]).toBe(
      "node --env-file-if-exists=.env.local --import tsx scripts/youtube-import-browser.ts",
    );
    expect(packageJson.scripts?.["youtube:probe-embed"]).toBe(
      "node --import tsx scripts/youtube-probe-embed.ts",
    );
    expect(packageJson.scripts?.["youtube:record-embed-verification"]).toBe(
      "node --import tsx scripts/youtube-record-embed-verification.ts",
    );
  });

  it.each([
    ["a leading-hyphen raw ID", `--video=${leadingHyphenVideoId}`],
    ["a supported watch URL", `--video=https://www.youtube.com/watch?v=${leadingHyphenVideoId}`],
  ])("records a normalized candidate from %s", async (_label, videoArgument) => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "mwp-youtube-review-command-"));
    try {
      await seedLeadingHyphenCandidate(directory);
      await execFileAsync(process.execPath, [
        "--import",
        "tsx",
        reviewScript.pathname,
        "--state-dir",
        directory,
        "--target",
        "bulgarian-split-squat",
        "--variation",
        "canonical",
        videoArgument,
        "--decision",
        "rejected",
        "--reviewer",
        "Codex GPT-5.6 Sol",
        "--rejection-reason",
        "wrong-movement",
      ]);

      const key = getYouTubeCandidateStateKey(
        "bulgarian-split-squat",
        "canonical",
        leadingHyphenVideoId,
      );
      expect((await loadManualYouTubeReviews(directory)).reviews[key]).toMatchObject({
        videoId: leadingHyphenVideoId,
        decision: "rejected",
        rejectionReason: "wrong-movement",
      });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
