# Decisions

## 2026-08-25: Treat the recording as workflow evidence

The private recording is evidence for navigation and interaction intent. It is not a source repository or visual specification. The application uses original code, data, copy, assets, and identity.

## 2026-08-25: Keep guest data temporary

Guest equipment and runner interactions remain in memory or tab-scoped browser storage. The interface labels sample data and never reports that guest activity is saved to an account.

## 2026-08-25: Use immutable program and workout revisions

Editing a program creates a revision. Starting a workout snapshots the relevant prescription and exercise meaning. Later program or catalog edits do not alter completed or in-progress history.

## 2026-08-25: Keep one explicit active owned program

An owner may keep up to 24 program roots, but exactly one root is active after onboarding. A partial unique database index enforces at most one active root; repository transactions enforce that a nonempty collection never finishes with zero active roots. Reads do not guess from starter keys or timestamps when the invariant is corrupt.

Creating from a starter or cloning an owned revision creates an independent root and activates it atomically. Clones share canonical catalog and owner custom-exercise identities but receive new revision and descendant record IDs. Activating another root creates no revision and cannot mutate either graph or any workout snapshot.

The account equipment profile is the current active-program projection. Activation updates that projection to the target revision's equipment profile so the compatible library and new workout starts remain coherent. Equipment confirmation is allowed only for the active root and creates a new revision there; inactive roots and historical workouts remain unchanged.

Every owned five-day revision retains exactly one populated Core section on every day plus one walker and one runner cardio template. Core may be renamed but not removed, duplicated, or published empty; non-core sections require destructive review before removal. Program targets remain canonical kg/metres/seconds-per-kilometre even when the editor presents lb/miles/seconds-per-mile. Mutation success must validate the complete returned graph and bind it to the submitted operation before client state advances.

## 2026-08-25: Keep the deletion job outside profile ownership

The account-deletion saga record is keyed by the server-derived Firebase UID but has no foreign key to `user_profiles`. It must survive the owned-data transaction so Firebase deletion can be retried after fitness data and the profile are gone. The job stores only bounded phase, status, attempt, idempotency hash, and safe error-code metadata. Migration `0001_account_deletion_saga` refuses to run if legacy job rows exist, requiring explicit review instead of inventing resumable state. This migration is checked in, tested locally, applied to Neon, and included in the verified production migration sequence.

Published program revisions and accepted workout history remain immutable during ordinary operation. Account deletion is the narrow exception: the repository sets a transaction-local Firebase UID, and replacement trigger functions permit `DELETE` only when each row's owner exactly matches that UID. The setting cannot authorize another owner's row and does not permit inserts or updates. This keeps historical mutation guards intact while allowing a member's complete owned graph to be erased atomically.

The account-deletion service resolves Firebase Admin configuration before it asks the repository to reserve or delete database data. After the database transaction commits, a provider failure records only a classified safe code, reports the Firebase identity state as unknown, and preserves the secure session for retry. Cookies are expired only after provider success or `auth/user-not-found` and a successful durable completion write. A completion-write failure is not mislabeled as a Firebase error; its still-running job requires the planned trusted reconciler, because a deleted Firebase identity may no longer pass revocation-aware viewer verification.

Client cleanup follows confirmation, never optimism. Settings reauthenticates the currently active Firebase user, rejects a changed or mismatched UID, exchanges a forced-fresh ID token for the secure session, and waits for the server's completed response before clearing the matching IndexedDB namespace or signing out the Firebase client. A partial server result retains both for retry. If local cleanup fails after confirmed deletion, Firebase client sign-out is still attempted and the UI reports the residual site-data action without claiming cleanup succeeded.

The completion reconciler is an operator command rather than an authenticated application route. It receives only Firebase Admin `getUser` capability, defaults to dry run, fingerprints ownership in output, and may write only after `auth/user-not-found`. Apply locks the candidate and rejects an optimistic timestamp/status mismatch; failed or blocked jobs enter a new Firebase attempt before terminal completion. An existing identity is reported but never deleted. This separates crash recovery authority from end-user traffic and keeps production apply behind explicit approval.

## 2026-08-25: Store canonical metric values

