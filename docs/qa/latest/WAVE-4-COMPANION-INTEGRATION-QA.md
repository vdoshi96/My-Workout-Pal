# Wave 4 companion integration QA

## Disposition and scope

**Integration audit: passed after one bounded correction. Fresh finish-review
disposition after the focused preservation fix: `ship`.**

Branch `vishal/companion-integration` starts from exact public `main`
`298cb04b8b16ad6c3586ef74bc95df7301533472`. Reviewed pilot
`b4499f3b953a5745039f1bca67da68e6e135c7c3` is an ancestor of reviewed rollout
`709a977bbccc0333517e873955c0b3572e70bd9f`, so the rollout was merged once and
the pilot was not separately replayed. The plan commit is
`ddb32d4d90047d62167522d1ef360a42afa5ba1d`; the no-conflict source merge is
`d962dfb59a51b7bb0cf57cda19ea611a0ec32fa7`.

This is a local, branch-only release candidate. It proves no `main` merge,
deployment, alias/provider/environment/billing change, production migration,
seed, user/data mutation, or sibling-worktree cleanup.

## Independent audit and bounded correction

The integration audit found three issues:

1. Opening equipment review did not collapse the routine beaver because the
   editor did not own that child review state.
2. An interrupted authenticated fixture owner could leave an exact staged file
   that a later run could not safely distinguish from unrelated data.
3. The selected design-board sidecar retained an absolute local generation
   source and identifier.

One correction batch lifted equipment-review visibility to the editor, added a
lock-owned hidden staging inode for each planned fixture copy, and removed the
private sidecar fields. Dead-owner recovery requires the expected hash,
approved hidden staging name, same destination directory, and identical
destination device/inode before it deletes a destination. The fixture still
validates sources before locking, preserves same-hash and different-hash
pre-existing files, cleans partial copies, and rejects an active concurrent
owner.

Meaningful RED evidence failed specifically on the missing
`equipmentReviewOpen` boundary and the stale-lock `EEXIST` recovery case. Fresh
finish review then found the same-hash pre-existing-file case; its new negative
regression failed conceptually under the first planned-file record and passes
with the owned inode proof. The corrected focused unit run passed three files
and 14 tests; staging alone passed 4/4. Current browser
evidence opens the equipment review, requires the review to be visible and the
beaver absent, then cancels and requires the beaver to return.

The final candidate diff contains no schema, migration, seed, API, repository,
authentication, dependency-manifest, workspace-resolution, or lockfile change.
Inherited request helpers remained unchanged. Rollout cancellation allowances
remain bounded to allowlisted same-origin `GET` resources, the exact
cancellation class, and frame or superseding-navigation evidence.

## Asset registry and cache classes

All 16 WebPs retain exact 1024/512 dimensions and reviewed SHA-256 hashes:

| Variant | 1024 WebP SHA-256 | 512 WebP SHA-256 | Cache class |
| --- | --- | --- | --- |
| Planning hedgehog | `79891bacacde49d7aeff0ad647d1e62a41fb68f56f5d7cbab937c58bfadbb126` | `45995ea9cd380bb344dda92decbe45c00ff66285b6e5e32872b97115528da79b` | Public install |
| Preparing fox | `9812c7a337667f70388aa9b4820f81b4306140e2001998aa18bab30aa814cc33` | `07816814dd9c0e94cfb3b2bfb324425f60b6789b16964780bc1e5f58974d1de3` | Owned only |
| Reviewing raccoon | `94721d121b53e2fa3cfb779e6dab1a8a0932cb5fb2827711ca6ed34634db65f6` | `9f109d0315d72cf47032c539f023b6f4bfc81010f14a813a31be068223b49e72` | Public install |
| Cataloging otter | `357289744bc3fef9a9f283ff9cfde03b5970ac717c87de666930d08f2e3a7b5c` | `4b80975a2690060d59e455c95d5e75a0b2ea6dc3030730d5f45a6b2c7c44a2f6` | Public install |
| Routine-drafting beaver | `493df6e5ec6180547cb7683e3abfc22673652f3505902ed1189fdd9717b3279a` | `994c5e7773ea3eb146fa5be63ccdb97f92c4e55d9f101eae7aca0fb3dc266c23` | Owned only |
| History-archive tortoise | `5b42fb35ca468dad01616c136d80f43781f4d6a28636989db06831b67ec5f6ea` | `cc8455b894aa4b4181e77fdfa8b4f0579fcdb6d63fface888fd0df3bee6dbbed` | Owned only |
| Settings-packing hare | `9d227008d9a4dd7e3dc5cc3d6c5f3fbd0cfea23bcd06fa90ca73dc85915ac0f8` | `d90822b2e3e88855122e5891b94e61c69b3e89b4cf3a7fec20f62b3561b534db` | Owned only |
| Workout-corner bear | `3eb28d8075a24a8b4f8275be747d5caefa9e5d16af71cff4314c3b4fe597ffcb` | `aaecbf17e476b07c4dc4c01df5f99fddc9ab5360a2afd85b4b8f2061c571b5d5` | Owned only |

