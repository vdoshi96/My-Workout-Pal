# Flexible routine publication plan

## Outcome

A verified member can create an example-based or custom routine, give every day a personal name, and publish a complete immutable revision with 1-14 ordered days. The member can add, rename, duplicate, reorder, and remove days without rewriting an earlier program revision or workout snapshot. The protected overview, day route, equipment revision, and workout-start repository read the same arbitrary topology.

This Wave 0 slice replaces the fixed five-day publication boundary. It does not change the public five-day example, authentication entry behavior, companion visual concepts, private guidance links, or the later full day-builder interaction design.

## Navigation and user flow

- `/app/programs` keeps **Start with the example** and adds a custom-routine path that doesn't clone the five-day template. The custom path asks for the routine name, equipment profile, first day name, first section name, and first compatible movement so the first published revision is valid instead of pretending that an empty draft is saved.
- `/app/program/edit` exposes day add, rename, duplicate, move up, move down, and reviewed removal actions. A newly added day starts with one movement and no cardio. A duplicated day receives independent stable topology keys.
- `/app` renders the saved day count and every saved day in publication order. It doesn't describe an owned routine as five days or promise paired cardio.
- `/app/program/[day]` resolves the stable day key from the active owner-scoped revision. It renders zero, one, or two cardio choices and starts the selected opaque program-day row.
- `/workout/[sessionId]` continues to use the immutable session snapshot. Starting a custom day snapshots its personal day name, section title, movement meaning, targets, and optional cardio.

## Bounded topology contract

The publication boundary uses the following limits:

- 1-14 days per routine.
- A 1-120 character day name.
- 1-40 movements per day.
- At most 200 movements per routine.
- 1-12 stored sections per day and 1-40 movements per section.
- Zero, one, or two unique cardio choices per day.
- Existing prescription, note, range, rest, measurement, and canonical-unit limits remain unchanged.

Every movement belongs to one stored section so ordering and workout snapshot labels remain explicit. A day therefore retains at least one structural section. The section title is arbitrary, additional sections are optional, duplicate internal classifications are permitted, and no section must be named or classified as Core. This reconciles the required structural grouping with the repositioning contract that Core work itself is optional.

The `strength`, `accessory`, and `core` values remain an internal presentation and default-prescription classification in this migration. They don't constrain section names, uniqueness, presence, or ordering. A later schema migration can replace this classification without blocking flexible topology.

Walker and Runner remain the supported cardio measurement modes in this slice. Neither mode is required, and they don't need to appear as a pair. Zero choices require no cardio log. When one or two choices are published, they are alternative required choices: completing either one satisfies the day's cardio requirement.

## Stable identity contract

Immutable descendant row IDs identify one published revision only. Stable topology keys identify the same logical item across revisions:

- `program_days.day_key` remains the stable day key. Existing starter values such as `push` remain valid historical keys. Every newly added or custom-routine day uses an opaque UUID.
- Migration `0005_flexible_routine_topology` adds `section_key`, `prescription_key`, and `cardio_key` to the owned program tables. It backfills each existing row from that row's UUID, makes the columns non-null, and adds revision-scoped uniqueness constraints.
- Publication accepts the stable keys separately from `sourcePrescriptionId`. A source row ID authorizes preservation of source-only metadata, while the stable key drives new descendant identity.
- Renaming or reordering preserves stable keys. Adding generates new keys. Duplicating generates a new day key and new section, prescription, and cardio keys for the duplicate. Removing omits the item only from the new revision.
- Starter and root cloning copy stable keys into the independent root because they copy the logical topology. New immutable descendant row IDs remain distinct.
- Equipment changes copy every day and optional descendant in the source revision, preserve stable keys, apply the established starter replacements only where their semantic slot matches, and reject incompatible unmapped movements. Compatible movements in arbitrary user topology remain unchanged. Equipment revision never recreates starter days, Core sections, or missing cardio.

Request validation rejects duplicate stable keys anywhere in one revision. Newly created keys must be UUIDs. Legacy non-opaque day keys are accepted only when they already belong to the active source revision, which prevents a client from inventing another semantic key.

## Persistence and migration

Migration `0005_flexible_routine_topology` owns the following changes:

- Replace the `program_days_number_shape` check with `day_number between 1 and 14`.
- Add the three owned stable-key columns and backfill identity metadata from existing row UUIDs while changing no published topology, prescription meaning, order, or workout-history value. The migration temporarily disables only the three descendant immutability triggers needed for this metadata backfill and restores them before adding non-null and uniqueness constraints.
- Add revision-scoped unique indexes for day, section, prescription, and cardio stable keys.
- Preserve the template schema and all existing template rows. The public example remains a five-day template.
- Leave workout table columns unchanged. New snapshot JSON additionally records stable day, section, prescription, and cardio keys plus the section title; readers treat those additions as optional so pre-migration session snapshots remain backward compatible and immutable.

