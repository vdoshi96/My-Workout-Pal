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

Application commit `368997d465e6ffac5a45f3f9646b3589fb6fa023` deployed as `dpl_DdwYMTT4tqL6g2boJ7JYokES4vZa` and was Ready with the stable production alias when checked. The recorded rollback baseline is `dpl_7dkBB16HW6GHWtUTgjQSthLv2c37`. The closeout updates documentation, evidence, and the QA script only; it preserves the tested application source.

Production Chromium checks passed Library before setup, blank setup, routine save, desktop and phone scene rendering on Today/Routine/Library/Progress/Settings, Start visibility, set logging, paused-rest reload recovery, completion, Progress, persisted Off, and foreign-owner/missing-session equivalence. Checked surfaces had no horizontal overflow, application page errors, or accessibility violations. [Hosted result](member-atmosphere/hosted/result.json) confirms both disposable identities were cleaned up, their owner rows were removed, deletion jobs were terminal or absent, Firebase count returned from one to one, and the shared persistence digest stayed unchanged.

Public Chromium desktop and WebKit phone checks passed on the stable origin with zero accessibility violations and page errors. An initial WebKit run reported an RSC navigation cancellation; an unchanged retry passed without a waiver. The first hosted completion capture showed the streamed loading screen. Adding an explicit visible-heading wait let the complete journey pass on the unchanged deployed application.

The hosted YouTube frame, production-origin parameter, and external fallback were verified. Playback could not be established in this automated run; this release makes no new playback or human-viewing claim. Local WebKit covers authenticated phone and dark-theme behavior; hosted authenticated evidence uses Chromium at both viewport sizes.

| Production surface | Desktop | Phone |
| --- | --- | --- |
| Today | [Capture](member-atmosphere/hosted/app-desktop.png) | [Capture](member-atmosphere/hosted/app-phone.png) |
| Library | [Capture](member-atmosphere/hosted/app-library-desktop.png) | [Capture](member-atmosphere/hosted/app-library-phone.png) |
| Settings | [Capture](member-atmosphere/hosted/app-settings-desktop.png) | [Capture](member-atmosphere/hosted/app-settings-phone.png) |
| Completed Progress | — | [Capture](member-atmosphere/hosted/progress-phone.png) |

## Evidence retention

This report replaces the previous completed Quiet Set QA set. The previous report and read-only video inventory remain available in [their Git snapshot](https://github.com/vdoshi96/My-Workout-Pal/tree/9bfc163/docs/qa/latest). Video inventory was not modified or reapproved in this iteration. Asset provenance resides beside each public WebP.
