# Production-grade implementation plan

This is the build contract for the September 22, 2026 audit (`docs/plans/PRODUCTION-GRADE-AUDIT.md`). It is written for an implementing agent that did not see the audit. Follow it literally. Where it gives exact copy, use that copy character for character, including curly or straight apostrophes as written (all apostrophes in this plan are straight `'`).

## 0. Rules of engagement

Read these files before touching code, in this order: `AGENTS.md` (especially "Production quality bar"), this plan, `DESIGN.md` (sections Overview and Colors only), `PRODUCT.md` (section "Current interaction contract" only). Nothing else is required reading.

- Work on the existing branch `vishal/production-grade-audit`. Do not create another branch or worktree.
- This Next.js version (16.3) differs from older versions. Before using `notFound`, `generateMetadata`, `headers()`, or `proxy.ts`, read the matching file under `node_modules/next/dist/docs/`.
- Run one heavy process at a time (build, dev server, Playwright, full Vitest). Two at once has crashed this machine (exit 137).
- Do not touch production data, Firebase, Neon, Vercel, YouTube curation, video approval, seeds, migrations, database schema, artwork, or dependencies.
- Do not add features, refactors, abstractions, or files that this plan does not name. If something outside this plan looks wrong, list it under "Noticed, not changed" in the final report.

### Test rules (strict)

The acceptance tests are already written and committed on this branch. They are the only tests you need.

| File | Runner | Covers |
|---|---|---|
| `tests/unit/production-audit-copy.test.ts` | Vitest | Implementation vocabulary scan and required copy |
| `tests/unit/production-audit-contracts.test.ts` | Vitest | Runner domain, helpers, manifest, file contracts |
| `tests/authenticated-e2e/production-audit.spec.ts` | Playwright (authenticated fixture) | Member flows |
| `tests/e2e/production-audit-public.spec.ts` | Playwright (dev server) | Public pages |

1. Do not create test files. Do not add `it`, `test`, or `describe` blocks anywhere. Do not add snapshot files.
2. Do not edit the four acceptance files. If you believe one is wrong, stop and say which assertion and why in the report; do not work around it. The September 22 owner-requested time-zone correction is recorded below; it does not authorize other acceptance changes.
3. Never use `.skip`, `.only`, `.todo`, `test.fixme`, raised timeouts, or retries to get green.
4. You may edit an existing (pre-audit) test only when all three hold: it fails after your change; the failing assertion checks copy, a label, a role, a route, a control, or a behavior that this plan explicitly changes (R4 rest timer kept, R6 leave rule, R12 prefill, R13/E12 mm:ss entry, R20 redirect, A2 Settings before setup); and your edit changes only that expected value, plus any input value the new control needs (for example cardio `fill("1200")` → `fill("20:00")`). Log every such edit in the report as `file:line old → new`.
5. Existing tests that are known to assert changed copy (you will likely need to update these, and only these, plus any others that meet rule 4): `tests/unit/workout-runner.test.ts` ("Explicitly complete"), `tests/unit/authenticated-runner-resilience-plan.test.ts` and `tests/authenticated-e2e/onboarding.spec.ts` ("Save activity"), `tests/unit/hosted-authenticated-media-command.test.ts` and `tests/authenticated-e2e/customization-geometry.spec.ts` ("Your routes"), `tests/unit/program-collection-component.test.tsx` ("Active overview"), `tests/unit/public-account-entry.test.tsx`, `tests/unit/hosted-auth-command.test.ts`, `tests/e2e/public-release.spec.ts` ("My workouts", "Five-day starter example", "Starter preview", "Open Push day", "Sample data"), `tests/unit/accessible-labels.test.tsx`, `tests/unit/public-exercise-return.test.ts`, `tests/unit/public-progress-page.test.tsx`, `tests/e2e/animal-surface-pilot.spec.ts`, `tests/unit/member-home-route-states.test.tsx` and `tests/authenticated-e2e/animal-surface-pilot-authenticated.spec.ts` ("Loading your home", "Your home did not load"), `tests/authenticated-e2e/{onboarding,runner-resilience,quiet-set}.spec.ts` ("Complete exercise", "Step 2 of 3" is kept), `tests/unit/workout-runner-presenters.test.ts`, `tests/authenticated-e2e/runner-resilience.spec.ts`, `tests/authenticated-e2e/animal-surface-rollout-authenticated.spec.ts` ("Offline queued"), `tests/unit/workout-runner-component-harness.test.tsx` ("Reauthenticate", "Leave both values"), the cardio `Duration (seconds)` fills in `tests/authenticated-e2e/*.spec.ts`, `tests/unit/training-insights-components.test.tsx`.
6. Tests under `tests/fixtures/authenticated-app/**` are application mirrors, not tests. You must change them wherever this plan says "fixture mirror".

### September 23 owner-authorized W5 follow-up

The owner permits a bounded expansion of rule 4 for PR #8. First run both full W5 suites to completion on detached main `c619ac6` in the canonical checkout, recording every failing title. An existing browser journey may then change only selectors, copy, flow steps, and expected values when that journey also fails on main, or when this plan changes the checked behavior. Preserve every assertion's intent and all geometry and overflow thresholds. If an assertion's subject has no current equivalent, preserve it and stop on that item; record the missing subject in the QA report. A branch-only failure of a main-passing check requires an application fix, not a weaker test.

The authorized stale flows include three-step example onboarding, current public landing controls, and Library artwork layout. The rule-5 copy and cardio clock-entry edits remain required. The owner also requests singular/plural movement counts in Today, the day page and its fixture, and the editor outline. In the existing member-home unit test, replace the duplicate plural checks with one meaningful singular check and check the Mobility row's destination instead of its bare name. If an acceptance file requires the incorrect singular copy, stop and report it.

All other test and environment limits remain. Run W1–W6 fresh and serially on the final commit, retaining existing skips only. Retake both member-today screenshots and any other affected UI evidence. Add a main-versus-branch W5 table and tag every new ledger row `plan-changed` or `stale on main (fails at c619ac6)`. Update STATUS and documentation parity. Push logical commits to the existing branch and mark PR #8 ready only when the required gates pass. Do not merge or deploy.

### Commands

```sh
# Unit acceptance (fast; run constantly)
npx vitest run tests/unit/production-audit-copy.test.ts tests/unit/production-audit-contracts.test.ts
# Member acceptance (builds the fixture; ~3 min)
pnpm test:e2e:authenticated -- production-audit
# Public acceptance (starts `pnpm dev`; reads the ignored local database read-only)
pnpm exec playwright test production-audit-public --project chromium-phone --project chromium-desktop
# Full gate
pnpm verify
pnpm test:e2e:authenticated
pnpm test:e2e:release
```

`pnpm dev` rewrites `next-env.d.ts`. Run `git checkout next-env.d.ts` before committing.

## 1. Win conditions

The work is done only when every line below is true, in one final run, on the final commit:

- **W1** Both unit acceptance files pass: 0 failures.
- **W2** `pnpm test:e2e:authenticated -- production-audit` passes on both `chromium-desktop` and `webkit-phone` (7 tests × 2 projects).
- **W3** The public acceptance command passes on `chromium-phone` and `chromium-desktop` (6 tests × 2; other projects report skipped by design).
- **W4** `pnpm verify` exits 0 (typecheck, lint, every Vitest file, db/seed/PWA/docs checks, production build, production boundary).
- **W5** `pnpm test:e2e:authenticated` (full) and `pnpm test:e2e:release` exit 0 with no new skips.
- **W6** The QA evidence and documentation in section 9 exist, and `pnpm docs:check` passes.
- **W7** The final report (section 10) is delivered.

