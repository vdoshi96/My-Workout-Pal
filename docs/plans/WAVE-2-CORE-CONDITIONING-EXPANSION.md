# Wave 2 core and conditioning expansion plan

## Outcome

Expand the canonical movement library with the 42 inventory candidates assigned
to core, conditioning and carries, and mobility and recovery. The generated
catalog keeps all 27 released records in their released order, then appends the
owned candidates once in deterministic inventory order.

Each added record has a stable slug, display name, supported logging kind,
existing equipment requirements, movement family, primary muscles, searchable
aliases, and exactly three concise instructions. The batch adds no durable
database ID and publishes no candidate video. A record without a full-watch-
approved pair renders its instructions and a truthful unavailable or personal-
guidance state without an empty or unapproved iframe.

## Scope and ownership

This package owns only the following authored catalog sources:

- `src/domain/exercises/catalog-manifests/core.ts`
- `src/domain/exercises/catalog-manifests/conditioning-and-carries.ts`
- `src/domain/exercises/catalog-manifests/mobility-and-recovery.ts`

The bounded inventory contributes 18 core records, 14 conditioning and carry
records, and 10 mobility and recovery records. The package also owns distinct
category tests, authenticated browser coverage, this plan pair, and a uniquely
named QA report and evidence package.

This package doesn't edit the five upper-body or lower-body strength manifests.
It also doesn't edit the generator, combined manifest index, catalog adapter,
metadata adapter, central catalog snapshot, seed manifest, schema, migration,
shared status, or wiki. If an owned record can't satisfy the existing generator
contract, stop and report the exact gap before changing a shared file.

The package must not merge `main`, seed production, approve a candidate video,
deploy, change providers or aliases, or modify a sibling worktree.

## Verified intake

The clean intake commit is
`a202a815ad3b7320bbc68b819303822ca4773b1d`. Before branch creation, detached
`HEAD`, local `main`, and `origin/main` resolved to that commit.

Wave 1 supplies the generator-backed category manifests, deterministic combined
catalog, equipment-compatible public and member search, frozen chooser
selection, owner-scoped personal guidance, immutable workout snapshots, and the
authenticated production fixture. The generator supports the following
bounded vocabulary:

- Roles: `compound`, `accessory`, `core-reps`, and `core-timed`.
- Logging kinds: `weight_reps`, `bodyweight_reps`, `duration`, and
  `distance_duration`.
- Equipment: `bodyweight`, `dumbbells`, `barbell`, `plates`, `bench`, and
  `rack`.

The owned inventory uses only `bodyweight` and `dumbbells`, so it doesn't require
an equipment reinterpretation or taxonomy change.

## Content contract

For each candidate, preserve the inventory slug, display name, logging kind,
equipment list, and order. Add one distinct movement family, one or more primary
muscles, useful aliases that don't duplicate after normalization, and exactly
three instructions:

1. Describe the setup and stable starting position.
2. Describe the controlled movement or hold.
3. Describe the return, side change, or stopping condition.

Instructions must avoid medical advice, outcome promises, diagnosis, treatment,
pain language, and unbounded safety claims. Aliases must improve search without
collapsing distinct inventory movements. Records remain names-and-instructions-
only catalog entries until the separate curation record contains an eligible,
fully watched pair.

The 216 Grok URLs are product-owner-approved link selections. Their runtime
status remains pending full-watch review. Do not copy their video IDs into a
seed, create a catalog iframe, redo discovery, or describe a sampled visual
timeline as a full watch.

## Catalog order and deterministic generation

Append the 18 core candidates after the eight released core records. Append the
14 conditioning and carry candidates to their empty category manifest. Append
the 10 mobility and recovery candidates to their empty category manifest. The
combined generator retains the released 27-record compatibility prefix and
then visits category additions in manifest order.

Focused tests must prove the following properties:

- Each owned inventory slug occurs exactly once.
- The category counts are 26 total core records, 14 conditioning and carry
  records, and 10 mobility and recovery records.
- The released 27-record prefix remains exact and each owned candidate appears
  in inventory order after that prefix.
- Every owned record has supported values, no durable ID field, at least one
  equipment ID, at least one muscle, at least one alias, and exactly three
  instructions.
- Generation is deterministic and every generated record is deeply frozen.
- Representative name, slug, alias, muscle, and equipment queries return the
  expected compatible records.

## Logging and editor behavior

The batch represents all four supported logging kinds. The routine editor owns
target defaults and replacements; catalog content doesn't add another target
model.

Adding a repetition movement creates the editor's section-specific repetition
range. Adding a `duration` or `distance_duration` movement creates a 20-45
second range with no repetition range. A `distance_duration` movement also
requires a positive distance before publication. A `duration` movement doesn't
require distance.

Replacing a movement with another movement of the same logging kind retains
the authored targets and stable prescription identity. Replacing it with a
different logging kind resets incompatible repetition, duration, weight, and
distance values to the existing defaults while retaining the stable
prescription identity, notes, set count, set kind, and rest period. Focused
tests use representative owned catalog records to prove each represented
shape, the positive-distance blocker, same-kind retention, and cross-kind reset.

## Navigation and interface states

The authenticated journey uses production components in the isolated fixture:

1. Open the real routine editor for a verified member.
2. Search for representative owned records by display name and alias.
3. Confirm that both supported profiles expose the owned bodyweight and
   dumbbell movements and preserve each record's exact equipment requirements.
4. Add representative repetition, duration, weighted repetition, and
   distance-duration movements.
5. Enter every required target, publish the draft, reload it, and confirm the
   exact movement names and targets.
6. Start the exact saved day and confirm that the runner shows the same
   immutable movement meaning.
7. Open a record without an approved app pair and confirm useful instructions,
   truthful unavailable or personal-guidance copy, and no iframe.

Run the journey in Chromium desktop and WebKit phone. Use keyboard interaction
where the engine supports it and retain screenshots only in this package's
uniquely named evidence directory.

## Persistence and authorization

The package changes authored catalog content only. Stable database identities
remain derived by the existing seed boundary from canonical slugs. Routine
publication stores the catalog reference through the existing owner-scoped
server contract. Starting a workout snapshots the selected exercise meaning,
targets, and resolved guidance into the immutable workout graph.

The browser fixture must exercise a verified member. The client never supplies
an owner ID, and another owner must not gain access to the first owner's draft,
guidance, workout, or history. Existing exact-two starter seed behavior remains
unchanged because the batch adds no approved-video rows.

## Failure recovery

Search failure keeps the editor draft and offers the existing retry path.
Publication validation identifies the exact movement that lacks a required
positive distance. A rejected or ambiguous publication doesn't claim success,
discard the draft, or create a second revision. After a successful publication,
reload reads the server-owned revision before the journey starts a workout.

Missing app guidance never blocks selection or logging. The detail and runner
surfaces show useful text, omit an unapproved iframe, and preserve an optional
owner-only guidance path. Media failure can't remove instructions or workout
controls.

## Responsive behavior and accessibility

At desktop and phone sizes, search results, target fields, publication errors,
and terminal actions must remain visible without horizontal overflow. Keep
touch targets at least 44 by 44 CSS pixels. Preserve label-in-name, semantic
headings and lists, visible focus, focus restoration after the chooser closes,
controlled status announcements, and keyboard-operable selection.

Run Axe on the expanded chooser, editor, and runner states. Preserve reduced-
motion and forced-colors behavior. The batch adds no decorative art or motion.

## Privacy and video state

Do not commit raw curation material, transcripts, frames, contact sheets,
candidate IDs, private guidance URLs, owner identifiers, credentials, or
user-derived screenshots. Synthetic QA identities and data must remain bounded
to the isolated fixture.

The public catalog does not label a Grok-selected link as approved. It renders
an app-approved player only when the existing production seed contains the
complete reviewed pair. Owner links remain private, are labeled as the member's
links, and never change public video status.

## Test-driven implementation

Before adding records, add a distinct category test that fails on the missing
42-candidate contract. Retain the focused command, meaningful failure, and
failing assertion count. After implementation, rerun the exact command and
record its passing files, tests, and duration.

Add focused coverage for category order, generator output, search and aliases,
equipment compatibility, logging defaults and validation, safe replacement,
and missing-video presentation. Don't rewrite the central released catalog
snapshot or another Wave 2 worker's test.

## Verification matrix

Run and record the following checks on the final branch:

- Strict TypeScript.
- Scoped ESLint for owned sources and tests, then full ESLint.
- Focused category, search, equipment, logging, replacement, and missing-video
  Vitest tests.
- Full Vitest.
- Deterministic seed and exact-two approved-video checks.
- Generated service-worker and documentation parity.
- Next.js Webpack production build.
- Production route-boundary verification.
- Authenticated Chromium desktop and WebKit phone journeys.
- `git diff --check`, owned-path diff review, and a clean Git worktree after the
  final commit.

Use the project's existing dependency installation and don't mutate shared
`node_modules`.

## Acceptance criteria

- The generated catalog contains all 42 owned candidates exactly once and keeps
  all 27 released records in their exact released order.
- Category counts and deterministic inventory order match the bounded source.
- Every owned record has supported metadata and exactly three useful,
  claim-free instructions.
- Search and equipment filters find representative records by name and alias.
- Every represented logging shape has correct defaults, required targets, and
  safe same-kind and cross-kind replacement behavior.
- A verified member can add representative records in the real editor,
  publish, reload, start the exact routine, and see immutable movement meaning.
- Missing approved app video shows useful text and no empty or unapproved
  iframe. The 54 released starter videos retain exact-two seed behavior.
- Owner-scoped guidance, private authorization, immutable snapshots, starter
  compatibility, PWA output, documentation parity, and production routes pass
  without regression.
- The feature branch is committed and pushed as
  `vishal/library-core-conditioning-expansion` without merging `main` or
  changing production.

## Evidence and closeout

Store the package report in
`docs/qa/wave-2-core-conditioning-expansion/` with a same-content HTML
counterpart. Keep evidence uniquely named so later integration can select the
combined package without deleting `docs/qa/latest/`.

Report exact category counts, owned files, commit IDs, verification totals,
retained screenshots, inventory ambiguity, and integration requirements. Push
the feature branch and stop before merge or release actions.
