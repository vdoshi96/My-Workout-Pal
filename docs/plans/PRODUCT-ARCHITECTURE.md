# Product and architecture plan

## User outcomes

My Workout Pal must support two truthful experiences:

- A guest can evaluate the complete seeded program, both equipment profiles, exercise guidance, a sample workout, and sample analytics without believing that activity is saved.
- An authenticated and eligible user can own program revisions, custom exercises, workout logs, and derived progress without another user being able to read or mutate them.

## Navigation model

Public navigation exposes **Program**, **Library**, **Sample progress**, and **Sign in**. Authenticated navigation exposes **Today**, **Program**, **Library**, **History**, **Progress**, and **Settings**. On narrow screens, the four highest-frequency destinations use a bottom navigation bar and secondary destinations remain in the account menu. On tablets and desktop, the same information architecture uses a persistent rail or header without changing route meaning.

An active workout becomes the primary task. The runner owns its own compact navigation and requires explicit confirmation before leaving with unsaved or failed changes.

## Application boundaries

### Server Components

Server Components render public catalog data, program overviews, history, records, analytics summaries, and settings reads. They query the database only through ownership-scoped repositories and never serialize secrets, Firebase Admin objects, or unrelated user records.

### Client Components

Client Components are limited to equipment preview toggles, search and filtering, video selection, editors, authentication SDK calls, timers, set entry, offline drafts, retry controls, install prompts, and navigation protection. A Client Component receives the minimum serializable state required for its interaction.

### Mutations

Server Actions handle same-origin form and editor mutations. Route handlers handle Firebase token exchange, session lifecycle, curation administration, PWA synchronization, and APIs that require explicit request semantics. Every mutation validates the body with Zod, verifies origin and CSRF, derives Firebase UID from the secure session, checks account eligibility, applies ownership in the query, and returns a discriminated result.

## Domain types and invariants

### Identity and eligibility

- `AuthIdentity` contains server-derived `firebaseUid`, provider, email verification, authentication time, and revocation status.
- Google identities are eligible when Firebase reports a verified provider identity.
- Password identities can browse authenticated surfaces before email verification but cannot perform permanent mutations.
- High-risk account deletion requires a recent authentication time and an explicit reauthentication proof.

### Equipment

- `EquipmentProfileKind` is `dumbbells` or `barbell`.
- The dumbbell profile contains dumbbells, bodyweight, and an ordinary bench.
- The barbell profile contains barbell, plates, rack, bench, dumbbells, and bodyweight.
- Catalog compatibility is derived from required equipment, not a hand-written boolean.
- An equipment change produces a substitution preview. Confirmation creates one new active-program revision inside one transaction.

### Exercise and prescription

- A canonical exercise has a stable slug, movement name, nonblank movement family, modality, muscles, instructions, equipment requirements, compatibility, logging kind, and optional variation parent.
- Logging kinds are `weight_reps`, `bodyweight_reps`, `duration`, and `distance_duration`.
- Custom exercises belong to exactly one Firebase UID and can contain zero to two normalized YouTube video IDs.
- A prescription points to a canonical or owned custom exercise and stores an optional bounded display label, section, order, set count, range, rest, warm-up or work classification, and target metadata.
- Reused movements point to the same canonical exercise record across program days.

### Program revisions

- A user program has one active revision pointer.
- A revision and its day, section, and prescription rows are immutable after publication.
- Editing clones the active revision, applies validated changes, and atomically advances the pointer.
- Workout sessions retain the revision ID and a denormalized snapshot of names, logging kind, units, prescriptions, and substitutions needed to preserve meaning.

### Workout sessions and logs

- A session state is `draft`, `active`, `completing`, `completed`, or `abandoned`.
- Only one resumable active session per user and program revision is allowed unless the user explicitly abandons or completes it.
- Every client mutation has an idempotency key unique within the user and session.
- Warm-up sets never count toward progression, volume, or personal records.
- Work-set logs preserve canonical kilograms, repetitions, duration, distance, form rating when supplied, note snapshot, timestamp, and client idempotency key.
- Completion requires all locally acknowledged operations to be durably accepted or explicitly retried. A failed save cannot be presented as complete.

### Progression and analytics

- Double progression suggests a load increase only when every work set reaches the repetition-range top and the user records appropriate form. The product never chooses a load.
- Volume is the sum of `weightKg * repetitions` across qualifying work sets. Bodyweight work is excluded from external-load volume unless a logged added load exists.
- Epley estimated one-repetition maximum is `weightKg * (1 + repetitions / 30)` for positive weight and repetitions. It is not calculated for duration, distance, warm-up, or bodyweight-only sets.
- A personal record compares canonical values within the same exercise variation and record type (`max_weight`, `estimated_1rm`, `volume`, `max_repetitions`, `distance`, or `duration`). An equal best is a tie, not a new higher record.
- Presentation rounds only after canonical comparison. Weight conversion uses `1 kg = 2.2046226218 lb`.
- Analytics derive from persisted completed sessions and logs. Sample analytics use a separate labeled fixture and never share a user record identifier.

## Starter program

