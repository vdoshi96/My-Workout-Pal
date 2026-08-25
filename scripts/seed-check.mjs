import { readFile } from "node:fs/promises";
import process from "node:process";

const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

function optionValue(args, name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function key(row) {
  return `${row.canonicalExerciseSlug}::${row.variationId}`;
}

function add(errors, code, message, row = {}) {
  errors.push({
    code,
    message,
    ...(row.canonicalExerciseSlug ? { canonicalExerciseSlug: row.canonicalExerciseSlug } : {}),
    ...(row.variationId ? { variationId: row.variationId } : {}),
    ...(row.videoId ? { videoId: row.videoId } : {}),
  });
}

function validate(required, rows, supported) {
  const errors = [];
  const requiredKeys = new Set(required.map(key));
  const rowsByKey = new Map();
  const supportedSlugs = new Set(supported ?? required.map((item) => item.canonicalExerciseSlug));

  for (const requiredVariation of required) {
    if (!supportedSlugs.has(requiredVariation.canonicalExerciseSlug)) add(errors, "unsupported-canonical-exercise", "A required mapping references an unsupported canonical exercise.", requiredVariation);
  }

  for (const row of rows) {
    if (!supportedSlugs.has(row.canonicalExerciseSlug)) add(errors, "unsupported-canonical-exercise", "The seed references an unsupported canonical exercise.", row);
    if (!requiredKeys.has(key(row))) add(errors, "wrong-variation", "The seed row does not match a required canonical variation.", row);
    if (typeof row.videoId !== "string" || !VIDEO_ID_PATTERN.test(row.videoId)) add(errors, "invalid-video-id", "The seed contains an invalid YouTube video ID.", row);
    if (row.displayOrder !== 1 && row.displayOrder !== 2) add(errors, "invalid-display-order", "A curated variation must use display order one or two.", row);
    if (row.approvalState !== "approved") add(errors, "not-approved", "Every seeded video must be approved.", row);
    if (typeof row.reviewer !== "string" || !row.reviewer.trim()) add(errors, "missing-reviewer", "Every approved seeded video must name its reviewer.", row);
    if (typeof row.reviewedAt !== "string" || !row.reviewedAt.trim() || Number.isNaN(Date.parse(row.reviewedAt))) add(errors, "missing-review-timestamp", "Every approved seeded video must have a valid review timestamp.", row);
    if (row.fullWatchConfirmed !== true) add(errors, "not-fully-watched", "Every seeded video must have a complete-watch confirmation.", row);
    if (typeof row.title !== "string" || !row.title.trim()) add(errors, "missing-title", "Every seeded video must preserve its reviewed title.", row);
    if (typeof row.channelTitle !== "string" || !row.channelTitle.trim()) add(errors, "missing-channel", "Every seeded video must preserve its reviewed channel attribution.", row);
    if (Object.prototype.hasOwnProperty.call(row, "viewCount")) add(errors, "view-count-not-allowed", "View counts cannot be stored in production seed truth.", row);
    const rowKey = key(row);
    const group = rowsByKey.get(rowKey) ?? [];
    group.push(row);
    rowsByKey.set(rowKey, group);
  }

  for (const requiredVariation of required) {
    const group = rowsByKey.get(key(requiredVariation)) ?? [];
    if (group.length !== 2) add(errors, "required-video-count", `The ${key(requiredVariation)} variation must contain exactly two videos.`, requiredVariation);
    const ids = new Set();
    const orders = new Set();
    for (const row of group) {
      if (ids.has(row.videoId)) add(errors, "duplicate-video-id", "A variation cannot reuse a video ID.", row);
      ids.add(row.videoId);
      if (orders.has(row.displayOrder)) add(errors, "duplicate-display-order", "A variation cannot reuse a display order.", row);
      orders.add(row.displayOrder);
    }
  }
  return errors;
}

async function main() {
  const args = process.argv.slice(2);
  const requiredPath = optionValue(args, "--required") ?? process.env.YOUTUBE_REQUIRED_VARIATIONS;
  const seedPath = optionValue(args, "--seed") ?? process.env.YOUTUBE_SEED;
  if (!requiredPath || !seedPath) {
    console.error("seed:check requires --required REQUIRED.json and --seed SEED.json; no production seed was created.");
    process.exitCode = 1;
    return;
  }

  const requiredPayload = JSON.parse(await readFile(requiredPath, "utf8"));
  const seedPayload = JSON.parse(await readFile(seedPath, "utf8"));
  const required = Array.isArray(requiredPayload) ? requiredPayload : requiredPayload.requiredVariations;
  const rows = Array.isArray(seedPayload) ? seedPayload : seedPayload.videos;
  const supported = requiredPayload.supportedCanonicalExerciseSlugs;
  if (!Array.isArray(required) || !Array.isArray(rows)) throw new Error("Seed manifests must contain arrays.");
  const errors = validate(required, rows, supported);
  if (errors.length > 0) {
    console.error(`seed:check failed with ${errors.length} error(s).`);
    for (const error of errors) console.error(`${error.code}: ${error.message}`);
    process.exitCode = 1;
    return;
  }
  console.log(`seed:check passed: ${required.length} required variation(s) have exactly two approved videos.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "seed:check failed safely.");
  process.exitCode = 1;
});
