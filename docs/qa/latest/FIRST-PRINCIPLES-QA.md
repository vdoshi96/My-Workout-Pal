# First-principles simplification verification

Date: September 4, 2026. Base: `76503a46e1233283131099c4240f822ef457560a`.
Scope: local implementation and verification; hosted production behavior is not
established by this report.

## Changes and rationale

Delete the unused progression evaluator, its nine isolated tests, the unused
runner barrel, and 13 unused runner aliases. Search found no application caller
for the evaluator and no source, test, or script consumer for the deleted
aliases. Preserve the repository's used snapshot alias.

Interrupted History can contain unfinished exercises. Read pending state as
stored and show **unfinished** with any saved sets. Keep completed-session and
missing-state integrity checks. No writes, migration, or backfill are needed.
The offline queue, ownership checks, immutable snapshots, and reviewed visual
system remain because they address concrete product needs.

## Regression evidence

Before implementation, both real-repository start/abandon/History cases failed
with `Workout history is incomplete.`: immediate abandonment and abandonment
after a saved set. Both corruption guards passed. Two rendering cases failed
because the view displayed pending instead of unfinished.

After implementation, the focused repository, insights, and rendering suites
passed 38 tests. They prove saved measurements, unchanged repeated reads,
foreign-owner denial, unfinished empty movements, and retained corruption
checks. These tests use local PGlite with all eight actual migrations.

## Static and build checks

- Full Vitest run: 858 passes and one sandbox `listen EPERM` on the unchanged
  localhost embed-probe test. Its permission-correct unchanged replay passed
  all three tests. Effective result: all 859 tests pass across 126 files.
- TypeScript, ESLint, production build, and the 44-entry route boundary pass.
- Drizzle schema check and 34 database/bootstrap tests pass.
- Seed-policy check confirms 27 required variations and 54 approved videos.
- Generated public service worker check passes.
- Generated Markdown/HTML parity passes for all 64 documents; diff review passes.

## Browser evidence

The local production-mode Chromium replay passed: create an example routine,
open Push, start a workout, abandon it immediately, follow the automatic
History handoff, and reload its detail. All six movements remain unfinished,
with no invented sets and a read-only snapshot notice.

At 390- and 1,440-pixel viewport widths, document scroll width equals viewport
width and Axe reports zero violations in the main content. Both screenshots
were visually inspected. Saved-set abandonment is covered by the real-repository
and rendering regressions, not a separate browser replay.

Evidence: [phone](unfinished-history-phone.png) and
[desktop](unfinished-history-desktop.png).

The fixture uses synthetic owners, local PGlite, real repositories and
components, and no live provider credentials. Development mode entered a
file-watcher rebuild loop, so the accepted replay uses a production build.
Initial fixture headers caused third-party media CORS errors; scoping those
headers to localhost corrected the harness setup. Media playback is outside
this History check. No live account or production database was changed.

## Historical evidence

The [Wave 4 production report](https://github.com/vdoshi96/My-Workout-Pal/blob/76503a46e1233283131099c4240f822ef457560a/docs/qa/latest/WAVE-4-PRODUCTION-RELEASE-QA.md)
remains in Git history. Its hosted release claims apply to that source, not this
local correction. This report replaces its generated copies in docs/qa/latest.