All prescriptions use editable defaults. Compounds use three work sets of 8-12 repetitions and 90 seconds of rest. Accessories use two sets of 10-15 repetitions and 60 seconds of rest. Repetition-based core uses two sets of 8-15 repetitions. Timed core uses two sets of 20-45 seconds. Every day includes a walker or runner cardio template with time, distance, pace, incline, and notes.

The exact movement order and equipment substitutions are maintained in `docs/reference/SUBSTITUTIONS.md` and validated against seed data.

## Persistence model

### Core tables

- `user_profiles`, `user_preferences`, and `user_equipment_profiles` use Firebase UID as the external owner key.
- `catalog_exercises`, `catalog_equipment`, `exercise_equipment`, `exercise_aliases`, and `curated_videos` are globally readable seeded records.
- `custom_exercises`, owner-scoped custom equipment edges, normalized custom search aliases, and `custom_exercise_videos` are user-owned.
- `program_templates`, `program_template_revisions`, `template_days`, `template_sections`, and `template_prescriptions` hold immutable seeded templates.
- `user_programs`, `program_revisions`, `program_days`, `program_sections`, and `program_prescriptions` hold immutable user revisions plus one active pointer.
- `workout_sessions`, `workout_exercise_snapshots`, `workout_exercise_states`, `set_logs`, and `cardio_logs` preserve sessions and historical meaning. Snapshots are always immutable; per-exercise notes, substitutions, skips, and completions live in owner/session/snapshot outcome rows with a versioned latest client operation ID; logs can change only while a session is resumable and freeze after completion or abandonment. A session has at most one cardio choice.
- `personal_records` and `progress_summaries` are reproducible projections with source log identifiers and calculation versions.
- `idempotency_keys` records accepted mutation results and expiry.
- `account_deletion_jobs` tracks the deletion saga without retaining deleted fitness content.

### Database rules

- Foreign keys use restrictive deletion by default. Account deletion uses an explicit owned-data transaction.
- Unique constraints enforce one active session boundary, revision numbers, set positions, video order, video identity per exercise variation, and idempotency scope.
- Check constraints enforce nonnegative canonical measures, valid ranges, snapshot target shapes and set bounds, nonblank movement families and video variations, two approved seed-video orders per exercise variation, and known states.
- Every repository method that reads or writes user data requires a server-derived owner argument. There is no unscoped `findById` for owned records.
- Migrations are append-only, versioned, tested from an empty database, and tested as upgrades from the preceding release fixture.
- Canonical seed rows use deterministic RFC 4122 version-five UUIDs derived from a public, fixed application namespace plus a bounded entity kind and stable domain key. Re-running a seed therefore converges on the same catalog and template identities across preview and production.

### Database implementation slice

The first persistence slice is a single append-only PostgreSQL migration represented by Drizzle tables under `src/db/schema.ts`. Firebase UID remains the external owner key; internal UUIDs are opaque row identifiers. Owned rows repeat the owner key and use composite foreign keys where a child points to another owned row, so an owner-scoped repository query cannot accidentally join across accounts. Catalog and curated records are global, while custom exercises, programs, sessions, logs, and projections are owned.

The migration creates user profile, preference, and equipment rows; catalog equipment, exercises with durable movement families, compatibility edges, aliases, and curated-video records with explicit variation IDs; custom exercises with owner-scoped equipment edges, normalized search aliases, and normalized video IDs; immutable template and user-program revision trees with optional prescription display labels; published-revision workout sessions with immutable prescription snapshots, owner-scoped per-exercise outcome states, set/cardio logs, idempotency records, personal records, progress summaries and their source-log links; and the account-deletion job boundary. Catalog aliases are reusable across exercises while remaining unique per exercise after normalization. PostgreSQL enums, checks, partial unique indexes, and restrictive foreign keys enforce known states, canonical kilograms/meters/seconds, measurement-kind field shapes, same-program revision pointers, published-only active revisions and session creation, program-day/section parent scope, snapshot target shapes and set-count bounds, snapshot-to-set measurement-kind matching, one active resumable session per owner and revision, one cardio choice per session, sequential outcome versions and operation IDs, revision numbering, ordered prescriptions/video slots, tied personal-record source identities, and mutation idempotency.

Published program revisions and all descendants are protected by database triggers for insert, update, and delete. Workout prescription snapshots may be inserted only while a session is resumable and are always immutable afterward; outcome states preserve runner notes, compatible substitutions, skips, and completions without rewriting the original snapshot, may be corrected while resumable only with version +1 and a new operation ID (exact no-op replays are harmless), stamp `updated_at` on material changes, and freeze after completion or abandonment. Set and cardio logs may be inserted, corrected, or removed while their owning session is draft, active, or completing, then freeze after completion or abandonment; the database allows only one cardio log per owner/session. During a resumable correction, log IDs, owner/session/snapshot scope, set position or kind, idempotency keys, and creation timestamps remain fixed; measurement values, notes, form, and recorded timestamps may change, and cardio mode remains editable. Session creation requires a published revision. Session identity and creation fields are immutable in every state. Terminal sessions cannot change state or terminal kind and enforce truthful started/completed/abandoned timestamps. The first migration is exercised from an empty PGlite database, including cross-owner composite-FK failures, canonical-measurement failures, snapshot/log measurement-kind mismatches, duplicate active sessions/idempotency keys, active-log correction, published-child insert rejection, prescription display-label retention, sequential outcome operation guards, terminal-state guards, outcome-state persistence and terminal freeze, and post-completion immutability. The database connector is lazy and import-safe: missing `DATABASE_URL` is reported only when a caller asks for a live connection, never while importing server modules or Drizzle configuration.

