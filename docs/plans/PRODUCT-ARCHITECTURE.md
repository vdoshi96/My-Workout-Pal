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

- A canonical exercise has a stable slug, movement name, modality, muscles, instructions, equipment requirements, compatibility, logging kind, and optional variation parent.
- Logging kinds are `weight_reps`, `bodyweight_reps`, `duration`, and `distance_duration`.
- Custom exercises belong to exactly one Firebase UID and can contain zero to two normalized YouTube video IDs.
- A prescription points to a canonical or owned custom exercise and stores section, order, set count, range, rest, warm-up or work classification, and target metadata.
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
- `workout_sessions`, `workout_exercise_snapshots`, `set_logs`, and `cardio_logs` preserve sessions and historical meaning. Snapshots are always immutable; logs can change only while a session is resumable and freeze after completion or abandonment.
- `personal_records` and `progress_summaries` are reproducible projections with source log identifiers and calculation versions.
- `idempotency_keys` records accepted mutation results and expiry.
- `account_deletion_jobs` tracks the deletion saga without retaining deleted fitness content.

### Database rules

- Foreign keys use restrictive deletion by default. Account deletion uses an explicit owned-data transaction.
- Unique constraints enforce one active session boundary, revision numbers, set positions, video order, video identity per exercise variation, and idempotency scope.
- Check constraints enforce nonnegative canonical measures, valid ranges, two approved seed-video orders, and known states.
- Every repository method that reads or writes user data requires a server-derived owner argument. There is no unscoped `findById` for owned records.
- Migrations are append-only, versioned, tested from an empty database, and tested as upgrades from the preceding release fixture.
- Canonical seed rows use deterministic RFC 4122 version-five UUIDs derived from a public, fixed application namespace plus a bounded entity kind and stable domain key. Re-running a seed therefore converges on the same catalog and template identities across preview and production.

### Database implementation slice

The first persistence slice is a single append-only PostgreSQL migration represented by Drizzle tables under `src/db/schema.ts`. Firebase UID remains the external owner key; internal UUIDs are opaque row identifiers. Owned rows repeat the owner key and use composite foreign keys where a child points to another owned row, so an owner-scoped repository query cannot accidentally join across accounts. Catalog and curated records are global, while custom exercises, programs, sessions, logs, and projections are owned.

The migration creates user profile, preference, and equipment rows; catalog equipment, exercises, compatibility edges, aliases, and curated-video records; custom exercises with owner-scoped equipment edges, normalized search aliases, and normalized video IDs; immutable template and user-program revision trees; workout session prescription snapshots, set/cardio logs, idempotency records, personal records, progress summaries and their source-log links; and the account-deletion job boundary. Catalog aliases are reusable across exercises while remaining unique per exercise after normalization. PostgreSQL enums, checks, partial unique indexes, and restrictive foreign keys enforce known states, canonical kilograms/meters/seconds, measurement-kind field shapes, same-program revision pointers, program-day/section parent scope, snapshot-to-set measurement-kind matching, one active resumable session per owner and revision, revision numbering, ordered prescriptions/video slots, and mutation idempotency.

Published program revisions and all descendants are protected by database triggers for insert, update, and delete. Workout prescription snapshots may be inserted only while a session is resumable and are always immutable afterward; set and cardio logs may be inserted, corrected, or removed while their owning session is draft, active, or completing, then freeze after completion or abandonment. Terminal sessions cannot change state or terminal kind and enforce truthful started/completed/abandoned timestamps. The first migration is exercised from an empty PGlite database, including cross-owner composite-FK failures, canonical-measurement failures, snapshot/log measurement-kind mismatches, duplicate active sessions/idempotency keys, active-log correction, published-child insert rejection, terminal-state guards, and post-completion immutability. The database connector is lazy and import-safe: missing `DATABASE_URL` is reported only when a caller asks for a live connection, never while importing server modules or Drizzle configuration.

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

The active runner writes a tab-safe draft to IndexedDB under a Firebase UID and session namespace. Each queued operation carries an idempotency key, base revision, local timestamp, and explicit status. Reconnection submits operations in order. Server acceptance replaces pending state with persisted identifiers. Conflict responses retain the draft and explain the action required.

Refresh resumes the same server session and overlays unacknowledged local operations. A different signed-in UID cannot open the draft. Sign-out or account deletion clears that UID namespace. If authentication expires, the runner keeps the local draft, blocks permanent mutations, and guides reauthentication without claiming that data is saved.

## Security and privacy

- Use a per-request nonce Content Security Policy with the minimum Firebase and YouTube sources. Application pages render at request time so Next.js can attach the nonce; frame policy permits only approved YouTube and Firebase authentication origins.
- Add `Referrer-Policy`, `Permissions-Policy`, `X-Content-Type-Options`, and frame-ancestor protection.
- Normalize and validate YouTube URLs before persistence. Render embeds from durable video IDs and never inject user-provided markup.
- Rate-limit authentication session exchange, recovery-adjacent routes, custom exercise writes, and sync retries by trusted identity and coarse network signal.
- Keep logs free of tokens, cookies, private keys, full notes, and raw fitness records. Use request IDs and safe error codes.
- Do not use third-party product analytics in the initial release. Operational usage is measured through Vercel and database dashboards without adding a paid product.
- Account deletion removes owned database rows, local drafts, session cookies, and the Firebase user through an auditable saga. Partial failure leaves a restricted deletion job and retry path, not a false success.

## YouTube curation and custom-video boundaries

- Normalize accepted YouTube watch, short-link, and embed URLs to a video ID at the validated input boundary. Reject Shorts and malformed or unsupported hosts before persistence.
- Custom exercises accept zero, one, or two unique normalized IDs from HTTPS YouTube watch, short-link, or embed URLs. They reject raw IDs, duplicate normalized URLs, and more than two inputs before persistence. They never persist a caller-provided embed URL or markup.
- The curator's default target manifest is derived from every catalog record: exactly one target per catalog exercise, with stable `variationId: "canonical"`, a movement stem, useful aliases, and only relevant barbell/dumbbell discriminator terms. Bodyweight records do not require the word `bodyweight` in a title. A private `--targets` manifest may explicitly override this complete default, including an intentional empty array.
- Default and override target inputs are deduplicated by `canonicalExerciseSlug` plus `variationId`; the report and proposed pairs contain one target entry per such key. Pending hydration IDs are deduplicated across targets while candidate decisions remain target-specific.
- Discovery keeps relevance-ordered and view-count-ordered searches as separate candidate sources. Mechanical eligibility runs before ranking, and view count breaks ties only among candidates that pass every hard gate.
- Pair proposals prefer a distinct channel when its mechanically eligible score is comparable, reject materially redundant second videos, and remain proposals until human review and full-watch confirmation.
- Mechanical gates reject unavailable, private, processing, non-embeddable, non-syndicated, regionally unavailable, live, unsafe, misleading, disallowed-category, wrong-movement, wrong-equipment, duplicate, near-duplicate, Shorts, and out-of-range duration candidates.
- The curator writes a local checkpoint and review report that contains query provenance, hydrated IDs, rejection codes, quota estimates, review state, ranked eligible candidates, proposed pairs, and any quota block. Configurable request and page budgets stop before the next API request would exceed the budget and preserve the next page token. Discovered candidates, review state, and rejection state are keyed by `canonicalExerciseSlug::variationId::videoId` so one video cannot overwrite another variation's state. If hydration omits a searched ID, the curator persists a checked unavailable candidate with `video-unavailable` and does not rehydrate it until an explicit refresh. Checkpoint schema changes reject incompatible unscoped state rather than silently reusing it.
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
