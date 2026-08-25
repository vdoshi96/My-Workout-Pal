# Project status

## Current phase

Authenticated-domain and persistence integration after the verified guest-product foundation.

## What exists

- A local Git repository on `main`.
- A fully inspected private reference recording, with temporary inspection artifacts outside the repository.
- The initial product record and context documentation.
- A strict Next.js 16.3.2 foundation with the approved route-atlas program overview, five day details, searchable compatibility-filtered library, exercise detail, read-only sample workout and analytics, truthful auth gate, offline fallback, self-hosted fonts, PWA manifest, service worker, and original icon assets.
- Pure starter-program, equipment-substitution, program-draft editing, library-filter, canonical exercise-metadata, safe authenticated-return, double-progression eligibility, and persisted-data analytics domains.
- A verified baseline commit, `168f2a5`, from which bounded analytics, YouTube, and database worktrees were created.
- Firebase web sign-in, registration, verification email, recovery, and Google UI paths are implemented behind configuration detection. Admin session creation uses revocation-aware token verification, recent-auth enforcement, same-origin double-submit CSRF, and secure HTTP-only cookies. No Firebase project is configured yet.
- A request-memoized viewer context is derived only from the revocation-aware Firebase Admin session result. It normalizes provider and display claims, keeps unverified password identities read-only, and never accepts a client-provided ownership key.
- A nonce-based strict Content Security Policy and companion browser security headers. Next.js request rendering applies a fresh nonce to framework output; the YouTube referrer and Firebase popup policies are explicit.
- Pure canonical-unit analytics cover volume, Epley estimated one-repetition maximum, exact ties, progress summaries, and presentation-only rounding.
- All 27 canonical starter exercises have original route cues, movement families, aliases, and primary-muscle metadata. Library search includes those fields while still applying equipment compatibility first.
- A database-neutral, deterministic seed manifest derives all six equipment rows, 27 catalog exercises, compatibility edges, aliases, and both five-day equipment revisions from the canonical product domain. It preserves the Lower-day “Heavy goblet squat” label as revision metadata without duplicating the catalog exercise.
- Canonical database rows have stable RFC 4122 version-five identities derived from a fixed public namespace and bounded seed keys, ready for an idempotent Neon seed transaction.
- Authentication return targets are normalized to bounded same-origin paths and reject protocol-relative, encoded-control, auth-loop, and external destinations.
- Double progression can only suggest considering a load increase after the exact number of weight-and-repetition work sets all reach the range top with form explicitly marked appropriate. It ignores warm-ups and never emits a load or increment.
- The service worker is generated from a tested public-cache policy. It caches only public program/library/sample routes, hashed Next static output, and explicit app artwork; authentication, APIs, future owned-data routes, arbitrary images, cross-origin assets, and non-GET requests remain outside the cache.
- Vercel project `vdoshi96s-projects/my-workout-pal` is linked locally as `prj_aHNqBtTx1irlbhNNvHTvynQkb0P9`. Neon resource `my-workout-pal-db` is connected on the Marketplace `free_v3` plan in `iad1`, with Neon Auth disabled and database variables attached to development, preview, and production. It has no deployment yet.
- Pure YouTube URL normalization, catalog-derived curation targets, candidate hard-gate/ranking, exact-two seed validation, and private resumable curation checkpoint modules with offline tests.
- A reusable curated-video presentation contract validates an approved, fully watched exact pair before mounting one privacy-enhanced non-autoplay iframe at a time. Production exercise pages remain unavailable until the reviewed seed exists.

## Work in progress

- Review the corrected database worktree after its cross-program persistence corrections completed.
- Finish and review correction passes for the YouTube curation workflow and pure interruption-safe runner state machine.
- Add owner-scoped repositories and authenticated program, runner, history, records, analytics, settings, and account-lifecycle surfaces after the schema corrections land.
- Verify the service worker and offline fallback against a production server rather than the development server.

## Verification run

