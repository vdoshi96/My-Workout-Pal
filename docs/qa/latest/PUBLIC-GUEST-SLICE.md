# Public guest slice verification

## Scope

This run covers the equipment-aware starter route, day details, compatible exercise library, exercise detail approval state, read-only sample workout and analytics, guarded sign-in destination, and PWA production build surface. It is local evidence, not preview or production proof.

## Fail then pass evidence

- `pnpm vitest run tests/unit/program-seed.test.ts tests/unit/equipment-substitution.test.ts` initially failed because the program modules did not exist. Six tests pass after the seed and substitution implementation.
- `pnpm vitest run tests/unit/library-filter.test.ts` initially failed because `@/domain/exercises/library` did not exist. Three tests now pass for stable ordering, compatibility exclusion, and term search after equipment filtering.
- Browser inspection exposed a desktop navigation overlap, a mobile route-stamp collision, a Playwright artifact watcher loop that reset client state, and exercise-detail `scrollWidth` of 934 pixels in a 390-pixel viewport. After correction, the measured exercise-detail `scrollWidth`, field-notes width, and video-field width are all 390 pixels.

## Personally replayed flows

- Selected Barbell + rack and observed the announcement that six route changes were applied without saving guest state.
- Selected Pull and observed Barbell bent-over row in the preview and a profile-preserving `/program/pull?equipment=barbell` link.
- Searched `barbell squat` under Dumbbells and observed the explicit zero-result compatibility state, then changed to Barbell + rack and observed exactly one compatible Barbell back squat result with the query retained.
- Opened Barbell back squat and observed truthful starter facts plus two separate manual-review video slots with no fabricated embeds.
- Inspected the read-only sample analytics at desktop width and confirmed that every metric and historical row is labeled sample data.

## Automated checks

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`: three files and nine tests pass.
- `pnpm build`: Next.js 16.3.2 webpack production build succeeds with ten application routes.

## Remaining verification

Production-server service-worker installation, offline navigation, Chromium and WebKit matrices, automated accessibility, reduced motion, dark mode, tablet layout, slow and failed requests, authenticated persistence, preview deployment, production deployment, and runtime logs remain open.
