# Project log

## 2026-08-26: Firebase and YouTube credential reconciliation

- Verified the user-created Firebase project `my-workout-pal-92819`, project number `381810672975`, on Spark in the signed-in Firebase Console. The earlier staged project ID was only a proposal and was never created.
- Initialized Firebase Authentication and enabled Email/Password while leaving email-link, phone, anonymous, Identity Platform, and paid services off. The project still has no registered web app, and Google remains unsaved pending the reviewed public name and support email.
- Confirmed without printing values that ignored `.env.local` contains `YOUTUBE_API_KEY` and no Firebase public or Admin value. Confirmed that Vercel development, preview, and production contain only the Neon-managed variables and no Firebase variable.
- Retained a focused failure proving that `pnpm youtube:curate` did not load `.env.local`, then corrected the package command. The focused test and all 36 YouTube unit tests pass with strict TypeScript and scoped lint. A zero-quota command smoke loaded the credential without making an API request and produced the expected 27-target `quota-blocked` private report.
- Completed one bounded official YouTube search request without exposing the key. The then-current schema-two checkpoint recorded the legacy 100-unit estimate. That request exposed a page-cap reset that could starve later exercises across resumes. A retained failure reproduced the `page-limit` result; the correction stores durable per-query page counts, treats the configured page count as a total cap, and passes the focused YouTube matrix.
- Completed the first discovery slice at 90 successful one-page searches. Schema two displayed 9,000 estimated units under the superseded pre-June-2026 cost model. The ignored checkpoint then contained 1,297 target-scoped candidates across 15 of 27 catalog targets and no hydration or approval state; no arbitrary candidate was seeded.
- Retained a focused failure in which reaching the search request cap suppressed otherwise affordable metadata hydration. The correction separates search and hydration blocking while preserving one honest quota-blocked report.
- Verified the current official quota model, retained four failing assertions, and passed all 41 YouTube tests with strict TypeScript and scoped lint. Checkpoint schema three migrates schema-two progress without loss and recomputes `search.list` and `videos.list` at one unit per successful call. A provider search-quota response is sanitized before persistence, leaves the failed query resumable, and no longer prevents pending hydration.
- The coordinated checkpoint had advanced to 94 successful searches before the report-verified zero-search hydration run. That run used 26 one-unit `videos.list` requests and hydrated all 1,252 unique IDs. The migrated schema-three checkpoint now records 94 search requests, 26 hydration requests, and 120 estimated units; 1,355 target-scoped candidates cover 16 catalog targets, 269 pass mechanical eligibility, and 16 proposed pairs are ready for human review. The next live search was rejected because the provider search bucket was exhausted; the local checkpoint counts successful calls only. The 160-query catalog has 66 searches left after reset. No candidate was approved or seeded.
- Adversarial shortlist inspection found mechanically eligible but visibly wrong adjacent variants: decline instead of flat bench, floor-seated shoulder press, curl-to-press and incline curl, incline press without a bench, reverse lunge with rotation, commentary framing, unsupported fat-loss copy, and non-English title cues. Retained eligibility and resume failures now apply catalog-scoped movement exclusions and reevaluate old checkpoint entries with current target rules. The zero-request regenerated report reduces the mechanically eligible set from 269 to 245 while preserving all discovery and hydration state. Reverse lunge remains ineligible for approval because only four of its six searches completed; no video was approved or seeded.
- Retained a focused failure in which a two-video reverse-lunge shortlist appeared `ready-for-review` after only four of six searches. Target completeness now derives every relevance and view-count query key before pair status. The regenerated private report marks 15 complete-target pairs `ready-for-review` and all 12 incomplete targets `discovery-incomplete`; the provisional reverse-lunge IDs remain visible without claiming review readiness.
- Rechecked Firebase after action-time authorization. The signed-in Google account can read the project, but the live console explicitly requires a project owner for app and user management. Web-app registration, Google provider setup, authorized-domain setup, and Admin-key creation remain paused until the browser uses an owner account.
- Retained a missing-module failure before adding the private `youtube:review` workflow. The typed recorder validates the scoped checkpoint candidate, complete approval evidence, stable rejection and blocker reasons, timestamps, atomic mode-`0600` persistence, and explicit replacement of a prior approval. Four focused tests pass. Candidate `O7ECGhZj_Hc` is recorded as pending because playback reached the end but the in-app browser couldn't expose visual frames; the record keeps full-watch and visual-review confirmation false.
- Reached the Vercel dashboard's two-factor challenge through the existing account. Spend Management remains read-only-unverified until the user completes 2FA; no billing, budget, notification, pause, plan, or overage control changed.
- Created the `release/firebase-youtube-completion` branch from clean released SHA `08ba5773d700683d646b14f2df3cd6d942dee214` for reversible setup, curation, authenticated QA, and release checkpoints.

