import { readFile } from "node:fs/promises";
import process from "node:process";

import {
  buildDefaultRequiredVideoVariations,
  validateCuratedVideoSeed,
} from "../src/domain/youtube/seed-validation.ts";
import type { CuratedVideoSeed, RequiredVideoVariation } from "../src/domain/youtube/types.ts";

function optionValue(args: readonly string[], name: string): string | undefined {
  const index = args.indexOf(name);
  const value = index >= 0 ? args[index + 1] : undefined;
  return value && !value.startsWith("--") ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const requiredPath = optionValue(args, "--required") ?? process.env["YOUTUBE_REQUIRED_VARIATIONS"];
  const seedPath = optionValue(args, "--seed") ?? process.env["YOUTUBE_SEED"];
  if (!seedPath) {
    console.error("seed:check requires --seed SEED.json; no production seed was created.");
    process.exitCode = 1;
    return;
  }

  const requiredPayload: unknown = requiredPath ? JSON.parse(await readFile(requiredPath, "utf8")) : undefined;
  const seedPayload: unknown = JSON.parse(await readFile(seedPath, "utf8"));
  const required = requiredPath
    ? Array.isArray(requiredPayload)
      ? requiredPayload
      : isRecord(requiredPayload) && Array.isArray(requiredPayload["requiredVariations"])
        ? requiredPayload["requiredVariations"]
        : undefined
    : buildDefaultRequiredVideoVariations();
  const rows = Array.isArray(seedPayload)
    ? seedPayload
    : isRecord(seedPayload) && Array.isArray(seedPayload["videos"])
      ? seedPayload["videos"]
      : undefined;
  if (!required || !rows) throw new Error("Seed manifests must contain arrays.");

  const result = validateCuratedVideoSeed(
    required as readonly RequiredVideoVariation[],
    rows as readonly CuratedVideoSeed[],
    { requireDefaultCatalogCoverage: true },
  );
  if (!result.valid) {
    console.error(`seed:check failed with ${result.errors.length} error(s).`);
    for (const error of result.errors) console.error(`${error.code}: ${error.message}`);
    process.exitCode = 1;
    return;
  }
  console.log(`seed:check passed: ${required.length} required variation(s) have exactly two approved videos.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "seed:check failed safely.");
  process.exitCode = 1;
});