The migration is exercised through the complete checked-in PGlite sequence from `0000` through `0005`, including an upgrade fixture with existing published rows. It isn't applied to Neon or another production database in this task.

The profile/program repository keeps owner UID derivation on the server. It adds a custom-routine creation transaction that writes one root, one published revision, one user-named day, one user-named section, one selected compatible movement, and no cardio. The transaction verifies the chosen catalog movement and equipment compatibility, reserves the idempotency key, activates the new root, and updates the owner's equipment projection exactly like starter creation.

Publication validates the full aggregate before it creates the database graph. It resolves every catalog and owner-custom movement inside the transaction, checks the current active revision, inserts a new complete graph, publishes it, and atomically advances the active pointer. An earlier revision, inactive root, workout session, snapshot, set log, cardio log, personal record, and progress source remain unchanged.

Workout start continues to accept only the opaque program-day row ID resolved by the owner-scoped route. If another day in the same revision already has a resumable session, the repository returns a conflict naming that in-progress day; it never silently opens the wrong day. The member must resume or abandon that session before starting the newly requested day.

## Domain and transformation behavior

Pure editor helpers run before UI work and don't mutate their input:

- Add a valid minimal day with new stable keys.
- Rename a day without changing identity.
- Duplicate a day with equal meaning and independent stable keys.
- Reorder a day and normalize all `dayNumber` values from array order.
- Review a nonempty day removal by capturing its stable key plus every movement name and key.
- Remove a reviewed day while refusing removal of the final day or a stale review.
- Add, rename, reorder, and remove arbitrary sections while retaining at least one section and one total movement per day.
- Add or remove supported cardio modes without requiring a pair.

The existing prescription transforms continue to validate logging meaning and canonical units. They receive stable prescription keys so React keys and publication identity don't depend on position or the preceding revision's row ID.

## Authorization, privacy, and security

- The server derives Firebase UID from the revocation-aware HTTP-only session. No create, publish, equipment, start, or read request accepts an owner key.
- Same-origin CSRF and verified permanent-mutation eligibility run before body parsing and database construction.
- Foreign and missing program, revision, day, catalog, and custom-exercise identifiers remain indistinguishable.
- Private responses remain `Cache-Control: private, no-store`.
- Routine names and day/section names are private account data. Server errors and evidence don't log them alongside an owner identifier.
- Weight stays in kilograms, distance stays in meters, and presentation conversion stays at validated UI boundaries.
- The migration, tests, and fixture use no production database, Firebase, Vercel, YouTube, or private recording data.

## Loading, empty, failure, and interruption states

- A custom-routine form is incomplete until it has a bounded name, day name, section name, equipment profile, and compatible first movement. It never reports an empty unpublished object as saved.
- The editor refuses zero days, a day with zero movements, more than 14 days, more than 40 movements in one day, or more than 200 movements in the routine.
- Removing a nonempty day opens a review that names every movement leaving the next revision. Cancel changes nothing and restores focus.
- A stale removal review, stale base revision, deleted custom movement, incompatible movement, malformed stable key, duplicate stable key, database failure, or ambiguous response leaves the local draft intact and the active revision unchanged.
- One idempotency key survives an interrupted create or publish request. A same-request replay returns the affected revision without duplicating rows. Reusing the key with different topology conflicts.
- A dirty draft still blocks accidental navigation. Selecting another day inside the editor doesn't discard the draft.

## Responsive behavior and accessibility

Phone layouts keep one selected day in the editor and use explicit add, duplicate, move, and remove controls above its fields. Tablet and desktop keep the day outline beside the editor. Layout doesn't change topology meaning or DOM order.

Day and section ordering always has keyboard controls; no operation requires drag and drop. Every day action has a visible label and a name that includes the day. Removal review uses a labeled dialog, moves focus into the dialog, supports Cancel and Escape, and returns focus to the invoking control. Status changes use a polite live region, while validation failures use the existing alert summary. Controls keep 44 by 44 CSS pixel targets, visible focus, reduced-motion behavior, dark mode, forced-colors legibility, and 200% zoom reachability.

## Test-driven implementation

Retained fail-first evidence covers:

