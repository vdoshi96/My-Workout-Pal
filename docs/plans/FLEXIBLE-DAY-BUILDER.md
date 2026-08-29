# Flexible day-builder plan

## Outcome

A verified member can open the active routine editor, shape any saved day without relying on starter names or counts, publish one complete immutable revision, reload the saved day, and start a workout from that exact revision.

The editor supports movement add, replace, reviewed removal, and keyboard ordering; arbitrary optional section add, rename, reviewed removal, and keyboard ordering; and zero, one, or two ordered alternative cardio choices. Stable opaque topology keys survive rename and reorder operations. Publication creates new descendant rows and never rewrites an earlier routine revision or workout snapshot.

This Wave 1 slice consumes the Wave 0 flexible-publication contract. It doesn't change the guest landing page, signed-in home, Progress naming, companion copy, canonical or private library persistence, private guidance persistence, or inline private-movement creation.

## Navigation and flow

The member flow uses the following routes:

1. Open `/app/program/edit` from the active owned routine.
2. Select any day by its stable route key without discarding draft changes.
3. Add, replace, reorder, or review removal of movements.
4. Add, rename, reorder, or review removal of optional sections. Every published movement remains in one structural section, but no section name or classification is mandatory.
5. Add, remove, configure, and reorder zero to two alternative cardio choices.
6. Publish through `/api/app/program/publish` with the existing retry-stable idempotency key.
7. Open the selected saved day by its stable route key, reload it, and start or resume its exact server-snapshotted revision.

Changing the selected day inside the editor doesn't navigate or reset the draft. Leaving the editor with unpublished changes keeps the existing discard review.

## Editor state

The client keeps the following explicit states:

- Clean: The draft matches the active published revision.
- Dirty: At least one draft field, order, selection, or canonical-unit input differs from the baseline.
- Choosing: The editor has an add, replace, or seed-day request waiting for the library chooser.
- Reviewing removal: The editor names the exact movement or section descendants that the next publication omits.
- Invalid: The error summary names structural, selection, or measurement blockers without discarding the draft.
- Publishing: Controls are unavailable while one request is in flight.
- Published: The returned graph matches the submitted operation and becomes the clean baseline.
- Conflict or failure: The active revision remains unchanged, the local draft remains available, and the same operation can be reconciled or retried safely.

## Types and ownership boundary

The day builder owns draft placement and accepts one narrow movement selection:

```ts
type MovementSelection = Readonly<{
  source: Readonly<{
    kind: "catalog" | "custom";
    id: string;
  }>;
  name: string;
  loggingKind: LoggingKind;
}>;

type MovementChooserRequest =
  | Readonly<{ intent: "add" }>
  | Readonly<{ intent: "replace"; currentSelection: MovementSelection }>
  | Readonly<{ intent: "seed-day" }>;
```

The library worker owns chooser search, catalog and private data loading, equipment compatibility filtering, inline private creation, and guidance persistence. The discriminated chooser boundary requires `currentSelection` only for `replace`; `add` and `seed-day` carry no current selection. The chooser exposes dismiss and sanitized stable error callbacks. An error can't contain an owner identifier or private URL.

The day-builder's neutral contract checkpoint is `2436bac92ba3381e76646bf61210cd5fd4dae88f` in `src/domain/exercises/movement-chooser-contract.ts`. Wave 1 integration mounts the library-owned `MovementChooserAdapter` for add, replace, and seed-day requests while the editor retains placement, topology, defaults, and publication. A small editor-local hint map recognizes a newly created private selection until the next server read; it does not expand the frozen contract or replace server validation.

A chooser selection contains no owner key, route identity, program identity, stable topology key, prescription target, guidance URL, or server-authoritative movement metadata. The returned name and logging kind are interface and default hints. The server revalidates movement existence, ownership, logging meaning, and equipment compatibility during publication. The editor captures its own day, section, and prescription destination before it opens the chooser and applies the returned selection there.

The day builder owns the following transformations:

- Preserve a prescription key when replacing a movement.
- Preserve compatible fields for a same-logging-kind replacement.
- Retain sets, rest, kind, and notes but reset incompatible ranges and targets for a cross-kind replacement.
- Generate a fresh opaque prescription key when adding a movement.
- Preserve cardio keys when reordering choices.
- Require a fresh review bound to the exact prescription or section keys before destructive removal.

## Persistence and authorization

Wave 0 migration `0005_flexible_routine_topology` and the existing publication repository remain the topology and authorization boundary. Migration `0006_program_cardio_display_order` adds one bounded `display_order` value to owned program cardio rows because mode order can't preserve a member's chosen alternative order. The migration backfills existing rows deterministically in Walker-then-Runner order, restores the published-row immutability trigger before it makes the value required, and adds revision-day uniqueness and 1-2 bounds. It changes no cardio meaning, workout snapshot, or template row.

Publication writes array position as cardio display order. Program reads, root cloning, equipment revisions, and workout start preserve and order by that value. This slice doesn't edit catalog or private-library storage and doesn't apply the migration to production.

Publication keeps these guarantees:

- The server derives Firebase UID from the revocation-aware HTTP-only session.
- Same-origin CSRF and verified mutation eligibility run before request parsing and database construction.
- The request contains no owner key.
- The repository validates the active owner-scoped base revision and every catalog or owner-private movement.
- One publication writes a complete revision with new descendant row IDs and preserved stable topology keys.
- A stale revision, missing or foreign movement, changed idempotency payload, incompatible equipment reference, or invalid aggregate writes nothing.
- Private responses remain `Cache-Control: private, no-store`.

Workout start continues to accept the opaque program-day row ID from the owner-scoped saved-day route. The server snapshots the selected published day name, section titles, movement meaning, targets, order, and optional cardio before returning the runner session.

## Bounds and validation

The editor and publication boundary preserve these Wave 0 limits:

- 1-14 ordered days.
- 1-12 structural sections per day.
- 1-40 movements per day and at most 200 movements per routine.
- Zero to two unique cardio choices per day.
- Day and section names contain 1-120 characters.
- Program names contain 1-80 characters.
- Existing prescription, notes, canonical measurement, and duration limits.

The interface never assumes five days, a section named Core, one section of each classification, or a Walker and Runner pair. The `strength`, `accessory`, and `core` values remain internal default-prescription classifications under the Wave 0 contract; they don't determine the visible section name, uniqueness, presence, or order.

## Failure recovery

- Keep all draft data after validation, request, response-shape, connection, and stale-revision failures.
- Keep one idempotency key for an interrupted publication until a confirmed response establishes the next clean baseline.
- Validate the complete returned graph and bind it to the submitted operation before showing a saved state.
- If a selected movement disappears, identify the unavailable draft movement and don't send the request.
- If a removal review becomes stale after another edit, refuse the removal and require a fresh review.
- If the selected day disappears from a confirmed publication response, select the nearest surviving saved day.
- If a saved-day start finds another resumable day, show the existing named conflict and don't open the wrong workout.

## Responsive behavior and accessibility

Phone layouts keep one selected day and its controls in document order. Tablet and desktop layouts keep the day outline beside the editor. No layout changes topology meaning.

All ordering uses visible **Up** and **Down** controls and requires no drag gesture. Every action name includes its day, section, movement, or cardio choice. Removal uses a labeled modal dialog, moves focus to the destructive action, supports **Cancel** and Escape, and restores focus to the nearest surviving control. Validation uses an alert summary; save and ordering changes use a polite live region. Controls retain visible focus, 44 by 44 CSS pixel targets, reduced-motion behavior, dark-mode contrast, forced-colors legibility, and reachability at 200% zoom.

## Privacy

Routine names, day and section names, private movements, targets, and notes are account data. They don't enter public caches, service-worker routes, analytics, logs, or public evidence. Screenshots use synthetic fixture owners and contain no Firebase credential, database URL, owner UID, private guidance link, or private recording derivative.

## Test-driven implementation

Retain concise failed-before and passed-after evidence for the following behavior:

- Cardio ordering preserves the two opaque keys and doesn't mutate the source draft.
- Migration `0006` backfills existing optional cardio, preserves immutable meaning, accepts order 1-2, and rejects duplicate or out-of-range order.
- A stale or unconfirmed movement-removal review can't remove a movement.
- A confirmed movement-removal review removes only the named prescription and preserves the remaining order and keys.
- Add and replace consume the narrow selection shape while keeping the existing target-retention and reset rules.
- The editor renders arbitrary day and section names, exposes keyboard ordering for movements, sections, and cardio, and doesn't contain fixed five-day or mandatory-Core assumptions.
- Publish accepts the complete arbitrary topology, returns the exact stable keys and cardio order, and leaves the earlier revision unchanged.
- Reload resolves the selected stable day route, and workout start snapshots the exact saved order and zero-to-two cardio shape.

Run focused unit and component tests before repository and workout integration tests. The final gate includes strict TypeScript, full ESLint, all Vitest files, Drizzle metadata, deterministic seed validation, generated service-worker verification, documentation parity, the supported Webpack production build, and the production route-boundary check.

## Browser evidence

The production-mode authenticated fixture uses synthetic owners and the real PGlite repositories. Replay this focused journey in Chromium desktop and WebKit phone:

1. Open an owned arbitrary-name routine and select a nonstarter day.
2. Add and replace movements through the selection boundary, reorder them, and cancel then confirm one reviewed removal.
3. Add, rename, and reorder an optional section; cancel then confirm its removal review.
4. Start with zero cardio, add two alternatives, reorder them, remove one, then add it again and retain the authored two-choice order.
5. Publish, reload the saved-day route, and verify names, counts, keys, and order.
6. Start the saved day and verify the immutable runner snapshot uses the published movement, section, and cardio order.
7. Verify keyboard operation, dialog focus restoration, no serious or critical Axe result, no horizontal overflow, private no-store responses, and no unexpected console, page, or first-party request failures.

Retain only the newest completed QA report and representative Chromium desktop and WebKit phone screenshots under `docs/qa/latest/`.

## Acceptance criteria

- An authenticated owner can add, replace, review removal of, and reorder movements without changing another owner or an earlier revision.
- The owner can add, rename, reorder, and review removal of optional sections without a fixed Core requirement.
- The owner can configure and reorder zero, one, or two alternative cardio choices without requiring a Walker and Runner pair.
- A two-choice cardio reorder survives publication, reload, root cloning, equipment revision, and workout snapshot creation.
- Stable day, section, prescription, and cardio keys survive rename and reorder operations and round-trip through publication.
- The selected saved day reloads by its stable route key and starts an exact immutable workout snapshot.
- Arbitrary names and counts work within the documented safety bounds.
- The chooser boundary remains limited to movement selection; no competing catalog, private movement, or guidance persistence is added.
- Focused tests, broad verification, authenticated Chromium desktop and WebKit phone evidence, documentation parity, and Git diff review pass before the branch is pushed.

## Verification record

Failed-before evidence:

- The editor-model run reported two failures and 15 passes before cardio reordering and reviewed movement removal existed.
- The publication/repository run reported two failures and 21 passes: `[runner, walker]` reloaded as `[walker, runner]`, and zero-distance cardio parsed successfully.
- The cardio-default test reported the received one-second values before the builder adopted a useful 1,200-second default.

Passed-after evidence:

- Focused chooser/editor/publication/migration/repository matrix: 6 files and 64 tests.
- Migration-impact matrix: 8 files and 83 tests.
- Complete permission-correct Vitest run: 109 files and 747 tests in 109.18 seconds.
- Strict TypeScript, full ESLint, Drizzle metadata, exact-two seed, generated service worker, documentation parity, Webpack production build, and the 41-entry production route boundary passed.
- Authenticated production-fixture journey: Chromium desktop passed in 10.1 seconds; WebKit phone passed in 17.7 seconds; 2 passed in 29.2 seconds.

The worker checkpoint remains available in branch history. The newest combined report and representative synthetic frames are retained in `docs/qa/latest/WAVE-1-INTEGRATION-QA.md`. No production migration was applied, no deployment ran, and this evidence makes no hosted-production claim.