Weight is stored in kilograms, distance in meters, and duration in seconds. Validated boundaries convert user input and presentation according to preferences.

## 2026-08-25: Derive account insights from immutable owner data

History reads terminal workout sessions through a stable timestamp-and-ID cursor. Completed and interrupted sessions use their saved exercise, state, set, and cardio snapshots; active sessions remain in the resumable runner. Every query begins with the server-derived owner key, and a foreign session is indistinguishable from a missing session.

Progress is rebuilt from work-set logs whose workout exercise state and session both completed, plus completed-session cardio logs, and grouped in the owner's saved time zone. Warm-ups, skipped exercises, active interruptions, and abandoned sessions do not inflate totals. Weight-repetition volume uses external kg times repetitions; bodyweight volume uses only recorded added kg because body mass is unavailable. Combined exercise-set and cardio distance is labelled `Logged distance`. All-time aggregates remain database-side, while the displayed daily series is bounded to the newest 180 completed workouts and reports truncation. Existing summary rows are disclosed as rollup state rather than substituted for source-log truth, and an empty account produces no chart points.

Personal-record candidates are projected transactionally when a session completes and joined through their immutable effective catalog/custom source identity. Zero-load weight/repetition work produces a repetition candidate only; Epley uses `weightKg × (1 + repetitions / 30)` for positive load. A database-side maximum query keeps the newest 500 winning identity/type groups, computes the full exact tie count, and exposes only the newest 20 source links per group so one common repetition tie cannot create an unbounded response.

Migration `0004_personal_record_projection_checkpoint` supports an operator-only versioned rebuild for sessions completed before projection existed or after an algorithm correction. The command is dry-run by default, requires `--apply`, commits bounded batches, resumes from a globally ordered workout-session UUID, clears the cursor on completion, and never stores a Firebase UID. Recognized lower-version candidates are replaced or removed when the current algorithm no longer emits them—including warm-up, skipped, and zero-value sources—while unknown future versions remain stored but excluded from reads until this build can attest to them.

## 2026-08-25: Verify identity only on the server

Firebase client identity is exchanged for a secure HTTP-only session. Server code derives Firebase UID from the verified session and applies it to every user-owned database query. Client-supplied ownership identifiers are ignored or rejected.

## 2026-08-25: Require confirmed video approval

Discovery scripts can propose candidates but cannot silently seed production. A seeded demonstration requires mechanical eligibility, manual review, a complete viewing, approval metadata, and complete two-video mapping validation.

The production boundary independently revalidates each selected proposal instead of trusting its label. Every selected candidate must remain eligible, carry scoped `syndicationEvidence: verified`, and retain full-watch, exact-variation, concise, safe, material-value, and narration/captions/visual instruction evidence. The generated schema-one manifest contains only the canonical slug, variation, normalized ID, order, reviewed title/channel, approval state, reviewer, canonical ISO review timestamp, and full-watch confirmation. Extra fields, including view counts and private evidence, fail closed. The deterministic starter graph imports only this validated checked-in manifest; provider and private report files remain outside the application and repository.

## 2026-08-25: Defer an open-source license decision

The repository can be public without granting an open-source license. No license will be added without explicit legal approval from the user.

## 2026-08-25: Use a training route atlas visual system

The program is represented as a route with five waypoints, and equipment changes reroute only substituted movements. The selected mobile comp is `.impeccable/mocks/route-atlas-map.png`. Semantic structure and status truth outrank decorative cartography.

## 2026-08-25: Use the supported webpack production build path

The first Next.js 16.3.2 Turbopack production compile held the build lock without advancing diagnostics and required termination after more than one minute. The same source compiled, type-checked, prerendered, and traced in about 10 seconds with `next build --webpack`. The package build script uses webpack until a bounded Turbopack investigation proves the default reliable.

## 2026-08-25: Cache public reading routes only

The service worker may cache the guest program, library, samples, offline page, and static assets. It does not intercept authenticated navigation or API requests. Account writes require a confirmed server response and must expose pending, failed, and retry states instead of treating an offline queue as saved data.

## 2026-08-25: Prefer a nonce CSP for fitness and account data

