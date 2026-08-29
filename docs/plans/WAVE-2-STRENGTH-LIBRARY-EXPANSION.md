# Wave 2 strength library expansion plan

## Outcome

Add the 65 distinct upper-body and lower-body movements assigned to the strength
batch as generator-backed canonical catalog records. Preserve all 27 released
records and their exact order, then append each distinct owned candidate once in
the order from the expansion inventory.

The inventory's `prone-dumbbell-row` candidate is the released
`chest-supported-dumbbell-row`, not a distinct movement. Add the exact search
alias `prone dumbbell row` to that released record instead of creating a second
canonical slug. Preserve the two Grok links as unapproved candidate evidence for
the existing movement and keep them outside runtime data.

Every added record provides a stable slug, reviewed display name, supported
logging kind, compatible existing equipment, movement family, primary muscles,
search aliases, and exactly three useful instructions. The batch publishes no
candidate video. A movement without a full-watch-approved pair remains useful
through text guidance and renders no empty or unapproved iframe.

## Scope and stop boundaries

This branch owns the following manifest files:

- `src/domain/exercises/catalog-manifests/chest-and-pushing.ts`
- `src/domain/exercises/catalog-manifests/back-and-rear-shoulder.ts`
- `src/domain/exercises/catalog-manifests/shoulders.ts`
- `src/domain/exercises/catalog-manifests/arms.ts`
- `src/domain/exercises/catalog-manifests/lower-body-and-glutes.ts`

This branch also owns uniquely named strength-batch unit, browser, plan, and QA
files. It can use existing production components and authenticated fixture
routes without changing their contracts.

This branch must not:

- Edit the core, conditioning and carries, or mobility and recovery manifests.
- Edit `catalog-generator.ts`, `catalog.ts`, `metadata.ts`, the manifest index,
  central snapshots, seed manifests, shared status or wiki pages, schema, or
  migrations unless a verified generator defect blocks the owned content.
- Copy the 132 product-selected strength URLs into runtime data or describe any
  pair as app-approved.
- Seed a database, apply a migration, deploy, change a provider or alias, merge
  `main`, or modify or remove another worktree.

If the supported manifest schema can't represent an inventory candidate, stop
and report the exact contract gap before changing a shared file.

## Verified intake

Detached `HEAD`, local `main`, and `origin/main` resolved to
`a202a815ad3b7320bbc68b819303822ca4773b1d` before branch creation. The
worktree had no tracked or untracked changes.

Before manifest implementation, the branch consumed prerequisite checkpoint
`7046a94bae41e90839b16d5329b58a1975600ee9` as local cherry-pick
`ad92476`. Its explicit 27-variation policy separates released exact-two video
requirements from catalog membership, so text-only catalog growth neither
fabricates approved rows nor weakens fail-closed validation for the released
subset.

The inventory assigns 66 named candidates to this batch. Evidence review found
one canonical duplicate, so the branch adds 65 records and one alias:

| Category | Existing records | Added candidates | Final category records |
| --- | ---: | ---: | ---: |
| Chest and pushing | 3 | 12 | 15 |
| Back and rear shoulder | 4 | 11 | 15 |
| Shoulders | 1 | 10 | 11 |
| Arms | 2 | 12 | 14 |
| Lower body and glutes | 9 | 20 | 29 |
| **Owned total** | **19** | **65** | **84** |

The complete canonical catalog contains 27 released records before this batch
and 92 records after it. The later sibling batch adds the remaining 42
candidates. Combined Wave 2 adds 107 records and reaches a corrected 134-record
catalog target.

All assigned candidates use the existing logging kinds and equipment IDs. The
batch adds no durable database ID. The 216 Grok links are approved selections
only; none has the required runtime full-watch record. Of the 132 selected links
in the strength inventory, two remain evidence for the existing
`chest-supported-dumbbell-row` after duplicate reconciliation.

## Catalog contract

Append distinct candidates after each manifest's released records in the exact
order from `docs/reference/EXERCISE-LIBRARY-EXPANSION.md`. Keep the released
records unchanged except for adding the reviewed `prone dumbbell row` alias to
`chest-supported-dumbbell-row`.

