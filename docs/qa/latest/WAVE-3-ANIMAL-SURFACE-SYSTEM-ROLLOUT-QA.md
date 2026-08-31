# Wave 3 animal surface-system rollout QA

## Disposition

**Passed. Fresh Impeccable finish-review disposition: `ship`.**

Branch `vishal/pal-visual-rollout` starts from exact approved pilot tip
`b4499f3b953a5745039f1bca67da68e6e135c7c3`. The branch extends the pilot's
single `DecorativeCompanion` component, tokens, failure collapse, theme and
forced-color behavior, cache policy, and semantic test system to public/member
Library, the owned routine editor, History list/detail, Settings, and the
workout runner. Pilot surfaces remain regression-covered.

This record is local and branch-only. It proves no merge, deployment, provider,
alias, environment, billing, migration, production seed/data, sibling-worktree,
or Wave 4 action.

## Assets and hashes

Five purpose-built original concepts passed alpha, transparent-margin,
light/dark composite, dimension, prompt, and output-hash review. Rejected
checkerboard, obscured-foot, and wrong-subject candidates do not ship.

| Concept | 1024 WebP SHA-256 | 512 WebP SHA-256 |
| --- | --- | --- |
| Cataloging otter | `357289744bc3fef9a9f283ff9cfde03b5970ac717c87de666930d08f2e3a7b5c` | `4b80975a2690060d59e455c95d5e75a0b2ea6dc3030730d5f45a6b2c7c44a2f6` |
| Routine-drafting beaver | `493df6e5ec6180547cb7683e3abfc22673652f3505902ed1189fdd9717b3279a` | `994c5e7773ea3eb146fa5be63ccdb97f92c4e55d9f101eae7aca0fb3dc266c23` |
| History-archive tortoise | `5b42fb35ca468dad01616c136d80f43781f4d6a28636989db06831b67ec5f6ea` | `cc8455b894aa4b4181e77fdfa8b4f0579fcdb6d63fface888fd0df3bee6dbbed` |
| Settings-packing hare | `9d227008d9a4dd7e3dc5cc3d6c5f3fbd0cfea23bcd06fa90ca73dc85915ac0f8` | `d90822b2e3e88855122e5891b94e61c69b3e89b4cf3a7fec20f62b3561b534db` |
| Workout-corner bear | `3eb28d8075a24a8b4f8275be747d5caefa9e5d16af71cff4314c3b4fe597ffcb` | `aaecbf17e476b07c4dc4c01df5f99fddc9ab5360a2afd85b4b8f2061c571b5d5` |

All 16 companion WebPs have exact same-basename provenance records under
`docs/design/provenance/companions/`. The landing hero pair has corresponding
records under `docs/design/provenance/illustrations/`. Records retain prompts,
dimensions, safe transformations, and verified output hashes while excluding
absolute local paths and generator identifiers. No JSON remains under
`public/illustrations/`.

## TDD and implementation evidence

The meaningful RED command was:

```text
node node_modules/vitest/vitest.mjs run \
  tests/unit/decorative-companion.test.tsx \
  tests/unit/animal-surface-rollout.test.ts --configLoader runner
```

It failed before implementation because all five rollout variants, the shared
visibility predicates, route placements, rollout collapse selector, and Library
cache entries were absent. The failure included missing closed-registry keys,
missing `@/domain/companions/visibility`, and missing CSS collapse behavior.
Those contracts passed after implementation and remained green through full
verification.

The final state predicates are intentionally restrictive:

- Settings requires a verified member, ready browser identity, no save or
  deletion operation, no deletion review, no message, and no preference value
  differing from the last saved model.
- Runner requires recovery-ready, online, no active logging, no blocking
  notice, no guidance, no pending operation, no timer, and no terminal state.
  CSS also removes runner art on constrained phone states.

## Automated verification

