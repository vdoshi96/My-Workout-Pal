# Workout runner component plan

The workout runner is the client boundary between an immutable workout snapshot
and the interaction state that a user creates during a session. This plan
defines the reusable component contract before an authenticated route or
server repository exists.

## User outcome and navigation

The user can open a session, identify the exact program revision and day
snapshot, log the active set, review previous values and targets, record notes,
complete or skip each exercise, choose a compatible replacement, log walker or
runner cardio, and finish or abandon the session. The runner owns compact
navigation while it is active. An exit callback can return the user to the
preceding route only after the navigation-protection contract permits it.

The phone layout presents the current exercise and set first, followed by the
rest timer, save status, exercise list, notes, and session actions. Tablet and
desktop layouts add an outline beside the active entry without changing DOM or
reading order.

## Component boundary

`WorkoutRunner` is a Client Component. It receives a validated
`WorkoutSnapshot` or an initialized `ActiveWorkoutState`, and it keeps the
server submitter, local storage adapter, and account identity outside the
component. The component never accepts a client-entered UID. The parent
provides the verified owner-scoped snapshot and injects:

- `RunnerStorage` for local persistence and resume.
- `RunnerSubmitter` for server submission and idempotent reconciliation.
- An optional `getConnectivity` reader for deterministic browser/test
  connectivity initialization. Without it, the component reads
  `navigator.onLine` and listens for `online` and `offline` events.
- An optional compatible-substitution provider that returns candidates for the
  active exercise. The component passes the chosen candidate to the reducer;
  it does not invent compatibility or reinterpret targets.
- An optional navigation callback and a navigation-protection hook. The hook
  receives the current `ActiveWorkoutState` and exposes the reducer’s truthful
  `isNavigationBlocked` and `navigationProtectionReason` result to the host
  route.

The component dispatches `runnerReducer` actions, persists before sync, and
uses `syncRunnerOperations` only through the injected adapters. One persistence
queue serializes the local write and submit cycle for each state revision. A
newer revision cancels stale React results; an already-started injected submit
is allowed to settle, but cannot replace newer local truth. It does not create
a persistence schema, call a route directly, or render a fabricated success
page.

The `unitSystem` prop accepts `metric` or `imperial` and defaults to `metric`.
The reducer always stores kilograms, meters, and seconds. The component
converts weight to kilograms, distance to meters, and pace to seconds per
kilometer when the user edits imperial fields, and labels displayed pounds,
miles, and per-mile pace explicitly.

## Snapshot and interaction states

Render the following state groups with text labels, not color alone:

- Snapshot identity: session ID, day name, day ID, and immutable program
  revision ID.
- Exercise progress: current position, warm-up or work phase, logged,
  skipped, substituted, and completed state.
- Set values: previous measurement, target range or duration, and a controlled
  editor for `weight_reps`, `bodyweight_reps`, `duration`, and
  `distance_duration`.
- Cardio: walker or runner selection, duration, distance, pace, incline, and
  notes, with derived pace shown as derived.
- Save truth: idle, pending, saved, failed, offline, authentication expired,
  and conflict. Duplicate server submissions resolve to the saved state.
- Recovery: retry only retryable failures, reauthentication guidance for an
  expired session, conflict guidance that does not overwrite a local draft,
  and a visible pending or offline explanation.
- Rest: idle, running, paused, and complete, with pause, resume, and clear
  actions. Announce only meaningful timer transitions and completion.
- Session: completing, completed, abandoning, abandoned, and blocked
  completion. Completion remains unavailable until required work sets, cardio,
  notes, and operations satisfy the domain rules.

## Data and persistence invariants

The component treats the snapshot as immutable. It displays canonical values
in kilograms, meters, and seconds and performs presentation formatting only at
the boundary. Warm-up measurements keep their `isWarmup` marker and never
become work-set progression input. Every reducer operation carries an
idempotency key and source revision. Local drafts remain recoverable when a
submit fails, the browser goes offline, or authentication expires.

The injected storage adapter persists the state before submission. A submitter
result of `saved` or `duplicate` marks the operation saved. Offline and
authentication-expired results leave the operation pending and expose the
corresponding status. Failed and conflict results retain the operation and
local input for retry or resolution. The component never reports a pending or
offline operation as server-saved.