For each candidate:

- Use the inventory slug, display name, logging kind, and required equipment
  without reinterpretation.
- Choose one supported role: `compound`, `accessory`, `core-reps`, or
  `core-timed`.
- Use a stable lowercase, hyphenated movement family that supports useful
  search without merging distinct variations.
- Name one or more primary muscles using the catalog's existing plain-language
  vocabulary.
- Add distinct aliases that improve real searches and don't duplicate after
  trim and case normalization.
- Write exactly three bounded instructions in setup, controlled execution, and
  finish or stopping order.
- Exclude medical, rehabilitation, pain, injury-prevention, physique, strength,
  mobility, performance, or other outcome claims.

The generator remains the sole validation and assembly boundary. Generated
records stay deeply frozen and deterministic.

## Search, filters, and logging

The existing public catalog search matches names, slugs, movement families,
aliases, primary muscles, and required equipment. The member chooser includes
those terms plus the logging-kind label in its candidate search text. Equipment
compatibility applies before a result becomes selectable.

Focused tests cover representative name and alias queries from every owned
category. They also prove that dumbbell-only profiles exclude rack and
barbell-dependent movements, supported bodyweight records remain selectable,
and representative duration, bodyweight-repetition, and weight-repetition
records retain the inventory logging meaning.

No strength movement uses `distance_duration`. That logging shape remains owned
by the conditioning batch and existing runner contracts.

## Video and guidance states

The added catalog records have no entry in the exact-two approved-video seed.
The application therefore derives truthful unavailable app guidance for them.
The public detail presents the three written instructions. The chooser offers
truthfully labeled private-guidance fields, and the runner presents an
unavailable app-guidance state while keeping logging usable. None mounts an
app-approved video iframe for these records.

Owner-provided guidance remains separate, private, and labeled as the member's
link. This batch doesn't add, approve, or publish personal links and doesn't
change snapshot or owner-isolation behavior.

## Routine publication and persistence

The movement chooser returns the existing neutral selection shape only:

```ts
{
  source: { kind: "catalog" | "custom"; id: string };
  name: string;
  loggingKind: LoggingKind;
}
```

The routine editor continues to own placement, topology, targets, ordering, and
publication. The server continues to resolve catalog slugs, enforce equipment
compatibility, derive ownership from the verified session, publish a complete
immutable revision, and snapshot movement meaning when a workout starts.

This content batch adds no persistence path. A failed chooser load,
publication, reload, or start keeps the existing retry and stale-revision
behavior. A malformed or ambiguous response can't advance the editor.

## Authorization, privacy, and safety

- Derive owner identity only from the verified server session.
- Keep the canonical records public and free of owner data, URLs, or durable
  database IDs.
- Keep personal links, routine names, workout data, and session identifiers out
  of catalog manifests and shared screenshots.
- Keep the private reference recording and curation scratch artifacts outside
  Git and documentation.
- Do not create a public iframe for an unapproved candidate URL.
- Do not add medical advice, rehabilitation claims, outcome promises, or load
  prescriptions to movement instructions.

## Accessibility and responsive behavior

Use existing production components without a layout or styling fork. In the
authenticated Chromium desktop and WebKit phone journeys:

- Search fields, result controls, publication actions, and start actions remain
  keyboard-operable with visible names.
- Added names and unavailable-guidance messaging wrap without horizontal
  overflow at phone width.
- Empty-video messaging remains visible and understandable without color.
- The chooser and editor retain semantic dialog, list, status, and focus
  behavior.
- Automated accessibility scans report no critical or serious violations on
  the representative content state.

## Test-driven implementation

Add `tests/unit/strength-catalog-expansion.test.tsx` before adding candidates.
Retain concise failed-before evidence for these contracts:

1. Each owned manifest contains the 65 distinct inventory slugs after its
   released prefix and in deterministic inventory order. The duplicate name is
   an alias of `chest-supported-dumbbell-row`, not another slug.
2. The combined catalog contains 92 records, preserves the first 27 records
   exactly, and contains no durable `id` property.
