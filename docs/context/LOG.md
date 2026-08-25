# Project log

## 2026-08-25: Durable account-deletion boundary

- Retained a missing-module failure, then added the strict owner-free deletion request, stable intent hash, monotonic database/Firebase saga transitions, and safe provider-error classification with five passing domain tests.
- Retained the missing migration failure, then removed the deletion job's restrictive profile foreign key and added bounded phase, retry-key, request-hash, and completion-shape constraints.
- Proved in PGlite that the minimal saga row survives profile deletion, invalid metadata is rejected, and a legacy job causes an actionable migration refusal rather than guessed state. The migration remains local and unapplied to Neon.
- Added the server-only account-deletion repository with verified/recent/provider viewer gates, a strict owner-free request, an explicit foreign-key deletion order, and one transaction that preserves the durable job while deleting profile, preference, equipment, custom-exercise, program, workout, record, summary, and mutation-idempotency data.
- Replaced immutable-history trigger functions with a deletion-only, transaction-local, exact-owner exception. Ordinary history deletion still fails, and an Alice-scoped transaction cannot delete Bob's row.
- Closed the simultaneous-first-request race by re-reading the durable job after acquiring the profile lock, so a waiting retry resumes the first transaction's Firebase phase even though the profile has been removed.
- Passed 35 focused domain, schema, and PGlite repository assertions covering exact-owner/global preservation, late rollback, concurrent replay, post-profile retry, Firebase failure/resume/completion, and authentication gates, plus strict TypeScript, scoped lint, and Drizzle validation. No migration, Firebase call, push, merge, or deployment was performed.
- Retained a missing-service failure before adding Firebase/database orchestration that resolves Admin configuration before database work, deletes only the viewer UID, treats `auth/user-not-found` as completed replay, and never returns raw provider detail.
- Retained a missing-route failure before adding private `DELETE /api/app/account` with CSRF, server identity, strict 2 KiB owner-free input, safe private output, partial-Firebase retry truth, and session/CSRF expiry only after durable completion.
- Passed 10 focused service and direct-route assertions. Completion-write failure stays distinct from provider failure and leaves a durable running job; a trusted reconciler and the Settings reauthentication/client-cleanup flow remain required. No credential-backed provider call or external mutation was performed.
- Retained the production-build failure that rejected a test factory exported from an App Router route module, moved the factory to the server HTTP layer, and passed the replayed tests, strict type checking, scoped lint, and webpack build with `/api/app/account` listed as a dynamic route.
- Retained a missing-client-module failure before implementing exact-confirmation, same-UID provider reauthentication, forced ID-token refresh, secure-session replacement, server completion, owner-only IndexedDB cleanup, and Firebase client sign-out as one ordered orchestration contract.
- Replaced the disabled Settings placeholder with a phone-safe scrolling review dialog, sticky actions, keyboard focus, explicit impact list, password/Google-specific UI, live progress, partial retry, exact `DELETE` gate, active-request unload protection, and post-completion cleanup warnings.
- Direct review caught and closed an adapter race that could have reused the earlier Firebase user object if the live client user disappeared or changed before reauthentication. Twenty-two focused client/API/storage assertions cover popup cancellation and post-deletion sign-out failure in addition to the owner cleanup gates; strict TypeScript, scoped lint, and the production build pass. Live provider and browser evidence remain blocked by absent Firebase configuration, and no external state changed.
- Planned the trusted completion reconciler as a server-only, dry-run-default operator command. It may mark a locked Firebase-phase job complete only after Firebase Admin reports that exact job UID absent; it never deletes an existing identity, exposes a public route, prints raw ownership/provider detail, or applies to production without separate approval.

## 2026-08-25: Immutable program publication repository