## 2026-08-25: Production label-in-name and Lighthouse checkpoint

- Lighthouse 13.4.1 exposed a serious `label-content-name-mismatch` diagnostic on the visible landing brand and five waypoint controls despite the aggregate 100 accessibility score. A focused component test failed before implementation on the shorter overriding label.
- Removed redundant accessible-name overrides from three brand links and five waypoint buttons so native visible text is authoritative. Updated the guest browser journey to locate the truthful visible names. The focused test then passed.
- Passed strict TypeScript, full ESLint, 64 test files and 420 tests, generated PWA and 27-document parity, Drizzle metadata, the Next.js webpack production build, and the local 40-case browser matrix with 39 passes plus the documented WebKit service-worker capability skip.
- Published GitHub SHA `149fde9d1ea7583e1a291c8b17ad296e91f3678b` as Ready Vercel production deployment `dpl_HFFWzSg9hPTxh5q4KqW2yvhsC4WN`. The deployed browser matrix repeated 39 passes and the same explicit skip; the bounded error-log query returned no entries.
- Ten Lighthouse mobile/desktop audits across landing, program overview, barbell Pull, dumbbell library, and the sample runner measured 97–100 performance, 100 accessibility, 100 best practices, no run warnings, and no remaining label-in-name mismatch.
- A headed Playwright CLI pass at a 640-by-900 reflow-equivalent viewport with forced colors and reduced motion active found zero horizontal overflow and zero offscreen actions on all five routes. Keyboard focus and skip activation passed, and screenshot inspection preserved visible headings, content, selected state, boundaries, and primary actions.

## 2026-08-25: Initial Vercel production and production migration

- Deployed GitHub-backed `main` to the linked Vercel project. Vercel's first-deployment rule assigned the requested preview to production, produced Ready deployment `dpl_2NWnCqiUeBfEsumnSqzM8hmFsMsS`, and aliased it publicly at `https://my-workout-pal-chi.vercel.app`.
- Connected GitHub repository `vdoshi96/My-Workout-Pal` after deployment. Vercel's project API confirms production branch `main`, native preview support, preview comments, Node 24.x, Pro deployment plan, and GitHub source SHA `210560b3716f646a0cc43913f125d70cc1f83eee`.
- Verified public unauthenticated `200` responses, HSTS, strict nonce CSP, popup-safe opener policy, frame denial, referrer policy, and the remaining declared security headers. The full remote Chromium/WebKit matrix passed 39 cases with the documented WebKit PWA capability skip; seven public Axe gates and Chromium production offline recovery passed. The post-run error-log scan returned no entries.
- Reviewed and applied versioned production migrations `0001` through `0003`. Read-only database verification before and after returned identical starter counts: 6 equipment rows, 27 exercises, 44 compatibility edges, 54 aliases, 2 revisions, 10 days, 26 sections, 60 prescriptions, 20 cardio choices, and 0 approved videos.
- Official Vercel documentation confirms Pro's $20 monthly credit, 50/75/100 spend-budget notifications, and optional pause-all hard-stop behavior. It does not document a 90% Spend Management budget threshold. The in-app browser lacks a Vercel web session, and no positive overage amount is authorized, so no notification, budget, pause, billing, or paid-plan control changed.
- The production guest surface is verified, but this is not completion proof: Firebase remains unconfigured behind its truthful gate and no exercise videos are approved without the required YouTube API key and full manual review.

## 2026-08-25: Public GitHub publication

