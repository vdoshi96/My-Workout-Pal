# Library and personal guidance foundation plan

## Outcome

An authenticated owner can search equipment-compatible canonical movements and
their private movements, choose one for a routine, create a private movement
without leaving the chooser, and attach or replace private guidance. Publishing
and starting the routine preserve the selected movement and snapshot the
resolved guidance. Later edits do not change an active or historical workout.

This Wave 1 package establishes catalog and chooser foundations. Wave 2 owns the
reviewed metadata and instruction expansion from 27 to 135 canonical movements.
The 216 product-selected YouTube links remain research candidates with
`not_started` runtime status until the existing full-watch curation record makes
an exact pair eligible for publication.

## Ownership boundary

This package owns the following behavior:

- Generator-backed canonical catalog sources and deterministic combined output.
- Owner-scoped private movement and personal-guidance loading and persistence.
- Bounded search and equipment compatibility for canonical and private results.
- URL normalization, safe presentation, and private guidance labels.
- The stable movement chooser adapter contract and inline private creation flow.
- Workout guidance snapshotting, runner presentation, focused tests, and browser
  evidence.

The day-builder package owns the editor shell, day and section placement,
prescription keys, target defaults, logging-kind transitions, ordering, cardio,
and publication controls. This package does not change the guest landing page,
the signed-in home, Progress naming, or companion copy.

## Chooser contract checkpoint

The day builder imports the contract without importing chooser UI internals. The
adapter receives one discriminated `request` and three callbacks:

- `request`: `add` and `seed-day` contain only their intent. `replace` also
  requires `currentSelection` so an implementation can't erase replacement
  context by accident.
- `onSelect`: receives one exact movement selection.
- `onDismiss`: reports intentional closure without a selection.
- `onError`: reports a bounded UI-safe error without exposing URLs, owner IDs,
  or persistence details.

`onSelect` receives only the following value:

```ts
{
  source: { kind: "catalog" | "custom"; id: string };
  name: string;
  loggingKind: LoggingKind;
}
```

The public contract names these values `MovementChooserIntent`,
`MovementSource`, `MovementSelection`, `MovementChooserRequest`,
`MovementChooserError`, and `MovementChooserAdapterProps`. The chooser never
returns prescription keys, target defaults, sections, positions, or persistence
models. The day builder maps the selection into its draft and owns same-kind
value retention and cross-kind resets.

## Navigation and interface states

The day builder opens the adapter from its add, replace, or blank-day action.
The chooser provides search, compatible results, a private-movement filter, and
an inline **Create private movement** action. It returns focus to the invoking
control after selection or dismissal.

The chooser covers the following states:

- Initial compatible canonical and private results.
- A bounded search query with matching results or a useful empty state.
- Loading, slow loading, retryable failure, and authentication expiry.
- An unverified account that can browse but cannot create or persist guidance.
- Inline private creation with validation, saving, duplicate replay, failure,
  and retry using one idempotency key.
- Canonical approved guidance, no approved guidance, and existing private
  guidance.
- Personal-guidance save, replace, remove, stale input, and retry states.

On phones, the chooser and inline form use one bounded scrollable sheet. On
tablet and desktop layouts, search results and movement detail can share space
when both panes remain usable. DOM order and keyboard order remain stable across
breakpoints.

## Catalog sources and search

Move canonical records into category manifests with one validated generator that
produces the combined application catalog and database seed rows. Each record
retains one stable slug, display name, logging kind, required equipment,
movement family, aliases, primary muscles, exactly three reviewed instructions,
and no curation-workflow fields. Content review evidence and video status remain
outside the runtime catalog manifest.

Wave 1 preserves the 27 released records and their 54 approved videos exactly.
It adds no expansion candidate to runtime data before its metadata and
instructions pass review. Generator tests prove deterministic output, unique
slugs, complete starter parity, and category isolation for Wave 2 workers.

Search normalizes case, punctuation, and whitespace, limits input length, and
matches names, slugs, logging kinds, movement families, aliases, primary
muscles, and required equipment. Equipment compatibility is applied before a
result becomes selectable. Private queries start with the server-derived owner;
another owner's movement is indistinguishable from a missing movement.