Restore is gated by owner-plus-session identity (and snapshot revision/day
validation) every time the active snapshot changes. A fresh identity cannot
persist its initial state while an earlier restore is in flight. A later
successful storage cycle clears an adapter failure banner so an earlier
storage error cannot remain falsely visible.

## Exercise and session actions

The active exercise exposes the following actions:

- Save the current set after kind-specific validation.
- Start the target rest interval, pause, resume, or clear it.
- Save a per-exercise note without losing text during another operation.
- Skip the exercise with an optional reason.
- Request compatible substitutions through the injected callback and confirm
  one candidate with matching `loggingKind`.
- Complete the exercise after every work set is logged.

The session exposes **Complete workout** and **Abandon workout** actions. Both
show the resulting pending, saved, failed, or conflict state in the runner.
The component does not navigate to a success route; the host decides where a
confirmed completion belongs.

## Failure recovery and navigation protection

When a save fails, keep its input visible and identify whether retry is
allowed. When the server reports a conflict, keep the local state and provide
a host-controlled resolution path. When authentication expires, stop sync and
tell the user to reauthenticate as the same account. When connectivity drops,
show offline queued state and resume sync after the host reports connectivity.

The component calls the optional navigation-protection hook whenever state
changes. The host can use the result with `beforeunload`, router interception,
or an in-app confirmation dialog. The protection reason must distinguish an
unsaved draft, pending save, failed save, conflict, or completion in progress.

## Responsive and accessible behavior

Use phone-first layout with a single active editing task and sticky progress or
save controls that remain above safe-area insets. Use a two-column outline and
active entry at tablet and desktop widths when both remain legible. Keep every
interactive target at least 44 CSS pixels high and preserve hardware keyboard
entry for numeric fields.

Use semantic headings, landmarks, form labels, fieldsets, legends, button
labels, status text, and `aria-current` or `aria-pressed` where applicable.
Keep validation messages adjacent to their fields. Use one polite live region
for controlled save and navigation announcements and a separate timer status
that announces start, pause, resume, and completion rather than every second.
Support keyboard-only operation, visible focus, 200% zoom, forced colors, and
`prefers-reduced-motion`. Reduced motion removes decorative transitions while
preserving state changes and focus behavior.

## Privacy and authorization

The parent must obtain the snapshot through an owner-scoped server read. The
component renders only the supplied snapshot and local state. It does not
accept a UID field, put private workout data in a public cache, or send notes
or measurements anywhere except the injected submitter. Sign-out and account
switching are host responsibilities; the host must unmount or clear the
private runner state before showing another identity.

## Acceptance criteria

- Snapshot identity remains visible while editing.
- Previous values and target text appear for every active set.
- Warm-up and work sets have distinct labels and preserve their domain phase.
- All four measurement kinds validate and render their appropriate fields.
- Walker and runner cardio expose duration, distance, pace, incline, and notes.
- Notes, skip, substitution, exercise completion, session completion, and
  abandonment dispatch typed reducer actions.
- Rest timer controls expose idle, running, paused, and complete states.
- Saved, pending, offline, authentication-expired, failed, conflict, retry,
  and duplicate-submit states remain truthful.
- Navigation protection reflects the domain helper without accepting a client
  ownership key.
- Phone, tablet, and desktop layouts preserve keyboard and screen-reader order.

## Tests and evidence

Add fail-first pure presentation-helper tests for target summaries,
measurement summaries, previous values, cardio summaries, save-status labels,
timer labels, and announcement throttling. Run the existing domain runner suite
with the helper suite. The component-boundary harness dispatches a real reducer
action, persists and syncs through injected adapters, renders metric and
imperial values, verifies canonical round-trip conversion, and defers an older
submit while a newer revision becomes authoritative. It also covers
owner-plus-session restoration identity. Record browser evidence later at the
runner route for phone, tablet, and desktop,
including keyboard entry, reduced motion, refresh resume, offline queue,
retry, conflict, authentication expiry, completion, and abandonment.

The focused presenter suite first failed because the new helper module did not
exist. It passed after the helper and component-boundary harness were added.
The focused run covers 40 tests across the domain runner, presenter helpers,
and injected persistence and sync harness.
