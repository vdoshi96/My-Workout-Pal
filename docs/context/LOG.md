# Project log

## 2026-08-25: Persisted workout resume recovery

- Retained a missing-module failure before hydrating immutable server snapshots, set and cardio logs, notes, outcomes, and compatible substitutions into runner state.
- Retained a completed-without-set failure before rejecting persisted outcome contradictions.
- Reconstructed confirmed operations from server idempotency keys, derived canonical drafts for all four measurement kinds, and selected the first unfinished runner position.
- Retained five missing-function failures before reconciling an owner-matched offline draft with the server baseline.
- Preserved unrelated cross-tab progress, recognized interrupted responses that the server confirmed, overlaid only unresolved local targets, and converted unconfirmed local success to a nonretryable conflict.
- Passed 16 resume tests, the 30-test resume and PGlite repository slice, 31 test files and 263 branch tests, strict TypeScript, full ESLint, Drizzle validation, generated-service-worker parity, documentation parity, and the Next.js Webpack production build. Kept hydration commit `835894a` and reconciliation commit `7f941a7` local.

## 2026-08-25: Strict runner API client adapter

- Retained a fail-first missing-module result before implementing the browser runner API adapter.
- Mapped each queued operation to a route-scoped body that contains only the idempotency key, immutable base revision, kind, and payload.
- Rejected corrupt queued identities and malformed `saved`, `duplicate`, or `failed` responses instead of letting the runner claim an unverified save.
- Preserved private-client network errors so the runner can classify offline and authentication interruptions without discarding its local draft.
- Passed 10 client adapter tests, the 30-test client and server transport slice, 30 test files and 247 branch tests, strict TypeScript, full ESLint, Drizzle validation, generated-service-worker parity, documentation parity, and the Next.js Webpack production build. Kept implementation commit `e0f00f5` local.

## 2026-08-25: Runner outbox transport alignment

- Compared the integrated runner outbox with the isolated private API and found that the route required a client outcome version that the runner doesn't store.
- Retained six failing API assertions that returned `400` for the real base-revision envelope before correcting the route.
- Changed the route to accept the immutable base revision, derive the owner and internal lifecycle fields on the server, and call the runner-specific repository entry point without trusting a client outcome version.
- Added strict rejection tests for client `ownerUid`, `expectedVersion`, `sequence`, and `status` fields, plus structured conflict-response coverage for offline recovery.
- Passed 20 API contract tests, the 34-test API and PGlite repository slice, 29 test files and 237 branch tests, strict TypeScript, full ESLint, Drizzle validation, generated-service-worker parity, documentation parity, and the Next.js Webpack production build. Kept plan commit `3dd44ab` and implementation commit `8747b5b` local.

## 2026-08-25: Private workout API boundary

- Retained a fail-first test that couldn't resolve the private workout API module, then implemented start or resume, resume-read, and runner-operation route handlers.
- Enforced CSRF before viewer resolution, viewer eligibility before body parsing, a 32 KiB request limit, strict owner-free Zod payloads, canonical measurement shapes, and lazy database construction.
- Returned `no-store` on success and failure, hid foreign workout ownership behind `404`, preserved expired-session responses, and mapped unexpected persistence errors without exposing internal details.
- Passed 16 API contract tests, the 28-test API and PGlite repository slice, 29 test files and 231 branch tests, strict TypeScript, full ESLint, Drizzle validation, generated-service-worker parity, documentation parity, and a Next.js Webpack production build.
- Observed the built server return `401` with `no-store` for an unauthenticated resume and `403` with `no-store` for a cross-origin start. Kept commit `bd6fd4c` local on `agent/workout-repository` because merge, push, and deployment require explicit user approval.

## 2026-08-25: Transactional Neon bootstrap

