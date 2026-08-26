import manifestPayload from "./curated-video-seed.json";
import { parseCuratedVideoSeedManifest } from "./seed-manifest.ts";

export const APPROVED_CURATED_VIDEO_SEED_MANIFEST = parseCuratedVideoSeedManifest(manifestPayload);
export const APPROVED_CURATED_VIDEO_SEED = APPROVED_CURATED_VIDEO_SEED_MANIFEST.videos;
