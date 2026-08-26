# Public release browser baseline

## Scope

This checkpoint exercises the public product through the deployed Vercel production alias. It covers the guest equipment preview, all five starter-day controls, a barbell Pull route, compatibility-filtered library search and recovery, read-only sample workout and analytics, the truthful sign-in gate, production PWA installation and offline behavior, serious and critical automated accessibility checks, native accessible names, keyboard navigation, reduced motion, dark mode, phone target sizing, 200 percent reflow-equivalent inspection, forced colors, Lighthouse, and horizontal overflow.

This is public-production evidence for Ready Vercel deployment `dpl_HFFWzSg9hPTxh5q4KqW2yvhsC4WN`, sourced from GitHub SHA `149fde9d1ea7583e1a291c8b17ad296e91f3678b`, at `https://my-workout-pal-chi.vercel.app`. It covers only the public guest product and truthful unconfigured auth/video states; it does not cover configured authentication or persisted member data.

## Fail then pass evidence

- Lighthouse 13.4.1 first scored the landing page 97 performance, 100 accessibility, and 100 best practices, but its detailed `label-content-name-mismatch` audit failed with serious impact. The shorter overriding labels omitted visible text from the brand and five waypoint controls.
- Before markup changed, `pnpm vitest run tests/unit/accessible-labels.test.tsx` failed 1 of 1 tests on `aria-label="My Workout Pal home"`. Removing the three redundant brand overrides and five waypoint overrides made native visible content authoritative; the same focused test then passed 1 of 1.
- After deployment, the exact Lighthouse audit became `notApplicable` because no mismatched override remained. The landing mobile scores were then 98 performance, 100 accessibility, and 100 best practices with no run warning.
- Earlier public-baseline failures remain relevant history: the first executable 40-case matrix produced 30 failures, 9 passes, and 1 WebKit PWA capability skip, exposing serious contrast failures and transport-policy breakage. Surface-specific foreground tokens plus transport-aware CSP/HSTS handling produced the current 39-pass result without weakening HTTPS production headers.

## Personally observed route

The primary implementer used the Playwright CLI against public production and inspected the resulting forced-colors captures. The exercised guest route:

1. Opens the landing page and confirms guest activity is not saved.
2. Confirms Push, Pull, Legs, Upper, and Lower are reachable controls whose names are their visible number and day text.
3. Selects Barbell + rack, opens Pull, and confirms Barbell bent-over row.
4. Opens the barbell Pull day and confirms its matching exercise destination.
5. Searches the compatible library, verifies a real result, verifies the explicit no-match state, and clears the search.
6. Opens the sample workout and sample analytics, confirming both are read only and never represented as user history.
7. Opens the sign-in gate and observes the truthful unconfigured state.

## Automated checks

- `pnpm verify`: strict TypeScript, full ESLint, 64 test files and 420 tests, generated service-worker parity, and 27-document parity pass.
- `pnpm drizzle-kit check`: migration metadata is valid.
- `pnpm test:e2e:release`: the Next.js 16.3.2 webpack production build passes, then 39 browser cases pass with 1 explicit skip.
- `PLAYWRIGHT_BASE_URL=https://my-workout-pal-chi.vercel.app pnpm exec playwright test`: the same 39 cases pass against deployment `dpl_HFFWzSg9hPTxh5q4KqW2yvhsC4WN`, with 1 explicit skip.
- Chromium phone, tablet, and desktop pass PWA service-worker installation and offline recovery. Chromium and WebKit pass the guest journey, seven serious-or-critical Axe scans, keyboard skip navigation, reduced motion, dark mode, phone target sizing, and overflow checks.
- The sole skip is the WebKit service-worker-control case because Playwright supports that automation path only in Chromium. It is a capability exclusion, not a product pass.
- The post-matrix Vercel error-log query returned no entries. This is a bounded scan, not proof that future traffic is error-free.

## Lighthouse 13.4.1

Raw JSON reports were written to `/private/tmp` and were not published. Each row is one measurement, so performance variability is retained rather than converted into a guarantee.

| Surface | Mobile performance | Desktop performance | Accessibility | Best practices | Run warnings |
| --- | ---: | ---: | ---: | ---: | ---: |
| Landing `/` | 98 | 100 | 100 | 100 | 0 |
| Program overview `/program` | 99 | 100 | 100 | 100 | 0 |
| Barbell Pull day | 99 | 100 | 100 | 100 | 0 |
| Dumbbell library | 98 | 100 | 100 | 100 | 0 |
| Read-only sample runner | 98 | 97 | 100 | 100 | 0 |

The current command measured performance, accessibility, and best practices. PWA correctness remains separate evidence from the production Chromium install/offline checks, manifest validation, generated service-worker parity, and private-cache exclusions.

## 200 percent reflow and forced colors

A named, headed Playwright CLI session used a 640 by 900 CSS-pixel layout viewport, representing 200 percent reflow from a 1,280-pixel desktop layout, with `forced-colors: active` and reduced motion active. Landing, program overview, barbell Pull, dumbbell library, and sample workout each reported:

- zero document-width overflow;
- zero visible actions extending beyond the horizontal viewport;
- active forced-colors and reduced-motion media queries;
- visible headings, content, system-color boundaries, selected controls, and primary actions in manual screenshot review.

The first Tab focused `Skip to selected day`; Enter activated `#selected-day-sheet`. The five route action counts were 15, 15, 9, 32, and 14 respectively. One initial full-page `/program` screenshot was blank even though its DOM snapshot and metrics were complete; an isolated revisit, fresh snapshot, viewport capture, and stable full-page recapture rendered the complete page, identifying a capture artifact rather than claiming a product failure. Raw screenshots remain in ignored `output/playwright/` and are not publication artifacts.

## Protected collection evidence boundary

The same local gate includes migration, PGlite repository, direct-route, client-model, and static component coverage for the owned program collection. Those tests prove one active root, both starter profiles, independent clone identities, owner custom-exercise fidelity, stale and foreign denial, inactive-program workout and equipment denial, concurrent idempotent replay, strict private requests, malformed-success refusal, read-only verification gating, and the 24-program cap.

No configured Firebase project exists, so this run did not render or operate `/app/programs` as a signed-in user in Chromium or WebKit. The successful production build and automated owner-scoped tests are not labeled as live authenticated browser proof.

## Storage, ownership, equipment, and media answers

- Public guest selections stay in browser state and query parameters; they are never presented as persisted. Authenticated repositories store kilograms and meters canonically, with presentation conversion at validated boundaries, but no member record was created in this run.
- Server-derived Firebase UID checks, cross-user denial, immutable revisions, and workout snapshots are covered by unit and PGlite integration tests. Cross-user browser proof still awaits configured disposable identities.
- Both Dumbbells and Barbell + rack remain usable in the guest journey, and the barbell Pull substitution was observed in production.
- No video was approved, embedded, or represented as available. Exactly-two full-watch evidence and view-count-after-quality-gates selection remain blocked on the YouTube API key and human review.
- Commands, deployment identity, public URL, scores, and the documented capability skip make the public run reproducible without exposing a secret.

## Remaining verification

- Configured password and Google authentication, verification, recovery, expiry, reauthentication, deletion, and cross-user denial in real browsers.
- Persisted runner interruption, resume, completion, history, records, analytics, and account deletion against disposable Firebase identities.
- Owned program creation in both profiles, cloning, activation, editing, equipment synchronization, and immutable-history inspection against disposable Firebase identities.
- Manually watched and approved exact-two YouTube demos, live dual embeds, removal fallback, and the production seed.
- Authenticated preview and production replay, including signed-in 200 percent reflow and forced-colors states.