- Rechecked GitHub CLI and found the keyring credential valid for active account `vdoshi96`, superseding the earlier invalid-token observation.
- Audited every tracked path and Git object before publication. Only the empty `.env.example` is tracked; no raw or derived reference media, transcripts, local databases, curation scratch, secret-pattern match, or redundant browser artifact was found.
- Created public repository `vdoshi96/My-Workout-Pal`, added its HTTPS `origin`, pushed local `main`, and verified the repository visibility, default branch, remote tracking, and identical local/GitHub SHA `b76efc58f3a9fb31aedc873fdb567ab82c3103e2`.
- This checkpoint published source only. It did not deploy Vercel, apply a Neon migration, create Firebase, call YouTube discovery, or change billing.

## 2026-08-25: Owned program collection

- Wrote the complete collection plan before implementation, then retained a failing migration/schema suite before adding `user_programs.is_active`, deterministic upgrade backfill, and the partial unique owner-active index in migration `0003_program_collection`.
- Added owner-safe create-from-starter, full current-revision clone, and activation transactions. They cap an owner at 24 roots, create distinct descendant identities, preserve compatible custom references and editable meaning, synchronize active equipment, reject inactive equipment changes and workout starts, and lock idempotency records so concurrent identical requests collapse.
- Retained repository failures for stale migration fixtures before applying the complete local migration sequence. The final collection repository matrix covers both equipment profiles, owner custom-exercise clone fidelity, source immutability, later-switch replay, concurrent replay, foreign, stale, unverified, over-limit, and inactive-program paths.
- Retained a missing-route failure before adding private create/clone and activation handlers. The endpoints enforce CSRF before the verified server viewer, bound strict owner-free JSON, return private no-store responses, and keep foreign and missing identities indistinguishable.
- Retained missing client-model and retry-key failures before implementing runtime success validation and interrupted retry identity. Added `/app/programs` with one textual active state, create-both-profiles controls, independent-clone review, activation, verification gating, truthful pending/error copy, responsive cards, and keyboard-focused native dialog behavior. The active overview now links to the collection.
- Local commits `67faa09`, `aeb79e4`, `de42dbe`, `287f051`, and `62bfa65` form the reviewable plan, migration, repository, API, and UI checkpoints. The complete branch passes strict TypeScript, full ESLint, 63 test files and 419 tests, generated PWA parity, 26-document parity, Drizzle metadata validation, the webpack production build, and the public regression matrix with 39 passes and one documented WebKit service-worker skip.
- Merged the complete branch into local `main` as `ed6f96d`, then repeated the 63-file and 419-test gate, Drizzle validation, production build, and 39-pass browser result before removing the fully merged feature branch. No auxiliary worktree remains.
- No push, deployment, production migration, Firebase project creation, YouTube discovery request, or billing change occurred. Authenticated browser replay remains gated by Firebase project terms/configuration; the public browser result is not presented as signed-in collection proof.

## 2026-08-25: Public release browser baseline

- Added one reproducible `pnpm test:e2e:release` command that builds the application, starts an isolated production server on port 3108, and runs the complete Playwright matrix without reusing an unrelated development server.
- Retained the first executable browser result: 30 failures, 9 passes, and 1 explicit WebKit PWA skip. The failures identified a stale accessible-name expectation, serious color-contrast defects across public surfaces, and HTTP localhost asset breakage caused by production TLS-upgrade headers.
- Retained a focused failing security regression before implementation: the HTTP production CSP still contained `upgrade-insecure-requests`. The corrected header boundary now enables HSTS and upgrading only on HTTPS while retaining the strict nonce CSP on HTTP production checks; all 5 focused assertions pass.
- Introduced surface-specific coral, lichen, danger, and inverse-ink foreground tokens. Seven public routes now pass serious and critical Axe checks in Chromium and WebKit without discarding the established light or dark palette.
- Exercised the guest equipment switch, barbell Pull route, compatible library result and empty recovery, read-only sample workout, sample analytics, and sign-in gate. Keyboard skip navigation, reduced motion, dark mode, phone targets, horizontal overflow, Chromium PWA installation, and Chromium offline recovery are also automated.
- The final browser result is 39 passes and 1 explicit skip across Chromium phone, tablet, and desktop plus WebKit phone. Playwright does not support the skipped WebKit service-worker-control path; all other WebKit cases pass.
- Commit `101d6a4` passes strict TypeScript, full ESLint, 58 test files and 402 tests, generated-service-worker parity, 25-document parity, Drizzle metadata validation, and the local production-browser matrix. This is local evidence only; nothing was pushed or deployed and no production resource changed.
- Merged the three-checkpoint branch into local `main` as `9a3dd2e`, repeated the complete 58-file and 402-test gate, Drizzle validation, production build, and 39-pass browser result, then removed the completed local branch. No remote was available for push closeout.

