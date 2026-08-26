# YouTube curation and video policy

## Release invariant

Every seeded canonical exercise and equipment variation must have exactly two ordered, unique demonstrations that passed mechanical eligibility, human quality review, and a complete human viewing. A missing metadata check, incomplete official-or-authorized-browser discovery manifest, or incomplete watch review blocks production seeding. The application must not substitute arbitrary links.

## Credential and quota boundary

`YOUTUBE_API_KEY` is a server-side development and curation secret. It is never bundled into the application, printed in reports, committed, or copied into public QA evidence.

Official YouTube documentation accessed August 26, 2026, assigns `search.list` a separate default bucket of 100 calls per day at one unit per call. `videos.list` costs one unit in the combined quota for other endpoints. The local checkpoint counts successful calls and estimates documented method units; the provider quota page remains authoritative for rejected, invalid, or external calls that did not become successful checkpoint progress.

Without a target manifest, the command derives exactly one target with stable `variationId: "canonical"` from each of the 27 catalog records. Each target carries a movement stem, useful aliases, and only relevant barbell/dumbbell discriminator terms; bodyweight targets do not require a title to contain `bodyweight`. A private `--targets` manifest or `YOUTUBE_CURATION_TARGETS` path explicitly overrides this default, including an intentional empty array.

The curation command stores resumable progress outside production data. It records completed official queries, durable per-query page counts, page tokens, hydrated IDs, rejection codes, quota estimates, review status, ranked eligible candidates, and proposed pairs. A separate ignored browser receipt records rendered query runs and exact card observations without mutating official query keys or search accounting. Input targets are deduplicated by canonical exercise plus variation, pending hydration IDs are deduplicated across targets, and the report emits one target entry per key. Discovered-candidate, review, and rejection maps use the scoped `canonicalExerciseSlug::variationId::videoId` key. A configurable request budget stops before the next API request would exceed its limit. Search and hydration request caps are independent within the run's total unit cap: reaching the search cap still permits low-cost metadata hydration for IDs already in the checkpoint. Re-running continues a query only when quota interrupted it before the configured total page cap. Reaching `maxPagesPerQuery` marks that official query complete so repeated runs cannot crawl deeper pages or starve later exercises. Existing IDs are checked before search quota is spent.

## Discovery sequence

1. Deduplicate the required canonical exercise and equipment variations from the seed specification.
2. Build several exact movement and equipment queries, including known aliases and exclusion terms.
3. Call `search.list` with `type=video`, `videoEmbeddable=true`, `videoSyndicated=true`, `safeSearch=strict`, `relevanceLanguage=en`, the launch `regionCode`, and `videoDuration=short` for the primary pool.
4. Run relevance-ordered and view-count-ordered searches as separate candidate sources. Search order is not an approval score.
5. Hydrate unique video IDs with `videos.list` parts `snippet`, `contentDetails`, `status`, and `statistics`.
6. Parse ISO 8601 duration, language, live status, privacy, upload status, embeddability, channel, title, description, and view count.
7. Apply mechanical rejection before any ranking.
8. Produce a human-review report with query provenance, metadata, mechanical decisions, rejection reasons, and proposed candidates.

When the provider Search Queries bucket is exhausted, the authorized rendered-browser fallback uses the same exact deduplicated movement/alias query strings as `buildCurationQueries`. Each schema-v2 query run records the target, exact query, timestamp, `resultLimit: 15`, `resultCount: 15`, bounded-window confirmation, and standard-card provenance. Its observations contain positions one through 15 and standard watch URLs with rendered title, channel, duration, optional visible-view text, and matching timestamps. `pnpm youtube:import-browser` validates and atomically imports that ignored artifact, then uses `videos.list` for official metadata checks without calling `search.list`. A below-limit, duplicate, gapped, unknown, or mismatched run is rejected. When the same exact query has multiple runs, only the latest can satisfy completeness; an older checked run cannot hide newer unchecked IDs. Missing coverage remains `discovery-incomplete`. Complete latest 15-card windows become the distinct `browser-window-complete` state only after every latest-run ID has a provider metadata check. That status describes a bounded rendered window, not exhaustive search or pair readiness: candidates with unknown syndication remain hard-gate failures until separately verified outside YouTube. The fallback never claims API relevance or view-count search order.

