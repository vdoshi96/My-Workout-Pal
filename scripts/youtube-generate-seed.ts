import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { DEFAULT_YOUTUBE_CURATION_STATE_DIR } from "../src/domain/youtube/curation.ts";
import { buildCuratedVideoSeedManifestFromReport } from "../src/domain/youtube/seed-manifest.ts";

const DEFAULT_OUTPUT_PATH = "src/domain/youtube/curated-video-seed.json";

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
  if (occurrences.length > 1) {
    throw new Error(`youtube:generate-seed received duplicate ${name} values.`);
  }
  if (occurrences.length === 1 && !occurrences[0]?.trim()) {
    throw new Error(`youtube:generate-seed requires a value for ${name}.`);
  }
  return occurrences[0]?.trim();
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const reportPath = optionValue(args, "--report")
    ?? path.join(DEFAULT_YOUTUBE_CURATION_STATE_DIR, "review-report.json");
  const outputPath = optionValue(args, "--output") ?? DEFAULT_OUTPUT_PATH;
  const report: unknown = JSON.parse(await readFile(reportPath, "utf8"));
  const manifest = buildCuratedVideoSeedManifestFromReport(report);
  await mkdir(path.dirname(outputPath), { recursive: true });
  const temporaryPath = `${outputPath}.tmp-${process.pid}`;
  await writeFile(temporaryPath, `${JSON.stringify(manifest, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o644,
  });
  await rename(temporaryPath, outputPath);
  console.log(`Generated ${manifest.videos.length} approved video rows at ${outputPath}.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "youtube:generate-seed failed safely.");
  process.exitCode = 1;
});
