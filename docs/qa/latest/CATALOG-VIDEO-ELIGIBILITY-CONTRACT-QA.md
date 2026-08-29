# Catalog video eligibility contract QA

## Status

The catalog/video prerequisite is locally verified on
`vishal/catalog-video-eligibility-contract`. Canonical catalog membership is
independent from the explicit app-video requirement policy. The policy retains
exactly 27 canonical variations, and the checked-in approved manifest retains
exactly 54 rows with two rows per required variation.

The branch adds no movement record, category-manifest edit, catalog status
field, database migration, production mutation, candidate approval, deployment,
provider change, alias change, `main` merge, sibling-worktree change, or browser
matcher reconciliation.

## Verified intake

The worktree began clean. Detached `HEAD`, local `main`, and local
`origin/main` all resolved to
`a202a815ad3b7320bbc68b819303822ca4773b1d` before branch creation.

The approved schema-one seed file retained SHA-256
`3fec4225c70c23b8bc38e146b91b7fcdf779883e9b1a647c2c4026a5e1db51dd`.
The file is unchanged from the verified baseline.

## Before and after contract

Before this prerequisite, `buildDefaultRequiredVideoVariations()` mapped every
runtime `CATALOG_EXERCISES` key to one required `canonical` video variation.
Default YouTube targets also mapped every catalog record. Expanding the catalog
would therefore expand the production requirement and force two approved video
rows for every text-only record. `buildStarterDatabaseRows()` also bypassed
video validation when a caller supplied an empty approved-row array.

After this prerequisite:

- `src/domain/youtube/video-requirements.ts` explicitly declares the 27
  app-video-required canonical variations without importing the catalog or
  approved rows.
- The default requirement builder validates that declaration against the live
  catalog but does not derive membership from it.
- Default curation targets consume the same declaration. Catalog growth does
  not silently create a curation target or production pair requirement.
- Approved-row validation uses the catalog support set supplied by the seed
  builder, so a synthetic text-only row is recognized as canonical while any
  undeclared video row for it remains an extra-row failure.
- Starter row construction always validates approved rows. An empty input or a
  missing declared pair fails closed.
- The runtime catalog manifest remains names, metadata, equipment, logging
  meaning, aliases, muscles, and instructions only. Video workflow state stays
  outside it.

The existing approved rows preserve their mapping, deterministic IDs, titles,
channels, order, reviewer evidence, timestamps, and full-watch state.

## Failed-before evidence

The first focused replay ran five test files before production changes. It
retained four contract failures:

- Both the policy and target tests failed to resolve the absent
  `video-requirements` module.
- Starter row construction accepted an empty approved-row input instead of
  reporting `required-video-count`.
- Seed validation reported a caller-declared supported text-only catalog slug
  as `unsupported-canonical-exercise` because production coverage discarded the
  supplied catalog support set.

The remaining focused assertions passed. After implementation, the first
focused contract replay passed 12 files and 61 tests. A presentation replay
passed six files and 23 tests, and the final combined focused replay passed 13
files and 63 tests.

## Synthetic text-only proof

Tests add a synthetic canonical record without editing a Wave 2 category
manifest. The record receives deterministic catalog, equipment, and alias rows,
keeps all three instructions, and receives no curated-video row. Default seed
construction still produces 54 approved rows for the independent 27-variation
policy.

A mocked catalog view proves that the same synthetic record is searchable by
its text-only alias. Static public presentation includes its written cue and
the truthful **Curated demos unavailable** state with no iframe. Private runner
presentation includes the truthful no-approved-pair state, retains the logging
action, and mounts no iframe.

The tests use additional synthetic catalog slugs without asserting a future
catalog total. The policy remains stable as catalog membership grows.

## Failure boundaries

Focused validation retains the following failures:

- Missing or non-exact-two required pairs.
- Duplicate required mappings, video IDs, or display orders.
- Extra seed rows for supported text-only catalog records.
- Unknown canonical slugs and unsupported equipment variations.
- Invalid video IDs or display order.
- Pending, rejected, unwatched, unattributed, or untimestamped rows.
- Forbidden candidate-only view-count fields.
- Ineligible, unverified-syndication, or incomplete full-watch candidates at
  report-to-manifest generation.

Removing one complete declared pair from the checked-in 54-row input fails
starter-row construction with `required-video-count`. The requirement remains
present because the policy is independent from the approved rows.

## Static, data, and build verification

The final local gates produced these results:

| Gate | Result |
| --- | --- |
| Focused shared contract | Passed: 13 files, 63 tests |
| TypeScript | Passed: `tsc --noEmit` |
| ESLint | Passed: full `eslint .` |
| Full Vitest | Passed: 120 files, 822 tests |
| Drizzle metadata | Passed: `drizzle-kit check` |
| Database schema/bootstrap | Passed: four files, 34 tests |
| Approved-video seed | Passed: 27 required variations, exactly two rows each |
| Approved manifest | Unchanged: 54 rows; SHA-256 recorded in this report |
| PWA/service worker | Passed: generated service worker verified |
| Production build | Passed: Next.js 16.3.2 Webpack build |
| Production route boundary | Passed: 44 App Router entries |

The first full Vitest attempt reached 119 files and 821 passing assertions. Its
only failure occurred before the remaining assertion because the sandbox denied
the loopback-only YouTube embed probe with `listen EPERM 127.0.0.1`. The
permission-correct replay passed all 120 files and 822 tests.

The `pnpm` wrapper did not reach TypeScript or ESLint because its shared-module
integrity check tried to replace the linked dependency directory and stopped
with `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`. No dependency tree was
purged or reinstalled. The canonical installed binaries ran both gates
successfully, matching the established shared-worktree procedure.

## Browser evidence

The focused browser replay used the verified production build and Chromium on
an exact loopback route. A deliberately unreachable loopback-only database URL
caused the real exercise-detail repository read to take its existing safe
unavailable path without contacting any external database.

On `/library/dumbbell-bench-press?equipment=dumbbells`, the accessibility
snapshot contained the **Route cues** list with three instructions, two
**Curated demos unavailable** cards, and the statement that no placeholder
video is shown. DOM inspection recorded:

- `iframeCount: 0`
- `routeCueCount: 3`
- `unavailableCards: 2`
- `hasControlInstruction: true`

The browser console contained zero errors and zero warnings. The session and
loopback server were closed after inspection. This is local fallback evidence,
not hosted or production proof. Browser matcher reconciliation remains assigned
to Wave 2 integration and this branch changes no matcher.

## Documentation and scope audit

The dedicated plan and this report have generated HTML counterparts.
Authoritative catalog and YouTube documents now state that video curation status
stays outside the runtime catalog manifest and that default requirements come
from the explicit policy.

Final diff checks must confirm that all eight files under
`src/domain/exercises/catalog-manifests/`, the approved seed JSON, migrations,
schema, provider configuration, and deployment configuration are unchanged.

## Handoff

Both content workers can consume one checkpoint from
`vishal/catalog-video-eligibility-contract`. Prefer cherry-picking the final
checkpoint so each isolated content branch receives the policy module, seed
validation, target behavior, future-safe shared counts, and contract tests as
one reviewed unit. Wave 2 integration can instead merge the pushed branch once
and must not reintroduce catalog-wide exact-two assumptions.

The exact pushed checkpoint SHA and commands are supplied in the task handoff.