## Personal-guidance persistence

Add an append-only migration for owner-scoped guidance rows. Each row belongs to
the server-derived Firebase UID and exactly one catalog or private movement
identity. A movement stores at most two ordered, unique links. The application
does not copy a personal link into catalog or curation tables.

The private API accepts no owner key. It validates CSRF before authentication,
authenticates before parsing or database construction, enforces the verified
mutation boundary, limits the request body, validates the movement identity and
owner scope, and returns `Cache-Control: private, no-store`. Replace operations
are idempotent and transactional. A foreign or missing source receives the same
safe result and creates no rows.

Account deletion removes personal-guidance rows in the owned-data transaction.
Repository tests prove owner isolation, duplicate replay, late-failure rollback,
maximum count, ordering, replacement, and deletion.

Do not apply the migration to production in this package. The schema owner must
review, restore-gate, apply, and verify it during integration.

## URL validation and presentation

Treat every personal URL as untrusted input. The server parses and canonicalizes
the URL before persistence, limits its encoded length, accepts only `https`, and
rejects credentials, control characters, loopback or private-network hosts,
unsupported ports, and unsafe fragments. The response and logs never include a
rejected raw URL.

Recognized YouTube watch and short URLs persist one normalized video ID and
render through a privacy-enhanced `youtube-nocookie.com` iframe. The player does
not autoplay and labels the item **Your link**, never **Approved**. Supported
article URLs render as external links with safe opener and referrer behavior.
The application never injects owner-provided HTML and never fetches an arbitrary
personal URL during an ordinary request.

The personal-guidance read model distinguishes an approved catalog pair, a
private owner link, and unavailable guidance. Missing app guidance does not
render an empty player or block movement selection.

## Inline private movement creation

The inline form collects a name, logging kind, required equipment, optional
instructions, and up to two optional personal links. It uses the existing
owner-scoped private-movement domain and preserves its semantic-history rules.
After a successful create, it persists normalized guidance, selects the created
movement, and returns the exact chooser result.

Creation and guidance persistence use one server transaction or an explicit
recoverable result that cannot claim both succeeded when only one write did.
Retry keeps one idempotency key. A malformed success response does not advance
chooser state.

## Publication and snapshot behavior

Routine publication continues to store only the canonical or custom movement
identity in each immutable prescription. When a workout starts, the repository
resolves personal guidance for the server-derived owner and effective movement,
then writes a bounded guidance snapshot into the immutable workout exercise row.
The snapshot records presentation-safe normalized fields, not a live foreign
key to editable guidance.

Runner and history reads use only the saved guidance snapshot. Updating,
replacing, or removing personal guidance after session creation cannot change an
active, completed, interrupted, or abandoned session. Guidance remains usable
when one external resource disappears; logging never depends on media loading.

## Failure recovery, accessibility, and privacy

Validation errors stay next to their fields and preserve nonsecret input.
Network or persistence failures retain search, inline form, and guidance drafts.
Authentication expiry blocks writes and routes the same owner through
reauthentication without exposing or discarding their private state.

The chooser uses a labeled search field, a semantic result list, visible source
and compatibility text, keyboard-operable selection, a titled dialog or sheet,
trapped focus while open, and focus restoration. Status messages use controlled
live regions. Touch targets are at least 44 by 44 CSS pixels, and 200% zoom does
not hide fields or terminal actions.

Personal movement names, instructions, aliases, and links never enter public
caches, service-worker entries, analytics, operational logs, error text,
screenshots with shared identities, or curation artifacts.

## Test-driven implementation

Retain concise failed-before and passed-after evidence for the following slices:

1. Chooser contract parsing and exact output shape.
2. Generator-backed catalog parity and deterministic output.
3. URL normalization, rejection, and presentation classification.
4. Guidance schema, repository, owner isolation, idempotency, and deletion.
5. Private API authentication order, body bounds, owner-free input, and
   `no-store` output.
6. Inline private creation, selection, retry, focus, and error recovery.
7. Workout snapshot immutability after guidance replacement or removal.
8. Runner presentation for approved app guidance, **Your link**, external
   articles, unavailable media, and removed resources.