- Retained a failing-first API and PGlite repository suite before adding the publication method.
- Added one shared strict publication schema with canonical five-day order, bounded prescription/cardio fields, exercise-reference XOR, unique source-prescription identities, and no client ownership or measurement-kind field.
- Published the edited graph in one owner-scoped transaction after locking the active program revision. Canonical catalog data or the viewer's custom exercise supplies logging meaning and required equipment; foreign and incompatible references fail without advancing the pointer.
- Kept the prior published revision unchanged, preserved target metadata only when a source prescription retains the same exercise identity, and generated all new revision child identifiers independently.
- Verified idempotent replay, changed-payload key conflict, stale base, unverified mutation, cross-user custom exercise, incompatible equipment, graph immutability, and rollback with 23 focused tests plus TypeScript and scoped lint.
- Added the private `POST /api/app/program/publish` boundary with same-origin CSRF, bounded strict JSON, a server-derived viewer, private no-store output, and route-order tests that reject cross-origin or unauthenticated requests before body or storage access.
- Added the protected program editor with phone-first day navigation, labeled prescription/cardio fields, explicit reorder controls, dirty-navigation protection, validation focus, retry-stable publication, stale-conflict copy, and a clear handoff to the separate equipment substitution confirmation.
- Independently re-ran the isolated workout repository's focused and complete matrices, inspected its final ownership, snapshot, idempotency, previous-value, history, and transaction boundaries, and marked the clean branch ready for a separately authorized local merge without merging, pushing, deploying, or changing production.
- Retained a five-test missing-behavior failure, then added immutable movement add/replace/remove transforms, section-and-logging defaults, bounded candidate search, same-meaning target retention, cross-meaning resets, and a distance-target publication gate.
- Connected a keyboard-usable modal chooser to deterministic compatible catalog candidates and owner-scoped compatible custom exercises. Selection stays in the local draft; publication still re-resolves identity, ownership, equipment, and logging shape inside the immutable transaction.
- Retained a missing-helper failure before adding stable client-only identifiers for new rows. The passing correction keeps focus attached through reorder and strips only those local identifiers from an immutable publication copy before validation or transport.

## 2026-08-25: Conflict-safe settings and sign-out

- Added owner-scoped preference updates for units, IANA time zone, and reduced motion with strict input, verification gating, row locking, expected-update timestamps, stable idempotent replay, and stale-page conflict refusal.
- Added a private same-origin CSRF endpoint and protected Settings surface. Unit copy distinguishes presentation conversion from canonical kilogram and meter storage, while equipment changes return to the Program revision workflow.
- Implemented sign-out ordering that clears only the active Firebase UID’s IndexedDB workout namespace before deleting the secure HTTP-only session and signing out the configured Firebase client.
- Kept account deletion visibly closed instead of simulating success while its recent-auth, database saga, Firebase failure-retry, and credential-backed paths remain unimplemented.
- Retained missing preference-method and missing-route/schema failures before implementation. Twenty-eight focused repository, API contract, and authorization-order assertions pass. Current main passes 39 files and 268 tests, strict type checking, full lint, Drizzle/PWA/documentation parity, and the production build. A parallel resource-contention timeout in the initial PGlite schema case passed alone and on full sequential replay.

## 2026-08-25: Authenticated compatible library

- Added a first-class Library destination to the protected account shell and a private dynamic route that derives the active equipment profile from the owner-scoped program read model.
- Combined the canonical compatibility-first catalog with only that viewer’s private custom exercises, including name, alias, equipment, and logging-kind search without accepting a client ownership key.
- Kept canonical and private detail destinations distinct, preserved a truthful no-results state, and bounded the URL query before filtering.
- Retained a missing custom-filter failure before implementation; seven focused library and nested-navigation assertions, strict TypeScript, and focused lint pass.

## 2026-08-25: Authenticated profile, program, and equipment surface