- A one-day arbitrary-name publication succeeds while the old five-day schema rejects it.
- Zero days, 15 days, duplicate stable keys, zero-movement days, 41-movement days, and 201-movement routines fail.
- Add, rename, duplicate, reorder, and reviewed removal preserve the input and normalize order.
- Duplicate days receive independent opaque descendant keys.
- Optional Core and cardio shapes round-trip through PGlite.
- Migration `0005` upgrades existing starter rows, backfills stable keys, permits day 14, rejects day 15, and leaves prior row values intact.
- Owner-scoped custom creation, publish, read, clone, equipment revision, and workout start work for arbitrary days.
- Foreign custom movements, foreign days, stale revisions, replay with changed input, and incompatible equipment write nothing.
- Starting Day B while Day A is resumable returns the named conflict instead of returning Day A. A zero-cardio day completes without cardio, while a one- or two-choice day requires one selected cardio completion.
- A pre-edit workout snapshot and an earlier program revision remain unchanged after day rename, reorder, removal, and equipment confirmation.

Focused tests run before the broad aggregate. The final local gate includes strict TypeScript, full lint, all unit and integration tests, Drizzle metadata validation, deterministic seed checks, generated service-worker parity, documentation parity, the supported Webpack production build, and the production route-boundary check.

## Browser evidence

The credential-free production-mode authenticated fixture covers this Wave 0 journey with synthetic owners and the real PGlite repositories:

1. Create a custom routine with one personal day name without cloning the example topology.
2. Rename that day, add a second, duplicate and rename the duplicate, move it, and remove one nonempty day after reviewing its movements.
3. Publish, reload `/app`, and reopen each remaining arbitrary day by stable route key.
4. Start a remaining day and inspect the workout snapshot's day name, section title, movement meaning, and optional-cardio state.
5. Confirm an equipment change and verify that it creates one new arbitrary-topology revision without adding starter descendants.
6. Reopen the pre-edit workout history and verify that its immutable snapshot didn't change.
7. Compare another owner's foreign day and program results with unknown IDs.

The focused journey runs in Chromium desktop and WebKit phone. Geometry cases cover Chromium phone/tablet/desktop and WebKit phone/tablet/desktop without duplicating persistence setup. Browser assertions include keyboard operation, focus return, dirty navigation, accepted-then-error retry, serious/critical Axe results, zero horizontal overflow, reduced motion, dark mode, first-party console/page/request failures, and private no-store responses.

This task doesn't deploy production, apply a production migration, merge `main`, or claim provider-backed evidence. Local fixture evidence remains distinct from hosted Firebase, Neon, preview, and production proof.

## Verification record (2026-08-27)

Retained fail-first evidence:

- The initial flexible-publication unit run failed three positive cases because the domain still required exactly five days, one Core section, and paired cardio; the bounded negative cases already passed. The implemented domain then passed all six cases.
- The initial migration integration run failed because migration `0005` did not exist. The complete `0000` through `0005` PGlite upgrade then passed, including published-row key backfill, restored immutability triggers, day 14 acceptance, day 15 rejection, and unchanged prior meaning.
- The first authenticated browser publication reached a successful server response but the client rejected an equivalent one-cardio graph because its binding comparison serialized object properties in insertion order. Canonical field comparison plus stable prescription-key binding fixed that regression before the final browser replay.

Passed-after evidence:

- 40 publication, editor, API, collection-model, and component tests.
- 54 schema, migration, profile-program, collection-repository, and API-route tests.
- 53 focused workout/start/resume/route tests, including 18 workout-repository integration tests, plus 39 broader runner and training-history tests.
- Direct strict TypeScript and focused lint checks.
- A production-mode authenticated fixture build and the full custom authoring, publish, reload, start, equipment-revision, immutable-history, and foreign-owner journey in Chromium desktop and WebKit phone.

The final branch-wide lint, unit/integration, database metadata, deterministic seed, service worker, documentation, production build, and route-boundary gates are recorded in the task handoff rather than treated as implementation-plan assumptions.

## Acceptance criteria

- The publication schema accepts 1-14 arbitrarily named ordered days and enforces 1-40 movements per day plus 200 per routine.
- New and duplicated topology uses stable opaque keys, while every publication still writes distinct immutable descendant rows.
- The member can add, rename, duplicate, reorder, and remove days, and every behavior survives publication and reload.
- Core work and cardio are optional. A valid day keeps one arbitrarily named structural section and at least one movement.
- Example and custom routine creation are distinct, truthful, owner-scoped, retry-safe paths.
- Program read models, protected overview/day routes, equipment revisions, and workout start consume arbitrary topology without ordinal or canonical-day assumptions.
- Earlier revisions and workout snapshots remain unchanged after publication and equipment changes.
- Migration `0005` passes the safe local PGlite upgrade path and isn't applied to production.
- Focused and broad verification, authenticated fixture evidence, documentation parity, and Git diff checks pass before the branch is pushed for orchestration.