## Authentication and session design

1. The Firebase client SDK completes Google or email/password authentication.
2. The client sends the short-lived Firebase ID token to the session route with a same-origin request, an origin check, and a double-submit CSRF token.
3. Firebase Admin verifies the ID token, provider, verification state, expiration, and revocation requirements, then creates a secure session cookie.
4. The cookie uses the `__Host-` prefix, `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/`, and no `Domain` attribute. The server rotates or clears it on expiry, revocation, sign-out, or identity mismatch.
5. Every permanent mutation verifies the session and eligibility. Sensitive mutations request revocation checking and recent authentication.
6. Sign-out clears the server session before client SDK sign-out and clears the local user draft namespace.

Tests cover invalid, duplicate, unverified, expired, revoked, CSRF, cross-user, deletion, and reauthentication paths. Error responses avoid revealing whether another user's resource exists.

## Offline and interruption recovery

The service worker caches the immutable shell, public program payload, catalog metadata, and app icons. It does not cache authenticated HTML, session endpoints, mutation responses, or private analytics.

The active runner writes a tab-safe draft to IndexedDB under a Firebase UID and session namespace. The browser adapter in `src/client/runner-storage.ts` uses one versioned object store keyed by the encoded owner-and-session runner key, opens the database through an injectable IndexedDB factory for deterministic tests, and maps unsupported, blocked, and quota failures to a UI-safe storage error code. Each queued operation carries an idempotency key, base revision, local timestamp, and explicit status. Reconnection submits operations in order. Server acceptance replaces pending state with persisted identifiers. Conflict responses retain the draft and explain the action required.

Refresh resumes the same server session and overlays unacknowledged local operations. A different signed-in UID cannot open the draft: load, save, and remove verify the owner encoded in the key and never return another namespace's record. Writes, reads, and deletes use one IndexedDB transaction each. Sign-out or account deletion calls the owner-scoped namespace clear, which deletes only that Firebase UID's records and leaves other users' drafts intact. If authentication expires, the runner keeps the local draft, blocks permanent mutations, and guides reauthentication without claiming that data is saved. The restore boundary rejects corrupt, unsupported, cross-session, and snapshot-mismatched records rather than hydrating them.

## Security and privacy

- Use a per-request nonce Content Security Policy with the minimum Firebase and YouTube sources. Application pages render at request time so Next.js can attach the nonce; frame policy permits only approved YouTube and Firebase authentication origins.
- Add `Referrer-Policy`, `Permissions-Policy`, `X-Content-Type-Options`, and frame-ancestor protection.
- Normalize and validate YouTube URLs before persistence. Render embeds from durable video IDs and never inject user-provided markup.
- Rate-limit authentication session exchange, recovery-adjacent routes, custom exercise writes, and sync retries by trusted identity and coarse network signal.
- Keep logs free of tokens, cookies, private keys, full notes, and raw fitness records. Use request IDs and safe error codes.
- Do not use third-party product analytics in the initial release. Operational usage is measured through Vercel and database dashboards without adding a paid product.
- Account deletion removes owned database rows, local drafts, session cookies, and the Firebase user through an auditable saga. Partial failure leaves a restricted deletion job and retry path, not a false success.

## YouTube curation and custom-video boundaries

### Quota accounting correction plan

**User outcome:** Operators can resume discovery after a provider quota stop without losing successful searches, misreporting API usage, or publishing incomplete video data. Guests and members continue to see the truthful unavailable-video state until every exact pair is reviewed.

**Navigation and UI states:** This slice changes the private `pnpm youtube:curate` workflow and its ignored review report. It adds no product route or control. The report distinguishes a configured request-budget stop, a provider-reported search-quota stop, pending hydration, ready-for-review candidates, and incomplete approval.

**Domain types and invariants:** Current `search.list` and `videos.list` calls each count as one documented API unit, while `search.list` also has a separate 100-call daily limit. `maxSearchRequests` remains the independent search-call guard. Checkpoint schema version 3 migrates schema-two quota estimates by recomputing documented method costs without changing completed queries, page caps, discovered IDs, review state, or rejection state. Provider error text, project numbers, and credential details never enter the checkpoint or report.

**Persistence and authorization:** The curator writes only the ignored local checkpoint and review report by atomic rename. It does not write the database, production seed, or Vercel environment. The API key remains a local operator secret; the workflow has no Firebase identity or user-owned authorization boundary.

**Loading, empty, error, interrupted, and worst-case states:** Each successful request persists before the next request. A provider quota response records a stable sanitized blocker, preserves the failed query for resume, and still hydrates already discovered IDs when the metadata quota bucket permits it. Network, malformed-response, and nonquota provider errors remain failures instead of being mislabeled as quota exhaustion. An incompatible unscoped schema remains rejected.

