# YouTube curation and video policy

## Release invariant

Every seeded canonical exercise and equipment variation must have exactly two ordered, unique demonstrations that passed mechanical eligibility, human quality review, and a complete human viewing. A missing API key, exhausted quota, or incomplete watch review blocks production seeding. The application must not substitute arbitrary links.

## Credential and quota boundary

`YOUTUBE_API_KEY` is a server-side development and curation secret. It is never bundled into the application, printed in reports, committed, or copied into public QA evidence.

Without a target manifest, the command derives exactly one target with stable `variationId: "canonical"` from each of the 27 catalog records. Each target carries a movement stem, useful aliases, and only relevant barbell/dumbbell discriminator terms; bodyweight targets do not require a title to contain `bodyweight`. A private `--targets` manifest or `YOUTUBE_CURATION_TARGETS` path explicitly overrides this default, including an intentional empty array.

The curation command stores resumable progress outside production data. It records completed queries, page tokens, hydrated IDs, rejection codes, quota estimates, review status, ranked eligible candidates, and proposed pairs. Input targets are deduplicated by canonical exercise plus variation, pending hydration IDs are deduplicated across targets, and the report emits one target entry per key. Discovered-candidate, review, and rejection maps use the scoped `canonicalExerciseSlug::variationId::videoId` key. A configurable request and page budget stops before the next API request would exceed its limit. Re-running continues from the last safe checkpoint and checks existing IDs before spending search quota.

## Discovery sequence

1. Deduplicate the required canonical exercise and equipment variations from the seed specification.
2. Build several exact movement and equipment queries, including known aliases and exclusion terms.
3. Call `search.list` with `type=video`, `videoEmbeddable=true`, `videoSyndicated=true`, `safeSearch=strict`, `relevanceLanguage=en`, the launch `regionCode`, and `videoDuration=short` for the primary pool.
4. Run relevance-ordered and view-count-ordered searches as separate candidate sources. Search order is not an approval score.
5. Hydrate unique video IDs with `videos.list` parts `snippet`, `contentDetails`, `status`, and `statistics`.
6. Parse ISO 8601 duration, language, live status, privacy, upload status, embeddability, channel, title, description, and view count.
7. Apply mechanical rejection before any ranking.
8. Produce a human-review report with query provenance, metadata, mechanical decisions, rejection reasons, and proposed candidates.

If `videos.list` omits an ID returned by search, the curator records a checked unavailable candidate with `video-unavailable`, persists that ID in the checkpoint, and includes it in the private report. It does not retry the same omitted ID on ordinary resume. An explicit `--refresh-unavailable` run clears those checked IDs and permits a new hydration request. A missing response is never treated as an approval or silently discarded.

Official API references:

- [Search: list](https://developers.google.com/youtube/v3/docs/search/list)
- [Videos: list](https://developers.google.com/youtube/v3/docs/videos/list)
- [Video resource](https://developers.google.com/youtube/v3/docs/videos)

## Mechanical eligibility

Reject a candidate when any of the following conditions applies:

- The video is missing, private, unlisted when launch policy requires public discovery, still processing, failed, rejected, or not embeddable.
- The duration is shorter than about 30 seconds or longer than about six minutes without a recorded exception.
- The URL or metadata identifies a YouTube Short.
- The title, description, or channel context indicates the wrong movement, wrong equipment variation, an unrelated exercise, unsafe or misleading instruction, mistakes, clickbait, a listicle, ranking, challenge, reaction, podcast, follow-along, routine, compilation, or long discussion.
- The video is live, upcoming, primarily an introduction, not understandable in English, or unavailable in the launch region.
- The candidate duplicates an existing ID or is a near-duplicate cut from the same material.

Mechanical checks can reject obvious failures but cannot approve technical accuracy, relevance, concision, or safety.

## Human quality review

The reviewer watches each proposed video from start to finish and records the following decisions:

- The demonstrated movement and equipment variation are exact.
- The instruction is concise, visible, understandable, and focused on one exercise.
- The presentation does not promote dangerous technique, false certainty, or a medical claim.
- The opening reaches useful instruction without an excessive introduction.
- Camera framing and audio make the movement understandable.
- The candidate adds material value beyond the first selected video.
- The title and channel attribution match the live YouTube page.

Prefer distinct channels when mechanical and human quality is comparable. Reject or flag a materially redundant second result rather than filling a slot. View count breaks a tie only after both candidates pass eligibility and quality gates. The March 31, 2025, change to Shorts view counting is another reason not to treat view count as quality.

## Approval record

The durable seed stores the following fields:

- YouTube video ID.
- Canonical exercise and equipment variation ID.
- Display order one or two.
- Title and channel attribution.
- Approval state, reviewer, and review timestamp.
- Full-watch confirmation.
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

Run `pnpm youtube:curate` with an official `YOUTUBE_API_KEY`. Without `--targets` (or `YOUTUBE_CURATION_TARGETS`), the command invokes the typed workflow for the complete 27-record catalog-derived target set. A private target manifest explicitly overrides that set, including an intentional empty array. The command resumes from `.local/youtube-curation/checkpoint.json`, and writes the review proposal to `.local/youtube-curation/review-report.json`. The report includes query provenance, mechanical rejection codes, ranked eligible candidates, proposed pairs, and quota-blocked state when a budget stops progress. Set `YOUTUBE_CURATION_MAX_QUOTA_UNITS`, `YOUTUBE_CURATION_MAX_SEARCH_REQUESTS`, `YOUTUBE_CURATION_MAX_HYDRATE_REQUESTS`, and `YOUTUBE_CURATION_MAX_PAGES_PER_QUERY` (or the matching command-line flags) to bound a run. Use `--refresh-unavailable` to explicitly retry IDs previously omitted by `videos.list`. These paths are ignored by Git and contain no production data.

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

Ignored `.env.local` contains `YOUTUBE_API_KEY`; only presence was verified on August 26, 2026. The key is not copied to Vercel because it is a local curation credential, not an application runtime dependency. Discovery must still pass a bounded official API request and record quota use. Final selection, complete viewing, approval, exact-two production seed, and live production embed verification remain release gates until every catalog-derived target completes the policy.