- Wrote the operator plan before implementation, then retained the focused missing-module failure before adding the seeder.
- Added checked-in migrate, seed, and read-only verification commands. The transactional seed inserts catalog truth, constructs template revisions as drafts, writes and verifies their complete child graphs, and only then publishes them.
- Proved empty bootstrap, byte-stable rerun, catalog-drift rollback, and refusal to repair missing immutable published history in PGlite against the real migration.
- Applied the migration to the provisioned Neon database, seeded twice with identical counts, and verified the graph read-only. The live database contains 6 equipment records, 27 exercises, 44 compatibility edges, 54 aliases, 2 revisions, 10 days, 26 sections, 60 exercise prescriptions, 20 cardio prescriptions, and no invented approved videos.
- Kept the connection string in ignored environment storage and recorded only sanitized outcomes.

## 2026-08-25: Deterministic seed identity

- Retained a missing-module failure before adding the canonical seed identity helper; three focused tests then passed with type checking and lint.
- Derived stable RFC 4122 version-five UUIDs from a public application namespace, entity kind, and stable key so reruns cannot duplicate catalog or template identity.
- Kept the namespace nonsecret and rejected blank or ambiguous identity input.

## 2026-08-25: Interruption-safe runner domain

- Integrated the directly reviewed runner snapshot, set/cardio draft, rest timer, IndexedDB-compatible storage, owner namespace, idempotent outbox, conflict, auth-expiry, offline, substitution, skip, completion, and abandonment contracts.
- Returned the slice twice after review found completion mutability and terminal-retry races. The final correction revalidates completion retries, supersedes later work when abandonment is retried, restores immutable transitional states, and stops sync after terminal acceptance.
- Retained fail-first regression evidence across each correction pass. The combined application now passes 157 tests plus type checking, lint, generated PWA and documentation parity, and the production build.

## 2026-08-25: Curated dual-video player contract

- Retained a missing-module failure before implementing the production video-pair and embed contract; four focused tests then passed.
- Required one exact, ordered, approved, fully watched pair with durable title, channel, reviewer, and review-time metadata before rendering.
- Added a one-active-at-a-time privacy-enhanced player with non-autoplay controls, keyboard-operable selection, channel attribution, strict referrer behavior, and a direct YouTube fallback.
- Kept production exercise pages in the truthful unavailable state because no reviewed seed exists yet.

## 2026-08-25: Server-derived viewer boundary

- Added a request-memoized viewer context whose ownership key comes exclusively from a revocation-aware Firebase Admin session-cookie result.
- Normalized Google, password, and other providers without promoting malformed display, email, verification, or authentication-time claims.
- Kept unverified password identities in a truthful read-only state for permanent mutations.
- Recorded a fail-first missing-module test before implementing the boundary; three focused viewer tests, type checking, and focused lint then passed.

## 2026-08-25: Free Neon provisioning

- Confirmed from official Neon documentation and live Vercel Marketplace metadata that the current integration exposes a distinct `free_v3` plan.
- Provisioned `my-workout-pal-db` in `iad1`, disabled Neon Auth in favor of Firebase identity, and connected development, preview, and production environments.
- Kept connection values only in ignored local and Vercel environment storage; no secret value was printed into project documentation or committed.
- Removed the Marketplace CLI's task-created agent-skill artifacts instead of publishing unrelated third-party instructions.

## 2026-08-25: Canonical database seed manifest

- Retained a fail-first missing-module test before implementing the database-neutral starter seed manifest.
- Derived equipment, catalog, compatibility, aliases, two equipment-profile template revisions, five exact days, section order, editable prescriptions, and walker/runner cardio from the canonical product domain.
- Kept canonical exercise records reusable across profiles and days; the Lower-day “Heavy goblet squat” wording remains revision display metadata rather than a duplicate exercise.
- Four focused seed tests, type checking, and focused lint passed.

## 2026-08-25: Discovery and bootstrap

- Inventoried the initial workspace and found one private MP4 with no Git repository or portable application.
- Inspected the entire 96.52-second recording through full audio transcription and one-frame-per-second visual contact sheets.
- Confirmed that the recording demonstrates workflow intent rather than a complete application.
- Verified active Vercel CLI access for `vdoshi96` and a missing target GitHub repository.
- Recorded absent GitHub, Firebase, Neon, and YouTube credential gates without storing secret values.
- Initialized local Git on `main` and created the first durable product and project context.

