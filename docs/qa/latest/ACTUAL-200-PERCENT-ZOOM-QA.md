# Actual 200-percent public zoom QA

## Scope

- Public production runtime: `8365e47e8436a59bbccbd1a887176a5924d2ce27`
- Production origin: `https://my-workout-pal-chi.vercel.app`
- Focus-correction source: `33e3de4`
- Browsers: installed Google Chrome and Safari on macOS
- Persistence/provider effect: none

## Browser evidence

Chrome's site-specific settings and toolbar both reported `200%`. The same page reported DPR 4 at zoom and DPR 2 after the verified reset to `100%`. At 200 percent, landing, program, Barbell + rack selection, Push, contextual exercise return, filtered library search, exercise detail, and sign-in each had `scrollWidth === clientWidth` with an 892-pixel document width.

The exercise detail exposed exactly two tabs. ArrowRight changed selection from Demo 1 to Demo 2, replaced the original embed with `youtube-nocookie.com/embed/YwrzZaNqJWU`, retained exactly one iframe, and updated the direct fallback to `youtube.com/watch?v=YwrzZaNqJWU`. The iframe occupied CSS pixels 45 through 847.5 inside the 892-pixel document. Chrome's warning/error log set was empty.

Safari's Page Menu displayed the exact zoom list and reported `200%` after selection. Landing, program, Barbell + rack, Push, exercise detail, Demo 2, exact Push return, and sign-in remained available in the accessibility tree. Each surface exposed the page's single scroll axis and no separate horizontal scroll control. The Demo 2 subtree exposed Play video, attribution, Watch on YouTube, and the direct application fallback. Safari was visibly restored to `100%` before it quit.

No screenshot was retained because exact browser state plus numeric geometry provides stronger proof and avoids redundant disk use. No credential, account, UID, cookie, opaque member path, profile, trace, recording, report, or download entered the run.

## Retained fail-first correction

The production landing skip link received focus and changed the URL fragment, but its unfocusable destination left Chrome focus on `BODY`. The new component assertion failed on the missing `tabindex="-1"`. Source checkpoint `33e3de4` makes the public main, authenticated main, and selected-day destination programmatically focusable.

Passing checks on that exact source:

- `pnpm vitest run tests/unit/accessible-labels.test.tsx tests/unit/public-navigation-prefetch.test.tsx` — 2 files, 4 tests.
- `pnpm typecheck`.
- Scoped ESLint for the changed shells, explorer, component test, and two browser specs.
- Production-mode Chromium public skip-link case — 1 pass.
- Production-mode Chromium authenticated onboarding/focus case — 1 pass.
- Root production build and authenticated fixture build both passed before their generated output was deleted.
- Complete `pnpm verify` — 100 test files/672 tests, database 4 files/34 tests, 27 exact-two video mappings, PWA and 37-document parity, production build, and 41-route boundary.

## Disk closeout

- Deleted root `.next` (about 203 MB), fixture `.next-authenticated` (about 174 MB), `test-results`, and `playwright-report` immediately after the focused runs.
- Deleted the aggregate replay's second root `.next` (about 203 MB) immediately after the complete gate.
- Chrome and Safari were restored to default zoom and quit.
- No QA raster was added. The superseded hosted-deletion screenshots and note are removed after this Markdown/HTML pair verifies.

## Remaining boundary

Authenticated actual-200-percent collection/editor/settings/runner behavior remains coupled to the authenticated production-media gate because this public run reused no member session and transmitted no credential. Google consent/reauthentication and Vercel Spend Management also remain separate.