**Responsive behavior and accessibility:** This operator-only command has no phone, tablet, desktop, keyboard, motion, or screen-reader UI change. Product video surfaces retain their existing responsive and accessible unavailable state until approved records exist.

**Privacy and security:** Tests and reports must not contain the API key, provider project number, raw provider error, or private local paths beyond the documented ignored state directory. No discovered candidate becomes production data through this correction.

**Acceptance criteria, automated tests, and browser evidence:** A red-to-green unit test proves schema-two migration preserves progress and corrects the unit estimate. A second test proves a provider search-quota error produces a sanitized resumable report and permits pending hydration. Existing budget, page-cap, checkpoint, exact-two, and secret-exclusion tests remain green. No browser evidence is required for accounting; later completion still requires full video viewing and real embed verification for every approved pair.

### Exact-movement shortlist correction plan

**User outcome and navigation:** Human reviewers receive a shortlist for the exact catalog movement instead of obvious adjacent variants or commentary. This changes only the ignored operator report; public exercise detail and runner routes continue to show the honest unavailable state until approved exact pairs are released.

**States, domain types, and persistence:** Catalog-derived curation targets can declare normalized disallowed movement modifiers. The checkpoint preserves those modifiers with each target. A candidate that otherwise mentions the movement is still rejected as `wrong-movement` when it adds an incompatible modifier such as decline, floor-seated, press-after-curl, or rotation-after-lunge. Commentary/clickbait, localized non-English instruction cues, and unsupported fat-loss promises retain their existing stable rejection categories. Review status and hydrated metadata remain immutable inputs to regeneration; this correction does not approve, delete, or seed a candidate.

**Authorization, failure recovery, privacy, and security:** The API key and ignored checkpoint remain local operator data with no Firebase identity boundary. Regeneration is deterministic and makes no API request. Unknown modifiers stay pending for human judgment rather than being silently rejected. Existing unavailable, malformed, interrupted, and quota-blocked behavior is unchanged, and no private candidate report enters Git or production.

**Responsive behavior and accessibility:** This domain-only correction adds no phone, tablet, desktop, keyboard, screen-reader, motion, or dark-mode UI. Later embed browser evidence remains required for selected pairs on the existing accessible one-player surface.

**Acceptance criteria, tests, and evidence:** A retained failing table covers real false-positive shapes for flat bench, seated shoulder press, curl, reverse lunge, commentary, unsupported fat-loss copy, and non-English title cues. The passing suite must keep exact tutorials eligible, regenerate the current private report without network access, and reduce those false positives before any full-watch approval. Browser evidence begins only after a mechanically eligible pair is selected.

### Discovery completeness and manual review evidence plan

**User outcome:** Operators can distinguish a mechanically promising pair from a complete target that is ready for full-watch review. A rejected video stays out of later proposals, and an approval can't become a seed proposal without complete visual playback evidence and the required review decisions.

**Navigation and UI states:** This slice changes the ignored curation report and adds a private `pnpm youtube:review` operator command. It adds no product route. Each target reports `discovery-incomplete`, `needs-second-candidate`, `ready-for-review`, or `approved-for-seed`. The report also distinguishes pending playback, playback completed without visual proof, rejected review, and fully approved review. Public exercise and runner routes keep the unavailable-video state until a checked-in seed passes exact-two validation and is deployed.

**Domain types and invariants:** A target is discovery-complete only when every query produced by `buildCurationQueries` has a completed relevance request and a completed view-count request. A report can't label an incomplete target `ready-for-review`, even when two mechanically eligible candidates exist. Manual review records are keyed by `canonicalExerciseSlug::variationId::videoId`. An approved record requires a named reviewer, valid review timestamp, full-watch confirmation, visual-review confirmation, exact variation, concise instruction, safe instruction, material value, and one truthful `instructionEvidence` value: `narration` when the reviewer actually heard understandable English narration, `captions` when complete understandable English instructional captions were visibly observed, or `visual` when the full movement instruction was visually unambiguous without relying on unheard audio. A sound-on icon alone is not narration evidence. Pending and rejected records may omit instruction evidence, but cannot use it to imply approval. Approved records can't retain rejection or pending-blocker reasons, and rejected records can't retain a pending blocker. A rejected record requires a stable rejection reason. `shorts-content` records direct rendered evidence that the ID opens YouTube's Shorts player; the standard watch URL and `videos.list` shape do not prove otherwise, and a later approval cannot overwrite that verified-format rejection. A pending record can preserve playback progress or a technical evidence blocker without asserting visual review. Existing private schema-one pending records migrate without inventing instruction evidence; a legacy approval can migrate to `narration` only if its prior audio-review confirmation was true. Pair selection excludes rejected candidates, continues down the mechanically ranked list, and emits `approved-for-seed` only when exactly two nonredundant candidates have complete approval and scoped embed records. Review state doesn't reorder mechanical ranking: an unreviewed higher-ranked candidate remains ahead of a lower approved candidate until the reviewer rejects it.

**Persistence and authorization:** The command atomically writes a mode-`0600` record under `.local/youtube-curation/`. The report reads that ignored file and mirrors only validated review state. Neither command writes Neon, Firebase, Vercel, the checked-in production seed, or public documentation. A later seed proposal copies only validated approved records and still must pass `pnpm seed:check` before publication.