## 2. Build order

Do the phases in order. Run the unit acceptance command after every phase.

1. Phase A: domain and helpers (sections 3.1–3.4). Target: every `production-audit-contracts` block except "file-level contracts" passes.
2. Phase B: runner UI (section 4).
3. Phase C: routine management (section 5).
4. Phase D: member shell and account (section 6).
5. Phase E: public pages (section 7).
6. Phase F: copy sweep until `production-audit-copy` passes (section 8).
7. Phase G: styles cleanup (section 8.3).
8. Phase H: full verification, evidence, docs, commit, push, PR (sections 9–10).

## 3. Phase A: domain and helper contracts

### 3.1 Runner domain (`src/domain/workout-runner.ts`)

**R4. Rest timer survives advancing.** In `runnerReducer`, the `next_set` branch (currently `return withUpdated(next, { restTimer: undefined }, at);` near line 3251) and the `complete_exercise_and_next` branch (near line 3259) must keep `state.restTimer` unchanged. Only `clear_rest` and session end clear it.

**R12. Prefill.** Export `prefilledSetDraft(state: ActiveWorkoutState, setId: string): SetDraft`:
1. Find the set and its exercise; kind = `effectiveLoggingKind(state, exercise)`.
2. Among `state.loggedSets` entries with the same `exerciseId` and the same `phase` as the target set, excluding the target set, take the one whose set has the highest `position` lower than the target's position; if none is lower, take the highest position overall. Convert its `measurement` to a draft of the same kind.
3. Else, if the target set has `previous` of the same kind, convert `previous` to a draft.
4. Else, return `createSetDraft(kind)`.

Draft conversion: `weight_reps` → `{ kind, weightKg, repetitions }`; `bodyweight_reps` → `{ kind, repetitions, addedWeightKg }`; `duration` → `{ kind, durationSeconds }`; `distance_duration` → `{ kind, distanceMeters, durationSeconds }`.

Apply the prefill in the reducer: after `navigate_set`, `next_set`, `navigate_exercise`, and `complete_exercise_and_next` compute the new active set; if `state.drafts[activeSetId]` is undefined and `state.loggedSets[activeSetId]` is undefined, set `drafts[activeSetId] = prefilledSetDraft(next, activeSetId)`. Do **not** add it to `dirtySetIds`. `save_set` must accept a draft that exists but is not dirty (it already does).

**R2. Discard a failed change.** Add action `{ type: "discard_failed_operation"; idempotencyKey: string; now?: number }` to `RunnerAction` and handle it in `runnerReducer`:
- Unknown key → throw `RunnerTransitionError("unknown_operation", "The change no longer exists.")`.
- Operation `status !== "failed"` → throw `RunnerTransitionError("discard_not_allowed", "Only a change that failed can be discarded.")`.
- Kind `abandon_session` or `complete_session` → throw `RunnerTransitionError("discard_not_allowed", "Reload the workout to continue.")`.
- Otherwise set that operation's `status` to `"superseded"` and clear its error fields. Then rebuild the local effect of the operation's semantic target from the most recent (highest `sequence`) operation with the same `semanticTarget` (use `runnerOperationSemanticTarget`) whose `status === "saved"`:
  - `save_set`: if a saved operation exists, `loggedSets[setId] = { setId, exerciseId, phase, measurement: payload.measurement, operationKey: saved.idempotencyKey }`; otherwise delete `loggedSets[setId]`. Delete `drafts[setId]` and remove `setId` from `dirtySetIds`.
  - `save_cardio`: restore `loggedCardio` from the saved operation or set it to `undefined`; set `dirtyCardio` to `false`.
  - `save_note`: restore `notesByExercise[exerciseId]` from the saved payload, or delete the key; remove it from `dirtyNoteExerciseIds`.
  - `skip_exercise`: remove the exercise from `skippedExerciseIds` unless a saved skip exists.
  - `complete_exercise`: remove it from `completedExerciseIds` unless a saved completion exists.
  - `substitute_exercise`: restore the saved substitution or delete `substitutions[exerciseId]`.
- Finish with `withUpdated(...)` and recompute `sync` with `syncForState`.

**R6. Leaving and finishing.** Replace `isNavigationBlocked` and `navigationProtectionReason` with these exact rules (completed/abandoned sessions stay unblocked):

| Condition (first match wins) | Blocked | Reason string |
|---|---|---|
| `status === "completing"` | yes | `Your workout is still being saved.` |
| any `dirtySetIds`, `dirtyCardio`, or `dirtyNoteExerciseIds` | yes | `You have an unsaved entry. Log it or clear it first.` |
| any operation `status === "failed"` with `failureKind` `conflict` or `permanent`, or `retryable === false` | yes | `A change couldn't be saved. Discard it or try again first.` |
| anything else (pending, transient, offline, or auth failures) | no | `undefined` |

Pending and transient failures are stored on the device. Confirm that `src/domain/workout-resume.ts` re-queues `failed` operations with `transient`, `offline`, or `auth` failure kinds as `pending` when a workout is reopened; if it does not, make it do so (reset `status` to `pending`, clear error fields). The runner component must still block navigation while an IndexedDB write for the latest state is in flight (see R6 in section 4).

**Finishing messages.** In `ensureCompleteSession`, replace messages exactly:
- `Explicitly complete or skip ${exercise.name} before completing the session.` → `Finish or skip ${exercise.name} first.`
- `Log every work set for ${exercise.name} before completing the session.` → `Log every work set for ${exercise.name} first.`
- `Select and save the required cardio option before completing the session.` → `Log your cardio finish first.`
- `The required cardio log must be saved and confirmed before completing the session.` and `Every required work set must be saved and confirmed before completing the session.` → `Wait for your last changes to save, then finish.`
- The dirty-draft message → `Save your edited set or note first.`

### 3.2 Presenters (`src/components/workout/workout-runner-presenters.ts`)

Export `setEntryErrorMessage(kind: MeasurementKind): string` returning exactly:

| kind | text |
|---|---|
| `weight_reps` | `Enter weight and reps to log this set.` |
| `bodyweight_reps` | `Enter reps to log this set.` |
| `duration` | `Enter a time to log this set.` |
| `distance_duration` | `Enter distance and time to log this set.` |

### 3.3 New pure helpers

`src/domain/time-entry.ts`:
- `parseClockDuration(input: string): number | undefined`. Trim. Accept `M:SS`, `MM:SS`, or `H:MM:SS`, where seconds and minutes after a colon are exactly two digits `00`–`59`. A bare non-negative integer means whole minutes (`"20"` → `1200`). Anything else, including empty, negative, `"1:60"`, `"1::00"`, and `"12:3"`, returns `undefined`.
- `formatClockDuration(seconds: number): string`. Under one hour: `M:SS` (`65` → `"1:05"`, `0` → `"0:00"`, `1200` → `"20:00"`). One hour or more: `H:MM:SS` (`3900` → `"1:05:00"`). Round down to whole seconds.

