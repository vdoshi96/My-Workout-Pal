# Wave 2 catalog integration plan

## Outcome

Produce one reviewable local integration candidate on
`vishal/wave-2-catalog-integration` from base
`a202a815ad3b7320bbc68b819303822ca4773b1d`. Integrate the shared catalog and
video-eligibility contract, the strength catalog expansion, and the core,
conditioning, and mobility expansion without duplicating the shared
prerequisite.

The generated catalog must contain 134 deterministic records: the 27 released
records followed by 107 additions. The strength package contributes 65
distinct records. The core, conditioning, and mobility package contributes 42
records. `prone-dumbbell-row` is not a catalog record; the released
`chest-supported-dumbbell-row` record gains the exact alias
`prone dumbbell row`.

Keep the approved-video boundary at exactly 27 declared canonical variations
and 54 already-reviewed rows. Catalog-only records remain searchable,
selectable, publishable, runnable, and useful through written instructions
without gaining an approved video or empty iframe.

## Scope and stop boundaries

This integration may:

- Create and push `vishal/wave-2-catalog-integration`.
- Preserve the shared checkpoint and both source packages through explicit Git
  provenance.
- Resolve integration conflicts, central assertions, authenticated Playwright
  discovery, documentation, and local QA evidence.
- Run local database bootstrap, schema, seed, build, route, and browser gates.

This integration must not:

- Merge or fast-forward local or GitHub `main`.
- Apply a production migration, seed or mutate production data, deploy,
  promote, or change a provider or alias.
- Add, approve, or seed a Grok URL, candidate URL, candidate video ID, iframe,
  or provider mapping.
- Change schema or migrations unless an unexpected verified product blocker is
  reported before work continues.
- Add Wave 3 Corner Companions artwork, CSS, or runtime assets.
- Modify or remove a sibling worktree or source branch.
- Commit private recordings, transcripts, frames, curation scratch files,
  credentials, or owner-derived data.

## Verified intake

Before branch creation, the integration worktree was clean and detached at
`a202a815ad3b7320bbc68b819303822ca4773b1d`. Local `main`, `origin/main`, and the
live GitHub `main` ref resolved to the same commit. Each required source tip has
that base as its merge base.

The verified remote inputs are:

| Package | Remote branch | Required tip |
| --- | --- | --- |
| Catalog and video eligibility | `origin/vishal/catalog-video-eligibility-contract` | `7046a94bae41e90839b16d5329b58a1975600ee9` |
| Strength expansion | `origin/vishal/library-strength-expansion` | `5863659f274b932ba4e0ca1b8e9fc0a23f703c38` |
| Core, conditioning, and mobility expansion | `origin/vishal/library-core-conditioning-expansion` | `ac5b1b51b24f6554ac4ae9b731f8140ad73cf904` |

Shared checkpoint `7046a94`, strength prerequisite cherry-pick `ad92476`, and
core prerequisite cherry-pick `1cc190a` have stable patch ID
`36dd3f8aadbe2782d71d1088f33b2a2b0c49d3af`, the same parent, and identical
tree `0b873ced560c5b698d08307e7466671181dcf5ff`. Preserve `7046a94` as the
canonical shared commit and omit the two patch-equivalent duplicates.

## Integration order and provenance

Integrate the sources in the following order:

1. Cherry-pick shared checkpoint `7046a94` so its exact commit remains in the
   candidate history.
2. Cherry-pick strength content `bbd44ab` and evidence `5863659` without
   prerequisite duplicate `ad92476`.
3. Cherry-pick core, conditioning, and mobility content/evidence `ac5b1b51`
   without prerequisite duplicate `1cc190a`.
4. Resolve every overlap explicitly. Record the chosen content and reason in
   the integration QA report. Never accept one side wholesale when that action
   would discard another source package's owned records or evidence.
5. Add an integration checkpoint for central assertions, matcher composition,
   canonical documentation, generated HTML, and the consolidated QA package.

Preserve the two source-worker plans as intentional implementation history.
Consolidate completed evidence under `docs/qa/latest/` only after the combined
candidate passes its complete gate.

## Integration failed-before evidence

Source reports retain feature-level red-to-green evidence. Keep additional
integration evidence only for failures that the combined candidate exposes.
The expected initial assertion mismatches are:

1. The released-record generator snapshot expects the former two-alias value
   for `chest-supported-dumbbell-row`. Update it to require the exact third
   alias `prone dumbbell row`.
2. The shared library-filter assertion expects only
   `dumbbell-romanian-deadlift` for `dumbbell RDL`. Update it to require both
   `dumbbell-romanian-deadlift` and
   `single-leg-dumbbell-romanian-deadlift` in deterministic order.
3. The shared workout-repository fixture excludes `distance_duration` from its
   logging-kind expectation. Add the supported kind and prove all 19 tests in
   that file recover.

Also retain concise evidence for textual conflicts or genuine combined
defects, including the exact command, failing assertion or path, root cause,
correction, and passing replay. Keep sandbox or permission failures separate
from product failures, and treat them as infrastructure only after an unchanged
approved rerun passes.

## Catalog and type contract

The category manifests remain the only authored catalog-membership source. The
generator validates and deeply freezes the combined output. Preserve the
released 27-record prefix and visit additions in category and inventory order.

Each of the 107 additions must include:

- One unique stable slug and display name.
- One supported logging kind: `weight_reps`, `bodyweight_reps`, `duration`, or
  `distance_duration`.
- One or more existing equipment IDs.
- One supported role, one movement family, one or more primary muscles, and
  useful distinct aliases.
- Exactly three concise, claim-safe instructions in setup, controlled
  execution, and finish or stopping order.
- No durable database ID, URL, provider state, owner data, or video status.

The five added `distance_duration` records are supported catalog members. The
editor requires a positive distance before publication, the runner logs
canonical meters and duration, and presentation converts units only at
validated input and display boundaries.

## Search, navigation, and interface states

Public and authenticated libraries must search names, slugs, movement families,
aliases, primary muscles, equipment, and the existing authenticated
logging-kind labels. Apply equipment compatibility before a result becomes
selectable. For literal query `dumbbell RDL`, return the bilateral movement
before the single-leg movement.

Public and member exercise-detail routes keep written instructions available
when approved app guidance is absent. A catalog-only record renders the
truthful unavailable state with zero iframe elements. Approved released records
retain the existing two-option player.

The routine editor uses the neutral chooser result only:

```ts
{
  source: { kind: "catalog" | "custom"; id: string };
  name: string;
  loggingKind: LoggingKind;
}
```

The editor owns placement, targets, ordering, replacement defaults, and
publication. Search, equipment metadata, guidance, and ownership don't enter
the selection callback.

## Persistence, authorization, and history

Catalog expansion adds no persistence path. Stable database identities remain
derived from canonical slugs at the seed boundary. The existing server derives
Firebase UID from the verified session, validates catalog membership and
equipment compatibility, and publishes a complete immutable revision.

Workout start snapshots the selected revision, exercise meaning, logging kind,
targets, and resolved owner guidance. Reload, resume, and history read the
snapshot instead of mutable catalog or guidance state. A later catalog or
guidance edit can't rewrite an active or completed workout.

Store weight in kilograms and distance in meters. Keep owner-provided guidance
separate, private, and labeled as the member's link. A catalog-only record must
remain publishable and runnable when app guidance is unavailable.

## Video eligibility and seed stability

Video-required membership comes only from the explicit stable policy module.
It remains exactly 27 canonical variations. The checked-in approved manifest
remains exactly 54 rows, with two reviewed rows for each required variation and
no row for any catalog-only addition.

Seed construction must add catalog, compatibility, and alias rows for all 134
records while preserving the exact approved-video rows byte for byte. Seed
validation continues to reject missing, duplicate, extra, unknown, unsupported,
pending, rejected, or incomplete video rows.

No central assertion may expect 135 catalog records. Assertions for 27 required
variations and 54 approved rows must remain explicit and independent of total
catalog membership.

## Failure recovery, responsive behavior, and accessibility

Search, chooser, publication, and workout failures keep the existing draft,
retry, stale-revision, and idempotency behavior. A missing video can't block
selection, publication, logging, resume, or history. A malformed response can't
advance the editor or runner.