**Loading, empty, error, interrupted, and worst-case states:** The command refuses an unknown candidate, ambiguous scoped key, malformed timestamp, incomplete approval, approval without scoped embed evidence, missing rejection reason, or attempt to weaken a prior approval without an explicit replacement action. Interrupted writes preserve the prior file through atomic rename. Missing review state means pending. A playback that reaches the end while frame evidence is unavailable remains pending and records the evidence blocker. Sound-on UI without audible output does not satisfy `narration`; visible captions or visually unambiguous instruction must be recorded truthfully instead. A quota stop, incomplete query set, missing hydration, or provider removal prevents seed readiness without discarding discovery or review progress.

**Responsive behavior and accessibility:** This operator-only workflow has no phone, tablet, desktop, keyboard, screen-reader, reduced-motion, or dark-mode product change. Required browser evidence uses the existing accessible, non-autoplay player at a usable viewport and records the direct-link fallback separately.

**Privacy and security:** The review file contains no API key, cookies, account tokens, provider project numbers, raw media, screenshots, transcripts, or private notes. Error output names only stable candidate identifiers and validation fields. Production seed rows contain durable video IDs, titles, channels, display order, reviewer identity, approval state, and review timestamps, but no stale view counts or private evidence paths.

**Acceptance criteria, automated tests, and browser evidence:** Retain a failing test in which an incomplete target with two eligible candidates appears `ready-for-review`, then pass it with `discovery-incomplete`. Retain failures proving rejected candidates reappear and incomplete approval data can be accepted, then pass them with validated private review persistence and proposal filtering. Verify schema parsing and migration, scoped-key ownership, embed gating, atomic resume, pending visual-evidence blockers, each truthful instruction-evidence mode, exact-two approval, and seed-validation compatibility. A regression records a standard-watch candidate as `shorts-content`, proves it disappears from ranking/proposals, and refuses a later approval despite otherwise complete watch and embed fields. For every approved candidate, play the complete video, observe visual form from start to finish, record whether instruction was established through actually heard narration, visible captions, or visually unambiguous demonstration, verify the responsive embed and direct URL, explicitly check whether the same ID opens YouTube's Shorts surface, and keep the candidate pending if the browser can't expose visual frames or any truthful instruction basis.

### Eligible-candidate ranking correction plan

**User outcome and navigation:** Reviewers receive the two most-viewed current candidates only after every relevance, quality, movement, equipment, safety, availability, duration, language, embed, region, duplication, and review-rejection gate has removed ineligible results. This changes the private curation report and proposed pairs only; product routes continue to show unavailable media until reviewed seeds are released.

**States, domain types, and invariants:** Mechanical evaluation continues to calculate a relevance score for eligibility diagnostics. Ranking first filters to `eligible: true`, then sorts current hydrated `statistics.viewCount` descending. Relevance score cannot outrank view count among survivors. A missing view count sorts below a known count, and stable video ID order resolves an otherwise exact tie for reproducibility. Pair selection consumes that same eligible ordering, may choose a comparable distinct-channel candidate over a materially redundant second result, and still lets an unreviewed higher-ranked candidate block a lower approved candidate until it is rejected. View count remains ephemeral report metadata and is never copied into the durable production seed.

**Persistence, authentication, authorization, and recovery:** No schema, Firebase, Neon, Vercel, user-owned record, or production seed changes. Regeneration reads the ignored hydrated checkpoint and manual decisions, writes the ignored report atomically, and makes zero provider requests. Missing hydration or view metadata stays explicit; it does not invent a count. An interrupted report write preserves the prior report. Existing review decisions remain scoped to their video IDs and are not silently transferred if ordering changes.

**Phone, tablet, desktop, accessibility, privacy, and security:** This operator-domain correction adds no public layout, interaction, motion, keyboard, screen-reader, or dark-mode change. Private report metadata remains ignored and contains no API key, cookie, token, raw media, or transcript. Later browser evidence still uses the accessible one-player embed and direct fallback for the newly selected pair.

**Acceptance criteria, tests, and evidence:** Retain a failing test where a lower-view eligible candidate has the higher relevance score, then pass it with the higher-view candidate first. Keep hard-gate tests proving a highly viewed ineligible candidate is excluded, missing-count ordering is deterministic, and exact view ties use stable video ID order. Re-run proposal, distinct-channel, manual-rejection, approval, exact-two seed, and full YouTube matrices. Regenerate the private report without search calls and inspect every changed proposed pair before beginning or resuming full-watch decisions; the existing pending dumbbell-bench review is not approved merely because it was watched before the corrected ordering.

### Browser-discovered candidate import plan

**User outcome:** When the provider's Search Queries bucket is exhausted, an operator can preserve standard-video candidates discovered from rendered YouTube results and resume official metadata checks without losing provenance or overstating API discovery completeness. Guests and members continue to see the unavailable-video state until every required mapping has exactly two fully watched, approved demos.

