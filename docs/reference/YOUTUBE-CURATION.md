# YouTube curation and video policy

## Release invariant

Every seeded canonical exercise and equipment variation must have exactly two ordered, unique demonstrations that passed mechanical eligibility, human quality review, and a complete human viewing. A missing API key, exhausted quota, or incomplete watch review blocks production seeding. The application must not substitute arbitrary links.

## Credential and quota boundary

`YOUTUBE_API_KEY` is a server-side development and curation secret. It is never bundled into the application, printed in reports, committed, or copied into public QA evidence.

The curation command stores resumable progress outside production data. It records completed queries, page tokens, hydrated IDs, rejection codes, quota estimates, and review status. Re-running continues from the last safe checkpoint and checks existing IDs before spending search quota.

## Discovery sequence

1. Deduplicate the required canonical exercise and equipment variations from the seed specification.
2. Build several exact movement and equipment queries, including known aliases and exclusion terms.
3. Call `search.list` with `type=video`, `videoEmbeddable=true`, `videoSyndicated=true`, `safeSearch=strict`, `relevanceLanguage=en`, the launch `regionCode`, and `videoDuration=short` for the primary pool.
4. Run relevance-ordered and view-count-ordered searches as separate candidate sources. Search order is not an approval score.
5. Hydrate unique video IDs with `videos.list` parts `snippet`, `contentDetails`, `status`, and `statistics`.
6. Parse ISO 8601 duration, language, live status, privacy, upload status, embeddability, channel, title, description, and view count.
7. Apply mechanical rejection before any ranking.
8. Produce a human-review report with query provenance, metadata, mechanical decisions, rejection reasons, and proposed candidates.

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

Prefer distinct channels when quality is comparable. Skip a materially worse second result rather than filling a slot. View count breaks a tie only after both candidates pass eligibility and quality gates. The March 31, 2025, change to Shorts view counting is another reason not to treat view count as quality.

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

`pnpm seed:check` must reject any seed with a missing required mapping, count other than two, invalid ID syntax, duplicate ID within a variation, wrong variation, missing approval, missing full-watch confirmation, duplicate order, or unsupported canonical exercise reference.

The checker also confirms that reused starter prescriptions point to the same canonical exercise and therefore reuse the same approved demonstrations.

## Refresh and replacement

`pnpm youtube:refresh` checks seeded IDs with `videos.list` and proposes action when a video becomes missing, private, restricted, removed, unembeddable, or regionally unavailable. It does not mutate production.

The application keeps the remaining approved video and direct YouTube fallback available. A replacement repeats discovery, mechanical checks, full human review, approval, seed validation, preview verification, and production release. Replacement lineage preserves which approved video was superseded and why.

## Local command scaffold

Run `pnpm youtube:curate` with an official `YOUTUBE_API_KEY` and a private target manifest. The command resumes from `.local/youtube-curation/checkpoint.json` and writes the review proposal to `.local/youtube-curation/review-report.json`. These paths are ignored by Git and contain no production data.

If `YOUTUBE_API_KEY` is missing, the command exits before creating state or making a request and prints exactly:

```
Missing YOUTUBE_API_KEY; refusing to run YouTube curation.
```

Run `pnpm seed:check --required REQUIRED.json --seed SEED.json` to validate a proposed mapping. The checker rejects incomplete exact-two mappings and never writes production data.

## Player requirements

- Render one active iframe at a time and never autoplay.
- Use `https://www.youtube.com/embed/VIDEO_ID` with supported parameters such as `playsinline=1` and keyboard controls enabled.
- Do not use deprecated branding controls such as `modestbranding`.
- Keep the viewport at least 200 by 200 pixels; target at least 480 by 270 pixels for a 16:9 player when the layout permits.
- Preserve YouTube controls and branding.
- Set an iframe title, constrained `allow` features, fullscreen support, and a strict referrer policy that remains compatible with the player.
- Provide a titled and channel-attributed selector for both videos and a direct YouTube fallback.

Official player references:

- [YouTube embedded players and player parameters](https://developers.google.com/youtube/player_parameters)
- [YouTube API Services required minimum functionality](https://developers.google.com/youtube/terms/required-minimum-functionality)

## Exact credential gate

The environment has no `YOUTUBE_API_KEY`. Independent application, curation-code, seed-validation, fixture, and unavailable-state work can proceed. Discovery, quota-backed metadata hydration, final candidate selection, complete viewing, approval, exact-two production seed, and live production embed verification remain blocked until an authorized official YouTube Data API v3 key is available.
