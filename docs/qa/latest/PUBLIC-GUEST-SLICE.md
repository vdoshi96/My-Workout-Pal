# Public release browser baseline

## Scope

This checkpoint exercises the public product through a local Next.js production server. It covers the guest equipment preview, all five starter-day controls, a barbell Pull route, compatibility-filtered library search and recovery, read-only sample workout and analytics, the truthful sign-in gate, production PWA installation and offline behavior, serious and critical automated accessibility checks, keyboard navigation, reduced motion, dark mode, phone target sizing, and horizontal overflow.

This is local production-mode evidence rerun from program-collection implementation commit `62bfa65`. It is not preview or public-production proof, and it does not cover configured authentication or persisted member data.

## Fail then pass evidence

- The first executable `pnpm test:e2e:release` matrix ran 40 cases: 30 failed, 9 passed, and 1 WebKit PWA case was skipped. The failures exposed one stale accessible-name expectation, serious color-contrast defects across public surfaces, and a genuine transport-policy defect that made WebKit upgrade HTTP localhost assets to unavailable HTTPS.
- The color correction introduced surface-specific foreground tokens and retained the established light and dark visual system. The browser matrix then cleared the landing, day, library, exercise, sample, and sign-in accessibility gates.
- A focused security-header regression was retained failing before implementation: 1 of 5 assertions failed because an HTTP production response still contained `upgrade-insecure-requests`. After transport-aware CSP and HSTS handling, all 5 security-header assertions passed. HTTPS production responses retain HSTS and insecure-request upgrading; local HTTP production checks retain the strict nonce policy without claiming TLS.
- The first WebKit guest-flow replay exposed test-induced cancellation of prefetched React Server Component requests during immediate route replacement. Waiting for the route to become idle before the next explicit navigation removed that artificial interruption. The focused WebKit matrix then passed all 9 supported cases.

## Executed route

This automation was executed against the built server and its browser-error output was reviewed. It performs these user-visible actions and fails on browser console or page errors:

1. Opens the landing page and confirms the guest activity is not saved.
2. Confirms Push, Pull, Legs, Upper, and Lower are all reachable controls.
3. Selects Barbell + rack, opens Pull, and confirms Barbell bent-over row.
4. Opens the barbell Pull day and confirms the matching exercise destination.
5. Searches the compatible library, verifies a real result, verifies the explicit no-match state, and clears the search.
6. Opens the Lower sample workout and sample analytics, confirming both are read only and never represented as user history.
7. Opens the sign-in gate and accepts either the truthful unconfigured state or configured sign-in heading.

## Automated checks

- `pnpm test:e2e:release`: builds once, starts the application on isolated port 3108, and runs 40 production-browser cases. Final result: 39 passed and 1 skipped.
- Chromium phone, tablet, and desktop pass the PWA service-worker installation and offline cases.
- Chromium and WebKit pass the guest route, seven serious-or-critical Axe scans, keyboard skip navigation, reduced-motion behavior, dark-mode rendering, phone target sizing, and overflow checks.
- The sole skip is the WebKit service-worker-control case because Playwright supports that automation path only in Chromium. It is an explicit capability exclusion, not a reported product pass.
- `pnpm verify`: strict TypeScript, full ESLint, 63 test files and 419 tests, generated service-worker parity, and 26-document parity pass.
- `pnpm drizzle-kit check`: migration metadata is valid.
- `pnpm build`: the Next.js 16.3.2 webpack production build passes and lists the protected `/app/programs` page plus private create/clone and activation APIs as dynamic routes.

## Protected collection evidence boundary

The same local gate includes migration, PGlite repository, direct-route, client-model, and static component coverage for the owned program collection. Those tests prove one active root, both starter profiles, independent clone identities, owner custom-exercise fidelity, stale and foreign denial, inactive-program workout and equipment denial, concurrent idempotent replay, strict private requests, malformed-success refusal, read-only verification gating, and the 24-program cap.

No configured Firebase project exists, so this run did not render or operate `/app/programs` as a signed-in user in Chromium or WebKit. The successful production build and automated owner-scoped tests are not labeled as live authenticated browser proof.

## Remaining verification

- Configured password and Google authentication, verification, recovery, expiry, reauthentication, deletion, and cross-user denial in real browsers.
- Persisted runner interruption, resume, completion, history, records, analytics, and account deletion against disposable Firebase identities.
- Owned program creation in both profiles, cloning, activation, editing, equipment synchronization, and immutable-history inspection against disposable Firebase identities.
- Manually watched and approved exact-two YouTube demos, live dual embeds, removal fallback, and the production seed.
- Preview and public-production deployments, runtime logs, production database migration, Lighthouse, 200 percent zoom, forced-colors review, and public URL smoke tests.