**Navigation and UI states:** This slice adds a private operator command that reads an ignored browser-candidate artifact and imports it into the ignored curation checkpoint. It adds no application page, route, or public control. Command output distinguishes imported, already present, invalid, wrong target, partial browser coverage, a complete bounded 15-card window, pending hydration, hydrated, unavailable, pending embed verification, and provider-blocked candidates. Each proposed pair reports `api-discovery-complete`, `browser-window-complete`, or `discovery-incomplete`. `browser-window-complete` means only that every required exact deduplicated query supplied one validated 15-card rendered window; it never implies exhaustive YouTube search traversal. A window-complete target can still report `needs-second-candidate` while candidates lack verified outside-YouTube playback. The report never describes the fallback as API relevance- or view-count-ordered discovery.

**Domain types and invariants:** The schema-v2 browser artifact contains a query-run manifest plus candidate observations. A query run names the canonical exercise slug, variation ID, exact deterministic deduplicated query text, observation timestamp, `resultLimit: 15`, `resultCount: 15`, `boundedWindowComplete: true`, standard-card-only confirmation, and provenance `browser-rendered-search`. Each candidate observation adds its normalized standard watch URL, rendered title, channel, duration text, optional visible-view text, exact result position, and matching query text and timestamp. The collector repeatedly scrolls and waits until it has exactly 15 standard `ytd-video-renderer` watch cards; a below-limit or gapped run cannot claim completion and is rejected. When multiple runs exist for one target and exact query, only the latest timestamp is canonical for completeness; an older complete run cannot hide newer unchecked observations. The importer accepts only catalog-derived target keys, every exact query produced by the existing deduplicated `buildCurationQueries` manifest, internally consistent bounded-window evidence, positions one through 15, and normalizable non-Shorts YouTube watch URLs. It derives the durable video ID at the boundary and deduplicates the same scoped candidate while retaining distinct query observations. Browser observations use a separate provenance collection; they do not create official relevance or `viewCount` query keys, increment API search accounting, imply `syndicated: true`, or replace hydrated metadata. Visible view text is non-authoritative discovery evidence and never becomes durable seed truth. Missing query runs or unchecked latest-run IDs remain `discovery-incomplete`. A target becomes `browser-window-complete` only when each latest required exact query has a complete 15-card window and every ID from those latest runs has a completed official `videos.list` check. A hydrated browser candidate keeps `syndicationEvidence: "unknown"` and fails the `not-syndicated` hard gate until a real localhost-hosted `youtube-nocookie.com` iframe probe succeeds and a separate validated record promotes it to `syndicated: true` with `syndicationEvidence: "verified"`. After every hard gate passes, hydrated current view count orders eligible, non-rejected candidates descending; relevance score remains a gate diagnostic rather than an ordering key.

**Persistence, authentication, and authorization:** The input, checkpoint, report, import receipt, and later embed-verification records remain mode-`0600` files under ignored `.local/youtube-curation/` and are replaced atomically. The receipt durably stores browser query runs and candidate observations separately from official API query state and is sufficient to reconstruct every imported scoped checkpoint candidate. Each import reconciles the receipt into the checkpoint before processing new input, so interruption after receipt replacement but before checkpoint replacement is recoverable and idempotent. A schema-one receipt from the defective lazy-window collector is never treated as complete; the next valid schema-two import atomically supersedes it while preserving every already discovered or hydrated checkpoint candidate. The embed record is scoped to target, variation, and video ID and never transfers verification to another candidate. The commands have no Firebase user identity and no user-owned data boundary; authorization is local operator access to the repository and ignored state. They do not write Neon, Firebase, Vercel, production seeds, public documentation, completed official query keys, or API search counters. The importer reads the existing local YouTube API key only when official hydration is requested.

**Loading, empty, error, interrupted, and worst-case states:** A missing or whitespace-empty artifact produces a truthful no-op after any needed receipt-to-checkpoint recovery; it does not create a new receipt. Schema mismatches, malformed timestamps, invalid URLs, Shorts, unknown targets, unknown query text, negative, duplicate, or gapped result positions, a result count below 15, a false bounded-window claim, candidate/query-run timestamp mismatches, and conflicting scoped observations fail validation before new receipt mutation. Reimport is idempotent. An interrupted receipt/checkpoint sequence is repaired from the receipt on the next run. Missing required query runs or any latest-run candidate still awaiting an official metadata check leaves the target `discovery-incomplete`. If hydration is quota-blocked or omits an ID, the browser observation remains resumable and pending or records the existing checked-unavailable state without inventing metadata; unavailable IDs are never eligible. Imported candidates cannot erase prior official query provenance, hydration, rejection, review, or approval state. A browser result that later proves private, removed, non-embeddable, wrong movement/equipment, unsafe, redundant, or otherwise ineligible follows the existing stable rejection path.

**Phone, tablet, desktop, accessibility, and motion:** The importer is operator-only and adds no product layout, focus, screen-reader, dark-mode, reduced-motion, or touch behavior. Manual discovery evidence may come from any supported rendered browser viewport, but only standard video result cards count. Later product evidence still requires the existing responsive, keyboard-accessible, non-autoplay, one-active-player surface and direct-link fallback.

**Privacy and security:** The artifact stores no cookies, account identifiers, API keys, tokens, raw HTML, screenshots, transcripts, audio, provider project numbers, or private media. Terminal output is bounded to stable counts and validation fields and never prints the API key. Browser titles and channels are untrusted metadata, replaced by official hydration before eligibility, and never rendered as markup. The artifact and import receipt remain ignored; checked-in seed records may contain only the durable reviewed fields already allowed by the seed schema.

