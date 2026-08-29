# Wave 2 strength library expansion QA

## Status

The Strength-owned Wave 2 batch is implemented and locally verified on
`vishal/library-strength-expansion`. Implementation checkpoint `bbd44ab`
adds 65 distinct canonical records across the five owned manifests and adds
the exact alias `prone dumbbell row` to the released
`chest-supported-dumbbell-row`. The branch catalog contains 92 records: the 27
released records in their released order followed by the 65 Strength additions
in bounded inventory order.

The branch publishes no video candidate, approved row, durable database ID,
schema change, migration, provider change, production seed, deployment, or
`main` merge. The approved seed remains 54 rows for the explicit 27-variation
policy. The core, conditioning and carries, and mobility and recovery manifests
are unchanged.

Two full-suite assertions remain intentionally assigned to Wave 2 integration
because both live in shared central tests. All other 825 Vitest tests pass.

## Intake and prerequisite

Before branch creation, detached `HEAD`, local `main`, and `origin/main` all
resolved to `a202a815ad3b7320bbc68b819303822ca4773b1d`; the worktree was clean.

The branch consumed exact prerequisite checkpoint
`7046a94bae41e90839b16d5329b58a1975600ee9` from
`origin/vishal/catalog-video-eligibility-contract`. The clean cherry-pick is
local commit `ad92476`, and its tree is identical to the source checkpoint. The
prerequisite explicitly limits exact-two video requirements to the 27 released
canonical variations, allowing catalog-only growth without fabricated approved
videos.

## Content totals

| Owned category | Released prefix | Added | Branch category total |
| --- | ---: | ---: | ---: |
| Chest and pushing | 3 | 12 | 15 |
| Back and rear shoulder | 4 | 11 | 15 |
| Shoulders | 1 | 10 | 11 |
| Arms | 2 | 12 | 14 |
| Lower body and glutes | 9 | 20 | 29 |
| **Owned total** | **19** | **65** | **84** |

The 65 additions contain 53 `weight_reps`, 11 `bodyweight_reps`, and one
`duration` record. Every addition has supported equipment, role, movement
family, primary muscles, at least one normalized-distinct alias, and exactly
three nonblank, claim-safe instructions. No Strength record uses
`distance_duration`.

The inventory originally assigned 66 names to this worker. Coordinator review
resolved `prone-dumbbell-row` as a duplicate of released
`chest-supported-dumbbell-row`, so it is not another slug. Its two selected Grok
links remain unapproved evidence for the existing movement and never enter the
runtime seed. The corrected combined Wave 2 target is 107 additions and 134
catalog records after the sibling's 42 additions are integrated.

## Failed-before and passed-after evidence

The focused test was added before any manifest edit and run with:

```text
pnpm exec vitest run tests/unit/strength-catalog-expansion.test.tsx
```

The RED run produced one failed file and five failed tests. Each failure was
specific to absent production content:

- the first owned manifest expansion was empty rather than the expected ordered
  chest rows;
- generated additions were `undefined`;
- the released row lacked `prone dumbbell row`;
- alias search for `strict press` returned no barbell overhead press;
- `wall-sit` had no duration logging record.

After implementation, the first GREEN replay passed one file and five tests.
The final post-review replay also passed one file and five tests. The test proves
all 65 ordered slugs and equipment mappings, the 92-record catalog, the released
27-order prefix, no durable IDs, the 53/11/1 logging split, alias search,
equipment filtering, three-instruction bounds, 27 video requirements, 54
approved rows, and no approved row or iframe for a representative addition.

## Content review

An independent read-only GPT-5.6 Luna review covered all 65 records and the
alias reconciliation. It identified six concrete cue or alias issues in
`dumbbell-rear-delt-row`, `dumbbell-high-pull`, `barbell-skull-crusher`,
`barbell-jm-press`, `barbell-good-morning`, and `frog-pump`. All six were
corrected. The follow-up review approved the complete 65-record batch with no
remaining concrete issue.

## Browser evidence

The exact requested spec
`tests/authenticated-e2e/library-strength-expansion.spec.ts` ran explicitly
through the branch-only authenticated runner in both requested projects:

```text
node scripts/test-e2e-authenticated-strength.mjs \
  --project=chromium-desktop \
  --project=webkit-phone \
  tests/authenticated-e2e/library-strength-expansion.spec.ts
```

Result: two tests passed in 10.3 seconds after one production-fixture build. In
each project, verified synthetic member Alice:

1. onboarded to the real five-day routine;
2. opened the production routine editor and movement chooser;
3. found `Dumbbell floor press` by the `floor dumbbell press` alias;
4. selected `Wall sit` by name and received the 20–45 second editor defaults;
5. saw private-guidance fields rather than an approved-pair claim for each new
   movement;
6. published revision 2 through `/api/app/program/publish`;
7. opened and reloaded the saved day with both exact selections;
8. started the immutable workout snapshot through the production start control;
9. selected both additions in the runner, including the duration input for
   `Wall sit`;
10. saw **Unavailable** and the explicit no-approved-pair message with zero
    iframes; and
11. passed the critical/serious accessibility scan with no console or local
    request failures.

Screenshots use synthetic fixture data only:

- [Chromium desktop runner](./library-strength-expansion-chromium-desktop.png)
- [WebKit phone runner](./library-strength-expansion-webkit-phone.png)

The maintained authenticated matcher is unchanged. The branch-only config and
runner exist solely to execute the exact requested spec before combined Wave 2
matcher reconciliation.

## Verification matrix

| Gate | Result |
| --- | --- |
| Focused Strength RED | Expected: one file, five failed tests before manifest edits |
| Focused Strength GREEN | Passed: one file, five tests |
| TypeScript | Passed: `tsc --noEmit` |
| Scoped ESLint | Passed: five manifests plus Strength unit/browser/config/runner files |
| Full ESLint | Passed: `eslint .` |
| Full Vitest with loopback permission | 119/121 files and 825/827 tests passed; only two approved shared-test mismatches remain |
| All non-shared-test files | Passed: 119 files, 811 tests |
| Unaffected assertions in the two shared files | Passed: 14 tests; only the two named integration assertions skipped |
| YouTube loopback probe | Passed unchanged: one file, three tests; earlier sandbox `EPERM` did not recur with approved loopback execution |
| Drizzle and database bootstrap | Passed: `drizzle-kit check`; four files, 34 tests |
| Approved-video seed | Passed: 27 required variations, exactly two approved rows each; 54 rows unchanged |
| PWA/service worker | Passed: generated service worker verified |
| Documentation parity | Passed after this report: 54 Markdown/HTML pairs |
| Authenticated browser | Passed: two projects, two tests |
| Production build | Passed: Next.js 16.3.2 Webpack build, 14 static-generation tasks |
| Production route boundary | Passed: 44 App Router entries |
| Diff hygiene | Passed: no whitespace errors; owned and prerequisite paths reviewed separately |

The first sandboxed full Vitest attempt also hit `listen EPERM 127.0.0.1` in the
unchanged YouTube probe. The exact test passed three of three with approved
loopback execution. A final full-suite replay with the same permission removed
that infrastructure failure and produced exactly the two coordinator-approved
shared assertions below.

## Integration obligations

Wave 2 integration must make two narrow shared-test updates after merging both
content branches:

1. `tests/unit/catalog-generator.test.ts`, test **preserves every released
   record and its iteration order**, line 510 currently expects the released
   `chest-supported-dumbbell-row` alias array without `prone dumbbell row`.
   Update the released-record snapshot to expect that third exact alias.
2. `tests/unit/library-filter.test.ts`, test **searches aliases, muscles,
   movement families, and equipment**, line 45 currently expects `dumbbell RDL`
   to return only `dumbbell-romanian-deadlift`. Update the exact deterministic
   result to also contain `single-leg-dumbbell-romanian-deadlift`; preserve the
   useful alias `single-leg dumbbell RDL` and do not weaken the assertion.

The integration owner must also add both Wave 2 spec names to the maintained
authenticated matcher and rerun the combined browser matrix. When integrating
the sibling 42 additions, verify 107 total Wave 2 additions and a final
134-record catalog while retaining the same 27 required video variations and
54 approved rows.

Do not reconcile either assertion by deleting an alias, changing runtime
content, reintroducing catalog-wide video requirements, or editing an approved
seed row. Shared status/wiki and combined documentation reconciliation remain
integration-owned.

## Commit handoff

- `ad92476` — clean local cherry-pick of the shared catalog/video eligibility
  prerequisite (`7046a94bae41e90839b16d5329b58a1975600ee9`).
- `bbd44ab` — 65-record Strength content expansion, focused/browser tests,
  plan, runner/config, and browser screenshots.
- This paired QA report is committed separately after final documentation
  parity so its own checkpoint can be reported without circular self-reference.

The completed branch is pushed as `vishal/library-strength-expansion`. It is not
merged into `main` and no production action has been performed.
