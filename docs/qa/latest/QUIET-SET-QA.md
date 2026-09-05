# Quiet Set release verification

## Scope

The September 4–5 implementation follows the companion comparison and the user's subsequent art correction. Original cartoon Pip/Mica and bright gym environments replace the rejected naturalistic artwork. Today, setup, routine editing, workout logging, rest, Progress, video presentation, and the public trial use the new interface.

Production publication and hosted verification are pending. This record currently establishes local release readiness only. The final deployment identity and hosted results will be added after publication.

## Automated evidence

| Check | Observed result |
| --- | --- |
| Full unit and integration suite | 126 files, 866 tests passed. |
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

Runner resilience checks cover aborted requests with stable keys, expired/revoked authentication, two offline tabs, conflicting edits, stale confirmations, and durable completion. The tests use isolated PGlite data and loopback-only synthetic identities. Hosted authentication is a separate release gate.

## Red and green

Before implementation, two meaningful runner tests failed: combined logging did not start rest, and the new combined action did not enforce validation. The same initial run also encountered a loopback permission error; that infrastructure error is not counted as domain red evidence.

Two further tests failed before implementation: removing the final movement threw instead of retaining an empty draft, and Progress omitted expected completed work sets and repetitions. Their focused green run passed 27 tests. The final full suite passed all 866 tests.

The browser pass exposed completion racing pending operations. Complete workout now waits for pending saves. Visual inspection also caught inherited low-contrast Progress totals and a wrapping mobile example link; corrected captures supersede those images. Automated accessibility results alone are not treated as visual proof.

## Deliberate choices and limits

The independent Impeccable finish review returned four material fixes. The verdict pass scored all four resolved: phone movement/action layout, neutral optional-cardio text, save status below the heading, and serif trial-completion typography. Its disposition is **ship**, scoped to those fixes and supplied screenshots. Formal FORM-seed and separate quality-card process evidence were unavailable; no retrospective approval is inferred.

- Ready poses also serve neutral empty states. Characters use cream-backed plates rather than transparent sprites because generated transparency was not reliable. They are decorative and never demonstrate technique.
- Demos and the workout outline use native disclosure controls. Their content remains secondary to logging and available to keyboard users.
- The existing full-human-watch publication policy remains in force. Runtime can retain one valid existing demonstration; metadata checks and legacy database flags cannot approve new media. Variant notes identify the report's ambiguous examples.
- No real-participant usability study, physical-device certification, or native browser-menu 200% zoom run was completed in this iteration. Browser viewport/reflow evidence is scoped accordingly.
- No claim covers playback of all 268 videos. Selected-origin playback is recorded separately after hosted QA.

## Evidence locations

Final screenshots and machine-readable public/member results are retained in the adjacent `quiet-set/` directory after hosted verification. The comparison report remains a dated audit and retains its historical evidence. Current behavior is documented in `docs/plans/QUIET-SET-IMPLEMENTATION.md`, `PRODUCT.md`, and `DESIGN.md`.
