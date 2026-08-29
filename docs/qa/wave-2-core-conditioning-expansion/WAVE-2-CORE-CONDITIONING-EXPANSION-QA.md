# Wave 2 core and conditioning expansion QA

Date: 2026-08-29
Scope: Core, conditioning, carries, mobility, and recovery canonical content only

## Bounded inventory

This branch owns 42 generator-backed catalog additions:

- Core: 18 additions after the eight released records.
- Conditioning and carries: 14 additions.
- Mobility and recovery: 10 additions.

The logging distribution is 21 `bodyweight_reps`, 12 `duration`, four
`weight_reps`, and five `distance_duration` records. The branch does not define
the combined Wave 2 or final catalog total.

## TDD evidence

Before any manifest additions, the focused inventory contract failed all seven
tests because the 42 candidates were absent. The failure covered exact category
order, generator shape, logging distribution, search and equipment visibility,
distance defaults, replacement behavior, and runner distance-duration meaning.

After the three owned manifests were implemented, the same focused command
passed one file and seven tests. A broader focused replay then passed eight
files and 78 tests across generator, catalog/video eligibility, text-only
presentation, metadata, filtering, editor logging, and runner behavior.

## Browser evidence

The explicit production-component journey is
`tests/authenticated-e2e/library-core-conditioning-expansion.spec.ts`. A
temporary focused Playwright configuration selected the file without changing
the maintained shared matcher. The final replay passed in both requested
projects: two tests passed in 12.8 seconds after the authenticated fixture
completed its production build.

The verified Alice fixture used the real routine editor to find representative
owned records by names and aliases, then added all four represented logging
shapes:

- `Dumbbell clean` — `weight_reps`.
- `Crunch` — `bodyweight_reps`.
- `Flutter kick` — `duration` with the 20–45 second default.
- `Dumbbell farmer carry` — `distance_duration` with the 20–45 second default
  and no invented distance.

The first carry publication attempt produced the exact positive-distance
blocker before any publish request. The deliberate imperial fixture input was
converted to meter storage, revision 2 published, the editor reloaded all four
exact movements, and the exact saved day started. The runner then stored both
`distanceMeters` and `durationSeconds` for the carry. It rendered
**Unavailable**, the no-approved-pair explanation, a working logging action,
and zero iframes. Critical and serious Axe results were empty on the editor and
runner surfaces.

The first browser development replay exposed an ambiguous test selector for
`Dumbbell clean` and an incomplete WebKit onboarding navigation. Later replay
refinements used the exact accessible candidate meaning, waited for the saved
member home, and asserted the fixture's imperial presentation while checking
canonical meter values in the server read models. These were test precision
issues, not product failures.

Retained screenshots and SHA-256 values:

| Evidence | SHA-256 |
| --- | --- |
| `library-core-conditioning-editor-chromium-desktop.png` | `f253e2737a4ea1d366fdd3f0f7ab9326b5d015e7f5d9e3e6f6dc0c84947f9e76` |
| `library-core-conditioning-runner-chromium-desktop.png` | `f2b57ffdde8a39c391e1d5f0ea2f9d6a905b82fe4e43bca1a831cf786b59cf8d` |
| `library-core-conditioning-editor-webkit-phone.png` | `2102ccd4b04b1f716da53b733e0cab3d09fb2fb88853b8022c7279e82dfaf1cc` |
| `library-core-conditioning-runner-webkit-phone.png` | `81c8f7d9f9b430386a50bed65b4c3c4fac18be47b92957fe902a98c42cc9a024` |

## Verification matrix

| Gate | Result |
| --- | --- |
| Focused owned and adjacent contracts | Passed: eight files, 78 tests |
| TypeScript | Passed: `tsc --noEmit` |
| ESLint | Passed: full `eslint .` and scoped owned files |
| Full Vitest before integration reconciliation | 120 files passed, one failed; 810 tests passed, 19 failed of 829 |
| Drizzle metadata | Passed: `drizzle-kit check` |
| Database schema/bootstrap | Passed: four files, 34 tests |
| Approved-video seed | Passed: 27 required variations, exactly two rows each |
| Approved seed file | Unchanged: 54 rows, SHA-256 `3fec4225c70c23b8bc38e146b91b7fcdf779883e9b1a647c2c4026a5e1db51dd` |
| PWA/service worker | Passed: generated service worker verified |
| Documentation parity | Passed: 54 maintained Markdown/HTML pairs |
| Production build | Passed: Next.js 16.3.2 Webpack build |
| Production route boundary | Passed: 44 App Router entries |
| Authenticated browser | Passed: Chromium desktop and WebKit phone, two tests |

The full Vitest exception is one shared fixture-setup contract mismatch, not 19
independent product failures. `tests/integration/workout-repository.test.ts`
still expects the catalog logging-kind set to equal:

```text
Set { "weight_reps", "bodyweight_reps", "duration" }
```

The content batch truthfully produces:

```text
Set { "weight_reps", "bodyweight_reps", "duration", "distance_duration" }
```

Each of that file's 19 cases stops at the same setup assertion before its
repository behavior begins. The coordinator assigned the minimal expectation
reconciliation and all 19 repository-test/full-suite replays to Wave 2
integration. This branch intentionally leaves that shared test untouched.

The shared catalog/video-eligibility prerequisite was integrated from upstream
checkpoint `7046a94bae41e90839b16d5329b58a1975600ee9`. It preserves the released
27-variation video policy and unchanged 54 approved rows while allowing these
text-only records to enter the canonical catalog.

## Integration boundary

The maintained authenticated Playwright matcher is intentionally unchanged.
Wave 2 integration owns adding both new expansion spec names and replaying the
combined matrix. It also owns the one shared logging-kind expectation described
above. This branch must not be merged directly to `main` by this worker.
