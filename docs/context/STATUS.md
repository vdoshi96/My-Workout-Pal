# Project status

## Current phase

Authenticated repositories and runner-surface integration after the verified guest-product and Neon bootstrap foundations.

## What exists

- A local Git repository on `main`.
- A fully inspected private reference recording, with temporary inspection artifacts outside the repository.
- The initial product record and context documentation.
- A strict Next.js 16.3.2 foundation with the approved route-atlas program overview, five day details, searchable compatibility-filtered library, exercise detail, read-only sample workout and analytics, truthful auth gate, offline fallback, self-hosted fonts, PWA manifest, service worker, and original icon assets.
- Pure starter-program, equipment-substitution, program-draft editing, library-filter, canonical exercise-metadata, safe authenticated-return, double-progression eligibility, and persisted-data analytics domains.
- A verified baseline commit, `168f2a5`, from which bounded analytics, YouTube, and database worktrees were created.
- Firebase web sign-in, registration, verification email, recovery, and Google UI paths are implemented behind configuration detection. Admin session creation uses revocation-aware token verification, recent-auth enforcement, same-origin double-submit CSRF, and secure HTTP-only cookies. No Firebase project is configured yet.
- A request-memoized viewer context is derived only from the revocation-aware Firebase Admin session result. It normalizes provider and display claims, keeps unverified password identities read-only, and never accepts a client-provided ownership key.
- An isolated owner-scoped workout repository and private workout API support start or resume, resumable-session reads, and idempotent runner operations. The route layer validates CSRF before authentication, authenticates before body parsing or database construction, rejects client ownership and lifecycle fields, enforces a 32 KiB body limit, returns `no-store`, and maps foreign resources and persistence failures to safe responses. Runner submissions carry the immutable base revision without a client outcome version; the server derives ownership and delegates through the runner-specific repository path. The browser adapter emits only that owner-free envelope and rejects malformed success responses before the runner can claim a save.
- A nonce-based strict Content Security Policy and companion browser security headers. Next.js request rendering applies a fresh nonce to framework output; the YouTube referrer and Firebase popup policies are explicit.
- Pure canonical-unit analytics cover volume, Epley estimated one-repetition maximum, exact ties, progress summaries, and presentation-only rounding.
- All 27 canonical starter exercises have original route cues, movement families, aliases, and primary-muscle metadata. Library search includes those fields while still applying equipment compatibility first.
- A database-neutral, deterministic seed manifest derives all six equipment rows, 27 catalog exercises, compatibility edges, aliases, and both five-day equipment revisions from the canonical product domain. It preserves the Lower-day “Heavy goblet squat” label as revision metadata without duplicating the catalog exercise.
- Canonical database rows have stable RFC 4122 version-five identities derived from a fixed public namespace and bounded seed keys. The checked-in migration and transactional seeder have been applied to Neon, rerun without material change, and verified read-only.
- The complete bounded Drizzle schema is integrated: 30 user, catalog, template, program, immutable workout, idempotency, personal-record, progress-summary, and account-deletion tables plus composite ownership constraints and publication/history guards.
- Authentication return targets are normalized to bounded same-origin paths and reject protocol-relative, encoded-control, auth-loop, and external destinations.
- Double progression can only suggest considering a load increase after the exact number of weight-and-repetition work sets all reach the range top with form explicitly marked appropriate. It ignores warm-ups and never emits a load or increment.
- The service worker is generated from a tested public-cache policy. It caches only public program/library/sample routes, hashed Next static output, and explicit app artwork; authentication, APIs, future owned-data routes, arbitrary images, cross-origin assets, and non-GET requests remain outside the cache.
- Vercel project `vdoshi96s-projects/my-workout-pal` is linked locally as `prj_aHNqBtTx1irlbhNNvHTvynQkb0P9`. Neon resource `my-workout-pal-db` is connected on the Marketplace `free_v3` plan in `iad1`, with Neon Auth disabled and database variables attached to development, preview, and production. The database is migrated and seeded; the Vercel project has no deployment yet.
- Pure YouTube URL normalization, catalog-derived curation targets, candidate hard-gate/ranking, exact-two seed validation, and private resumable curation checkpoint modules with offline tests.
- A reusable curated-video presentation contract validates an approved, fully watched exact pair before mounting one privacy-enhanced non-autoplay iframe at a time. Production exercise pages remain unavailable until the reviewed seed exists.

## Work in progress

- Integrate the isolated workout repository and private route checkpoint with the authenticated shell and active runner after the user authorizes a merge.
- Connect runner operations to the private API and replay authenticated start, resume, save, retry, completion, and interruption flows after Firebase and database test credentials are available.
- Verify the service worker and offline fallback against a production server rather than the development server.

## Verification run