3. Every owned candidate has valid equipment, role, muscles, aliases, and
   exactly three claim-safe instructions.
4. Representative name and alias searches respect equipment compatibility.
5. Representative weight, bodyweight-repetition, and duration movements retain
   their logging meaning.
6. Added movements have no approved catalog video rows and resolve to the
   truthful unavailable guidance state.

Run the focused file in RED before changing manifests. After implementation,
run the focused strength file with the existing generator, library, video, seed,
chooser, guidance, snapshot, and editor regressions.

## Browser evidence

Add `tests/authenticated-e2e/library-strength-expansion.spec.ts` and run it in
the existing authenticated production fixture for `chromium-desktop` and
`webkit-phone`.

The journey must:

1. Create or load a verified member's example routine.
2. Open the real routine editor and chooser.
3. Search an added upper-body movement by alias and add it.
4. Search an added lower-body movement by name and add it.
5. Publish the changed routine through the owner-scoped server boundary.
6. Open and reload the saved day and prove both exact selections remain.
7. Start the exact saved day through the production start control.
8. Verify the runner renders both movements and the correct weight and duration
   logging controls.
9. Verify the unavailable app-guidance state and the absence of an unapproved
   iframe.
10. Capture one branch-unique screenshot per browser project after an
    accessibility scan.

Use production components and fixture persistence. Do not substitute direct
domain calls for chooser, publication, reload, or start proof.

Run the exact spec through the branch-only
`playwright.authenticated.strength.config.ts` and
`scripts/test-e2e-authenticated-strength.mjs`. Do not edit the maintained
authenticated matcher; the integration owner will add both Wave 2 spec names
and rerun the combined matrix.

## Integration obligation

The coordinator-mandated `prone dumbbell row` alias intentionally changes one
released record. The shared released-record assertion in
`tests/unit/catalog-generator.test.ts` still expects the former two-alias
array, so this branch leaves that central snapshot untouched and reports its
single expected mismatch. Integration must add the third alias to that snapshot
after merging both Wave 2 branches, then rerun the complete catalog and seed
suite. Removing the alias or restoring the old runtime record is not a valid
reconciliation.

## Acceptance criteria

- All 65 distinct owned candidates appear exactly once in deterministic
  inventory order, and `prone dumbbell row` searches the released
  `chest-supported-dumbbell-row` record.
- The 27 released catalog records, their order, and the 54 approved starter
  video mappings remain unchanged.
- The combined strength-branch catalog contains 92 unique stable slugs.
- Every added record has supported metadata and exactly three useful,
  claim-safe instructions.
- Representative search, alias, equipment, muscle, and logging behavior passes.
- Representative upper-body and lower-body selections publish, reload, and
  start through the real authenticated editor flow in Chromium desktop and
  WebKit phone.
- Added records show instructions and truthful unavailable app guidance with no
  empty or unapproved iframe.
- No sibling manifest, shared central catalog file, schema, migration, seed
  manifest, shared status/wiki file, production system, or sibling worktree is
  changed.

## Verification matrix

Run one large gate at a time and record exact totals:

- Focused strength RED, then focused strength and catalog GREEN.
- Strict TypeScript.
- Scoped ESLint, then full ESLint.
- Full Vitest.
- Drizzle and migration checks without applying a production migration.
- Exact-two approved-video seed validation.
- Generated PWA parity.
- Documentation build and parity.
- Next.js Webpack production build.
- Production route-boundary verification.
- Authenticated Chromium desktop and WebKit phone strength journeys.
- `git diff --check`, changed-file review, and forbidden-path review.

## Evidence and closeout

Keep the branch-specific QA report at
`docs/qa/latest/WAVE-2-STRENGTH-LIBRARY-EXPANSION-QA.md` with its generated HTML
counterpart. Keep only branch-unique screenshots from the newest completed
strength run. Do not delete or rewrite the current Wave 1 QA package.

Commit the reviewed implementation and evidence, then push
`vishal/library-strength-expansion`. Report category counts, changed files,
commits, exact verification totals, screenshot paths, inventory ambiguities,
and integration requirements. Stop before merging or releasing.
