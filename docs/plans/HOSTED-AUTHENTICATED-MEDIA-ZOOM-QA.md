# Hosted authenticated media and zoom QA

## User outcome

A real verified member can open the released workout runner, use both approved exercise demonstrations, recover when the first embed cannot load, and navigate the collection, editor, settings, and runner at actual 200-percent browser zoom without losing controls or workout meaning. The run uses one disposable password identity and removes its Firebase identity and owned Neon graph even when an assertion fails.

## Navigation

The bounded production journey registers one generated reserved-domain password identity, verifies it through Firebase Admin, signs in through the real client/provider/session boundary, onboards the dumbbell starter, and opens Push. It starts or resumes Push, opens the first exercise's media disclosure, starts Demo 1, switches to and starts Demo 2, and verifies one iframe plus the direct fallback. A separate reload blocks the first embed request, then proves Demo 2 and logging remain usable.

The same authenticated session visits `/app`, `/app/programs`, `/app/program/edit`, `/app/settings`, and `/workout/<owned-session>`. At exact browser-reported 200-percent zoom it inspects landmarks, headings, material terminal actions, dialogs/disclosures, fixed navigation, and one-axis layout. Zoom is restored before browser shutdown. The account is deleted through the owner-scoped cleanup boundary after browser evidence rather than retained for convenience.

## UI states

- Registration, Admin verification, verified sign-in, secure session exchange, onboarding, and runner loading each have an exact terminal success or fail-closed stage.
- Media states cover approved pair, Demo 1 selected, Demo 2 selected, one active iframe, direct fallback, first iframe request failure, alternate selection, and runner logging remaining available.
- Zoom states cover default, browser-reported 200 percent, restored default, horizontal overflow, clipped action, unreachable disclosure/dialog control, and lost focus.
- The released authenticated Push runner exposed a retained red result at the `zoom_runner_geometry` helper stage while the collection, editor, and settings passed. The equivalent 720 CSS-pixel fixture viewport and the hosted document-width check both pass; the failure occurs at that helper's final landmark assertion because the standalone workout route has no semantic `<main>`. The correction adds the missing landmark without changing runner state, persistence, or visual layout.
- After the main-landmark correction passed in production, the same hosted replay retained a second red at `zoom_runner_accessibility`: `aria-allowed-attr`, `aria-prohibited-attr`, and `button-name` appear only inside the live cross-origin YouTube player document. The identical app-owned runner DOM passes the credential-free serious/critical Axe boundary. Hosted Axe therefore excludes only the exact privacy-enhanced YouTube iframe document; the iframe element itself must have a nonblank accessible title, and each player must separately prove its real accessible `Play video` to `Pause video` transition.
- Cleanup states distinguish visible account deletion, exact-UID Admin fallback cleanup, absent identity, zero owned rows, and uncertain cleanup. An uncertain result fails the command and reports that manual cleanup may be required without printing the identity.

## Domain values and invariants

- The identity uses a generated `example.com` address and strong generated password held only in process memory. Neither value enters output, screenshots, traces, repository files, shell history, or browser profiles.
- Firebase Admin verification and deletion target only the exact UID returned for this run. The browser never supplies an ownership UID to the application.
- All private routes derive ownership from the secure HTTP-only session. The runner's session ID is discovered from the accepted first-party response and is not retained in QA documentation.
- The runner receives exactly two approved videos for the effective canonical exercise, with distinct valid 11-character IDs, display order 1 and 2, title/channel attribution, privacy-enhanced embeds, no autoplay, visible controls, and direct YouTube fallbacks.
- At most one YouTube iframe is mounted. Switching tabs replaces the iframe; it does not start a second player.
- Blocking the first embed request may not block sets, notes, skip, substitution, cardio, or alternate-demo selection. No application success is inferred from a third-party player request alone.
- Browser zoom is actual browser state. The interactive command pauses for a native macOS Chrome zoom gesture, then uses the authenticated Playwright page to measure the resulting device-pixel-ratio change and route geometry. Viewport emulation, device scale factor, CSS `zoom`, transforms, screenshots, or page-scale emulation are not substitutes.
- No workout completion is required. Any started session and every owner row are removed during cleanup; global catalog/video/template counts and all other owners remain unchanged.

## Persistence contract

The run may create one Firebase user, one secure application session, one profile/preferences/equipment graph, one five-day program revision, one workout session, and idempotency rows required by those accepted operations. Before creation it records aggregate Firebase user count, global catalog/template/video counts, and the absence of the generated identity. Cleanup deletes the exact owned graph through the production deletion service or an owner-scoped server fallback, deletes the exact Firebase UID, revokes the browser session, and confirms aggregate/owner postconditions.

Screenshots are optional and identity-free; exact browser state, iframe/player state, URL classes, and numeric geometry are preferred. No credential, cookie, CSRF token, UID, session ID, opaque program ID, player storage, provider payload, or raw database row is retained.

## Authentication and authorization