If `videos.list` omits an ID returned by search, the curator records a checked unavailable candidate with `video-unavailable`, persists that ID in the checkpoint, and includes it in the private report. It does not retry the same omitted ID on ordinary resume. An explicit `--refresh-unavailable` run clears those checked IDs and permits a new hydration request. A missing response is never treated as an approval or silently discarded.

Official API references:

- [Search: list](https://developers.google.com/youtube/v3/docs/search/list)
- [Videos: list](https://developers.google.com/youtube/v3/docs/videos/list)
- [Video resource](https://developers.google.com/youtube/v3/docs/videos)

## Mechanical eligibility

Reject a candidate when any of the following conditions applies:

- The video is missing, private, unlisted when launch policy requires public discovery, still processing, failed, rejected, not embeddable, or not confirmed syndicated. Browser-imported metadata retains `syndicationEvidence: "unknown"` and `not-syndicated` until a real privacy-enhanced outside-YouTube probe passes every required check.
- The duration is shorter than about 30 seconds or longer than about six minutes without a recorded exception.
- Rendered evidence identifies a YouTube Short. A standard watch URL or `videos.list` response is not proof that the same ID is not Shorts content; when opening the Shorts path exposes YouTube's Shorts player, record the stable scoped `shorts-content` rejection.
- The title, description, or channel context indicates the wrong movement, wrong equipment variation, an unrelated exercise, unsafe or misleading instruction, mistakes, clickbait, a listicle, ranking, challenge, reaction, podcast, follow-along, routine, compilation, or long discussion.
- The video is live, upcoming, primarily an introduction, not understandable in English, or unavailable in the launch region.
- The candidate duplicates an existing ID or is a near-duplicate cut from the same material.

Mechanical checks can reject obvious failures but cannot approve technical accuracy, relevance, concision, or safety.

Catalog-derived targets may carry explicit disallowed movement modifiers for adjacent variants that still contain the base movement name. The curator applies the current target rules when resuming old checkpoint candidates, so a stale discovered-target snapshot cannot keep decline, floor-seated, combined-movement, or other incompatible variants mechanically eligible after policy correction.

## Human quality review

The reviewer watches each proposed video from start to finish and records the following decisions:

- The demonstrated movement and equipment variation are exact.
- The instruction is concise, visible, understandable, and focused on one exercise.
- The presentation does not promote dangerous technique, false certainty, or a medical claim.
- The opening reaches useful instruction without an excessive introduction.
- Camera framing makes the movement visible throughout, and understandable English instruction is established through actually heard narration, visibly reviewed captions, or a visually unambiguous demonstration. A sound-on icon is not narration evidence.
- The candidate adds material value beyond the first selected video.
- The title and channel attribution match the live YouTube page.
- The same ID does not resolve to YouTube's Shorts surface. Verified Shorts-player evidence is a durable `shorts-content` rejection and cannot be silently replaced by approval.

After every mechanical relevance and quality gate removes ineligible results, order the survivors by current hydrated view count descending. Relevance score is a gate diagnostic, not a ranking key. Prefer distinct channels when mechanical and human quality is comparable, and reject or flag a materially redundant second result rather than filling a slot. Missing counts sort below known counts and exact count ties use stable video ID order for reproducibility. The March 31, 2025, change to Shorts view counting is another reason not to treat view count as durable quality truth.

## Approval record

The durable seed stores the following fields:

- YouTube video ID.
- Canonical exercise and equipment variation ID.
- Display order one or two.
- Title and channel attribution.
- Approval state, reviewer, and review timestamp.
- Full-watch confirmation.
- Instruction evidence recorded as `narration`, `captions`, or `visual`.
- Optional replacement lineage and last availability check.

The seed does not store indefinite ranking scores or stale view counts as product truth.

## Validation

`pnpm seed:check` derives the required set from all 27 catalog records when `--required` is omitted: each record maps to the durable `variationId: "canonical"`. A supplied required manifest must contain unique keys, cover every default catalog mapping, and contain no unsupported or non-canonical mapping. The checker must reject any seed with a missing required mapping, count other than two, invalid ID syntax, duplicate ID within a variation or anywhere else in the production seed, wrong variation, missing approval, missing full-watch confirmation, duplicate order, or unsupported canonical exercise reference.

The checker also confirms that reused starter prescriptions point to the same canonical exercise and therefore reuse the same approved demonstrations.

## Refresh and replacement

The typed `assessApprovedVideoPair` refresh helper checks seeded IDs with hydrated metadata and proposes action when a video becomes missing, private, restricted, removed, unembeddable, non-syndicated, or regionally unavailable. It does not mutate production.

The application keeps the remaining approved video and direct YouTube fallback available. A refresh assessment checks both IDs and emits a replacement-required proposal when one or both are unavailable. It never mutates the approved seed. A replacement repeats discovery, mechanical checks, full human review, approval, seed validation, preview verification, and production release. Replacement lineage preserves which approved video was superseded and why.

Checkpoint schema is versioned. State from the earlier unscoped schema is rejected with an actionable incompatibility message instead of being treated as target-specific state.

## Local command scaffold

Run `pnpm youtube:curate` with an official `YOUTUBE_API_KEY` in ignored `.env.local` or the process environment. The package command loads `.env.local` when the file exists. Without `--targets` (or `YOUTUBE_CURATION_TARGETS`), the command invokes the typed workflow for the complete 27-record catalog-derived target set. A private target manifest explicitly overrides that set, including an intentional empty array. The command resumes from `.local/youtube-curation/checkpoint.json`, and writes the review proposal to `.local/youtube-curation/review-report.json`. The report includes query provenance, discovery status, mechanical rejection codes, view-count-ordered eligible candidates, proposed pairs, and quota-blocked state when a request budget stops progress. Set `YOUTUBE_CURATION_MAX_QUOTA_UNITS`, `YOUTUBE_CURATION_MAX_SEARCH_REQUESTS`, `YOUTUBE_CURATION_MAX_HYDRATE_REQUESTS`, and `YOUTUBE_CURATION_MAX_PAGES_PER_QUERY` (or the matching command-line flags) to bound a run. The page value is a durable total cap for each query, not a per-run allowance. Use `--refresh-unavailable` to explicitly retry IDs previously omitted by `videos.list`.

For an authorized browser fallback, place schema-v2 `queryRuns` and `candidates` arrays in ignored `.local/youtube-curation/browser-candidates.json`, then run `pnpm youtube:import-browser`. Every exact deduplicated required query must contain one complete 15-card bounded window. The command writes `.local/youtube-curation/browser-imports.json` with mode `0600`, inserts new scoped IDs without official query keys, and hydrates pending IDs when the local API key is available. Use `--no-hydrate` for an import-only checkpoint or `--max-hydrate-requests` to bound provider checks. Missing or whitespace-empty input performs no new import, and a prior receipt can reconstruct checkpoint candidates after an interrupted receipt-first write. Reimport is idempotent.

Direct navigation to `youtube-nocookie.com/embed/VIDEO_ID` is not valid playback evidence because it has no HTTP Referer and can fail with YouTube Error 153. Run `pnpm youtube:probe-embed -- --video VIDEO_ID` instead. The loopback-only HTTP page sends an explicit referrer policy and renders the privacy-enhanced, non-autoplay player at responsive 16:9 dimensions with visible controls and a direct fallback. It records nothing. After playback actually starts there and the operator verifies visible controls, keyboard operation, and the direct fallback, run `pnpm youtube:record-embed-verification` with the exact target, variation, video, verifier, and all five confirmation flags. That command is an assertion recorder, not a browser probe. It refuses incomplete evidence, an unknown scope, unhydrated or unavailable metadata, and writes only the scoped mode-`0600` `.local/youtube-curation/embed-verifications.json` record. The report derives verified syndication from that file at runtime; it does not overwrite provider metadata. Both API- and browser-discovered candidates require this scoped record before manual approval or `approved-for-seed`. All of these paths are ignored by Git and contain no production data.

`pnpm youtube:review` records full visual playback and requires `--instruction-evidence narration`, `captions`, or `visual` for approval. Use `narration` only when the reviewer actually heard understandable English narration, `captions` when visible English instructional captions were reviewed through the full relevant instruction, and `visual` only when the demonstration is unambiguous without relying on unheard audio. Approval still requires exact variation, concision, safety, material value, full watch, and the scoped embed record.

If `YOUTUBE_API_KEY` is missing, the command exits before creating state or making a request and prints exactly:

```
Missing YOUTUBE_API_KEY; refusing to run YouTube curation.
```

Run `pnpm seed:check --seed SEED.json` to validate against the complete catalog-derived requirement, or add `--required REQUIRED.json` to validate a private override that still must cover the complete default set. Both paths use the typed domain seed validator, reject incomplete exact-two mappings, and never write production data.

## Player requirements

- Render one active iframe at a time and never autoplay.
- Use the privacy-enhanced `https://www.youtube-nocookie.com/embed/VIDEO_ID` boundary with `autoplay=0`, visible controls, `playsinline=1`, same-channel related-video behavior, and keyboard controls enabled.
- Do not use deprecated branding controls such as `modestbranding`.
- Keep the viewport at least 200 by 200 pixels; target at least 480 by 270 pixels for a 16:9 player when the layout permits.
- Preserve YouTube controls and branding.
- Set an iframe title, constrained `allow` features, fullscreen support, and a strict referrer policy that remains compatible with the player.
- Provide a titled and channel-attributed selector for both videos and a direct YouTube fallback.
- Keep only the selected iframe mounted so two videos never play simultaneously. The two-option tab interface supports left/right, Home, and End keyboard selection.

Official player references:

- [YouTube embedded players and player parameters](https://developers.google.com/youtube/player_parameters)
- [YouTube API Services required minimum functionality](https://developers.google.com/youtube/terms/required-minimum-functionality)
- [YouTube privacy-enhanced embedding](https://support.google.com/youtube/answer/171780?expand=PrivacyEnhancedMode&hl=en-GB)

## Exact credential gate

Ignored `.env.local` contains `YOUTUBE_API_KEY`; bounded official API discovery and hydration ran without printing the key on August 26, 2026. The key is not copied to Vercel because it is a local curation credential, not an application runtime dependency. Before browser import, the ignored schema-three checkpoint recorded 102 successful search requests and 30 hydration requests, or 132 estimated units cumulatively. All 1,352 officially discovered IDs were hydrated, yielding 1,455 target-scoped candidates, 17 API-complete targets, and 10 API-incomplete targets. The provider rejected the next search because the separate search bucket was exhausted; 60 official searches remain. The first v1 import attempt rejected a gapped run; after private correction, its 29 runs and 195 observations imported as 142 new scoped candidates and all new IDs were hydrated. The checkpoint therefore now has 33 hydration calls, 1,597 scoped candidates, and 1,490 hydrated IDs. Ten targets temporarily reported complete before review found that the collector had overclaimed completeness from only 5–8 lazy-rendered cards. That schema-one receipt remains private but cannot satisfy the hardened completeness rule. Its mode-`0600` schema-v2 replacement passes the real parser with 29 exact deduplicated query runs, 435 standard-watch observations, 15 contiguous cards per run, and all 10 expected targets. It is not yet imported; importing it will supersede the old receipt, preserve existing checkpoint candidates, and hydrate only new IDs. The private dumbbell-bench review now approves `ZzFblmTUxYU` on full caption evidence and `YwrzZaNqJWU` on full visually unambiguous instruction evidence, each with scoped embed and non-Short checks. `MKZIuwc-VCw` is durably rejected as `shorts-content`. This pair is not checked into the seed, and no other mapping is complete. Final ranking review, remaining full-watch decisions, catalog-wide exact-two approval, production seed, and live production embed verification remain release gates.