The completed gate includes focused Vitest tests, PGlite migration and
repository tests, authorization and cross-owner tests, strict TypeScript, full
ESLint, documentation generation and parity, Drizzle validation, the Webpack
production build, and `git diff --check`.

## Browser evidence

Use the isolated authenticated production fixture. In Chromium desktop and
WebKit phone, complete the following journey with keyboard coverage where the
engine supports it:

1. Open the chooser from a routine draft and search canonical and private
   results.
2. Select a canonical movement without approved app guidance and add a private
   article or YouTube link.
3. Create a private movement inline, select it, publish through the existing
   shell, and start the chosen day.
4. Verify that the runner labels private guidance **Your link** and renders an
   external link or privacy-enhanced player safely.
5. Replace the live guidance after session creation and confirm that the active
   session and immutable history retain the original snapshot.
6. Confirm that another owner cannot read, select, or replace the movement or
   guidance, and that private routes and media never enter the public cache.

Keep only the newest completed evidence under `docs/qa/latest/`. Local checks do
not prove production behavior, and this package does not deploy or modify
production.

## Acceptance criteria

- The day builder consumes the frozen chooser contract without importing UI
  internals or ceding prescription behavior.
- Canonical and owner-private search returns only compatible selectable results.
- Inline creation returns one exact stable selection and does not leave the
  chooser on success.
- Personal URLs are owner-scoped, normalized, bounded, safely rendered, and
  never labeled as app-approved.
- Workout start snapshots resolved guidance, and later edits cannot rewrite
  active or historical sessions.
- Another owner receives no movement, guidance, URL, or existence signal.
- The 216 selected research links remain outside the production seed until full
  human-watch records satisfy the existing policy.
- Focused and complete local gates plus Chromium desktop and WebKit phone
  authenticated evidence pass on the final branch.

## Implementation record

The neutral chooser checkpoint is commit `5255a5254fcde4c1b1558947bda64d47bad23743`.
Its contract module and three focused test/documentation files are byte-for-byte
identical to day-builder checkpoint
`2436bac92ba3381e76646bf61210cd5fd4dae88f`; the two commits are parallel
children of the verified Wave 0 baseline rather than a parent/child lineage.
The exported adapter is `MovementChooserAdapter` from
`src/components/exercises/movement-chooser.tsx`. It accepts only
`MovementChooserAdapterProps` from the neutral contract module and returns the
frozen selection shape without editor topology or guidance state.

Catalog checkpoint `0f820535c4aec0686b7b73451513bc8d3dda7d26`
splits all 27 released movements into eight validated category manifests while
preserving released order, seed identity, metadata, and the 54 approved video
rows. No one of the 216 expansion candidates was added to runtime data.

Migration `0007_personal_guidance.sql` adds the owner/source-XOR personal store
and immutable workout guidance snapshot. It also copies existing private custom
exercise YouTube links into the new store, so this additive change does not
silently discard earlier owner guidance. The day-builder branch owns
`0006_program_cardio_display_order.sql`. Wave 1 integration merged that branch
first, retained both SQL migrations in numeric order, and regenerated the
`0007` Drizzle snapshot against the integrated `0006` snapshot. The integrated
candidate applies neither migration to production and does not deploy.

Retained TDD evidence includes failures before the personal-guidance repository
existed, before legacy private-video backfill existed, and when resume hydration
dropped a correctly persisted guidance snapshot. The corresponding focused
repository, migration, hydration, and immutability regressions pass after the
implementation.

The isolated authenticated production fixture completes the library journey in
Chromium desktop and WebKit phone: search and source filtering, inline private
creation, YouTube normalization, article replacement, exact chooser selection,
publication through the owner-scoped server contract, workout start, private
link presentation, live-link replacement without snapshot drift, axe scanning,
and another-owner `404`. All 27 released catalog movements already have approved
guidance, so the browser journey uses a private movement for the unavailable-app-
guidance state instead of inventing an unapproved catalog record. The integrated
editor now consumes the adapter for add, replace, and seed-day requests through
the already identical frozen contract; the editor still owns destinations,
defaults, stable keys, and publication.