## 2026-08-25: Owned workout route and recovery host

- Replaced the owned day placeholder with a retry-stable start-or-resume control that sends no ownership key, preserves one idempotency key across interrupted retries, validates the complete private response before navigation, and keeps unverified accounts read-only.
- Added the dynamic `/workout/[sessionId]` server route. It derives the viewer from the secure session, hides foreign or malformed session identities as missing, reads only owner-scoped program and custom-exercise data, and returns an unverified member to the exact session after reauthentication.
- Mounted the runner only after loading the owner-namespaced IndexedDB record and reconciling it with the immutable server snapshot. Identity, snapshot, ownership, storage, or reconciliation failures stop before editing and do not overwrite the device draft.
- Derived substitution choices from deterministic canonical database identities plus the signed-in owner's compatible custom exercises, then retained only the active equipment profile and matching logging meaning. Every workout snapshot must resolve to exactly one effective exercise identity.
- Retained a missing route-model module failure and a missing start-controller failure before implementation. The final focused matrix passes 82 assertions across the route contract, route model, runner, IndexedDB storage, resume reconciliation, and PWA private-cache policy; strict TypeScript, scoped ESLint, PWA parity, documentation parity, and the production webpack build also pass.
- Passed the complete branch gate with 58 files and 401 tests, strict TypeScript, full ESLint, generated-service-worker parity, 25-pair documentation parity, and Drizzle metadata validation. The local production server returned a private `no-store` streamed sign-in redirect for the unauthenticated workout page, `401` plus `no-store` for unauthenticated resume, and `403` plus `no-store` for a hostile-origin start; no private workout data rendered.
- Created local implementation commits `af5deee`, `8e4ae39`, and `bada22b` after the written plan commit `20b466b`. No push, deployment, provider configuration, database mutation, or production browser claim was made in this checkpoint; live signed-in replay awaits Firebase configuration.
- Merged the clean feature branch into local `main` as `cefecdc`, reran the complete 58-file and 401-test gate, Drizzle metadata validation, and the Next.js webpack production build successfully, then removed the merged local branch. No Git remote exists yet, so push closeout is not applicable at this checkpoint.

## 2026-08-25: Owner-safe workout persistence integration

- Merged the verified workout repository, private API, strict browser adapter, and resume reconciliation into the authenticated application after explicit authorization.
- Resolved the Drizzle migration-number collision by preserving the account-deletion migration as `0001` and generating the workout measurement upgrade as `0002` from the combined schema. Preserved the required pace-source backfill for existing rows.
- Retained a 14-case missing-migration-path failure, a fail-first full-sequence assertion that exposed the omitted account-deletion upgrade, and three training-insights failures that exposed fixtures missing the canonical workout measurement upgrade.
- Updated affected PGlite fixtures to apply the complete migration sequence and to identify stored pace as entered data. The focused matrix passes 131 assertions.
- Passed strict TypeScript, full ESLint, 56 test files and 394 tests, generated-service-worker parity, 25 Markdown/HTML pairs, Drizzle metadata validation, and the Next.js 16.3.2 webpack production build. No external state changed during this local integration checkpoint.
- Created merge commit `cec02ba`, confirmed that the feature tip is its parent, and removed the clean completed worktree and merged local branch.

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
- Observed the built server return `401` with `no-store` for an unauthenticated resume and `403` with `no-store` for a cross-origin start. Kept commit `bd6fd4c` local on `agent/workout-repository` because merge, push, and deployment required explicit user approval.

## 2026-08-25: Deterministic current-main verification

