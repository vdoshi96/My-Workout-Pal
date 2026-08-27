# Actual 200-percent browser zoom QA

## User outcome

People can enlarge the released application to an actual browser zoom level of 200 percent without losing content, controls, focus order, or the ability to complete the inspected guest and member tasks. This lane verifies browser zoom rather than a narrow viewport, device-scale factor, operating-system display scaling, or CSS transform. It changes no workout, provider, database, billing, or account state unless a separately planned defect correction becomes necessary.

## Scope and navigation

The public journey covers the production landing page, program overview, one day, a filtered library, one exercise detail with its two demonstration choices, and sign-in. The authenticated customization journey already has phone, tablet, and desktop geometry evidence; this gate inspects its material collection/editor/equipment/settings surfaces at actual browser zoom using a disposable verified password member only if a reusable authenticated session is safely available. Otherwise, the authenticated part remains explicitly open rather than being simulated.

Chromium evidence uses the Codex in-app Chromium browser at the public production origin. WebKit evidence uses installed Safari when its visible page-zoom control exposes an exact 200-percent value. Each browser starts at its verified default zoom, changes zoom through the browser UI or browser keyboard command, and returns to the default before closing. A browser whose automation surface cannot expose or verify exact zoom is recorded as a limitation; it is not replaced with viewport emulation.

## States and invariants

- Browser zoom is exactly 200 percent and is verified from browser state, not inferred from a screenshot.
- Content remains available in document order. Horizontal page overflow, clipped dialogs, overlapping fixed navigation, unreachable terminal actions, and focus trapped outside an open dialog are failures.
- The browser back button and the application's contextual exercise return remain usable at zoom.
- The exercise detail keeps exactly two selectable demonstrations, one mounted iframe, title/channel attribution, and a direct YouTube fallback. This lane does not claim live playback unless the player is actually started and visibly observed.
- Public pages remain guest-readable. Sign-in remains optional for browsing and required only for persistent customization and tracking.
- Browser zoom is presentation state only. No canonical kilogram, metre, duration, workout, program, preference, or ownership value changes.

## Loading, empty, error, interrupted, and worst-case behavior

The inspection waits for the production document and hero/player assets before judging geometry. A loading player may not cover navigation or controls. A missing or unavailable player must retain attribution and the direct fallback where available, while a missing curated pair must show the existing useful unavailable state. Network, console, page, or first-party request failures are recorded and fail the gate unless they are an exact documented third-party player boundary. If browser zoom interrupts navigation, the current page and browser zoom state are re-read before any retry; repeated blind input is not evidence.

The worst case is a 200-percent desktop viewport acting like a narrow layout while fixed navigation, a long exercise title, player controls, or an editor dialog is visible. Every material action must remain reachable by ordinary scrolling and keyboard traversal with no two-dimensional page scrolling.

## Domain types and persistence contracts

This is an evidence-only boundary with no new application data type or persistence write. The evidence record stores only browser family, production origin, route class, verified zoom percentage, viewport/overflow measurements, visible control outcomes, console/error result, and a reviewed screenshot when it materially explains the result. It stores no UID, email, password, cookie, token, opaque member resource ID, browser profile, trace, HAR, or video.

## Authentication and authorization

Public coverage is unsigned-in. If authenticated coverage is run, identity creation, verification, secure session exchange, onboarding, and deletion follow the existing explicit opt-in hosted QA boundaries, with Firebase UID ownership derived only on the server and exact-UID cleanup in `finally`. A foreign or missing resource is never probed in this lane. A missing reusable safe auth boundary leaves authenticated zoom open rather than weakening the server session policy or using a production bypass.

## Responsive behavior and accessibility

At 200 percent, each inspected route must reflow to one readable axis, expose no document-level horizontal overflow, keep text readable without overlap, and keep representative controls at least operable by keyboard. The run checks skip-link focus, visible focus on navigation and demonstration tabs, arrow-key movement within the tablist, landmark/heading presence, and reachable terminal actions. Existing automated phone/tablet/desktop, reduced-motion, dark-mode, forced-color, and serious/critical Axe evidence remains complementary; browser zoom does not replace it.

## Privacy, security, and disk hygiene