**Acceptance criteria, automated tests, and browser evidence:** Retain a failing test showing that a valid browser artifact cannot yet be imported, then pass it with normalized scoped insertion, preserved query/result provenance, and no official query completion or search-unit increase. Retain failures for duplicate import, Shorts, unsupported targets, malformed timestamps, unknown queries, gapped positions, below-15 windows, false bounded-window completion, conflicting scoped records, and interrupted persistence. A fail-first fixture matching the defective collector's 5–8 initially rendered cards with a false completion claim must be rejected. A complete exact-query manifest with 15 standard watch cards per query becomes `browser-window-complete` after every latest-run ID receives an official `videos.list` check, without changing official search accounting. Regression coverage proves an old complete run cannot hide a newer unchecked run, a missing or empty artifact is a no-op, receipt-first failure recovers the checkpoint, omitted hydration records unavailable truth, and target/variation evidence remains isolated. That fully hydrated but unverified pool must remain `needs-second-candidate` with `not-syndicated`; a separately embed-verified candidate may enter the eligible ranking. A separate fail-first ranking test must prove that a higher-relevance but lower-view eligible candidate ranks below a lower-relevance but higher-view eligible candidate; current view count is primary only after every hard gate passes. Rejected reviews must be absent from the reviewer-facing ranked list. Verify strict TypeScript, scoped lint, the complete YouTube proposal/approval matrix, documentation parity, regenerated private report, and a private command smoke using the recollected schema-v2 standard-video pool. Metadata-only browser evidence never satisfies approval; every API or browser-discovered selection requires scoped outside-YouTube embed evidence, complete visual playback, and one truthful instruction basis before manual approval, exact-two validation, or production seeding.

### Outside-YouTube embed verification plan

**User outcome and states:** An operator can prove that any API- or browser-discovered candidate plays outside youtube.com before it enters the eligible shortlist or can be approved. The private report distinguishes discovery completeness from candidate embed verification; a complete target can remain without an eligible pair until two candidates pass this gate.

**Domain, persistence, and authorization:** A scoped mode-`0600` record under `.local/youtube-curation/` stores the canonical exercise slug, variation ID, normalized video ID, verifier, verification timestamp, privacy-enhanced embed origin confirmation, playback-start confirmation, visible-controls confirmation, keyboard-control confirmation, and direct-fallback confirmation. The command records operator assertions after the browser probe; it does not navigate, play, or verify the browser itself, and its name and output must say `record`. Recording refuses an unknown or unhydrated candidate, an unavailable or non-embeddable candidate, missing flags, malformed timestamps, or a scope mismatch. Loading that validated record may set only that report candidate to `syndicated: true` and `syndicationEvidence: "verified"`; metadata import, watch-page playback, or another variation's record cannot do so. Manual `approved` review recording and `approved-for-seed` proposal status both require the same scoped embed record for every API- or browser-discovered candidate. The command has no Firebase or user-data boundary and never writes production.

**Failure recovery, accessibility, privacy, and evidence:** Atomic replacement preserves the prior file on interruption. Missing or invalid evidence leaves `not-syndicated` unchanged. Direct navigation to the embed URL is invalid evidence because YouTube can return Error 153 without an HTTP Referer. A private `pnpm youtube:probe-embed` command therefore serves a loopback-only HTTP page with an explicit `Referrer-Policy`, a responsive iframe of at least 560 by 315 CSS pixels when space allows, `https://www.youtube-nocookie.com/embed/VIDEO_ID?autoplay=0&controls=1&rel=0`, keyboard-operable controls, and a direct YouTube fallback. The operator must observe playback start there before using the separate `youtube:record-embed-verification` assertion recorder. Neither command claims to automate visual playback, and neither records cookies, tokens, raw frames, transcripts, audio, or private browser state. Invalid IDs fail before server startup; bind defaults to `127.0.0.1`; failure to load, Error 153, unavailable playback, missing controls, or absent fallback remains unverified. Tests inspect the localhost response headers, escaped markup, player parameters, dimensions, loopback bind, recorder naming, and variation-scoped evidence. Full-watch approval remains a separate later decision.

