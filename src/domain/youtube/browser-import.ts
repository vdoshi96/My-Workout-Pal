import { readFile } from "node:fs/promises";

import {
  getBrowserYouTubeImportReceiptPath,
  loadBrowserYouTubeImportReceipt,
  mergeBrowserYouTubeImportReceipt,
  parseBrowserYouTubeCandidateArtifact,
  saveBrowserYouTubeImportReceipt,
  type BrowserYouTubeCandidateArtifact,
  type BrowserYouTubeImportReceipt,
} from "./browser-discovery.ts";
import {
  buildCurationQueries,
  getYouTubeCandidateStateKey,
  loadCurationCheckpoint,
  saveCurationCheckpoint,
} from "./curation.ts";
import type { RequiredVideoVariation, YouTubeCurationTarget } from "./types.ts";

export { loadBrowserYouTubeImportReceipt } from "./browser-discovery.ts";

type BrowserTarget = YouTubeCurationTarget & RequiredVideoVariation;

export async function importBrowserYouTubeCandidates(options: Readonly<{
  inputPath: string;
  stateDirectory: string;
  targets: readonly BrowserTarget[];
  now?: () => string;
  persistCheckpoint?: typeof saveCurationCheckpoint;
}>): Promise<Readonly<{
  checkpoint: Awaited<ReturnType<typeof loadCurationCheckpoint>>;
  receiptPath: string;
  summary: Readonly<{
    inputQueryRuns: number;
    importedQueryRuns: number;
    existingQueryRuns: number;
    inputObservations: number;
    importedObservations: number;
    existingObservations: number;
    newScopedCandidates: number;
  }>;
}>> {
  let artifact: BrowserYouTubeCandidateArtifact | undefined;
  try {
    const raw = await readFile(options.inputPath, "utf8");
    if (raw.trim()) {
      artifact = parseBrowserYouTubeCandidateArtifact({
        input: JSON.parse(raw) as unknown,
        targets: options.targets,
        expectedQueries: buildCurationQueries,
      });
    }
  } catch (error) {
    if (!(typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT")) throw error;
  }
  const timestamp = (options.now ?? (() => new Date().toISOString()))();
  const existingReceipt = await loadBrowserYouTubeImportReceipt(options.stateDirectory);
  const merged = artifact
    ? mergeBrowserYouTubeImportReceipt({ existing: existingReceipt, artifact, updatedAt: timestamp })
    : {
        receipt: existingReceipt,
        importedQueryRuns: 0,
        existingQueryRuns: 0,
        importedObservations: 0,
        existingObservations: 0,
      } satisfies Readonly<{
        receipt: BrowserYouTubeImportReceipt;
        importedQueryRuns: number;
        existingQueryRuns: number;
        importedObservations: number;
        existingObservations: number;
      }>;
  const checkpoint = await loadCurationCheckpoint(options.stateDirectory);
  const targetByKey = new Map(options.targets.map((target) => [
    `${target.canonicalExerciseSlug}::${target.variationId}`,
    target,
  ]));
  let newScopedCandidates = 0;
  for (const observation of Object.values(merged.receipt.observations)) {
    const target = targetByKey.get(`${observation.canonicalExerciseSlug}::${observation.variationId}`);
    if (!target) throw new Error("Validated browser YouTube candidate lost its target mapping.");
    const key = getYouTubeCandidateStateKey(
      observation.canonicalExerciseSlug,
      observation.variationId,
      observation.videoId,
    );
    if (checkpoint.discoveredCandidates[key]) continue;
    checkpoint.discoveredCandidates[key] = {
      target,
      queryKeys: [],
      item: {
        videoId: observation.videoId,
        url: observation.url,
        title: observation.title,
        channelTitle: observation.channelTitle,
        syndicationEvidence: "unknown",
      },
    };
    newScopedCandidates += 1;
  }
  const receiptPath = artifact
    ? await saveBrowserYouTubeImportReceipt(options.stateDirectory, merged.receipt)
    : getBrowserYouTubeImportReceiptPath(options.stateDirectory);
  if (newScopedCandidates > 0) {
    await (options.persistCheckpoint ?? saveCurationCheckpoint)(options.stateDirectory, checkpoint);
  }
  return {
    checkpoint,
    receiptPath,
    summary: {
      inputQueryRuns: artifact?.queryRuns.length ?? 0,
      importedQueryRuns: merged.importedQueryRuns,
      existingQueryRuns: merged.existingQueryRuns,
      inputObservations: artifact?.candidates.length ?? 0,
      importedObservations: merged.importedObservations,
      existingObservations: merged.existingObservations,
      newScopedCandidates,
    },
  };
}