## 2026-08-25: Guest route foundation

- Selected and implemented the original training-route-atlas direction after comparing three generated comps and grounded reference boards.
- Added the exact five-day dumbbell and barbell starter programs with immutable substitution behavior and retained fail-then-pass tests.
- Replayed the route in a real browser and corrected navigation overlap, mobile stamp collision, a Playwright artifact watcher loop, and horizontal detail overflow from observed evidence.
- Added the compatibility-filtered exercise library, truthful two-slot video approval state, read-only sample workout and analytics, guarded sign-in surface, PWA manifest, public-only service-worker cache, and offline fallback.
- Recorded baseline commit `168f2a5` and created isolated analytics, YouTube, and database worktrees for bounded implementation.

## 2026-08-25: Authentication boundary

- Added fail-then-pass policy tests for CSRF, verified identity, recent authentication, ownership, and session failure classification.
- Added Firebase client flows for Google and email registration, sign-in, verification, and recovery with safe duplicate, invalid-credential, throttling, pop-up, and network messages.
- Added Firebase Admin token verification and HTTP-only session endpoints. The server derives UID from verified claims, checks token revocation, requires recent authentication when creating a long-lived session, and never accepts client ownership.
- Kept live sign-in closed behind explicit public and Admin credential checks; no Firebase project was created and no secret entered the repository.

## 2026-08-25: Analytics, editing, and response security

- Integrated and personally reviewed canonical-unit analytics for volume, estimated strength, exact personal-record ties, conversion, rounding, and time-zone-aware summaries.
- Retained a failing-first program-editor suite, then implemented stable draft keys, keyboard-equivalent reorder normalization, precise validation, stale-revision rejection, and non-mutating publication preparation.
- Replaced static baseline headers with a per-request nonce Content Security Policy using the current Next.js 16 Proxy boundary and request-time rendering.
- Built the production application and inspected a real `next start` response. The CSP nonce matched rendered output, production contained no unsafe inline or evaluation directive, and the YouTube referrer policy remained compliant.
- Linked the local checkout to the empty Vercel project `vdoshi96s-projects/my-workout-pal` without deploying, connecting Neon, or changing billing controls.
- Returned the first database and YouTube slices for correction after direct diff review found cross-program revision gaps, missing custom equipment and aliases, missing volume-record persistence, a weaker executable curation path, and incomplete pair and refresh behavior.

## 2026-08-25: Canonical exercise metadata and safe return paths

- Added original route cues, movement families, aliases, and primary-muscle metadata for all 27 canonical starter exercises.
- Expanded compatibility-first library search to discover exercises by equipment, movement family, alias, and primary muscle without introducing medical claims.
- Added a bounded same-origin authentication return-path policy that rejects external, protocol-relative, encoded-control, API-session, and sign-in-loop targets.
- Removed the completed analytics worktree after verifying that its patch exactly matched the integrated commit.

## 2026-08-25: Bounded double progression

- Retained a missing-module failing test before adding the double-progression evaluator.
- Limited load-increase suggestions to a complete weight-and-repetition prescription whose every work set reaches the range top with appropriate form explicitly recorded.
- Kept warm-ups outside the decision and returned a nonnumeric advisory result rather than prescribing a load or increment.

## 2026-08-25: Generated public-only PWA cache

- Retained a missing-module failing test before adding a cache policy for public navigation, static output, and explicit app artwork.
- Stopped caching arbitrary same-origin images and limited cache cleanup to obsolete My Workout Pal public-cache versions.
- Added deterministic `pwa:build` and `pwa:check` commands so the shipped worker must match the tested policy.
- Replayed the worker against a production server and retained the failure that showed `navigator.onLine` remained true during a cached offline navigation.
- Replaced the unreliable single signal with a same-origin manifest reachability probe, then verified the real cached Push route, private-cache denial, and offline announcement in Chromium phone.
