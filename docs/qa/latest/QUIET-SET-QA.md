# Quiet Set release verification

## Scope

The September 4–5 implementation follows the companion comparison and the user's subsequent art correction. Original cartoon Pip/Mica and bright gym environments replace the rejected naturalistic artwork. Today, setup, routine editing, workout logging, rest, Progress, video presentation, and the public trial use the new interface.

The verified application release is commit `59f376ed55b8687d0548bd03f444bed335791166`, deployment `dpl_3upAjSUwahbkdZewr2VDyHwEc2WD`, Ready on [the stable live site](https://my-workout-pal-chi.vercel.app). PRs #3 and #4 contain the redesign and durability correction. Documentation-only closeout commits preserve this tested application source.

Live verification passed the public trial, all 134 rendered exercise guides, and a real authenticated workout from blank setup through saved completion and Progress. Rest pause/extension survives reload. A second disposable account received the same response for foreign and missing workout IDs. Both test accounts and their owned data were removed; the Firebase aggregate returned from one to one, and shared catalog state stayed unchanged. The bounded post-run deployment error-log query returned zero entries.

The first hosted run exposed a local timer checkpoint waiting behind a slow network save. The correction passed a meaningful regression test and the repeated live journey. The earlier failure is resolved; the successful result replaces its generated evidence.

## Automated evidence

| Check | Observed result |
| --- | --- |
| Full unit and integration suite | 126 files, 867 tests passed after the hosted durability correction. |
| Runner and member browser matrix | 19 passed; one intentionally skipped WebKit phone CSS-zoom case. Desktop Chromium covers that geometry check. |
| Final member captures and target-specific cases | Six passed across Chromium desktop and WebKit phone. |
| Public welcome and trial | Chromium desktop and WebKit phone passed, zero axe violations and zero page errors on the checked surfaces. |
| TypeScript and ESLint | Passed. |
| Production build and route boundary | Passed; 45 App Router entries. |
| Database schema and strict seed checks | Passed; existing seed remains 54 accepted mappings for 27 movements. No migration or seed executed. |
| Service worker parity | Passed; private routes and owned data remain outside public caches. |
| Live video inventory, read-only | 268 database mappings match the inventory, with no missing or extra mappings. |
| YouTube metadata, read-only | All 268 IDs returned oEmbed metadata; no exceptions. This is not playback or human-viewing evidence. |
| Artwork provenance and size | Eight masters contain prompts. Ten public WebP exports: phone scenes below 24 KB and characters below 12 KB each. |

The matrix covers zero setup POSTs before the final save; an actually empty draft; removal and undo; one-set publication; first-viewport Start and logging controls at 390 × 844; 10 unloaded push-ups; a 30-second hold; a 500-meter effort; rest pause/extension; reload; saved-set editing; completion; useful Progress totals; and persisted companion selection/off.

Runner resilience checks cover aborted requests with stable keys, expired/revoked authentication, two offline tabs, conflicting edits, stale confirmations, and durable completion. The tests use isolated PGlite data and loopback-only synthetic identities. The separate real hosted authentication gate passed; its result is retained in `quiet-set/hosted/result.json`.

## Red and green

Hosted QA supplied a further meaningful red: while a network request was held open, the latest paused/extended timer was absent from local storage. The correction checkpoints local state before waiting for serialized remote synchronization. Its focused suite passed 44 tests, including late-acknowledgment preservation. The repeated resilience browser matrix passed 19 cases with its one intentional skip.

Before implementation, two meaningful runner tests failed: combined logging did not start rest, and the new combined action did not enforce validation. The same initial run also encountered a loopback permission error; that infrastructure error is not counted as domain red evidence.

Two further tests failed before implementation: removing the final movement threw instead of retaining an empty draft, and Progress omitted expected completed work sets and repetitions. Their focused green run passed 27 tests. The initial full suite passed 866 tests; the post-correction suite passed 867.

The browser pass exposed completion racing pending operations. Complete workout now waits for pending saves. Visual inspection also caught inherited low-contrast Progress totals and a wrapping mobile example link; corrected captures supersede those images. Automated accessibility results alone are not treated as visual proof.

## Deliberate choices and limits

The independent Impeccable finish review returned four material fixes. The verdict pass scored all four resolved: phone movement/action layout, neutral optional-cardio text, save status below the heading, and serif trial-completion typography. Its disposition is **ship**, scoped to those fixes and supplied screenshots. Formal FORM-seed and separate quality-card process evidence were unavailable; no retrospective approval is inferred.

- Ready poses also serve neutral empty states. Characters use cream-backed plates rather than transparent sprites because generated transparency was not reliable. They are decorative and never demonstrate technique.
- Demos and the workout outline use native disclosure controls. Their content remains secondary to logging and available to keyboard users.
- The existing full-human-watch publication policy remains in force. Runtime can retain one valid existing demonstration; metadata checks and legacy database flags cannot approve new media. Variant notes identify the report's ambiguous examples.
- No real-participant usability study, physical-device certification, or native browser-menu 200% zoom run was completed in this iteration. Browser viewport/reflow evidence is scoped accordingly.
- The automated player probe was inconclusive. A normal Codex in-app browser subsequently played both existing Push-up demos on the stable production origin: primary `IODxDxX7oi4` advanced to 13 seconds and alternate `exVWa1ZNUzM` to 20 seconds. Titles, provider attribution, origin-aware frames, and direct YouTube links were present. This verifies selected playback, not all 268 videos or full human viewing.

The read-only weekly video-evidence workflow passed [GitHub Actions run 33940066352](https://github.com/vdoshi96/My-Workout-Pal/actions/runs/33940066352). It checks metadata and inventory integrity; it never approves videos.

## Evidence locations

Final screenshots and machine-readable public/member results are retained in the adjacent `quiet-set/` directory. Hosted Today and runner captures are production evidence; the retained Progress captures are from the isolated local member test. A hosted Progress screenshot caught a transient loading frame and was discarded rather than presented as rendered Progress proof. Hosted functional assertions independently verified the persisted totals. The comparison report remains a dated audit and retains its historical evidence. Current behavior is documented in `docs/plans/QUIET-SET-IMPLEMENTATION.md`, `PRODUCT.md`, and `DESIGN.md`.