- `ffprobe` verified the reference as a 96.52-second 392 by 850 H.264 video with AAC audio.
- A one-frame-per-second contact-sheet pass covered the full recording.
- Local Whisper transcription covered the full narration.
- The workspace inventory found only the private MP4 before initialization.
- GitHub target repository lookup confirmed that `vdoshi96/My-Workout-Pal` does not exist.
- Vercel CLI authentication succeeded for `vdoshi96` and listed the `vdoshi96s-projects` team.
- Vercel Marketplace provisioning reported Neon resource `my-workout-pal-db` ready on billing plan `free_v3`; a follow-up environment inspection confirmed database variables are attached without printing their values.
- Direct type checking, lint, 189 unit and integration tests, generated-service-worker parity, documentation parity across 21 Markdown/HTML pairs, Drizzle metadata validation, and a production build pass after the reviewed YouTube, runner-domain, database-schema, and deterministic seed integrations.
- Database bootstrap TDD retained the missing-seeder failure, then passed three PGlite integration tests covering empty publication, byte-stable rerun, catalog-drift rollback, and missing published-child refusal.
- Live Neon evidence: `db:migrate` passed against the provisioned empty database; `db:seed` passed twice with identical counts; `db:verify` then confirmed 6 equipment rows, 27 exercises, 44 compatibility edges, 54 aliases, 2 published revisions, 10 days, 26 sections, 60 prescriptions, 20 cardio choices, and 0 approved videos. Connection values were not printed.
- YouTube curation TDD evidence: the initial focused suites failed before implementation with unresolved domain-module imports, then passed; the first correction run failed on the unbounded page loop, syndication truth, custom-input message, and missing pair workflow, then passed; the second correction run failed on missing catalog targets, duplicate proposals, unscoped state, and accepted schema-one checkpoints, then passed; this final correction run failed six assertions covering omitted hydration, default seed coverage, duplicate required mappings, cross-variation seed IDs, default required derivation, and variation-scoped ranking, then passed with 37 tests.
- The default curation smoke generated 27 canonical proposals without making a request under a zero-search budget. An explicit empty target manifest produced a blocked report with zero proposals. The default `seed:check` path rejected an incomplete one-row fixture with all 27 required-video-count errors, and the duplicate-required manifest smoke reported duplicate and missing-required-variation errors. The typed `seed:check` smoke passed a two-video fixture in the preceding correction run.
- `next build --webpack` completed successfully. The default Turbopack build hung during compile and is recorded in `docs/context/DECISIONS.md`.
- Production `next start` inspection returned the strict CSP, a unique matching rendered nonce, `strict-origin-when-cross-origin`, popup-safe opener policy, frame denial, HSTS, and the remaining declared security headers. The nonce policy intentionally makes application HTML request-rendered; the manifest remains static.
- The production output retains the design contract seed `ba529732` and its full contract text inside the first authored body element.
- Playwright CLI personally replayed the guest equipment switch, Pull substitution, day links, library compatibility search and recovery, exercise detail approval gate, and desktop sample analytics. Phone inspection found and verified fixes for the desktop navigation overlap, mobile route stamp collision, dev watcher loop, and exercise-detail horizontal overflow.
- A production-server Playwright replay on Chromium phone confirmed that an opened Push route reloads from the public cache with the network disabled, `/sign-in` is absent from that cache, and the app announces the interruption after a same-origin reachability probe. The equivalent service-worker-control case is skipped on WebKit because Playwright documents service-worker support as Chromium-only; ordinary WebKit product flows remain part of the broader browser matrix.
- Auth tests cover duplicate and invalid client errors, CSRF mismatch and cross-origin denial, malformed identity input, absent server credentials, unverified permanent mutations, recent-auth deletion gates, expired and revoked sessions, and cross-user denial. Live provider success cannot run before Firebase credentials exist.
- The isolated workout branch passes 30 test files and 247 tests serially, strict TypeScript, full ESLint, Drizzle metadata validation, generated-service-worker parity, documentation parity, and the Next.js Webpack production build. The server API contract contributes 20 tests, and the browser adapter contributes 10 tests. A local production-server smoke observed `401` with `no-store` for an unauthenticated resume and `403` with `no-store` for a cross-origin start.

## Blockers and credential gates

- GitHub CLI reports that the stored `vdoshi96` token is invalid. Repository creation and push require reauthentication unless another authorized credential path succeeds.
- Firebase project and Admin credentials are absent.
- `YOUTUBE_API_KEY` is absent. `pnpm youtube:curate` refuses to run without it. Offline normalization, mechanical eligibility, ranking, checkpoint, and seed-validation tests do not require the key; discovery, quota-backed metadata hydration, final candidate selection, approval, exact-two production seed, and live production embed verification remain blocked.
- No paid configuration changes are authorized.
- The user requires explicit approval before any push, merge, deployment, or production mutation. The verified workout checkpoint remains local and isolated.

## Worktrees

- The completed analytics worktree was integrated as `fedfba4` and removed after patch-equivalence verification.
- The completed YouTube worktree was integrated through `6b633b0`; its selected files matched the reviewed worktree before cleanup.
- The completed database worktree was integrated through `ff3d69c`, compared for selected-file equality, and removed.
- The completed runner worktree was integrated through `785db9a`; its selected files matched the reviewed worktree before cleanup.
- `/private/tmp/mwp-workout-repository` on `agent/workout-repository`: the owner-scoped repository, private API, and strict browser adapter are verified through local commit `e0f00f5` and await explicit merge authorization. This is the only non-main worktree.
