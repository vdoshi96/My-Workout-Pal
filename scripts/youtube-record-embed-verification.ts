import process from "node:process";

import { DEFAULT_YOUTUBE_CURATION_STATE_DIR } from "../src/domain/youtube/curation.ts";
import { recordYouTubeEmbedVerification } from "../src/domain/youtube/embed-verification.ts";

function optionValue(args: readonly string[], name: string): string | undefined {
  const index = args.indexOf(name);
  const value = index >= 0 ? args[index + 1] : undefined;
  return value && !value.startsWith("--") ? value : undefined;
}

function requiredOption(args: readonly string[], name: string): string {
  const value = optionValue(args, name)?.trim();
  if (!value) throw new Error(`youtube:record-embed-verification requires ${name}.`);
  return value;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const stateDirectory = optionValue(args, "--state-dir")
    ?? process.env["YOUTUBE_CURATION_STATE_DIR"]
    ?? DEFAULT_YOUTUBE_CURATION_STATE_DIR;
  const filePath = await recordYouTubeEmbedVerification({
    stateDirectory,
    verification: {
      canonicalExerciseSlug: requiredOption(args, "--target"),
      variationId: requiredOption(args, "--variation"),
      videoId: requiredOption(args, "--video"),
      verifier: requiredOption(args, "--verifier"),
      ...(optionValue(args, "--verified-at") ? { verifiedAt: optionValue(args, "--verified-at") } : {}),
      privacyEnhancedEmbedConfirmed: args.includes("--privacy-enhanced-embed-confirmed"),
      outsideYouTubePlaybackConfirmed: args.includes("--outside-youtube-playback-confirmed"),
      visibleControlsConfirmed: args.includes("--visible-controls-confirmed"),
      keyboardControlsConfirmed: args.includes("--keyboard-controls-confirmed"),
      directFallbackConfirmed: args.includes("--direct-fallback-confirmed"),
    },
  });
  console.log(`Private YouTube embed verification assertion recorded at ${filePath}.`);
  console.log("This recorder does not probe playback; retain separate localhost browser evidence.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "youtube:record-embed-verification failed safely.");
  process.exitCode = 1;
});