Application HTML is request-rendered so Next.js can attach a fresh nonce to framework scripts and generated styles. This disables static HTML and ordinary CDN caching for application pages and increases function work, but avoids production `unsafe-inline` while the product handles account and fitness data. The web manifest and ordinary static assets remain static, and the service worker retains its public-only offline cache. Usage monitoring must account for this deliberate server-rendering cost.

The response policy allows only the Firebase network and frame boundaries needed for authentication and the YouTube origins needed for approved embeds. `strict-origin-when-cross-origin` preserves the referrer YouTube requires. `same-origin-allow-popups` preserves Google sign-in popup behavior without weakening frame ancestry.

## 2026-08-26: Separate welcome from program exploration

The public root route is a welcome surface and `/program` is the five-day explorer. Guests can read every starter day, canonical exercise guide, approved demonstration pair, sample workout, and sample analytic without authentication. Sign-in is presented as optional until a visitor wants to customize or persist equipment, prescriptions, exercises, workout progress, history, records, or analytics.

The welcome hero extends the route-atlas system with an original hand-drawn cartoon gym populated by expressive animal characters. The environment, equipment, and characters share one deliberately illustrated world while the exercises remain physically understandable. The image is noninteractive atmosphere. A proposed hotspot and filtered-library experiment was rejected because it made the gym read as a diagram rather than a convincing cartoon place.

The hero renders from its explicit project URL with reserved intrinsic dimensions and responsive CSS. That URL is the exact asset precached by the public-only service worker. This avoids a mismatch in which cached HTML would reference an uncached Next image-optimization URL, and it avoids the generated inline image style that the nonce-only CSP correctly refuses.

## 2026-08-26: Preserve recognized public navigation origins

Exercise-detail links carry a bounded `returnTo` value for their actual public source. The server accepts only the program overview, one of five public day paths, a normalized filtered library, or a normalized sample-workout route. Labels are derived from that recognized destination; untrusted labels, private paths, repeated scalars, absolute URLs, controls, fragments, and unknown routes fail closed to the exercise library.

This explicit context is preferred to browser history because a direct visit, reload, copied link, or interrupted navigation may have no useful prior entry. Dynamic exercise links opt out of Next.js prefetch after WebKit exposed aborted RSC prefetch requests as page errors; deliberate navigation still server-renders the destination normally without speculative request noise.

## 2026-08-26: Limit generated HTML parity to publication documentation

`scripts/render-docs.mjs` treats the repository root documents and `docs/` tree as the maintained publication set, and generates a same-content HTML counterpart for every Markdown file in that set. The tracked `.impeccable/surfaces/` Markdown is an internal design-tool input, not a published project document, so it is intentionally outside the generator and does not receive an HTML twin. Changes to this boundary require updating the generator and this decision together rather than relying on an implicit exclusion.

## 2026-08-27: Make operation storage the multi-tab correctness boundary

Runner storage schema version two atomically reads, validates, merges, increments, and writes the complete owner-and-session record in one IndexedDB transaction. Immutable operations carry stable idempotency keys and semantic targets. Distinct targets commute, divergent values for one target remain an explicit member-resolved conflict, and server-confirmed values outrank stale unsent copies. A confirmed exercise decision supersedes stale mutations for that exercise, and a confirmed terminal state freezes every stale tab.

Unsubmitted form values remain device-local recovery projections rather than server operations. They can survive an ordinary refresh, but an atomic merge may replace them with a newer server-confirmed exercise or terminal projection. In that case the UI clears the stale value and disables its Save action before any request is made. A later edit intentionally created from the reconciled confirmed state remains eligible to become a new operation.

BroadcastChannel messages contain only an opaque namespace digest and revision hint. They can prompt another tab to reread IndexedDB, but message delivery, ordering, or availability can't determine correctness. Authentication and connectivity are runtime facts, not durable blockers: a fresh same-owner server baseline clears stale local flags without deleting queued operations or drafts.

## 2026-08-27: Bound local build and browser artifacts

Keep one durable ignored pnpm store and one dependency installation for active goal work. Don't bind a persistent checkout to a pnpm store under `/private/tmp`; a restart can remove that store and force repeated dependency reconstruction.

