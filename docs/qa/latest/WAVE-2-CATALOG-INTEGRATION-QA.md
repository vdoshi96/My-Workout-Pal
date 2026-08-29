# Wave 2 catalog integration QA

## Outcome

The local-only `vishal/wave-2-catalog-integration` candidate composes the shared
catalog/video-eligibility checkpoint, Strength expansion, and
Core/conditioning/mobility expansion on exact public-main base
`a202a815ad3b7320bbc68b819303822ca4773b1d`. It is verified and ready for review.
It has not been merged to `main`, migrated, deployed, connected to a new
provider, or used to approve or seed any candidate video.

The final catalog has 134 deterministic records: the released 27-record prefix,
65 Strength additions, and 42 Core, conditioning, carry, and mobility additions.
`prone-dumbbell-row` is absent. Released record
`chest-supported-dumbbell-row` retains exact alias `prone dumbbell row`.
Searching for `dumbbell RDL` returns, in order:

1. `dumbbell-romanian-deadlift`
2. `single-leg-dumbbell-romanian-deadlift`

Catalog-only records remain searchable, selectable, publishable, runnable, and
explicitly unavailable when app-approved guidance does not exist. The approved
video policy remains exactly 27 canonical variations and 54 already-reviewed
rows. No candidate URL, Grok URL, provider, approval, seed mapping, iframe,
schema, migration, production row, secret, private media, or Wave 3 artwork was
added.

## Post-handoff authoritative-state correction

The fully verified Wave 2 application/content checkpoint is exact commit
`301b618b888613d95d69dffc5c42b6fb0dd26797`. All application, database, build,
route, authenticated-browser, public-browser, accessibility, and zero-iframe
results in this report were completed at or before that checkpoint.

The final candidate tip containing this correction is a documentation-only
successor. No application or browser matrix was rerun after `301b618`; the
successor relies on the unchanged verified application tree and adds only the
authoritative Markdown reconciliation and its generated HTML. Its exact remote
SHA is recorded in the branch handoff rather than self-referenced from the
commit that contains this report.

Post-handoff review found that the inherited project status still described the
already-completed Wave 1 production release as pending. The correction
reconciles the exact release plan, recovery gate, and production closeout at
commits `6a4c42f`, `994b426`, and
`b364d1987a8190a6d8bb92e7a8d7a64f077c0843` with the Wave 2 docs:

- Wave 1 application, local and public `main`, and production source are exact
  commit `a202a815ad3b7320bbc68b819303822ca4773b1d`.
- Migrations `0006` and `0007` were restore-gated and applied in order.
- Deployment `dpl_8Crg9j6UD9K3aH7r6icePmcvLzzH` reached Ready on the three
  production aliases.
- Public, authenticated, password, real-Google, and Wave 1 product replays
  passed. Production returned to its baseline with no disposable owned rows,
  and the 216 candidate guidance links were not seeded.
- Live local and remote branch checks found no
  `vishal/pre-wave1-primary-preservation` ref. Its unique pre-sync state remains
  outside the repository in the private mode-`600` bundle recorded in canonical
  status; no bundle content was inspected or published.

The Wave 1 production report remains on
`origin/vishal/wave-1-production-release` and in Git history. It was not restored
to `docs/qa/latest/`, which remains exactly this Wave 2 report and HTML plus the
six existing Wave 2 screenshots.

The docs-only gate rendered and verified 56 Markdown/HTML pairs, passed
`git diff --check`, preserved the eight-file latest-evidence set and all six
screenshot hashes, and found no runtime, test, catalog, schema, seed, or public-
asset change relative to `301b618`. The `pnpm docs:build` wrapper stopped before
the configured script at a noninteractive dependency-purge prompt; the exact
configured commands `node scripts/render-docs.mjs` and
`node scripts/render-docs.mjs --check` then passed unchanged.

## Source provenance

The integration used this exact sequence:

| Step | Source checkpoint | Integrated checkpoint | Result |
| --- | --- | --- | --- |
| Plan | exact base `a202a815` | `b49d7d8` | Integration plan and HTML parity |
| Shared prerequisite | `7046a94bae41e90839b16d5329b58a1975600ee9` | `7b9882f` | Canonical catalog/video eligibility contract, applied once |
| Strength content | `bbd44ab` | `76f0b30` | 65 owned additions |
| Strength QA/docs | `5863659` | `f5cb808` | Strength source evidence and plan |
| Core/conditioning | `ac5b1b51b24f6554ac4ae9b731f8140ad73cf904` | `c62984e` | 42 owned additions and source evidence |
| Central contracts | integration-owned | `1a7c875` | Combined assertions and maintained matcher |