| Gate | Final result |
| --- | --- |
| Full Vitest | 127 files, 860 tests passed |
| Pilot delta | +4 files and +21 tests from 123 files/839 tests |
| TypeScript | `tsc --noEmit` passed |
| ESLint | Full repository lint passed |
| Drizzle/schema | Drizzle metadata plus four schema suites passed |
| Seed | 27 canonical variations with exactly two approved videos each passed |
| Service worker | Generated source and cache-policy parity passed |
| Docs | 61 canonical Markdown documents and generated HTML counterparts passed parity |
| Production build | Next.js 16.3.2 Webpack production build passed |
| Route boundary | 44 App Router entries; no authenticated harness route in production |
| Public matrix | 90 passed, 42 intentional project/native-zoom skips, 132 total |
| Authenticated matrix | Time-boxed final: 54 passed, 13 intentional project/native-zoom skips, 1 engine-only WebKit canceled resource; 68 total |
| Rollout authenticated slice | 8 passed, 10 intentional project/native-zoom skips |
| Runtime PWA lane | Chromium desktop offline `/library` passed |

The authenticated run covers Chromium and WebKit phone, tablet, and desktop.
All existing ownership, immutable snapshot/history, guidance, canonical-unit,
publication, reconciliation, and runner-resilience product assertions remain
green. The time-boxed final matrix's sole failure was WebKit canceling the
same-origin decorative `contours.svg` request during flexible-routine teardown;
the immediately preceding complete WebKit phone project passed 22 cases with
four intentional skips, including that routine and every rollout/resilience
journey. This is retained as an engine-only exception rather than weakened by a
broader cancellation rule. A WebKit navigation edge led to a stricter
same-origin supersession policy for canceled lazy companion requests and Next
route chunks. A transient pre-existing title race now waits for a non-empty
document title before Axe runs and still fails if the title never arrives.

## Browser and semantic evidence

The rollout matrix covers 320, 390, 430, 820, 1280, and 1440 CSS pixels;
light/dark; reduced motion; forced colors; keyboard; pointer; screen-reader
meaning; image failure; slow/failure/retry; offline; and the maintained runner
active/recovery/terminal states. Protected-selector assertions require both
bounding boxes and prove zero overlap with search, filters, inputs, topology,
reviews, history data, account controls, guidance, timers, logging, notices,
and fixed navigation. Companion nodes have no accessible name, focus target, or
pointer hit.

CDP page scale is recorded separately from true native 200% zoom. Native headed
captures for public Library, member Library, and History prove a two-to-one
device-pixel ratio, halved inner width, `visualViewport.scale === 1`, no
horizontal overflow, and complete companion collapse.

## Cache, offline, and privacy proof

The service worker adds only the cataloging-otter full and 512 WebPs for the
Wave 3 rollout. Runtime Chromium evidence opens public `/library`, observes its
route and both otter variants in Cache Storage, switches offline, and reloads
the usable Library with the offline notice and a decoded otter image.

Assertions prove that the preparing fox, routine beaver, History tortoise,
Settings hare, workout bear, `/app`, `/app/library`, `/app/history`,
`/app/settings`, and `/workout` remain absent from the public cache. The public
filesystem contains no provenance JSON. Authenticated fixture staging copies
only the exact 12 required companion files, uses a SHA-keyed lock, preserves
pre-existing destinations, and cleans only files created by the successful or
partially failed staging attempt.

## Retained visual evidence

Only the newest coherent Wave 3 evidence is retained. Each comparison contains
the complete uncropped board.