- Normalize accepted YouTube watch, short-link, and embed URLs to a video ID at the validated input boundary. Reject Shorts and malformed or unsupported hosts before persistence.
- Custom exercises accept zero, one, or two unique normalized IDs from HTTPS YouTube watch, short-link, or embed URLs. They reject raw IDs, duplicate normalized URLs, and more than two inputs before persistence. They never persist a caller-provided embed URL or markup.
- The curator's default target manifest is derived from every catalog record: exactly one target per catalog exercise, with stable `variationId: "canonical"`, a movement stem, useful aliases, and only relevant barbell/dumbbell discriminator terms. Bodyweight records do not require the word `bodyweight` in a title. A private `--targets` manifest may explicitly override this complete default, including an intentional empty array.
- Default and override target inputs are deduplicated by `canonicalExerciseSlug` plus `variationId`; the report and proposed pairs contain one target entry per such key. Pending hydration IDs are deduplicated across targets while candidate decisions remain target-specific.
- Official API discovery keeps relevance-ordered and view-count-ordered searches as separate candidate sources. Authorized rendered-browser discovery records its own complete three-query manifest without claiming either API order. Mechanical eligibility runs before ranking, then current hydrated view count orders the eligible survivors descending; relevance score remains diagnostic only.
- Pair proposals prefer a distinct channel when its mechanically eligible score is comparable, reject materially redundant second videos, and remain proposals until human review and full-watch confirmation.
- Mechanical gates reject unavailable, private, processing, non-embeddable, non-syndicated, regionally unavailable, live, unsafe, misleading, disallowed-category, wrong-movement, wrong-equipment, duplicate, near-duplicate, Shorts, and out-of-range duration candidates.
- The curator writes a local checkpoint and review report that contains query provenance, hydrated IDs, rejection codes, quota estimates, review state, ranked eligible candidates, proposed pairs, and any quota block. Configurable request and page budgets stop before the next API request would exceed the budget and preserve the next page token. Search and hydration request caps are independent within the total unit budget, so a stopped discovery pass can still hydrate already-discovered IDs without spending another search unit. Discovered candidates, review state, and rejection state are keyed by `canonicalExerciseSlug::variationId::videoId` so one video cannot overwrite another variation's state. If hydration omits a searched ID, the curator persists a checked unavailable candidate with `video-unavailable` and does not rehydrate it until an explicit refresh. Checkpoint schema changes reject incompatible unscoped state rather than silently reusing it.
- Seed validation derives one canonical variation for every catalog record when no required manifest is supplied. A supplied manifest must have unique keys, cover all default catalog mappings, and contain no unsupported or wrong variation. Validation requires exactly two distinct approved, fully watched videos in display order one and two for every required mapping, and each video ID must be unique across the entire production seed. Durable seed records keep approval and availability metadata, but do not treat view counts or ranking scores as product truth.
- Refresh assessment checks existing approved IDs for missing, private, restricted, non-embeddable, and non-syndicated states. It retains any available fallback and emits a replacement-required proposal without mutating the seed.
- A `syndicated` decision records whether the ID came through the filtered search or has verified evidence. Direct `videos.list` metadata without that evidence remains unknown and cannot be presented as syndicated.
- `pnpm seed:check` defaults to the complete catalog-derived requirement and invokes the typed seed validator used by the domain rather than maintaining a separate JavaScript validation implementation. `--required` is only a private manifest override; it cannot weaken catalog coverage.

## Loading, empty, error, and worst-case behavior

- Route loading uses meaningful skeletons with stable dimensions and accessible status text.
- Empty states distinguish no user data, filtered-out results, unavailable offline data, and intentionally blank optional fields.
- Validation errors remain adjacent to fields and preserve nonsecret input.
- Server and network errors return retryable codes and do not discard local drafts.
- Duplicate submits resolve to the original idempotent result.
- Stale program revisions reject edits with a comparison and reload path.
- Database or Firebase outages leave reads and local drafts honest, disable unsafe completion, and expose recovery actions.
- A removed or restricted video leaves the alternate approved video selectable, shows a direct YouTube fallback, and flags replacement review without silently changing the seed.

## Responsive behavior

- Phone layouts prioritize one active task, thumb-reachable actions, sticky runner progress, and full-width media.
- Tablet layouts support a prescription list beside the selected detail or editor inspector when space permits.
- Desktop layouts use a bounded reading width, persistent navigation, and side-by-side program or analytics context without stretching forms.
- Breakpoint changes preserve DOM order and reading order. No information is available only through hover.

## Accessibility

- Every route has one `h1`, a skip link, landmarks, logical heading levels, and a descriptive title.
- Tabs, dialogs, menus, timers, toasts, charts, and comboboxes implement keyboard and screen-reader semantics.
- Save status uses text and live regions with controlled announcement frequency.
- Charts include a tabular summary and never rely on color alone.
- Video selection labels title, channel, active state, and external fallback.
- Motion is purposeful and disabled or replaced when `prefers-reduced-motion` is active.
- Touch targets are at least 44 by 44 CSS pixels. Zoom to 200% does not obscure actions or content.

## Implementation slices

1. Foundation: repository, documentation parity, design direction, scaffold, lint, typecheck, unit harness, and seeded domain contracts.
2. Public catalog: starter program, equipment preview, day and exercise detail, library, dual-video component, sample workout, and sample analytics.
3. Identity and ownership: Firebase client/Admin sessions, eligibility, CSRF, protected layouts, profile, preferences, and IDOR tests.
4. Program editing: immutable revisions, equipment substitution confirmation, custom exercises, and YouTube URL normalization.
5. Runner and recovery: session snapshots, strength and cardio logs, timers, IndexedDB outbox, resume, and navigation protection.
6. Progress: history, records, calculations, analytics, conversion, ties, and accessible visualizations.
7. Account lifecycle: verification, recovery, sign-out, reauthentication, deletion saga, and local cleanup.
8. Curation and operations: YouTube API workflow, review, seed validation, removal refresh, deployment, budgets, observability, and recovery documentation.

Each slice must satisfy the plan, TDD, security review, responsive browser evidence, and documentation parity before merge.