- Ran the complete current-main matrix after the training-insights, PWA, and strict-CSP checkpoints. The first default fully parallel Vitest run passed 328 of 331 assertions but timed out three separate PGlite integration files at five seconds; none reported an assertion or product failure.
- Replayed all tests with file parallelism disabled and passed 52 files and 331 assertions. Encoded that proven scheduling policy in Vitest configuration, then ran the ordinary unmodified command and passed the same 52/331 matrix in 69.17 seconds.
- Passed strict TypeScript, full ESLint, Drizzle metadata validation, generated service-worker parity, 25 Markdown/HTML pairs, and the webpack production build.
- Against the local production server, the PWA offline E2E passed on Chromium phone, tablet, and desktop. The WebKit phone case remained intentionally skipped because the service-worker control path is unsupported by Playwright.
- Created local commit `5091a62` after inspecting the one-file diff stat. Main remained local and clean; no push, merge, deployment, migration, Firebase project creation, or production mutation occurred.

## 2026-08-25: Installable PWA surface and strict-CSP visual correction

- Retained a missing-state-module failure before adding pure standalone, captured-prompt, dismissal, and replacement-worker rules. Three focused state cases and all 17 existing public-cache cases pass.
- Expanded the global PWA client with an optional browser install offer, session-scoped keyboard dismissal, installed-mode suppression, accepted/dismissed/error outcomes, blocked-service-worker tolerance, update-ready disclosure, user-controlled reload, and a shared offline/install/update notice stack.
- Rebuilt through the supported webpack path and replayed the install offer at 390 by 844 and 1280 by 900. Keyboard dismissal persisted across reload, accepted choice closed the offer, and browser-offline mode retained its status announcement. No provider or production state changed.
- Rejected the first browser run as evidence because the existing development server reproduced its documented stale-loader corruption. The local production server was clean enough to expose five genuine CSP errors from blocked waypoint style attributes.
- Retained a failing source-policy test that named the guest route, sample chart, and authenticated progress page. Replaced fixed inline geometry with classes and the variable progress bar with a labeled semantic `meter`; the policy, security-header cases, strict TypeScript, scoped lint, and production build pass.
- Replayed home and sample progress in the production browser with zero console errors and visually confirmed all five waypoints and three chart bars. Authenticated progress remains build/source verified until Firebase configuration permits signed-in browser evidence.
- Created local commits `5239b9c` and `6e194b2` after inspecting each milestone's diff stat. Nothing was pushed, merged, deployed, migrated, or changed in production.

## 2026-08-25: Owner-scoped training history and progress

- Retained a missing-repository-module failure before adding the server-only training-insights read model. Five PGlite integration tests then proved stable terminal pagination, immutable snapshot detail, foreign-session hiding, owner-isolated PR sources, exact ties, completed-only analytics, owner-time-zone grouping, persisted-rollup disclosure, and malformed-viewer/cursor rejection.
- Added dynamic server-rendered History, immutable workout detail, Personal Records, and Progress routes. Active workouts stay in the runner; interrupted workouts remain in the archive but do not inflate progress. Empty states explicitly refuse sample account activity.
- Kept kilograms, meters, and seconds canonical in storage and converted only at presentation. Retained a missing-presenter failure, then passed four focused conversion, duration, time-zone, and record-type cases.
- Passed strict TypeScript, scoped lint, nine focused unit/integration tests, and the webpack production build. The build confirms all four routes are dynamic. Live signed-in browser replay remains gated because the signed-in Firebase Console has no project and the user has not authorized creating or configuring one.
- Created local commits `62d9ad3` and `6c51e41` after inspecting each checkpoint's diff stat and patch. No push, merge, deployment, migration, provider project creation, or production mutation occurred.

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
- Retained the missing operation and missing repository-method failures, then added strict dry-run/apply argument parsing, bounded Firebase-phase selection, opaque owner fingerprints, safe terminal output, and per-owner failure isolation. The Firebase dependency exposes `getUser` only.
- Added the locked internal repository transition with optimistic timestamp/status checks, monotonic retry accounting for failed/blocked jobs, completed replay, and stale-candidate refusal. Seventeen focused reconciliation/saga/domain assertions, TypeScript, scoped lint, and an invalid-argument CLI smoke pass. No credential-backed Firebase query, external database write, production apply, push, merge, or deployment occurred.

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