Run only one production build or browser matrix at a time. Measure free space and the exact task-owned artifact directories before and after each large gate. After reviewed evidence is retained, delete `.next`, fixture `.next-authenticated`, `test-results`, and `playwright-report`. Keep only the newest tracked QA report and screenshots. Don't delete unrelated browser caches, simulator data, user files, or system data as part of this cleanup policy.

## 2026-08-27: Position the product as a customizable workout companion

My Workout Pal helps a member plan a personal routine, use guidance while training, log work, and review progress. The existing Push, Pull, Legs, Upper, and Lower route is one editable starter example. It no longer defines the product, the authenticated program shape, or the number and names of a member's days.

This decision supersedes the fixed five-day, mandatory-Core, and paired Walker/Runner requirements recorded for the first release. It preserves the first release as intentional history. New routine publication uses explicit safety bounds, arbitrary day and section names, optional sections and cardio, stable opaque identities, owner-scoped authorization, and complete immutable revisions. Earlier program revisions and workout snapshots remain unchanged.

The canonical movement library can publish reviewed names, metadata, and instructions before approved video coverage exists. A published app video pair still requires the complete existing eligibility and human full-watch approval boundary. Owner-provided guidance stays private, is never described as app-approved, and never changes the public catalog.

Successful bare sign-in defaults to the protected `/app` route. Public cached pages remain identity-neutral and use an account action that enters the protected boundary, so cached HTML never guesses or leaks member state.

Visual warmth extends beyond the landing hero only through the selected animal-surface direction. Shipping vignettes must be purpose-built, decorative, static, contrast-safe, pointer-inert, hidden in forced colors, and separate from private data and critical workout controls.

## 2026-08-27: Select Corner Companions for the animal surface system

The completed three-direction review selected Corner Companions as the sole production direction for the Wave 3 pilot and any later approved rollout. Each approved surface receives one contextual character vignette in reserved whitespace. The vignette supports the nearby task without becoming navigation, coaching, status, or data.

The guest landing page uses a planning companion, the signed-in home uses a preparation companion, and the guest Progress preview uses a calm review companion outside the chart and sample disclosure. Phone layouts place the art in a collapsible dedicated slot. Desktop layouts keep it out of the member account rail and data plane.

Every production vignette is purpose-built, text-free, decorative, static, pointer-inert, ignored by assistive technology, and absent in forced-colors mode. Image failure cannot remove product meaning, account state, sample disclosure, navigation, or an action. The pilot must verify phone and desktop layouts, 200% zoom, contrast, reduced motion, forced colors, failure states, and offline asset behavior before rollout.

Two alternatives were reviewed and discarded. Their images, prompts, and direction-specific provenance are not retained on the concept branch. The selection does not authorize a public branch push, merge, deployment, or production implementation.

## 2026-08-27: Handle idle Neon failures at the pool boundary

The application constructs the Neon WebSocket pool explicitly and registers one privacy-safe `error` listener before handing the pool to Drizzle. Neon already removes a client that fails while idle; the application listener prevents Node's unhandled event behavior from terminating a warm function and records only constant diagnostic text.

The listener does not retry a query, convert an active database failure into success, expose the error object, or change the lazy database singleton. Interactive transactions remain on the WebSocket-backed pool. Authentication and CSRF routes remain database-independent, even if an idle pool event from earlier work occurs while one of those routes is running.

## 2026-08-28: Persist authored cardio choice order explicitly

Walker and Runner are optional alternatives, not semantic positions. Program cardio rows therefore store a bounded display order within each owned revision day. Publication derives that order only from the validated day payload; reads, root clones, equipment revisions, and workout snapshot creation preserve it. Mode remains unique within the day but does not determine presentation order.

Migration `0006_program_cardio_display_order` backfills existing published rows in their prior Walker-then-Runner presentation order while the descendant immutability trigger is narrowly suspended, then restores the guard before making the position required. It adds per-day order uniqueness and a one-to-two bound and does not change cardio meaning or workout history. Production application of this migration remains a separately reviewed release action.