`src/domain/time-zones.ts`:
- `timeZoneOptions(saved?: string): readonly string[]`. Return `Intl.supportedValuesOf("timeZone")`, plus `"UTC"` if missing, plus `saved` if provided and missing, deduplicated and sorted with `localeCompare(…, "en-US")`.
- September 22 contract correction: require `America/Chicago`, UTC, every runtime-supported zone, and preservation of the saved value. Do not require an unsaved alias absent from the runtime list, such as `Asia/Kolkata` on Node 24.19.0 / ICU 78.3. A saved alias must still be preserved. The list contains choices; it does not determine the selected zone. Onboarding keeps the browser-detected zone, and Settings keeps the account's saved zone. The owner's local Node runtime was verified as `America/Chicago`; do not force that zone on other users.

`src/domain/navigation/member-return.ts`:
- `signInRedirectPath(requested: string | null): string`. If `requested` is a string that equals `/app` or starts with `/app/` or `/app?`, and does not start with `//`, return `/sign-in?returnTo=${encodeURIComponent(requested)}`. Otherwise return `/sign-in?returnTo=%2Fapp`.

`src/components/program/program-editor-model.ts`:
- `formatProgramDraftIssue(draft: ProgramEditorDraft, issue: { path: readonly PropertyKey[]; message: string }, exerciseNames: ReadonlyMap<string, string>): string`.
  - Location: if `path[0] === "days"` and `draft.days[path[1]]` exists, the prefix is that day's `name`. If the path continues with `"sections", s, "prescriptions", p` and that prescription exists, append ` › ` and the movement name: `displayName`, else `exerciseNames.get(catalogExerciseId ?? customExerciseId)`, else `Movement ${p + 1}`. If it continues only with `"sections", s`, append ` › ` and that section's `title`. If it continues with `"cardio", c`, append ` › Cardio`. With no day, the prefix is `Routine`.
  - Field: if the last path element is a string in this table, the text after `: ` starts with the label then a space then the lowercase-first message rewrite, as follows: known zod codes produce `Max reps is too low.` style text. Implement as: `${label} ${friendly}` where `friendly` is `is too low.` if `message` starts with `Too small`, `is too high.` if it starts with `Too big`, `is required.` if it contains `Required` or `expected number, received null`, otherwise the original message.

    | key | label |
    |---|---|
    | `name` | `Day name` |
    | `title` | `Section name` |
    | `setCount` | `Sets` |
    | `minimumReps` | `Min reps` |
    | `maximumReps` | `Max reps` |
    | `minimumSeconds` | `Min time` |
    | `maximumSeconds` | `Max time` |
    | `restSeconds` | `Rest` |
    | `targetWeightKg` | `Target weight` |
    | `targetDistanceM` | `Target distance` |
    | `durationSeconds` | `Duration` |
    | `distanceM` | `Distance` |
    | `inclinePercent` | `Incline` |
    | `notes` | `Notes` |
  - If the last element is not in the table, the text after `: ` is the original message.
  - Output: `${prefix}: ${text}`. It must never contain `→` or any raw key.
- In `src/domain/programs/publication.ts` replace the message `Use one complete ascending repetition or duration range.` with `Set a low-to-high range for reps or time.`

### 3.4 Manifest (`src/app/manifest.ts`)

Set exactly: `start_url: "/app"`, `scope: "/"`, `background_color: "#f6f3e9"`, `theme_color: "#f6f3e9"`. Icons: four entries: `icon-192.png` and `icon-512.png` each once with `purpose: "any"` and once with `purpose: "maskable"`. Shortcuts, in order: `{ name: "Today", short_name: "Today", url: "/app" }`, `{ name: "Library", short_name: "Library", url: "/app/library" }`, `{ name: "Progress", short_name: "Progress", url: "/app/progress" }`, each with the existing 192 icon.

## 4. Phase B: workout runner

Files: `src/components/workout/workout-runner.tsx`, `owned-workout-runner.tsx`, `try-one-set.tsx`, `src/app/workout/[sessionId]/{page,loading,error}.tsx`, and fixture mirror `tests/fixtures/authenticated-app/app/workout/[sessionId]/page.tsx`.

Layout order inside the active exercise card, top to bottom (anything not listed is removed from the card):
1. Exercise heading `<h2 id="runner-active-heading" tabIndex={-1}>` with the movement name.
2. Set tabs.
3. Previous / Target line.
4. Set entry fieldset with inputs, the inline error slot, and **Log set & rest**.
5. Forward button (when the active set is logged).
6. Rest timer.
7. `<details className="runner-more">` with `<summary>More options</summary>` containing, in order: Exercise note (textarea labeled `Note` and a `Save note` button), Swap exercise (heading `Swap exercise`, text `Swap before your first set. Targets stay the same.`, button `Find a compatible movement`), and a `Skip exercise` button.
8. `Watch demo and technique guidance` disclosure (unchanged).

Remove the "Mark this movement" card and its skip-reason textarea entirely.

**R5. Validation.** When Log set & rest runs with missing or invalid values, do not dispatch. Render `<p id="runner-set-error" className="runner-field-error">` directly under the inputs with `setEntryErrorMessage(kind)`. Set `aria-invalid="true"` and `aria-describedby="runner-set-error"` on every empty or invalid input and focus the first one. Clear the error and `aria-invalid` as soon as any input in that fieldset changes. Remove the top-of-page banner path for this case. Never render text containing `weightKg`, `repetitions is required`, or an error `code`.

**R4/R8. Forward button and focus.** Label: `Next set` when more sets remain; `Next exercise` on the last set when more exercises remain; `Finish exercise` on the last set of the last exercise. After it runs, focus `#runner-active-heading` and announce once, in the existing polite status region: `Next: ${exerciseName}, set ${n} of ${total}.` (for the last one: `Exercise done.`). The rest timer keeps running (domain R4).

**R12.** Inputs show the draft values from the domain prefill, formatted with the display unit and without trailing zeros (`25`, not `25.0`). A value entered as 25 lb must display as `25` in the next set.

**R9.** In the timer-affecting `apply` calls (`log_set_and_rest`, `start_rest`, `resume_rest`, `extend_rest`), call `setClockNow(Date.now())` before dispatching so the first render and announcement use the current time.

**R10. Skip confirmation.** `Skip exercise` opens a native `<dialog>` (`showModal`) with `aria-labelledby` pointing at `<h2>Skip {exerciseName}?</h2>`, text `You can't log sets for it after skipping.`, an optional textarea labeled `Reason (optional)`, and buttons `Skip exercise` (confirm, dispatches `skip_exercise` with the reason) and `Cancel` (closes; focus returns to the More options summary).

**R1. End workout.** Rename the footer `Abandon workout` button to `End workout`. It opens a `<dialog>` with `aria-labelledby` pointing at `<h2>End this workout?</h2>`, the text `Sets you logged stay in your history.`, a textarea labeled `Note (optional)`, and buttons `End workout` (dispatches `abandon_session` with the note) and `Keep going` (closes; focus returns to the footer End workout button). Delete the always-visible "Abandonment note (optional)" textarea.

**Footer.** Order: `Finish workout` (primary; renamed from `Complete workout`; dispatches `complete_session`; if the domain throws, show its message in the inline status under the footer), `End workout` (secondary), `Leave for now` (link-style button; renamed from `Exit workout`). Show `All changes saved.` when nothing is pending; `Saving…` while any operation is pending; nothing else.