The command requires explicit provider and native-zoom opt-in environment flags, an interactive terminal, exact production origin, expected Firebase project ID, and existing local Firebase Admin plus Neon credentials. It rejects any non-HTTPS or unexpected origin, project mismatch, absent credential, missing native-zoom authorization, or aggregate baseline uncertainty before identity creation. At the two bounded prompts an operator applies native Chrome 200-percent zoom and then native 100-percent reset; lack of confirmation times out into exact-account cleanup. Password verification uses Firebase Admin only for the disposable test identity; the application session still comes from the real client token and server exchange.

No Google identity is used, so Google consent and Google reauthentication remain separate. A foreign-owner probe is unnecessary because the completed hosted deletion lane already proves cross-owner equivalence; this lane may not broaden into another two-user run.

## Loading, empty, error, interrupted, and worst-case behavior

- A slow or failed first iframe stays isolated from application persistence. The direct fallback and Demo 2 choice remain reachable.
- Third-party YouTube warnings are recorded exactly and may be accepted only when they are known player-policy noise with no failed app request. First-party console errors, page errors, failed requests, and unexpected HTTP responses fail the run.
- Session creation, onboarding, workout start, or cleanup responses are structurally validated. A malformed `2xx` cannot advance the run.
- Browser interruption triggers cleanup with the exact captured UID. The command never retries identity creation after a response whose acceptance is uncertain.
- The worst path is provider/browser failure after Neon rows exist. Cleanup first deletes the owned database graph, then the Firebase identity, and verifies both; uncertainty is surfaced rather than hidden.

## Mobile, tablet, desktop, and accessibility

Existing automated Chromium/WebKit phone, tablet, and desktop matrices remain the broad regression layer. This production lane uses one desktop Chromium window because actual browser zoom turns it into a narrow reflow boundary. At 200 percent, every inspected page must have `scrollWidth === clientWidth`, a single reading axis, a visible primary heading, keyboard-reachable navigation and terminal actions, no fixed-nav overlap, and no serious or critical Axe violation in the runner media and one editor/dialog state.

Demo tabs support role `tab`, arrow-key selection, visible selected state, and a single labelled iframe. The media disclosure, fallback link, and logging inputs remain reachable by keyboard. Skip-link activation moves focus to the main target after the released correction.

## Privacy, security, and disk hygiene

The process passes secrets only through existing ignored environment variables and process memory. It prints only stable stage names and a sanitized final result. It launches one browser at a time with no trace or video. Any temporary browser directory is created below the task's temporary root, measured, and deleted in `finally`; no default user profile is copied. Root `.next`, fixture `.next-authenticated`, `test-results`, and `playwright-report` remain absent because the run targets production directly.

Before and after the run, record free disk space and confirm no simulator, Chrome, browser worker, test report, trace, recording, or temporary profile remains. Keep only the newest completed QA Markdown/HTML pair and at most two identity-free screenshots if they materially add evidence.

## Acceptance criteria

- Explicit opt-in, exact production origin, Firebase project, global database, and aggregate user baselines pass before creating an identity.
- One generated password identity registers, becomes verified through Admin, signs in, exchanges a secure session, and onboards the dumbbell five-day program.
- The owned Push runner exposes the approved exact pair and one iframe; Demo 1 and Demo 2 each visibly enter a playing state after a user gesture.
- With the first embed request deliberately blocked, the runner still exposes Demo 2, its direct fallback, and set logging; Demo 2 reaches playing state.
- Collection, program editor, settings, and runner each pass actual browser-reported 200-percent one-axis geometry and keyboard reachability; zoom is restored.
- A production-component fixture regression at 720 CSS pixels reports no element outside the document viewport, no horizontal document overflow, one visible semantic main landmark, and no serious or critical app-owned Axe violation before the hosted replay is accepted. The live YouTube document is not presented as app-owned accessibility evidence.
- No unexpected first-party console/page/request/HTTP failure occurs. Any accepted third-party warning is exact and documented.
- The disposable Firebase UID is absent, owned Neon row counts return to zero, global counts are unchanged, and the aggregate Firebase count equals baseline.
- No identity, credential, cookie, opaque ID, profile, trace, video, or build/report artifact remains; free space does not materially decrease.

## Automated tests and retained red evidence

Add a pure configuration parser and command policy test before the browser runner. Fail first on the missing command/config contract, then cover opt-in denial, origin/project mismatch, sanitized errors, cleanup postconditions, exact-pair validation, player-state classification, first-embed blocking allowlist, browser-zoom proof classification, and generated-artifact exclusions. Reuse the established hosted-auth/deletion helpers only when their ownership and sanitization contracts remain intact.

The final focused matrix includes the new domain/command/helper tests, strict TypeScript, scoped lint, documentation parity, and diff checks. The released runner's missing main landmark at actual zoom is the retained hosted fail-first result; the credential-free 720 CSS-pixel fixture adds the same landmark assertion and must fail before the semantic correction. Because production markup changes, the final gate includes the complete aggregate/build and production boundary, with all generated output deleted immediately afterward.

## Browser evidence required

Record exact released SHA/deployment, Chromium version, default and 200-percent browser-reported zoom, route classes, zero-overflow measurements, player tab/iframe/fallback state, visible playing indicator for each demonstration, first-embed failure recovery, keyboard/Axe result, first-party collector sets, cleanup postconditions, temporary disk peak, and final free space. Do not name the account or opaque resources. Google provider behavior and Vercel Spend Management remain separate manual gates.