PWA cache v6 (`my-workout-pal-public-v6`) retains the public hedgehog and
raccoon pairs and adds only the otter pair. Live Chromium proof opened public
`/library`, observed the route plus both otter variants in Cache Storage,
switched offline, and reloaded a usable Library with an offline notice and a
decoded otter. Assertions proved `/app`, `/app/library`, `/app/history`,
`/app/settings`, `/workout`, and every fox, beaver, tortoise, hare, and bear
asset absent from public Cache Storage.

No provenance JSON is fetchable under `public/illustrations/`. Private-safe
same-basename records under `docs/design/provenance/` retain prompt, dimension,
transformation, and hash facts without local paths or generator identifiers.

## Exact verification results

| Gate | Corrected candidate result |
| --- | --- |
| TypeScript | Passed |
| Full ESLint | Passed |
| Full Vitest | 127 files, 862 tests passed |
| Drizzle/schema | Metadata passed; four suites, 34 tests passed |
| Read-only live DB | 134 exercises, 202 equipment edges, 269 aliases, 54 approved videos; template counts 2 revisions/10 days/26 sections/60 strength/20 cardio |
| Seed policy | 27 required canonical variations, exactly two approved videos each; no seed applied |
| Service worker | Generated source and cache-policy parity passed |
| Docs | 62 canonical Markdown documents and generated HTML counterparts passed parity |
| Production build | Next.js 16.3.2 Webpack build passed |
| Route boundary | 44 App Router entries; no authenticated harness route in production |
| Public matrix | 90 passed, 42 intentional project/native skips, 132 total |
| Rollout public slice | 23 passed, 37 intentional project/native skips, 60 total |
| Authenticated matrix | 54 passed, 13 intentional project/native skips, one WebKit-phone same-origin fox-image cancellation, 68 total; exact failed test then passed 1/1 |
| Pilot/rollout authenticated slice | 13 passed, 11 intentional skips, 24 total |
| Rollout authenticated slice | 8 passed, 10 intentional skips, 18 total |
| Complete final WebKit-phone replay | 21 passed, four intentional skips, one known 120-second navigation-timing timeout, 26 total; exact timed-out test then passed 1/1 in 3.9 seconds |
| Firebase serverless | One file, two tests passed |
| Dependency boundary | One version: `firebase-admin -> jwks-rsa -> jose@4.15.9` |

The final complete public matrix is green. In the exact-candidate authenticated
matrix, all product assertions passed except the final failed-request audit
reported one WebKit cancellation of the same-origin preparing-fox image during
Library Guidance; that exact test passed 1/1 unchanged on replay. Settings
dirty state, runner neutral-only visibility, image failure, forced colors,
reduced motion, offline, recovery, active logging, timer, guidance, pending,
error, and terminal states remain fail-closed. Strict geometry,
accessibility-tree, focus, keyboard, pointer, target-size, fixed-navigation,
and overflow assertions found no material regression.