**R6. One leave rule.** `Leave for now`, the top-bar `Back to Today` and `Library` links, and `beforeunload` all use `isNavigationBlocked`. While an IndexedDB write for the latest state is in flight, treat it as blocked with reason `Saving to this device…`. When blocked, the links call `preventDefault()` and show the reason in the footer status; `beforeunload` sets `returnValue`. When leaving with pending operations, show nothing extra: they sync when the workout is reopened.

**R2. Failed saves.** Replace the recovery section heading `Save activity` with `Couldn't save`. For each failed operation render: its human label (existing `formatOperationStatus` label), and either `Try again` (transient/offline/auth: dispatches `retry_operation`) or `Discard this change` (conflict/permanent/`retryable === false`: dispatches `discard_failed_operation`, then announces `Change discarded.`). Never render `errorCode` or `errorMessage` from the server. Delete the `Resolve conflict` text and the `Leave both values unresolved` button.

**R14. Device storage errors.** Replace every `Local workout storage is unavailable: ${…}` banner with `We couldn't save to this device. Your last logged set is safe.` plus a `Try again` button that re-runs the last persist. Log the raw error with `console.error`.

**Local-tab conflict chooser.** Keep the feature. Copy: heading `Pick which value to keep`, per option button `Keep ${choiceLabel}`, success announcement `${value} kept.`

**R13. Cardio entry.** In the cardio form only (not timed strength sets), replace the `Duration (seconds)` number input with a text input labeled `Duration` (`inputMode="numeric"`, `placeholder="mm:ss"`), parsed with `parseClockDuration` and displayed with `formatClockDuration`. Replace `Pace (seconds/km|mi)` with `Pace (min/km)` or `Pace (min/mi)`, same mm:ss handling (storage stays seconds per kilometer). Invalid text shows `Enter a time like 20:00.` inline with `aria-invalid`. Cardio heading `Cardio finish`, intro `Pick your cardio finish.`; when cardio exists, show `Required to finish` next to the heading. The mode group label is `Cardio`. Placeholder when no mode is selected: `Choose Walker or Runner to log it.`

**R15. Set tabs.** Warm-up tabs keep a visible short label `Warm-up` on every width and use the `--paper-deep` background with a dashed `--rule` border; work tabs use the solid style. Fix in `src/app/quiet-set.css` next to the existing `.runner-set-tab` rules.

