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
is allowed to settle, but cannot replace newer local truth. Effect cleanup may
stop UI adoption or a new remote sync, but never drops the latest local write;
the newest queued state is written even if the runner unmounts before its
queue turn. It does not create a persistence schema, call a route directly, or
render a fabricated success page.

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

## Authenticated route integration

### User outcome and navigation

The owned day page exposes **Start or resume workout** for an eligible member.
The client keeps one idempotency key across a failed retry, accepts only a
strict start response, and navigates to `/workout/[sessionId]`. That dynamic
route uses a minimal workout shell instead of the ordinary account navigation.
The runner returns to the account program on an allowed exit and navigates to
the immutable history detail only after completion or abandonment is confirmed
as saved by the server.

### UI states and failure recovery

The day control distinguishes ready, opening, retryable failure, verification
required, and successful navigation. The workout route distinguishes server
loading, local recovery, ready, reconciled pending work, conflict, blocked
storage, expired authentication, offline queue, completing, completed, and
abandoned states. A missing, foreign, malformed, or terminal session resolves
as unavailable without revealing ownership. An unexpected repository or
hydration failure reaches the private route error boundary and never renders a
fresh runner over uncertain persisted data.

The client host loads the owner-and-session IndexedDB record before it mounts
`WorkoutRunner`. If no record exists, it uses the server baseline. If a valid
record exists, it applies `reconcileWorkoutResumeState`. A corrupt, mismatched,
or unreadable record blocks the runner and offers retry or a safe return; it
does not overwrite the local record with the server baseline. Refresh, tab
close, connection loss, an interrupted response, and another-tab save preserve
the same reconciliation rules.

### Types, persistence, and authorization

The Server Component awaits and validates the `sessionId` route parameter,
derives the viewer from the revocation-aware HTTP-only session, loads the
session through `WorkoutRepository.loadResume`, and hydrates one serializable
`ActiveWorkoutState` from immutable rows. It also loads presentation units and
compatible canonical and owner-only custom substitution candidates on the
server. Candidate identities are durable database UUIDs; the client receives
no ownership selector and filters candidates by the snapshot logging kind.

The client host constructs `IndexedDBRunnerStorage` with the server-derived
owner namespace and injects `createWorkoutRunnerSubmitter` over the same-origin
CSRF client. Operations still contain a local owner identity for namespace and
integrity checks, but `runnerOperationRequest` removes it from transport. The
server derives ownership again and refuses client lifecycle or version fields.
Unverified password identities can read an existing snapshot but cannot mount
mutation controls. Public caches and the service worker must not store the
workout route, API responses, notes, measurements, or account identity.

### Responsive and accessible behavior

Phone keeps the route identity, save truth, active set, and primary action in a
single column above safe-area insets. Tablet and desktop use the runner's
two-column outline without changing DOM order. The loading and blocked-recovery
surfaces use semantic headings and `role="status"`; start errors remain adjacent
to the initiating control. Keyboard focus moves to the workout heading after
navigation, the runner protects `beforeunload` only for truthful unsaved state,
and reduced motion changes no recovery or focus behavior.

### Acceptance criteria, tests, and browser evidence

- A start request contains only program, day, and stable idempotency values and
  routes both a created and resumed response to the returned session.
- Malformed success responses, duplicate clicks, offline requests, unverified
  identities, and server failures never navigate or claim a saved workout.
- The route awaits dynamic parameters, hides foreign IDs as unavailable, and
  passes only a server-hydrated serializable state to the client boundary.
- Local recovery finishes before the runner can persist. Server-confirmed keys
  win, unresolved local work remains pending, and a mismatched record blocks
  without deletion or overwrite.
- The real IndexedDB adapter, private submitter, unit preference, compatible
  substitutions, navigation protection, and confirmed terminal callbacks are
  wired to the reusable runner.
- Fail-first unit tests cover the absent start contract, malformed start
  responses, stable retry identity, route-model construction, owner/session
  recovery, and blocked reconciliation. Existing repository, API, resume,
  storage, and component harness tests remain green.
- Playwright replays start, duplicate resume, refresh with no local draft,
  pending local recovery, interrupted response, another-tab progress, offline
  retry, expired auth, completion, abandonment, back, and tab-close behavior.
  Evidence covers Chromium and WebKit at phone, tablet, and desktop sizes with
  keyboard, automated accessibility, dark mode, and reduced motion.

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
submit while a newer revision becomes authoritative, then cancels the newest
handle to prove that its pending local state still wins. It also covers
owner-plus-session restoration identity and stable restore keys across
structurally identical snapshots. Record browser evidence later at the
runner route for phone, tablet, and desktop,
including keyboard entry, reduced motion, refresh resume, offline queue,
retry, conflict, authentication expiry, completion, and abandonment.

The focused presenter suite first failed because the new helper module did not
exist. It passed after the helper and component-boundary harness were added.
The focused run covers 40 tests across the domain runner, presenter helpers,
and injected persistence and sync harness.