At phone and desktop sizes, long names, results, target fields, publication
errors, and runner controls must remain visible without horizontal overflow.
Preserve keyboard operation, visible focus, label-in-name, semantic headings and
lists, focus restoration, status announcements, 44-by-44 CSS-pixel touch
targets, reduced motion, and forced-colors behavior. Run accessibility checks
on representative expanded chooser, editor, detail, and runner states.

## Authenticated browser evidence

Add exact spec names `library-strength-expansion.spec.ts` and
`library-core-conditioning-expansion.spec.ts` to the maintained authenticated
Playwright matcher without removing any existing journey.

Run each exact expansion journey on `chromium-desktop` and `webkit-phone`.
Then rerun the combined maintained authenticated matrix. The journeys must use
the real editor, owner-scoped publication, reload, saved-day start, production
runner, correct logging controls, truthful unavailable guidance, zero iframe,
and accessibility scans.

The manifests, public search, exercise detail, seed graph, and runtime guidance
are shared public/runtime behavior. Run the maintained public matrix after the
focused authenticated evidence and record any documented engine capability
skip separately from a failure.

## Verification matrix

Run one large gate at a time and record exact file, test, pass, fail, and skip
totals:

- Integration RED for the three central assertion mismatches, then their exact
  passing replay.
- Focused catalog generator, metadata, category, filter, chooser, publication,
  starter-row, seed, YouTube policy, missing-video presentation, runner,
  snapshot, history, and workout-repository tests.
- Full Vitest.
- Strict TypeScript and full ESLint.
- Database bootstrap and migration tests without applying an external
  migration.
- Drizzle schema metadata validation.
- `pnpm seed:check` plus an approved-row byte comparison.
- Service-worker generation and parity.
- Documentation generation and Markdown/HTML parity.
- Next.js Webpack production build and route-boundary verification.
- Focused authenticated Chromium desktop and WebKit phone journeys.
- Combined maintained authenticated matrix.
- Maintained public matrix.
- `git diff --check`, generated-output checks, forbidden-content scans, and a
  clean worktree audit.

## Documentation and evidence closeout

Update `PRODUCT.md`, `docs/context/STATUS.md`, relevant decisions and plans,
`docs/wiki/index.md`, and the corrected expansion reference when verified
product truth changes. Preserve the worker plans and intentional historical
135-candidate wording only where the text clearly labels the superseded intake.
Describe the released product contract as 134 records, 107 additions, 27
video-required variations, and 54 approved rows.

After the complete candidate passes, retain one Wave 2 integration report and
its HTML counterpart plus only the newest combined screenshots under
`docs/qa/latest/`. Remove superseded generated evidence from that directory only
after the replacement is verified. Keep source-worker plans and any evidence
outside `docs/qa/latest/` that the final report cites as intentional provenance.

## Acceptance criteria

- The clean candidate descends from the exact requested base and records all
  three required source tips or their intentional patch-equivalent provenance.
- The catalog contains exactly 134 unique records in deterministic order: 27
  released records, 65 strength additions, and 42 core, conditioning, and
  mobility additions.
- `prone-dumbbell-row` is absent, and `chest-supported-dumbbell-row` contains
  exact alias `prone dumbbell row`.
- `dumbbell RDL` returns both required slugs in deterministic order.
- All five `distance_duration` additions select, publish, run, and retain their
  canonical logging meaning.
- Every addition has supported metadata and exactly three safe instructions.
- Approved video eligibility remains 27 variations and 54 byte-stable rows;
  no candidate video or iframe enters runtime data.
- Catalog-only records work through search, selection, immutable publication,
  runner logging, resume, and history with truthful unavailable guidance.
- Ownership, immutable snapshots, kilogram/meter storage, private guidance,
  PWA cache boundaries, accessibility, and responsive behavior pass without
  regression.
- Focused tests, complete static/data/build gates, both focused authenticated
  journeys, the combined authenticated matrix, and the public matrix pass with
  only documented capability skips.
- Canonical Markdown and generated HTML agree, and `docs/qa/latest/` contains
  only the verified Wave 2 integration evidence package.
- The final branch is clean, pushed, and reported with exact SHA, provenance,
  conflict decisions, totals, QA paths, sibling worktrees, and release gates.
- Local and GitHub `main`, production data, providers, deployments, and sibling
  worktrees remain unchanged.