Every source tip has merge-base exactly `a202a815`. There were no textual
cherry-pick conflicts. Strength and Core own disjoint manifest additions;
central semantic overlaps were resolved explicitly in the integration commit
rather than choosing one branch silently.

### Duplicate prerequisite proof

Canonical `7046a94`, Strength prerequisite copy `ad92476`, and Core prerequisite
copy `1cc190a` have:

- identical tree `0b873ced560c5b698d08307e7466671181dcf5ff`;
- stable patch ID `36dd3f8aadbe2782d71d1088f33b2a2b0c49d3af`;
- identical 29-path diffs: 7 additions and 22 modifications;
- identical changed blob IDs.

Only `7046a94` was applied. The duplicate commits were deliberately omitted.
The proof is reproducible without pasting the raw blob listing:

```sh
git show -s --format='%H %P %T' 7046a94 ad92476 1cc190a
git diff-tree --no-commit-id --name-status -r 7046a94
git diff-tree --no-commit-id --name-status -r ad92476
git diff-tree --no-commit-id --name-status -r 1cc190a
git diff-tree --no-commit-id --raw -r 7046a94
git diff-tree --no-commit-id --raw -r ad92476
git diff-tree --no-commit-id --raw -r 1cc190a
git show --pretty=format: 7046a94 | git patch-id --stable
git show --pretty=format: ad92476 | git patch-id --stable
git show --pretty=format: 1cc190a | git patch-id --stable
```

## Explicit central resolutions

- The released catalog-generator snapshot keeps exact record equality and adds
  third alias `prone dumbbell row`.
- The library-filter contract uses literal query `dumbbell RDL` and expects the
  bilateral then single-leg slugs. The combined Strength search surface also
  required deterministic `rack squat` results for back squat, front squat, and
  Zercher squat.
- The shared workout-repository fixture includes `distance_duration`; all 19
  tests in that file recovered.
- The Strength source assertions now use the combined total of 134 while
  bounding their order comparison to the 65 Strength-owned additions, leaving
  the 42 Core-owned suffix intact.
- The maintained authenticated matcher includes exact specs
  `library-strength-expansion.spec.ts` and
  `library-core-conditioning-expansion.spec.ts` while preserving every prior
  journey.
- The expanded chooser exposed two legitimate instruction fields in the shared
  library journey. The test now scopes private-creation inputs to the accessible
  `Create private movement` region.
- The Core WebKit persistence journey now waits for the exact successful
  post-publish editor RSC response before forcing a reload. Strict console,
  page-error, failed-request, failed-response, Axe, and zero-iframe checks remain
  enabled.

## Catalog and seed inventory

The generated and locally seeded inventories agree:

| Contract | Verified value |
| --- | ---: |
| Catalog records | 134 |
| Released prefix | 27 |
| Strength additions | 65 |
| Core/conditioning/mobility additions | 42 |
| `weight_reps` | 76 |
| `bodyweight_reps` | 37 |
| `duration` | 16 |
| `distance_duration` | 5 |
| Equipment compatibility edges | 202 |
| Search aliases | 269 |
| Required approved-video variations | 27 |
| Reviewed approved-video rows | 54 |

Category inventory is chest/pushing 15, back/rear shoulder 15, shoulders 11,
arms 14, lower body/glutes 29, core 26, conditioning/carries 14, and
mobility/recovery 10. Every new record has exactly three safe instructions and
uses only supported equipment and logging kinds. The five
`distance_duration` records are `dumbbell-farmer-carry`,
`dumbbell-suitcase-carry`, `dumbbell-front-rack-carry`, `bear-crawl`, and
`reverse-bear-crawl`.

The checked-in seed file stayed byte-stable before and after verification:

```text
3fec4225c70c23b8bc38e146b91b7fcdf779883e9b1a647c2c4026a5e1db51dd
```

## Retained failed-before evidence

The integration retained meaningful failures and corrected their causes:

- The first focused three-file run reported 21 failures and 14 passes: the
  released alias snapshot, deterministic RDL search, and all 19 repository tests
  stopped on the missing `distance_duration` fixture member.
- After those three fixes, the same slice reached 34 passes with one remaining
  combined `rack squat` expectation failure; the deterministic three-result
  expectation corrected it.
- The first eight-file combined source slice reported 2 failures and 52 passes
  because Strength still assumed a branch-local total of 92. After correcting
  the total, one order failure remained because its unbounded slice consumed the
  Core suffix. The bounded Strength-owned slice then produced 54 of 54 passes.
- The first combined authenticated matrix reported 40 passes, 2 failures, and 2
  skips because the expanded catalog made the shared library instruction
  locator ambiguous. Accessible-region scoping recovered that journey.
- The Core WebKit journey reproduced an aborted post-publish RSC request as
  Next's `Load failed` fallback during the forced persistence reload. Awaiting
  the exact RSC response recovered the journey without suppressing browser
  errors.
- The first credential-free public run reported 39 passes, 8 failures, and 1
  skip solely because approved-video detail reads had no `DATABASE_URL`. An
  unchanged rerun against a disposable loopback Postgres cluster containing the
  checked-in 54 reviewed rows passed 47 with the same 1 documented WebKit PWA
  skip. No external database was queried or changed.

## Passing verification

| Gate | Result |
| --- | --- |
| Central catalog/filter/repository slice | 35/35 passed |
| Combined catalog/generator/filter/publication/runner/history/repository slice | 8 files, 54/54 passed |
| Complete Vitest | 122 files, 834/834 passed |
| Strict TypeScript | Passed |
| Full ESLint | Passed |
| Database/bootstrap | 4 files, 34/34 passed |
| Drizzle schema metadata | Passed |
| Deterministic seed check | 27 variations, 54 reviewed rows; byte-stable |
| Disposable local SQL/bootstrap/verify | 134 exercises, 202 compatibility edges, 269 aliases, 54 approved rows |
| PWA/service-worker generation and parity | Passed |
| Documentation generation and parity | 55/55 Markdown/HTML pairs passed |
| Next.js 16.3.2 Webpack production build | Passed |
| Production route boundary | 44 App Router entries; no fixture/harness route |
| Exact Strength journey | 2/2: Chromium desktop and WebKit phone |
| Exact Core/conditioning journey | 2/2: Chromium desktop and WebKit phone |
| Maintained authenticated matrix | 42 passed, 2 intentional skips |
| Maintained public matrix | 47 passed, 1 documented WebKit PWA skip |
| Accessibility and unavailable guidance | Axe passed; missing guidance rendered zero iframes |
| Git whitespace/generated/diff checks | Passed |

The public run used a task-owned Postgres cluster and the repository's
loopback-only Neon HTTP QA proxy. Migrations `0000` through `0007` were applied
only to that disposable cluster. The canonical seed and read-only verifier
returned the inventory above. The server, proxy, and cluster were then stopped,
and the temporary directory was removed.

## Evidence retained

- [Strength expansion, Chromium desktop](library-strength-expansion-chromium-desktop.png)
- [Strength expansion, WebKit phone](library-strength-expansion-webkit-phone.png)
- [Core editor, Chromium desktop](library-core-conditioning-editor-chromium-desktop.png)
- [Core editor, WebKit phone](library-core-conditioning-editor-webkit-phone.png)
- [Core runner, Chromium desktop](library-core-conditioning-runner-chromium-desktop.png)
- [Core runner, WebKit phone](library-core-conditioning-runner-webkit-phone.png)
- [Strength source plan](../../plans/WAVE-2-STRENGTH-LIBRARY-EXPANSION.md)
- [Core/conditioning source plan](../../plans/WAVE-2-CORE-CONDITIONING-EXPANSION.md)
- [Shared catalog/video eligibility plan](../../plans/CATALOG-VIDEO-ELIGIBILITY-CONTRACT.md)
- [Combined integration plan](../../plans/WAVE-2-CATALOG-INTEGRATION.md)

## Release stop

This report approves only a clean, pushed feature-branch candidate for review.
Merging public `main`, applying a production migration, mutating production
data, deploying, changing providers, approving a video, and adding a candidate
to the reviewed seed all remain separate authorization gates.