- `ffprobe` verified the reference as a 96.52-second 392 by 850 H.264 video with AAC audio.
- A one-frame-per-second contact-sheet pass covered the full recording.
- Local Whisper transcription covered the full narration.
- The workspace inventory found only the private MP4 before initialization.
- GitHub target repository lookup confirmed that `vdoshi96/My-Workout-Pal` does not exist.
- Vercel CLI authentication succeeded for `vdoshi96` and listed the `vdoshi96s-projects` team.
- Vercel Marketplace provisioning reported Neon resource `my-workout-pal-db` ready on billing plan `free_v3`; a follow-up environment inspection confirmed database variables are attached without printing their values.
- `pnpm typecheck`, `pnpm lint`, 160 unit and integration tests, generated-service-worker parity, `pnpm docs:check`, and a production build pass after the reviewed YouTube and interruption-safe runner integrations plus deterministic seed identity.
- YouTube curation TDD evidence: the initial focused suites failed before implementation with unresolved domain-module imports, then passed; the first correction run failed on the unbounded page loop, syndication truth, custom-input message, and missing pair workflow, then passed; the second correction run failed on missing catalog targets, duplicate proposals, unscoped state, and accepted schema-one checkpoints, then passed; this final correction run failed six assertions covering omitted hydration, default seed coverage, duplicate required mappings, cross-variation seed IDs, default required derivation, and variation-scoped ranking, then passed with 37 tests.
- The default curation smoke generated 27 canonical proposals without making a request under a zero-search budget. An explicit empty target manifest produced a blocked report with zero proposals. The default `seed:check` path rejected an incomplete one-row fixture with all 27 required-video-count errors, and the duplicate-required manifest smoke reported duplicate and missing-required-variation errors. The typed `seed:check` smoke passed a two-video fixture in the preceding correction run.
- `next build --webpack` completed successfully. The default Turbopack build hung during compile and is recorded in `docs/context/DECISIONS.md`.
- Production `next start` inspection returned the strict CSP, a unique matching rendered nonce, `strict-origin-when-cross-origin`, popup-safe opener policy, frame denial, HSTS, and the remaining declared security headers. The nonce policy intentionally makes application HTML request-rendered; the manifest remains static.
- The production output retains the design contract seed `ba529732` and its full contract text inside the first authored body element.
- Playwright CLI personally replayed the guest equipment switch, Pull substitution, day links, library compatibility search and recovery, exercise detail approval gate, and desktop sample analytics. Phone inspection found and verified fixes for the desktop navigation overlap, mobile route stamp collision, dev watcher loop, and exercise-detail horizontal overflow.
- A production-server Playwright replay on Chromium phone confirmed that an opened Push route reloads from the public cache with the network disabled, `/sign-in` is absent from that cache, and the app announces the interruption after a same-origin reachability probe. The equivalent service-worker-control case is skipped on WebKit because Playwright documents service-worker support as Chromium-only; ordinary WebKit product flows remain part of the broader browser matrix.
- Auth tests cover duplicate and invalid client errors, CSRF mismatch and cross-origin denial, malformed identity input, absent server credentials, unverified permanent mutations, recent-auth deletion gates, expired and revoked sessions, and cross-user denial. Live provider success cannot run before Firebase credentials exist.

## Blockers and credential gates

- GitHub CLI reports that the stored `vdoshi96` token is invalid. Repository creation and push require reauthentication unless another authorized credential path succeeds.
- Firebase project and Admin credentials are absent.
- `YOUTUBE_API_KEY` is absent. `pnpm youtube:curate` refuses to run without it. Offline normalization, mechanical eligibility, ranking, checkpoint, and seed-validation tests do not require the key; discovery, quota-backed metadata hydration, final candidate selection, approval, exact-two production seed, and live production embed verification remain blocked.
- No paid configuration changes are authorized.

## Worktrees

- The completed analytics worktree was integrated as `fedfba4` and removed after patch-equivalence verification.
- The completed YouTube worktree was integrated through `6b633b0`; its selected files matched the reviewed worktree before cleanup.
- `/private/tmp/mwp-database` on `agent/database`: final schema correction is in progress for curated-video variation, snapshot target shape, bounded set positions, tied PR sources, and published active revisions.
- The completed runner worktree was integrated through `785db9a`; its selected files matched the reviewed worktree before cleanup.