The browser remains on the allowlisted production origin except for the existing privacy-enhanced YouTube iframe and a direct fallback that is inspected but not opened unless required. No credential is typed through an uncontrolled browser surface. At most two identity-free screenshots are retained in `docs/qa/latest`; raw browser profiles, traces, recordings, downloads, and temporary captures are deleted immediately. No local application build is required. Reusable dependencies remain, while generated build/result/report directories remain absent.

## Acceptance criteria

- Chromium exposes and verifies actual 200-percent zoom on the production origin.
- Safari/WebKit also verifies exact 200-percent zoom, or its precise automation limitation is documented without a substitute claim.
- Landing, program, day, library, exercise detail, and sign-in remain readable and operable with zero document-level horizontal overflow.
- Contextual return, keyboard navigation, two demonstration choices, one iframe, and the direct fallback remain reachable at zoom.
- Any authenticated surface claimed by this lane is actually opened through a server-derived production session; otherwise it remains open.
- No first-party console/page/request/HTTP failure is observed, and any third-party player warning is named exactly.
- Browser zoom is restored to default and temporary tabs/captures are closed or removed.
- Only newest reviewed QA evidence remains, Markdown/HTML parity passes, Git diff checks pass, and disk free space does not materially decrease.

## Automated tests and retained red evidence

Existing public and authenticated geometry, navigation, video-pair, security-header, and accessibility tests remain the automated regression layer. Documentation parity and diff checks must pass on this evidence branch. If actual zoom reveals a product defect, retain one minimal fail-first automated geometry/accessibility regression before changing source, then pass the focused test, strict types, scoped lint, and the exact browser replay. Browser-only evidence is never described as an automated test.

## Browser evidence required for completion

Record the production deployment and source SHA, browser family/version where exposed, the exact mechanism that proves 200 percent, route sequence, keyboard interactions, horizontal-overflow measurements, visible fixed-navigation/dialog/player behavior, console/error result, and zoom restoration. Retain no more than one reviewed Chromium image and one reviewed Safari/WebKit image, and only when they materially show reflow that numeric measurements cannot. A screenshot without verified browser zoom state is insufficient.

## Completed evidence record

On August 27, 2026, public production checkpoint `8365e47e8436a59bbccbd1a887176a5924d2ce27` was inspected in Chrome and Safari without a local application build. Chrome's site-specific settings and toolbar both reported exactly `200%`; the page DPR changed from 2 to 4. Landing, program, Barbell + rack selection, Push, contextual exercise return, filtered library search, exercise detail, and sign-in each reported zero document-level horizontal overflow. The exercise detail retained two tabs, keyboard ArrowRight selection, one iframe bounded from 45 to 847.5 CSS pixels inside an 892-pixel document, privacy-enhanced Demo 2, attribution, and the direct YouTube URL. Chrome recorded no console warning or error.

Safari's Page Menu exposed the exact percentage list and reported `200%` after selection. The same landing/program/Push/exercise/sign-in path stayed available through one-axis page scroll areas with no separate horizontal scroll control. Demo 2 exposed the live YouTube player subtree and direct fallback, and the exact Push return succeeded. Chrome and Safari were both restored to `100%` and quit; no browser profile, screenshot, trace, report, recording, or download was retained.

The headed run also exposed that shared skip links changed the URL fragment but left Chrome focus on `BODY`. A focused component assertion failed before source work. Exact source checkpoint `33e3de4` gives the public shell, authenticated shell, and program selected-day target `tabIndex=-1`; four focused component assertions, strict TypeScript, scoped lint, one production-mode Chromium public browser case, and one production-mode authenticated Chromium fixture case pass. The roughly 203 MB public build, 174 MB fixture build, and all reports/results were deleted immediately after verification. Authenticated actual-zoom and authenticated production media remain a combined later gate because this run transmitted no credential and reused no member session.

The complete exact-tree gate then passed 100 test files and 672 tests, four database files and 34 tests, all 27 exact-two video mappings, generated PWA and 37-document parity, the production Webpack build, and a 41-route production boundary. Its second 203 MB root build was also deleted immediately.

Release `e21b6d819740a500e17cf4a58c88bd995c19ff59` was then fast-forwarded to local and GitHub `main`. GitHub reports success and production `dpl_Gadd7Yqe41EEhh5T3UHHNzFynnQP` is Ready; the four public route probes returned `200` and the exact-deployment one-hour error query returned no entries. No provider, database, account, or paid setting changed during publication.
