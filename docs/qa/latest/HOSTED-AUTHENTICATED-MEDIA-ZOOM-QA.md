# Hosted authenticated media and 200-percent zoom QA

## Scope

- Released application source: `f84cb87867818e7eb6836c1dfcb1fe48d01b20ec`
- Ready production deployment: `dpl_5cJDcu23Nw2v289Diraz4vR1dwCm`
- Public production origin: `https://my-workout-pal-chi.vercel.app`
- Final harness source: `994be7a`
- Ready protected preview: `dpl_3fC382LEs8C47Y2Qb4PKiAS81BVk`
- Browser: installed Google Chrome on macOS
- Provider effect: one generated verified password identity, its owner-scoped Neon graph, and exact cleanup

## Production browser evidence

The fail-closed command created one generated reserved-domain Firebase identity, signed in through the real Firebase client and secure session-cookie endpoint, onboarded the dumbbell starter, and started Push through the owner-scoped production API. Exactly three intended first-party mutations occurred: session exchange, onboarding, and workout start.

The first effective exercise exposed exactly two approved, distinct demonstrations. Demo 1 and Demo 2 each moved from the real accessible `Play video` control to `Pause video`; switching tabs retained exactly one privacy-enhanced iframe, the selected video ID matched its direct YouTube fallback, and no autoplay was used. A separate replay deliberately aborted the first embed, then proved Demo 2, its fallback, and Save set remained usable; Demo 2 again entered the playing state.

At the two bounded prompts, native macOS Chrome controls changed the temporary browser window from 100 to 200 percent and back to 100 percent. The Playwright page independently required the device-pixel ratio to double and return to baseline. At 200 percent, `/app`, `/app/programs`, `/app/program/edit`, `/app/settings`, and the owned Push runner retained their exact headings, visible main landmarks, a single reading axis, and zero document-level horizontal overflow. App-owned editor and runner markup had no serious or critical Axe violation.

The live YouTube document reported three player-owned Axe rules (`aria-allowed-attr`, `aria-prohibited-attr`, and `button-name`). The final boundary excludes only the exact `youtube-nocookie.com/embed/` document from app-owned Axe claims. It separately requires a nonblank iframe title and both real player control transitions, so third-party markup is neither hidden nor misrepresented as application code.

## Retained fail-first corrections

- The initial command and configuration modules were absent; focused tests failed before the explicit approval, production-origin, Firebase/Neon, media, zoom, cleanup, and sanitized-output contracts were implemented.
- YouTube's current player exposes accessible `Play video` and `Pause video` controls rather than the brittle CSS controls initially assumed. The production diagnostic reached `media_demo_one_control` before the harness adopted the accessible contract.
- Page-level Playwright key events do not modify Chrome browser chrome. A public no-account diagnostic proved the native handshake as DPR and CSS width `1 / 1440 → 2 / 720 → 1 / 1440`; the harness now pauses for native gestures and times out into cleanup.
- The hosted 200-percent replay found no runner overflow but did find that the standalone workout route lacked a semantic main landmark. The credential-free 720 CSS-pixel browser test failed on `getByRole("main")`, then passed after production and fixture routes received the landmark.
- The post-fix hosted replay identified the three serious player-owned Axe rules above. The identical fixture runner passed app-owned Axe. A fail-first command policy test then required the exact iframe exclusion plus nonblank title and real play/pause evidence.

## Automated and deployment evidence

- Focused hosted configuration/command matrix: 2 files, 12 tests.
- Focused runner 720 CSS-pixel production-fixture replay: 1 Chromium test, passing geometry, landmark, and app-owned Axe.
- Strict TypeScript, scoped ESLint, documentation parity, and diff validation passed after each bounded checkpoint.
- Complete permission-correct `pnpm verify` on released application source: 102 files and 684 tests, database 4 files and 34 tests, 27 exact-two approved video mappings, generated PWA and 39-document parity, Next.js 16.3.2 Webpack production build, and 41-route production boundary.
- Review deployment `dpl_3fC382LEs8C47Y2Qb4PKiAS81BVk` reached Ready. Vercel's authenticated protection bypass returned `200` with private no-store and declared security headers for `/`, `/program`, `/library`, and `/sign-in`; its error-level log query was empty.
- GitHub and local `main` aligned at `f84cb87867818e7eb6836c1dfcb1fe48d01b20ec` before production `dpl_5cJDcu23Nw2v289Diraz4vR1dwCm` reached Ready on the public aliases.
- The final accessibility-boundary and QA closeout reached reviewed checkpoint `3f2644453ce8195c7f14765a8c94cf668df76793`, Ready preview `dpl_CdUJGWXMyCfo9tHK3KMe1rrLUub1`, and Ready production `dpl_97VKX7rdFtxioQ23h85KzFKN8omM`. GitHub reported success, the four public routes returned `200`, and the exact production error query returned no entries.

## Cleanup and disk closeout

The final safe result reported `videosPlayed: 2`, `blockedFirstEmbedVerified: true`, `exactZoomVerified: true`, `firstPartyMutationCount: 3`, `globalStateVerified: true`, and `cleanupConfirmed: true`. Aggregate Firebase users were `0 → 0`; the generated identity was absent, its owned Neon row count was zero, the terminal deletion state was confirmed or absent, and the global catalog/video/template digest was unchanged.

Every failed diagnostic also confirmed cleanup. No generated email, password, UID, cookie, CSRF token, session/program/workout ID, database row, browser profile, screenshot, trace, recording, or provider payload was retained.

Root `.next` (about 203 MB), fixture `.next-authenticated` (about 174 MB per focused build), `test-results`, and `playwright-report` were removed immediately after each run. The reusable dependency tree and repository-local pnpm store remain to prevent repeated downloads and unpacking while manual gates remain. Free volume stayed about 190 GiB.

## Remaining manual gates

- Replay Google sign-in and Google reauthentication with an authorized interactive Google identity.
- Sign in to the Vercel web dashboard, choose the exact USD Spend Management amount, inspect notification subscriptions, and request action-time confirmation before enabling notifications or the team-wide production pause. Official Spend Management thresholds are 50, 75, and 100 percent; 90 percent is not offered.