- Integrated the owner-scoped onboarding and active-program repository only after direct review found and corrected a global substitution rule that would have changed required Push and Legs movements. Both directions now assert every exercise across all five starter days.
- Added server-derived profile, preferences, equipment, and active-revision reads; transactionally cloned the exact starter; required valid IANA time zones; preserved owner custom exercises and compatible values; rejected incompatible custom exercises without writes; and made equipment confirmation depend on the previewed base revision.
- Consolidated guest and persisted equipment behavior behind one explicit day-and-section rule, then added a private read-model equipment projection so custom compatibility is known before confirmation.
- Added strict private profile/program endpoints with bounded JSON, same-origin double-submit CSRF, owner-free envelopes, UUID validation, no-store responses, stable errors, and authentication before database access or body parsing.
- Added one-step verified onboarding, exact substitution disclosure, active five-day overview, owned day detail, retry-stable saves, stale-conflict copy, and honest disabled runner state pending the separate workout repository integration.
- Retained the API authorization-order failure and the over-broad preview failure before correction. The focused profile, route, contract, and preview matrix passes 31 assertions; current main passes 39 test files and 263 tests, strict type checking, full lint, Drizzle, PWA and 23-pair documentation parity checks, and the production webpack build.

## 2026-08-25: Authenticated custom-exercise editor

- Mounted an authenticated private-library list plus create and edit routes without exposing the Firebase ownership key in any route or mutation input.
- Added all four logging meanings, required-equipment selection, bounded instructions and aliases, and zero-to-two normalized YouTube references with explicit custom-video policy copy.
- Kept unverified accounts read-only, reused idempotency keys across interrupted retries, advanced optimistic timestamps after every successful edit, and rendered server conflict, in-use, auth, and network outcomes instead of synthetic success.
- Added an explicit deletion review state with focus movement and a guarded result, plus a same-origin client mutation helper that bootstraps CSRF for each permanent request.
- Passed eight focused client, API-body, authorization-order, cache, and CSRF assertions with regenerated route types, strict type checking, focused lint, and diff validation.

## 2026-08-25: Private custom-exercise API

- Added authenticated `no-store` collection and resource handlers for owner-scoped custom exercise reads, creation, optimistic updates, and guarded deletion.
- Required same-origin double-submit CSRF before every mutation, bounded request bodies before JSON parsing, strict input envelopes, server-derived viewer identity, and UUID validation before database queries.
- Preserved stable repository validation, verification, conflict, in-use, and foreign-or-missing responses without returning SQL or credential detail.
- Retained the initial direct-route request-context failure, then supplied an explicit null-viewer test boundary and passed six focused body-size, malformed-input, identifier, cache, CSRF, and authentication assertions with type checking and lint.

## 2026-08-25: Protected account shell

- Added the server-protected `/app` route group around the revocation-aware `ViewerContext`; an absent, expired, or revoked session returns to the bounded sign-in path rather than rendering private scaffolding.
- Added a responsive account shell with explicit verified versus read-only identity status, phone bottom navigation, desktop rail navigation, skip-link support, semantic current-page state, and truthful loading and retry boundaries.
- Kept account navigation outside the public service-worker cache policy, so private HTML is neither precached nor runtime cached.
- Added focused route-selection tests and regenerated Next route types before type checking and focused lint.

## 2026-08-25: Owner-scoped custom exercises

- Retained missing-module failures before adding the custom-exercise domain and repository boundaries.
- Normalized bounded names, instructions, aliases, equipment, logging kinds, and zero-to-two YouTube URLs into durable video IDs without fetching user-provided links.
- Added server-only create, read, list, update, and delete operations that derive ownership from `ViewerContext`, deny unverified permanent changes, reserve owner-scoped idempotency keys transactionally, hide foreign IDs as not found, and use optimistic update timestamps.
- Required a semantic clone before changing the logging kind of an exercise already referenced by a program or workout, and blocked deletion while any persisted program, snapshot, record, or summary still references it.
- Retained 14 focused fail-then-pass domain and PGlite repository tests across normalization, invalid input, replay, request-hash conflict, verification, IDOR, semantic history, stale update, and deletion.

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
