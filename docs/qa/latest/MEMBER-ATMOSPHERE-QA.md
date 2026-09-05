# Member atmosphere release QA

## Scope

September 5, 2026. Direct Library access, including before routine setup; four primary member destinations; seven contextual scenes with six original cartoon characters; integrated phone and desktop backgrounds; browser-local Today companion choice and global Off. No migration, seed, video approval, provider change, or workout-domain change is part of this release.

## Local verification

The full suite passed 868 tests across 126 files. The final focused run passed 24 tests across six files, including the added pre-setup Library case. Navigation tests first failed for the missing link and incorrect selected destination. The pre-setup Library test first failed on the setup redirect. All pass after their corrections.

Typecheck, lint, 34 database checks, seed-policy checks, public service-worker v8 verification, production build, and the 45-entry production route boundary passed. Documentation and HTML parity are generated together.

The local authenticated matrix passed six journeys on Chromium desktop and WebKit phone. It covered empty setup, direct Library before and after setup, private routine save and undo, Today selection, Start visibility, strength/duration/distance logging, paused-rest reload recovery, completion, Progress, browser-local companion choice, and global Off. Settings passed accessibility scans after live dark switching and after a fresh dark load. External video content was stubbed in the isolated local harness; no playback claim comes from that run.

Public Chromium desktop and WebKit phone checks passed welcome, disposable practice and refresh discard, Library search, movement detail, Progress preview, and sign-in. App-owned accessibility scans reported zero violations and checked surfaces had no horizontal overflow or page errors.

## Design review

The independent Impeccable review accepted contextual activities, integrated scene treatment, direct Library navigation, Today action hierarchy, and restrained runner imagery. Its requested fixes addressed WebKit theme-switch foregrounds, authoritative documentation, and the selected-equipment side stripe. The verdict pass scored all three fixes resolved and returned `ship` for those reviewed corrections.

## Browser evidence

The local captures use synthetic data and a visible fixture banner. Fixed phone navigation appears at the viewport boundary in full-page captures.

| Surface | Desktop | Phone |
| --- | --- | --- |
| Today | [Capture](member-atmosphere/local/chromium-desktop-today.png) | [Capture](member-atmosphere/local/webkit-phone-today.png) |
| Routine | [Capture](member-atmosphere/local/chromium-desktop-routine.png) | [Capture](member-atmosphere/local/webkit-phone-routine.png) |
| Library | [Capture](member-atmosphere/local/chromium-desktop-library.png) | [Capture](member-atmosphere/local/webkit-phone-library.png) |
| Progress | [Capture](member-atmosphere/local/chromium-desktop-progress.png) | [Capture](member-atmosphere/local/webkit-phone-progress.png) |
| Settings, dark | [Capture](member-atmosphere/local/chromium-desktop-settings-dark.png) | [Capture](member-atmosphere/local/webkit-phone-settings-dark.png) |

## Production verification

Pending deployment. The recorded rollback baseline is Ready deployment `dpl_7dkBB16HW6GHWtUTgjQSthLv2c37`. Release completion requires the stable production alias, authenticated browser journey, exact disposable-account cleanup, and unchanged global persistence digest. Local evidence does not establish these hosted results.

## Evidence retention

This report replaces the previous completed Quiet Set QA set. The previous report and read-only video inventory remain available in [their Git snapshot](https://github.com/vdoshi96/My-Workout-Pal/tree/9bfc163/docs/qa/latest). Video inventory was not modified or reapproved in this iteration. Asset provenance resides beside each public WebP.
