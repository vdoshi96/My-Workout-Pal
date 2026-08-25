# Authenticated data and repository plan

## User outcome

A verified member can finish onboarding, keep one active equipment-aware program, start or resume exactly one workout for its published revision, record every supported strength/core/cardio result, and later see the same immutable session in history, records, and analytics. An unverified password member can view public and already-owned read-only data but cannot create or permanently change it. No caller can select an ownership key.

## Navigation and flow

1. Server-derived viewer context enters `/app` and loads profile, preferences, equipment, and active program in one bounded read model.
2. A first-time verified member confirms units, time zone, reduced motion, and either dumbbell or barbell equipment. The server creates the profile and clones the matching published starter revision into one owned active program.
3. Program overview and day detail read the active published owned revision. Editing creates a new draft, validates it, publishes it, then atomically moves only that program’s active pointer.
4. An equipment change previews substitutions and incompatible targets. Confirmation creates a new revision for the active program; history and existing session snapshots do not change.
5. “Start workout” returns an existing resumable session for that owned revision or atomically creates one with immutable exercise/cardio snapshots.
6. Runner operations persist with owner-scoped idempotency. Completion or abandonment closes the session; history reads the frozen snapshot and logs.
7. History, records, and progress project only persisted owned rows. Settings can update preferences, initiate recent-auth deletion, and clear owner-scoped offline drafts after successful deletion.

## UI states

- **Loading:** route-level skeleton describes the surface, not synthetic user values.
- **Empty onboarding:** public starter content remains available with a clear “not saved yet” label.
- **Unverified:** owned reads remain truthful; permanent controls are disabled with verification guidance.
- **Ready:** active program revision, profile, and save state come from Neon.
- **Saving:** controls prevent accidental duplicate submits while the idempotency key remains stable.
- **Interrupted/offline:** runner changes remain pending locally; account/program mutations report that they were not saved.
- **Duplicate:** the server returns the original successful result without creating another profile, revision, session, or log.
- **Stale revision/conflict:** the server does not overwrite newer state and offers reload/retry guidance.
- **Expired/revoked auth:** mutation stops, the local runner draft remains owner-scoped, and the member reauthenticates as the same account.
- **Not found/foreign ID:** resource absence and cross-owner access use the same response shape.
- **Worst case:** a transaction rolls back completely; no active pointer targets a draft, no session has a partial snapshot, and no success UI is rendered.

## Domain types and invariants

- Firebase UID comes only from the revocation-aware server session and is the external ownership key.
- Profile, preferences, and equipment are one-to-one with the owner.
- A program key is unique per owner. Its active pointer belongs to that same owner/program and targets a published revision.
- Program/template revision descendants are immutable after publication.
- Equipment confirmation creates a new active revision only for the selected program. Compatible notes and targets remain; incompatible targets are cleared with an explanatory revision note.
- Each active revision has five ordered days, ordered sections, exact exercise XOR identity, valid measurement shapes, and walker/runner cardio choices.
- One owner/revision may have at most one resumable session. Session creation snapshots all presentation and target meaning before activation.
- Set positions are bounded by the snapshot set count. Measurement kind and shape must match the snapshot. Kilograms and meters are canonical.
- One cardio result belongs to a session. Client operation IDs are nonblank, owner/session scoped, and replay-safe; reuse with a different request hash is a conflict.
- Exercise outcome versions start at one and material changes advance exactly one with a new operation ID. Terminal outcomes and terminal sessions freeze.
- History never resolves names or targets from mutable current program/catalog rows.

## Persistence and transactions

Repositories are server-only and receive a verified viewer object, never a client UID. Onboarding, template cloning, revision publication/pointer movement, session snapshot creation, operation application, and deletion each use one database transaction. Reads select owner plus resource ID together. Mutation results are recorded with an idempotency key before returning. Database constraints are the final boundary; repository validation turns expected conflicts into stable application errors.

## Authentication and authorization

Every repository entry requires a non-null server viewer. Permanent mutations require `eligibleForPermanentMutations`; password verification and Google verified identity are represented by that server-derived fact. Deletion additionally requires recent authentication at the route boundary. CSRF is validated before every browser mutation. Repository APIs do not export an `ownerUid` argument, and foreign IDs return the same not-found error as missing IDs.

## Phone, tablet, and desktop behavior

Phone uses one-column onboarding, program cards, and runner controls with a sticky session action region that does not obscure fields. Tablet keeps the outline beside the active set when space permits. Desktop adds history/target context without changing operation order. All surfaces preserve the same server states and do not use viewport-specific data behavior.

## Accessibility

Every status change has visible text and a restrained live-region announcement. Field errors connect through `aria-describedby`; navigation and reordering have keyboard equivalents; confirmation dialogs name the exact program/profile effect. Focus moves to the first invalid field or conflict summary. Reduced-motion preference affects transitions but not save feedback. Color is never the only pending, saved, failed, skipped, or PR indicator.

## Privacy and security

Private notes, loads, bodyweight additions, cardio details, history, and analytics never enter public caches or logs. Repository errors omit raw SQL, connection values, Firebase tokens, and foreign ownership facts. History endpoints are dynamic and `no-store`. Account deletion is a resumable server saga; successful removal clears database ownership rows, Firebase identity, session cookies, and the matching offline namespace in the documented order.

## Acceptance criteria

- Verified onboarding creates exactly one profile/preferences/equipment set and one complete active starter program; replay returns the same result.
- Unverified mutation is denied without writes.
- Dumbbell and barbell clones preserve exact five-day prescriptions and labels.
- Confirmed equipment change creates one new published revision, moves only the selected active pointer, preserves the old revision, and explains cleared incompatible targets.
- Foreign program/session/custom-exercise IDs are indistinguishable from missing IDs and produce no write.
- Start/resume is idempotent under duplicate and concurrent submission and never exposes a partial snapshot.
- Every set/cardio/outcome operation validates snapshot scope, kind, position, version, terminal state, and request-hash replay.
- Completed and abandoned sessions are immutable and appear in owner-only history from snapshots.
- Records and progress use persisted logs, canonical units, declared calculation versions, and exact-tie behavior.
- Slow, failed, expired-auth, duplicate, stale, offline, refresh, and back-navigation paths never claim unsaved data succeeded.

## Automated tests and browser evidence

PGlite integration tests use the real migration and starter seed. Retained fail-then-pass evidence covers verified/unverified onboarding, duplicate replay, exact profile clones, active-pointer ownership, revision immutability, equipment substitution, foreign-ID denial, concurrent start/resume, immutable snapshots, all four measurement shapes, set bounds, cardio uniqueness, operation hash conflict, outcome versions, terminal freeze, and history isolation. Unit tests cover request hashing and stable error mapping. Browser evidence must replay onboarding, both equipment profiles, program edit/confirmation, active runner save/offline/reload/resume/retry/complete, history, records, analytics, auth expiry, and deletion on phone, tablet, and desktop in Chromium and WebKit with keyboard, reduced motion, dark mode, and automated accessibility checks.