**R19. Accessibility.** Remove `aria-label` from the timer `<strong>`; give the timer region `role="timer"` and keep the visible text. Remove `aria-live="off"`. Remove the duplicate `Workout outline` `<h2>` inside `<details>` (the summary already names it). Keep one skip link per page (remove the runner's own). Replace internal kind text such as `weight reps · preserve targets` with `Weight and reps`, `Reps`, `Time`, or `Distance and time`.

**Offline and sign-in states.** Offline heading `You're offline`, text `Sets are saved on this device and will sync when you reconnect.` Re-auth text `Sign in again to keep syncing. Your sets are safe on this device.`, button `Sign in again`. Other announcements: `Retrying…`, `Updated from another tab.`, `Exercise done.`, `Skipped.`

**R3. Recovery screen** (`owned-workout-runner.tsx`). Loading: heading `Opening your workout…` only. Failure: heading `We couldn't open this workout`, text `Your logged sets are still on this device.`, buttons `Try again` (existing retry), `Use the version saved to your account` (opens a `<dialog>`: heading `Use the saved version?`, text `Changes that only exist on this device will be removed.`, buttons `Use saved version` and `Cancel`; confirm deletes this session's record through the existing runner-storage delete function for `(ownerUid, sessionId)` and reloads), and link `Back to Today` (`/app`).

**R20. Finished workouts.** In `src/app/workout/[sessionId]/page.tsx` and its fixture mirror: when the session exists but is completed or abandoned, `redirect(`/app/history/${sessionId}`)` instead of `notFound()`. Use the repository's existing session status read; do not add a query if one exists.

**Route files.** `loading.tsx`: heading `Opening your workout…`, no paragraph. `error.tsx`: heading `This workout didn't load`, text `Your logged sets are safe on this device.`, button `Try again`. `page.tsx` verification text: `Verify your email, then sign in again to continue this workout.`

**Try one set** (`src/components/workout/try-one-set.tsx` or wherever `/try` renders):
- Banner: `Practice only. Nothing is saved.`
- Helper under the button: `Any number works. Nothing is saved.`
- `Reset practice` renders only after a value has been entered or logged.
- `Add 30 seconds` extends from `Math.max(Date.now(), deadline)`.
- End-of-practice call to action: `Set up my routine` (replaces `Save my routine`).

## 5. Phase C: routine management

Files: `src/components/program/{program-editor,program-editor-model,program-collection,program-collection-model,equipment-profile-control,onboarding-form}.tsx|ts`, `src/components/exercises/{movement-chooser,custom-exercise-editor}.tsx`, `src/app/app/program/**`, `src/app/app/programs/page.tsx`, `src/app/app/library/custom/**`, and fixture mirrors `tests/fixtures/authenticated-app/app/app/{program,programs,library/custom}/**`.

**Vocabulary.** The member-facing noun is **routine** everywhere in these files. Required replacements:

| Old | New |
|---|---|
| `Your routes` (page title and h1) | `Your routines` |
| `Owned programs`, `Owned program`, `Current revision` row | remove |
| `Programs` (collection h2) | `Saved routines` |
| `Create a program` | `New routine` |
| `Program name` | `Routine name` |
| `Edit active` | `Edit routine` |
| `Active overview` | `Back to Today` |
| `Clone` | `Duplicate` |
| `Manage routines` (editor link) | `All routines` |
| day page back link `Program` | `Today` (it goes to `/app`) |

**E1. Custom starting point.** `src/app/app/programs/page.tsx` (and fixture mirror) must pass every catalog movement compatible with each equipment profile, not the active routine's prescriptions. Read catalog rows with database IDs through the same repository read that backs `/api/app/movement-chooser` (find it from `src/app/api/app/movement-chooser/route.ts`); pass `{ id, name, requiredEquipment }` sorted by name. `program-collection.tsx` filters that list by the selected equipment profile (the existing `requiredEquipment` check). The `First movement` control stays a `<select>` with that label.

**E8. Explicit switch.** Create buttons read `Create and use this routine`. Under them: `It replaces ${activeName} on Today.` Duplicate buttons read `Duplicate`; after success show `Copy created. It's now your active routine.`

**Collection copy.** Intro: `The active routine is the one you train from on Today.` Starting points: `Five-day example` / `Five ready-made days.`; `Custom starting point` / `Start with one day and build from there.`

**E2. Discard changes** (`program-editor.tsx`). When `dirty`, render a secondary button `Discard changes` in the footer next to `Save routine`. It opens a `<dialog>` with `aria-labelledby` → `<h2>Discard your changes?</h2>`, text `Your routine goes back to the last saved version.`, buttons `Discard` and `Keep editing`. Discard resets the draft from the saved baseline, clears errors, pending measurement text, undo, and the dirty flag, closes the dialog, and announces `Changes discarded.` The button disappears when not dirty.

**E3. Readable errors.** Replace the ``${issue.path.join(" → ")}: ${issue.message}`` mapping with `formatProgramDraftIssue(publishableDraft, issue, exerciseNames)`, where `exerciseNames` maps catalog and custom IDs to names from the editor's candidates. Render errors as a list under the heading `Fix these before saving`. For each issue whose path reaches a prescription field, set `aria-invalid="true"` and `aria-describedby` (pointing to the list item's id) on that input. For the range issue (path ends at the prescription, message `Set a low-to-high range for reps or time.`), mark both the min and max inputs. Clear an input's error when that input changes. Status text: `Check the highlighted fields.` Keep the input labels `Sets`, `Minimum reps`, `Maximum reps`, `Minimum seconds`, `Maximum seconds` unchanged.

**E9. Conflicts.** Replace `reload before publishing again`, `Return to Your routes`, and `The stored publication was reconciled…` with text `This routine changed somewhere else. Reload to get the latest version. Your unsaved edits will be lost.`, a button `Reload latest` (`window.location.reload()` after the existing leave-guard confirm), and a link `All routines` → `/app/programs`.

**E10. Equipment deep link.** On mount and on `hashchange`, if `location.hash === "#program-editor-equipment-title"`, set `open` on the `<details>` that contains that heading and scroll it into view.

**E11. Add day.** Render the add-day form in a `<dialog>` (heading `New day`, field `Day name`, buttons `Choose first movement` and `Cancel`). If the chooser is dismissed, reopen this dialog with the typed name preserved. Delete the text `Choosing a movement next creates one new day with fresh topology keys. Cardio is optional.` and the eyebrow `New unpublished day`.

**E12. Cardio targets.** Editor cardio `Duration seconds` becomes a text input labeled `Duration` with mm:ss handling (`parseClockDuration`/`formatClockDuration`). Pace labels become `Pace (min/km)` / `Pace (min/mi)` with mm:ss handling. Distance input `step="0.01"`. Update `programEditorUnitLabels` pace values to `min / km` and `min / mile`. Storage stays seconds and meters.

**E13. Row actions.** For each day row, section, and movement: keep `Replace` visible (movements only). Move `Up`, `Down`, `Duplicate` (days), and `Remove` into a native `<details className="row-menu">` with `<summary aria-label="More actions for ${name}">More</summary>`. Keep existing accessible button names (`Remove ${name}` etc.) so dialogs and tests still find them. Add `role="group"` wherever a `div` carries `aria-label`.

**Editor copy.**

| Old | New |
|---|---|
| `Day duplicated with independent topology keys. The duplicate is still unpublished.` | `Day duplicated.` |
| `Equipment revision N is now the clean editor baseline…` | `Equipment updated. Past workouts are unchanged.` |
| `…section added as an empty unpublished draft…` | `Section added. Add a movement to it.` |
| `This section is empty. Add a movement before publishing…` | `Empty section: add a movement or remove it.` |
| `Sets, rest, and notes were retained; the range and incompatible targets were reset.` | `${name} swapped in. Check its targets.` |
| `Removing this movement omits it from the next publication. Earlier revisions and workout snapshots remain unchanged.` and similar day/section text | `Past workouts won't change.` |
| dialog eyebrow `Review unpublished changes` | remove |
| `…before publishing permanent changes. You can still inspect this draft.` | `Verify your email to save changes.` |
| `The draft has validation errors and was not sent.` / `…exercise selection errors…` | `Check the highlighted fields.` |

Keep only one save-state indicator (the `.quiet-save-state` element with `Saved` / `Unsaved changes` / `Saving…`) and one polite live region.

**Equipment control copy** (`equipment-profile-control.tsx`): `Editor settings` → `Equipment`; `No canonical movement substitutions are required.` → `No movements need to change.`; `Sets, range, rest, position, and notes stay. Movement-specific targets clear.` → `Sets, reps, rest and notes carry over.`; `This preview uses published revision N…` → `Save or discard your routine edits first.`; `Saved revision N…` → `Equipment updated.`; `The server response could not be reconciled. Reload before retrying this equipment change.` → `Something went wrong. Reload the page and try again.`

**E4. Chooser on phones** (`movement-chooser.tsx`). Below 48rem width, when a result is selected, show a bar fixed to the bottom of the chooser dialog: `<button className="primary-action">Use ${name}</button>` (same handler as the detail pane's use button). Copy: `Compatible canonical movements and only your private movements.` → `Movements that fit your equipment.`; badge `Canonical` → `Library`; `The workout will use its reviewed demonstration pair.` → `Includes demo videos.`; `The earlier guidance save is already stored.` → `Links saved.` Move `aria-live` from the whole detail pane to a visually hidden element that announces `${name} selected.` **E16:** when a guidance save fails, keep the create form open and show the error inside it.

**E14. Custom movements.** `custom-exercise-editor.tsx`: add the same leave guard the routine editor uses (`beforeunload` plus in-app link confirm) while dirty. When the movement is referenced, disable the logging select and show `Can't be changed once it's in a routine or workout.` Copy: delete `Choose one durable logging meaning…`; links help → `Optional. Up to two YouTube links.`; deletion help → `You can delete this once no routine or workout uses it.`; `The earlier save is already stored.` → `Saved.`; `Deletion is refused while any program, workout snapshot, record, or progress summary still references it.` → `You can delete this once no routine or workout uses it.`
Custom list page: intro `Only you can see these.`; empty heading `No custom movements yet`; empty text `Add one when the library doesn't have what you need.`; link `Browse the library` → `/app/library`.

**E15. Onboarding** (`onboarding-form.tsx`). Keep `Step N of 3 · …` and all labels. Replace each `<legend>` with an `<h2 tabIndex={-1}>` (ref) and give the fieldset `aria-labelledby`. Headings exactly: `Where would you like to start?`, `Your preferences`, `Equipment`. After Back or Continue changes the step, focus the new step's heading (in an effect keyed on `step`, not on first mount). Time zone becomes a `<select id="onboarding-timezone">` of `timeZoneOptions(timezone)`, defaulting to `Intl.DateTimeFormat().resolvedOptions().timeZone`, and moves out of the `<details>` (rename the details summary to `Motion`). When more than 12 first-movement results exist, show `Showing 12 of ${n}. Keep typing to narrow it down.` Headings use sentence case (remove any uppercase transform on these headings in CSS).

**Member day page** (`src/app/app/program/[day]/page.tsx` and fixture mirror): catch `RepositoryNotFoundError` → `redirect("/app")`; remove `revision N` text; `Configured finish` → `Cardio finish`; delete `The server snapshots this exact revision…`; guide links → `/app/library/${slug}`.

**Titles.** `export const metadata = { title: "…" }` in: `/app/program/edit` → `Routine`; `/app/programs` → `Your routines`; `/app/library/custom` → `Custom movements`; `/app/library/custom/new` → `New movement`. `generateMetadata` in `/app/program/[day]` → `${dayName}` and `/app/library/custom/[id]` → movement name (fall back to `Routine` / `Custom movement`). Mirror each in the fixture page.

**Dead code.** Delete the unused `MovementChooser` alias export, unused exports `PROGRAM_CARDIO_MODES`/`PROGRAM_SECTION_MAXIMUM` only if still unused after this phase (otherwise use them in place of hard-coded `["walker","runner"]`, `12`, `14`), and create `src/components/exercises/labels.ts` exporting `EQUIPMENT_LABELS` and `LOGGING_KIND_LABELS` (`weight_reps: "Weight and reps"`, `bodyweight_reps: "Reps"`, `duration: "Time"`, `distance_duration: "Distance and time"`) used by the chooser, custom editor, and library pages instead of `replaceAll("_", " ")` or local copies.

## 6. Phase D: member shell and account

Files: `src/app/app/{layout,page,loading,error,not-found}.tsx`, `src/app/app/[...missing]/page.tsx` (new), `src/app/app/{settings,progress,prs,history}/**`, `src/app/app/library/page.tsx`, `src/components/layout/{authenticated-shell,authenticated-nav,authenticated-session-sign-out}.tsx`, `src/components/settings/**`, `src/components/insights/**`, `src/components/program/member-program-home.tsx`, `src/components/ui/companion-preference.tsx`, `src/client/session-sign-out.ts`, `src/proxy.ts`, and fixture mirrors under `tests/fixtures/authenticated-app/app/`.

**Titles (A5).** Fixture root layout `tests/fixtures/authenticated-app/app/layout.tsx`: `title: { default: "My Workout Pal", template: "%s · My Workout Pal" }` (the harness banner stays). Add `metadata` titles: `/app` → `Today`; `/app/settings` → `Settings`; `/app/progress` → `Progress`; `/app/prs` → `Personal records`; `/app/history` → `History`; `/app/library` → `Library`; `generateMetadata` for `/app/history/[sessionId]` → `${dayName} workout` (fallback `Workout`). Mirror each in fixture pages.

**Not found (A7).** New `src/app/app/not-found.tsx`: `<section className="member-empty">` with `<h1>Page not found</h1>`, `<p>We couldn't find that page.</p>`, `<Link className="primary-action" href="/app">Back to Today</Link>`. New `src/app/app/[...missing]/page.tsx` that calls `notFound()`. Fixture: add the same `not-found.tsx` at `tests/fixtures/authenticated-app/app/app/not-found.tsx` and change `tests/fixtures/authenticated-app/app/app/[...path]/page.tsx` to call `notFound()`.

**Loading and error.** `src/app/app/loading.tsx`: `<p role="status">Loading…</p>` inside the existing wrapper, nothing else. `src/app/app/error.tsx`: `<h1>This page didn't load</h1>`, `<p>Nothing was changed.</p>`, button `Try again` that calls `reset()` only. Mirror in fixture `loading.tsx`/`error.tsx`.

**A2. Settings before setup.** `src/app/app/settings/page.tsx` and fixture mirror: never redirect for a missing routine or missing profile. Pass `activeProgram: null`, `initialPreferences: null`, `equipmentProfileKind: null` when absent; `ownerUid` comes from the viewer. `SettingsForm` changes:
- Section order: `Units and time zone` (card), `Characters` (card, contains `CompanionPreference`), `Equipment` (card; render only when a routine exists), `Account` (card).
- Preferences with no saved preferences: render the controls disabled and the text `Set up your routine to choose units and time zone.`; hide `Save preferences`.
- Time zone is a `<select id="settings-timezone">` of `timeZoneOptions(saved)`. Label `Time zone`. Delete the examples text.
- Motion checkbox label `Reduce interface motion`, help text `Turns off animations and smooth scrolling.`
- Save success status text exactly `Saved.`; in progress `Saving…`.
- Equipment card heading `Equipment`; when the `EquipmentProfileControl` renders, its heading is also `Equipment` (no second heading).
- Account card: heading `Account`; delete the settings `Sign out` button and its paragraph (the header keeps sign-out); deletion block title `Delete account`, text `Permanently deletes your account, routines, workout history and records. This can't be undone.`, button `Delete my account` (opens the existing dialog). If deletion is unavailable (no Firebase config or unsupported provider) show `Account deletion is unavailable right now.` and keep the button visible but disabled.
- Deletion dialog: remove eyebrow `Permanent account action`; heading `Delete your account?`; body `You'll confirm your sign-in, then everything is deleted.`; confirm button `Delete everything`; progress texts `Confirming your sign-in…`, `Deleting…`, `Finishing…`; identity errors `Please sign in again, then retry.`
- `firebase-client-identity-status.tsx`: checking → `Checking…`; ready → render nothing; not found or mismatch → `Please sign in again to delete your account.`; load failure → `Something went wrong. Try again.`; retry button `Try again`.
- Use normal field label styling (sentence case, body font) for every label on the page; remove uppercase serif treatments for `.member-settings label` and `.danger-action`.

**A3. Motion preference.** `src/app/app/layout.tsx`: after resolving the viewer, read the viewer's saved `reducedMotion` (reuse the preferences read inside `getViewerProfileProgram`; treat `RepositoryNotFoundError` as `false`). Pass `reducedMotion` to `AuthenticatedShell`, which sets `data-reduced-motion="true"` on its root element only when true (omit the attribute otherwise). Add the class `authenticated-shell-root` to the shell's root element. After every successful preferences save, `SettingsForm` sets `data-reduced-motion="true"` on `document.querySelector(".authenticated-shell-root")` when the saved value is true and removes the attribute when it is false. CSS: `[data-reduced-motion="true"] *, [data-reduced-motion="true"] *::before, [data-reduced-motion="true"] *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; }`. Fixture layout mirror: read preferences from the harness database the same way the fixture settings page does and pass the flag.

**A8. Return after sign-in.** In `src/proxy.ts`, for requests whose pathname is `/app` or starts with `/app/`, set request header `x-mwp-pathname` to `pathname + search` (use `NextResponse.next({ request: { headers } })` while keeping every existing security header and CSP behavior). In `src/app/app/layout.tsx`, replace `redirect("/sign-in?returnTo=%2Fapp")` with `redirect(signInRedirectPath((await headers()).get("x-mwp-pathname")))`.

**A1. Verification resend.** In `authenticated-shell.tsx`, the unverified banner reads `Verify your email to save changes.` and has a button `Resend verification email`. On click: get the Firebase client auth (existing client helpers in `src/client/firebase*`); if `auth.currentUser` matches the viewer UID call `sendEmailVerification(auth.currentUser)` and show `Email sent. Check your inbox, then sign out and sign in again.`; if no matching user, show `Sign in again to resend the email.`; on error, `Couldn't send the email. Try again later.` Disable the button while sending and for 60 seconds after success. If Firebase config is absent (fixture), render the button disabled.

**A9. Safe sign-out.** Before `performSessionSignOut` clears local data, read this owner's runner records with the existing runner-storage read functions (do not change `runner-storage.ts`). If any record has an unfinished session with operations not `saved`/`superseded` or dirty drafts, `window.confirm("You have a workout in progress on this device. Signing out removes it from this device. Sign out anyway?")`; cancel aborts. Sign-out texts: `Signing out…`; failure `Couldn't sign out. Try again.` Use a distinct `sign-out` icon (add it to `src/components/ui/icon.tsx`: a door-with-arrow path in the existing 24×24 stroke style).

**Navigation.** `authenticated-nav.tsx`: `Routine` is current for `/app/program/*` and `/app/programs`.

**Today** (`member-program-home.tsx`, `src/app/app/page.tsx`): remove the `CompanionPreference` block (it lives in Settings); remove the `Current route` eyebrow; delete the unreachable `completedSessions === 0` branch and the redundant `useState(initialProgram)`. The day list below the start card gets the heading `All days`; each row shows the day name and `${n} movements` and links to the day page (delete the per-row `Open ${day} to start` text).

**Library index** (`src/app/app/library/page.tsx`): links go to `/app/library/${slug}` (no query string). Copy: remove eyebrow `Your compatible field guide`; `Owner-only` → `Yours`; remove `Canonical` badge; empty search `No matches. Try a different search.`; remove `Incompatible exercises remain in the catalog and nothing was deleted.` Add `role="search"` to the search form. The member library heading stays `Exercise library`.

**Insights copy.** History: remove eyebrow `Immutable training archive`; intro `Every workout you've finished or stopped.`; timezone line `Times shown in ${tz}.`; empty text `Finished workouts will show up here.` History detail: delete `Read-only snapshot…`. Progress: empty text `Finish a workout to see your progress.`; remove eyebrow `Daily series`. Records: remove `Persisted milestones`; intro `Your best lifts, reps and times.`; empty `No records yet` / `Log a few workouts and your bests will show up here.`; ties `Tied best (${n} times)`.

**Companion copy** (`companion-preference.tsx`): section heading `Characters`, help `Pick who greets you on Today, or turn the characters off. Saved on this device.`

## 7. Phase E: public pages

Every public route (`/`, `/try`, `/program`, `/program/[day]`, `/library`, `/library/[slug]`, `/progress`, `/sample-workout`, `/sign-in`, `/offline`, and the root not-found page) renders inside `PublicShell`, so the `Primary` navigation is present on each.

Files: `src/app/{page,layout,not-found,error,global-error,loading}.tsx`, `src/app/offline/page.tsx`, `src/app/program/**`, `src/components/program/program-explorer.tsx` (replace), `src/app/library/**`, `src/app/app/library/[slug]/page.tsx` (new) and fixture mirror, `src/app/progress/page.tsx`, `src/app/sample-workout/page.tsx`, `src/app/sign-in/page.tsx`, `src/components/layout/public-shell.tsx`, `src/components/auth/auth-panel.tsx`, `src/components/video/{curated-video-player,exercise-video-field}.tsx`.

**P10. Root layout.** Delete `designContract` and the `<template>`. Keep metadata; the template `%s · My Workout Pal` stays. Also delete the three unused `@fontsource/barlow-condensed` imports only if `--font-display` is unused after Phase G; otherwise leave them.

**Public navigation (`public-shell.tsx`).** Items exactly, in order: `{ id: "program", href: "/program", label: "Example", icon: "map" }`, `{ id: "library", href: "/library", label: "Library", icon: "library" }`, `{ id: "progress", href: "/progress", label: "Progress", icon: "sample" }`, `{ id: "account", href: "/sign-in", label: "Sign in", icon: "sign-in" }`. `current` accepts `null` for pages with no current item. Desktop: a light header bar matching the member header (cream background, forest text, active item as the forest pill used by `.member-nav [aria-current="page"]`), not the dark block. Phone: the fixed bottom bar keeps four equal columns; labels never wrap (`white-space: nowrap`). Brand subtitle stays.

**Example routine (`/program`).** Replace `ProgramExplorer`'s atlas UI entirely. Render inside `PublicShell current="program"`:
- `export const metadata = { title: "Five-day example routine" }` in `src/app/program/page.tsx` (the acceptance test reads this file).
- `<h1>Five-day example routine</h1>`, intro `Strength, core, and an optional cardio finish across five days. Change anything once it's yours.`
- Equipment segmented control (two links with `aria-current` on the active one, keeping the existing `?equipment=` query): `Dumbbells`, `Barbell + rack`, and under it the profile description.
- A grid of five day cards (`<ol>`; two columns at ≥48rem, three at ≥72rem). Each card is one link to `/program/${day}${equipmentQuery}` containing: `Day ${n}` small label, `<h2>` day name, `${count} movements · cardio finish`, and the first three movement names as a list.
- Below the grid: primary link `Try one set` → `/try` and secondary link `Sign in to save your own version` → `/sign-in`.
- Where substitutions apply for the selected equipment, show one line per substituted movement on the card: `${original} → ${replacement}` is not allowed (no arrows); write `${replacement} replaces ${original}`.
- Delete the classes and CSS for `.route-map`, `.route-lines`, `.route-path`, `.map-legend`, `.atlas-grid`, `.guest-map-stamp`, `.equipment-stamp`, `.route-sheet`, `.selected-number`, `.route-heading`, `.alternate-*`, `.route-swatch`, `.movement-preview`, `.remaining-movements`, `.temporary-note` once unreferenced.

**Example day (`/program/[day]`).** Render inside `PublicShell current="program"`:
- Back link `Example routine` → `/program` (keep the equipment query).
- `<h1>${Day} day</h1>` (for example `Push day`), intro `${count} movements with a walker or runner finish.`
- Sections as `<h2>` (`Strength`, `Accessory`, `Core`) with rows linking to `/library/${slug}` showing name and `${sets} × ${reps} · ${rest}s rest`.
- `<h2>Cardio finish</h2>` with the two options and `Edit cardio targets once you save a routine.`
- Link `See an example finished workout` → `/sample-workout`.
- Remove `Starter preview · not saved`, `Example route`, and all uppercase serif labels.

**Library (`/library`).** Heading block uses the shared page gutter (no element touches the viewport edge; content inset ≥16px on phones, matching member pages on desktop). Copy: remove eyebrow `Canonical field guide` and badge `Guest browsing · not saved`; intro `Find a movement and see how to do it.`; profile line `Showing movements for ${label}.`; empty text `Try a different name or switch equipment.` Search form gets `role="search"`; the equipment links wrapper gets `role="group"`. Results: `<ul className="library-grid">` of compact cards (name + `${role} · ${equipment}`), one column on phones, two at ≥48rem, three at ≥72rem. Remove the `01`, `02` counters.

**Guide (`/library/[slug]`) and member guide (`/app/library/[slug]`).** Extract the body into `src/components/exercises/exercise-guide.tsx` (`ExerciseGuide({ exercise, profileLabel, backHref, backLabel })`). Structure, in DOM order:
1. Back link (`Exercise library` → public list with the equipment query; member: `Library` → `/app/library`).
2. `<h1>` movement name, then `Works with ${profileLabel}` when compatible (guests: the profile from the query, default Dumbbells; members: their equipment profile) or `Needs ${missing}` when not.
3. `<h2>Demo</h2>` then the video player (tab buttons at normal button height, not tall boxes) or the fallback `No video yet. Follow the steps below.`
4. `<h2>How to do it</h2>` with the cue list.
5. `<h2>Details</h2>` with a `<dl>`: `Default` (`${sets} work sets · ${reps} reps · ${rest}s rest`), `Tracks` (logging label from `LOGGING_KIND_LABELS`), `Equipment`, `Main muscles`.
6. One line: `Pick a weight and range you can control.`

Delete the dark `Field notes` sidebar and uppercase serif labels. In `curated-video-player.tsx` delete the `Report a problem` link (keep `Open on YouTube`). The member page (`src/app/app/library/[slug]/page.tsx`) loads the viewer's equipment profile the way `src/app/app/library/page.tsx` does, calls `notFound()` for unknown slugs, and exports `generateMetadata` → movement name. Fixture mirror: `tests/fixtures/authenticated-app/app/app/library/[slug]/page.tsx` using the harness database like the fixture library page.

**Progress preview (`/progress`).** Gutter as above. `<h1>Progress</h1>`, badge text exactly `Example data`, intro `An example of what Progress shows after a few workouts.` Delete `Immutable snapshots`, `Signed-in analytics are derived only…`, `Practice without persistence`. Closing band: heading `Track your own`, text `Sign in to see your real sets, reps and records.`, link `Sign in` → `/sign-in`. Replace uppercase serif labels with the member Progress styles.

**Example workout (`/sample-workout`).** `metadata.title` and `<h1>`: `Example workout`. Intro `An example of a finished workout. Nothing here is saved.` Back link `Push day` stays. Side panel heading `During a real workout` with items: `Saving` / `Each set shows when it's saved.`; `Interruptions` / `Close the app mid-workout and pick up where you left off.`; `Your targets` / `Review your last session and set your own targets.` Delete the `Rest` item. Headings `Read-only practice snapshot`, `Exercise snapshots`, `Cardio snapshot` → `Finished sets`, `Movements`, `Cardio`. Replace `READ ONLY`, `SAMPLE COMPLETE`, `TECHNIQUE`, `WARM-UP`, `WORK 1` uppercase serif labels with sentence-case body text (`Technique`, `Warm-up`, `Set 1`). Button `Sign in to start` → `/sign-in`.

**Sign-in (`/sign-in`) and `auth-panel.tsx`.** `<h1>Sign in to save your workouts</h1>`, intro `Keep your routine, history and records on any device.` Bullets: `A routine that fits your equipment`, `Pick up where you left off`, `Your own custom movements`. Unavailable state: heading `Sign-in is unavailable`, text `Please try again later.` (delete `Credential gate` and the Firebase paragraphs). Secondary link `Explore the example routine` → `/program`. Auth panel: delete the `Firebase session` label and the `Password accounts must verify email…HTTP-only…` paragraph; `Recovery` → `Forgot password?`; `Send recovery` → `Send reset link`; reset result `If that email has an account, we've sent a reset link.`; success `Signed in.`; after sign-up `Account created. Check your inbox to verify your email.`

**Landing (`/`).** `Create my routine` becomes a `secondary-action` link (same destination). If `searchParams.account === "deleted"`, render at the top of main `<p className="member-inline-notice" role="status">Your account and workout data were deleted.</p>`.

**Recovery pages.**
- `src/app/not-found.tsx`: inside `PublicShell current={null}`: `<h1>Page not found</h1>`, `<p>We couldn't find that page.</p>`, `<Link className="primary-action" href="/">Go home</Link>`. The response status stays 404.
- `src/app/error.tsx`: `<h1>Something went wrong</h1>`, `<p>This page didn't load.</p>`, button `Try again` (`reset()`).
- `src/app/global-error.tsx`: import `./globals.css` and `./quiet-set.css`; `<h1>Something went wrong</h1>`, button `Reload` (`window.location.reload()`).
- Root `loading.tsx` (if present): `Loading…`.
- `src/app/offline/page.tsx`: `PublicShell current={null}`; `<h1>You're offline</h1>`; `<p>Pages you've opened before still work. Changes save when you reconnect.</p>`; link `Go home` → `/`.
- PWA notices in `src/components/pwa/pwa-registration.tsx`: offline `You're offline. Changes will save when you reconnect.`; update `A new version is ready.`; install `Add My Workout Pal to your home screen for quick access.`

## 8. Phase F–G: copy sweep and styles

### 8.1 Copy sweep

Run the copy acceptance test. It lists every remaining user-facing string with implementation vocabulary as `file: text`. Rewrite each with the `AGENTS.md` copy rules. Do not rename identifiers, CSS classes, or API fields to satisfy it; the scanner ignores them. Error strings passed to `new Error(...)` or `console.*` are ignored; if such a string is later shown to users, map it to plain copy at the display site.

### 8.2 Copy that must not change

`Log set & rest`, `Start workout`, `Save routine`, `Try one set`, `Step N of 3 · …`, `Display units`, `Weight (lb)`/`Weight (kg)`, `Repetitions`, `Sets`, `Minimum reps`, `Maximum reps`, `Watch demo and technique guidance`, `Workout outline`, navigation labels `Today`, `Routine`, `Library`, `Progress`, `Settings`, and the member library heading `Exercise library`.

### 8.3 Styles (Phase G)

Only these style changes:
1. Delete every selector that became unreferenced through this plan. Verify each with `rg -n "<class-name>" src tests/fixtures` before deleting.
2. Add styles for new elements next to related rules: `.runner-field-error`, `.runner-more`, runner dialogs (reuse `.account-delete-dialog` look), `.row-menu`, `.library-grid`, `.program-day-grid`, `.exercise-guide`, the chooser bottom bar, and `[data-reduced-motion="true"]`.
3. Warm-up tab style (R15) and sentence-case headings/labels (Settings, onboarding, public pages).
4. Page gutter: public page headers use the same inline padding as member pages (`padding-inline: max(1rem, env(safe-area-inset-left))` on phones; existing member max-width container on desktop).
Do not reorganize, rename, or reformat unrelated rules.

## 9. Phase H: verification, evidence, docs

1. Run the win-condition commands in section 1 in order. Fix and re-run until all pass.
2. Evidence: start `pnpm dev` (public) and the authenticated fixture (`node scripts/test-e2e-authenticated.mjs` builds it; or reuse the fixture server the Playwright config starts) and capture these PNGs at 390×844 and 1440×1000 into `docs/qa/latest/production-grade/`: `landing`, `program`, `program-push`, `library`, `library-push-up`, `progress`, `sign-in`, `not-found`, `member-today`, `member-onboarding-step2`, `member-settings-presetup`, `member-routine-editor-errors`, `member-routines`, `member-library-guide`, `runner-set-entry`, `runner-end-dialog`. Name files `${name}-phone.png` and `${name}-desktop.png`. Use synthetic fixture data only.
3. Write `docs/qa/latest/PRODUCTION-GRADE-QA.md`: date, commit SHA, each command with pass counts copied from its output, the screenshot list, and known limits. Delete `docs/qa/latest/MEMBER-ATMOSPHERE-QA.md`, its HTML twin, and `docs/qa/latest/member-atmosphere/` (superseded; history stays in Git).
4. Update `docs/context/STATUS.md` with a new top section "Production-grade audit implementation: <date>" (4–6 sentences: what changed, verification result, branch/PR, not deployed). Append a status line to `docs/plans/PRODUCTION-GRADE-AUDIT.md`: `Implemented on branch vishal/production-grade-audit; see docs/qa/latest/PRODUCTION-GRADE-QA.md.`
5. `pnpm docs:build`, then `pnpm docs:check`.
6. `git checkout next-env.d.ts`, commit on `vishal/production-grade-audit` in logical commits (domain, runner, routine, member shell, public, copy/styles, docs), push the branch, and open a pull request to `main` titled `Production-grade audit fixes`. Do **not** merge, deploy, or delete branches; the owner reviews first.

## 10. Final report

Deliver, in this order:
1. Win conditions W1–W7 with the exact final pass/fail lines from each command.
2. Items from sections 3–7 not implemented, each with the reason (should be empty).
3. Every edit to a pre-existing test (`file:line old → new`).
4. "Noticed, not changed": anything outside the plan.
5. PR URL.

## 11. Out of scope

Routine delete/rename API, library category filters, companion artwork, video curation, schema or migration changes, `viewer.ts` display-name fallback, deployment, and any dependency change.