The Wave 3 source matrix recorded one exact WebKit `/contours.svg`
teardown cancellation with no product assertion failure and an immediately
green 22/4 replay. The immediately preceding product-corrected candidate also
passed the exact 22/4 WebKit-phone project before only fixture-ownership
hardening changed. On the final candidate, a complete WebKit-phone replay
instead hit the known 120-second `framenavigated` wait in the aborted-operation
resilience case after 21 passes and four intentional skips; the exact timed-out
case then passed 1/1 unchanged in 3.9 seconds. No timeout, cancellation
exemption, or harness policy was broadened.

## Native 200% evidence limitation

The reviewed Wave 3 source captures for public Library, member Library, and
History remain retained unchanged. They prove device-pixel ratio 2, halved
inner width, `visualViewport.scale === 1`, no horizontal overflow, and art
collapse. A fresh Wave 4 rerun was attempted after verifying the user, binary,
parent, age, and profile of one orphaned Playwright Chrome-for-Testing process
and terminating only that process. The user's regular Chrome was not touched.

The fresh isolated browser still remained at device-pixel ratio 1 because the
macOS zoom keystroke did not reach that browser in the current desktop/login
state. This record therefore retains the exact reviewed source proof, keeps CDP
page-scale evidence separate, and makes no fresh native claim. The current
equipment-review proof and complete responsive matrix cover the only integrated
UI correction.

## Retained evidence inventory

Only the newest coherent Wave 4 set remains under
`docs/qa/latest/wave-4-companion-integration/`. The seven full-board comparisons
and key current/native captures have these exact hashes:

| Evidence | SHA-256 |
| --- | --- |
| `comparisons/public-library-1440x1000-light-reference-comparison.png` | `1d02454c9bbd3e27d7458361542287a0df1dbb63dc80e59f5326dab8d2dfc30c` |
| `comparisons/member-library-chromium-desktop-reference-comparison.png` | `16f3fbc70c7f47fad9c82454257b3afb0e9fffcbc1592740d1a5a09065ffa1f8` |
| `comparisons/routine-editor-chromium-desktop-reference-comparison.png` | `1f78116f37999f3c433cb12ab143048625bb7b987fa5fddbbdd6ec78e49fe884` |
| `comparisons/routine-editor-equipment-review-chromium-desktop-reference-comparison.png` | `cdcfceef965b3bbaa1940905841854e7103930036c0b6143c5851ba616af3a9c` |
| `comparisons/history-list-chromium-desktop-reference-comparison.png` | `bf93b8357dc860c0b15a7f746f2e17c9f0434f85d5672266a3de8b3cb2f7c02f` |
| `comparisons/settings-chromium-desktop-reference-comparison.png` | `196279e2222c77d5b7d624ba2cd1c678200151856bac16f89bb992ebae39dc06` |
| `comparisons/runner-neutral-chromium-desktop-reference-comparison.png` | `a227100f77345f9dbb8f515acf13f601ca536c0995573d04e1aa845a35fb1e8b` |
| `routine-editor-equipment-review-chromium-desktop.png` | `687d290579edfd1546aefed704c22e83b2981e542cca4bbbe7c42f82efdac300` |
| `public-library-native-200-chromium.png` | `a188e8b05717e72509bfc626d7a0b0b0d9c8c907875f19795268c3a1d5bcd16a` |
| `member-library-native-200-chromium.png` | `8e730a6016fffde99699158aadd1c5bb5aa909d3fa4b8749c24adb1dd5ac581d` |
| `history-list-native-200-chromium.png` | `a8bb1410216886cb43ecebd4d4db80f7cede190bbb952e69fb7689f58a829c26` |

The directory contains 25 images total: seven comparisons and 18 direct
captures. Authenticated captures identify the local synthetic QA harness and
contain no real account, production user, or private workout data.

## Release boundary and blockers

No product or security blocker remains after the bounded correction. Fresh
independent finish re-review returned `ship` and retained that disposition after
classifying the isolated fox cancellation and navigation timeout as engine-only
evidence limitations. The native-proof refresh is another explicitly retained
evidence limitation, not a passing current-run gate. Clean local/upstream
equality is recorded after this canonical report is regenerated and the branch
is pushed.