| Capture | SHA-256 |
| --- | --- |
| `comparisons/history-list-chromium-desktop-reference-comparison.png` | `d953537c6659063bddfcc0da40ce8f1dd1e223e2a9d7dfd379c6962a0198ab98` |
| `comparisons/member-library-chromium-desktop-reference-comparison.png` | `5c50aa639bd0a8890c0b88a933f8924b4b8380b69b45cc170debdc1be6dc1b3e` |
| `comparisons/public-library-1440x1000-light-reference-comparison.png` | `bb52dea20f7ed88af15bc5d46bc6e017f4c3cff9a5fd2a14a9ae01beff5f05b2` |
| `comparisons/routine-editor-chromium-desktop-reference-comparison.png` | `427516ae28ff143e6574367c85b385a4e8d80e7e4f3442af9b6c5b148a400ed0` |
| `comparisons/runner-neutral-chromium-desktop-reference-comparison.png` | `0fd258140408c43ddb91524aa41e5b39f7dd3a4c8387d890d1cbed2b7d63d73c` |
| `comparisons/settings-chromium-desktop-reference-comparison.png` | `8a450b8ba0c78ac087e5f5518bc85d9cab3cad803588a98b6ba02c9d16f36d4f` |
| `history-detail-chromium-desktop.png` | `14df6d2b316c87179cbaa2c50a3ad116c3e39e3dc2c1124cb050c37cbc290c03` |
| `history-detail-webkit-phone.png` | `90bb9a65a4427e6748eac9b085cec60237514cdb0f3bcfab333deee7ef7d4859` |
| `history-list-chromium-desktop.png` | `e457c3b04724f80b0710dd96506cb3539edb60a3849109ac551909976864342c` |
| `history-list-native-200-chromium.png` | `a8bb1410216886cb43ecebd4d4db80f7cede190bbb952e69fb7689f58a829c26` |
| `history-list-webkit-phone.png` | `87a0056c2c063a704b13a69eefcc9cf659dfedf500303b678a79ca290b80eac0` |
| `member-library-chromium-desktop.png` | `7dde737c9e686418f89f935b4d35a976141999d47eb84fe6f359556a6f12f805` |
| `member-library-native-200-chromium.png` | `8e730a6016fffde99699158aadd1c5bb5aa909d3fa4b8749c24adb1dd5ac581d` |
| `member-library-webkit-phone.png` | `fec6409008725776f675d9bd38a40fc5632713c185324b03661873de39a0551e` |
| `public-library-1440x1000-light.png` | `39ce98ab696ea54ca3a89750487bb28e45a3fb5e9ece5cf21d4e8c740a977099` |
| `public-library-390x844-light.png` | `e2c6b1cfe8661dc1af3730cf25448c579226b319532bcb1770411a78ee90d723` |
| `public-library-820x1180-light.png` | `a910f50a1f757b2ce938ace5da2b4edd7c2f7987acdffdf3489e2f306808099b` |
| `public-library-native-200-chromium.png` | `a188e8b05717e72509bfc626d7a0b0b0d9c8c907875f19795268c3a1d5bcd16a` |
| `routine-editor-chromium-desktop.png` | `76abd7da666768264872210f54b7bbd2f8fb00f262704a0db502b5cfc1e72369` |
| `runner-neutral-chromium-desktop.png` | `723ef422d4c644cb9d9f3d08ad4d60621b26b8cdaf681537d8f3c5ad4c5991bc` |
| `runner-neutral-webkit-phone.png` | `2651f0709777a3de4f61da64a4f8a8aa46431d0ed1947abefd644c43886e7f11` |
| `settings-chromium-desktop.png` | `9138c5393cc270247c7a8d9ca96c987b118ced6090b108485dab63231961f339` |
| `settings-webkit-phone.png` | `fe2e5eb50c52140ecb05066f7f2cdf7394286b1089ac66953e9f966ae82d7674` |

## Review history and risks

The Impeccable manual detector ran exactly once. Its broad warnings described
pre-existing CSS organization and design-scale advisories, not a new rollout
defect. The fresh finish reviewer requested one bounded Settings correction:
collapse art immediately after an unsaved preference change. Unit and browser
coverage, refreshed captures, and a regenerated full-board comparison closed
the finding. The bounded re-review confirmed every integration-audit item and
issued `ship`; no detector rerun occurred. The documenter then refreshed
`DESIGN.md`, `.impeccable/design.json`, and generated documentation parity from
the final corrected implementation.

A fresh independent closeout review then inspected the retained captures and
the completed fixture, cancellation, provenance, offline-cache, and native-zoom
hardening. It accepted the isolated WebKit teardown cancellation as engine-only
noise with no product assertion failure, found no material defect, and retained
final disposition `ship`.

No known material visual or product regression remains. Settings and runner art
have deliberately narrow eligibility and may disappear whenever future product
state or layout cannot guarantee their reserved whitespace. That is the intended
content-first failure mode, not an incomplete rollout.
