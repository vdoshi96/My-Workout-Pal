# Authenticated runner recovery harness plan

## User outcome

A verified member can start a real persisted workout from the selected program day, log canonical set and cardio data, survive a response interruption and full-page reload, finish the workout, and open the immutable result. The browser evidence must use the production runner, client adapters, IndexedDB storage, workout API parser, repository, migrations, and seed against the credential-free PGlite harness. It must not simulate saved activity in fixture-only state or imply that synthetic auth proves Firebase.

This checkpoint is the first bounded runner slice. It proves start/resume, an accepted operation whose response fails, server/device reconciliation, duplicate idempotency, terminal completion, and owner isolation. A later checkpoint extends the same boundary to offline events, expired authentication after page load, personal records, the full progress surface, substitution, and multi-tab conflicts.

## Navigation

1. Alice opens `/app`, chooses the dumbbells profile, and creates the real five-day starter program.
2. Alice opens Push at `/app/program/push` and selects **Start or resume workout**.
3. The production start controller posts the owner-free program/day envelope and navigates to `/workout/<opaque-session-id>`.
4. The fixture workout page loads Alice through the server-derived harness context, resolves the session through the owner-scoped repository, hydrates the immutable snapshot, and mounts `OwnedWorkoutRunner`.
5. Alice logs the first work set while a one-shot harness scenario lets the repository accept the operation but replaces the response with a truthful server error.
6. Alice reloads. Server-confirmed progress and the matching IndexedDB draft reconcile without duplicating the set or claiming that unrelated work was saved.
7. Alice completes the remaining required movement decisions and cardio, completes the session, and follows the production terminal navigation to `/app/history/<session-id>`.
8. Bob requests Alice's session through both the read endpoint and route. The result must match an unknown UUID in status, body shape, cache policy, rendered state, and effects.

The fixture adds explicit `/app/program/[day]`, `/workout/[sessionId]`, workout API, and history-detail routes. The existing catch-all remains an honest unmounted state for every route outside this slice.

## UI states

- Day detail: ready, unverified/disabled, opening, resumed, failed start, and missing day.
- Runner: recovery loading, ready, pending, saved, failed, retryable, server-confirmed-after-response-error, current exercise/set navigation, cardio selected/saved, completing, completed, and blocked local-reconciliation error.
- History: immutable completed detail with sets, skipped/completed movements, cardio, units, and no invented values.
- Foreign/missing route: indistinguishable not-found output without an owner identifier.
- The harness banner remains visible so screenshots cannot be represented as hosted production evidence.

No UI may report success before the production reducer accepts a repository-shaped response. The deliberate accepted-then-error scenario must first show failure or pending recovery; only a subsequent server reload may promote the matching idempotency key to saved.

## Domain types and invariants

- `HarnessScenario` gains one bounded value: `accept-next-runner-then-error`. It preserves the verified server viewer and is consumed only after one successful runner operation.
- Program, day, session, snapshot, exercise, set, cardio, and idempotency identities remain UUID/opaque values created by the production repositories or client controller. Requests never contain a Firebase UID.
- Set measurements enter the client in display units, cross the validated boundary, and persist in kilograms. Cardio distance enters in the member's display units and persists in meters.
- The immutable `baseRevision` originates from the loaded session; clients cannot supply lifecycle or ownership state.
- A repeated operation with the same idempotency key and payload is a replay, not a second log. A key reused with another payload remains a conflict.
- A terminal session cannot accept later operations. History reads snapshot names and measurements rather than live catalog labels.

## Persistence contracts

- The fixture keeps one isolated PGlite database per test scope, applies migrations `0000` through `0003`, and runs the deterministic starter seed.
- Start, resume, and operation fixture route handlers delegate to `createWorkoutApi` and `createWorkoutRepository`. The fixture may adapt only its harness CSRF cookie into the production cookie name before delegation; it must not copy workout schemas, operation construction, response mapping, or ownership rules.
- The workout page uses `loadResume`, `hydrateWorkoutResumeState`, `getViewerProfileProgram`, approved-video lookup, and the production route-model helpers.
- IndexedDB remains browser storage, namespaced by the server-derived owner UID. Reload retains the matching draft; foreign-owner, foreign-session, corrupt, and snapshot-mismatch records remain rejected by production code.
- The accepted-then-error scenario submits the real operation first, then discards its successful HTTP response in favor of a bounded `500 no-store` response. The database and receipt stay committed, so reload can prove reconciliation. The evidence must call this an accepted operation followed by an error response, not a literal network disconnect.

## Authentication and authorization

Alice and Bob are fixed synthetic `ViewerContext` values selected before navigation by test-only headers. The browser never sends or chooses a UID in an application body. The harness injects those headers only into exact-loopback first-party requests; it must not leak them to YouTube or any other third-party origin. Every fixture page and handler derives the viewer from the request headers on the server.

Verified Alice may mutate. Unverified Alice can view program data but cannot start or change a workout. Bob receives the same `404 not_found` response and no-store policy for Alice's session as for an unknown session. Rendered route documents must also match after replacing only the caller-supplied session token that Next necessarily echoes in its router payload; no owner or existence-dependent content may differ. Fixture routes remain outside `src/app`, production builds remain free of harness markers, and no Firebase, Neon, Vercel, YouTube, ADC, or user environment variable reaches the child processes.

## Loading, empty, error, interrupted, and worst-case behavior

- A start failure retains the retry-stable client key and stays on the day page.
- A server-accepted set followed by a `500` is left in IndexedDB with its original key and an honest failed state.
- Full reload obtains the authoritative server snapshot, overlays only unresolved local targets, recognizes the already-confirmed operation, and removes the false failure without creating another set row.
- A duplicate replay returns the same persisted identity and changes no counts.
- Refresh during recovery shows the reconciliation surface and never overwrites a mismatched draft.
- Completion stays unavailable until every movement is completed or skipped and cardio is saved.
- A terminal failure does not navigate to history. Navigation occurs only after the completion operation is confirmed.
- Unknown, malformed, foreign, and terminal session requests fail closed with `no-store`.
- The bounded first slice does not claim literal browser offline, tab-close, post-load auth expiry, or multi-tab conflict evidence. Those remain explicit follow-up acceptance items.

## Phone, tablet, and desktop behavior

The runner flow runs in Chromium desktop and WebKit phone using the existing dynamic exact-loopback production fixture. The day card, set editor, exercise outline, cardio fields, recovery state, footer controls, and history detail must remain reachable without horizontal overflow. Authenticated dynamic day links use explicit navigation without speculative App Router prefetch so rapid WebKit navigation cannot leave aborted first-party requests or console errors. Sticky/fixed controls must not cover the active field at the initial phone viewport. A later full private matrix adds Chromium phone/tablet and WebKit desktop once the vertical behavior is stable.

## Accessibility

The browser test uses keyboard navigation for entering the day and at least one runner action, confirms the skip link, and runs Axe serious/critical scans on day detail, ready runner, material failure/recovery, and immutable history. The scan covers the complete first-party document but excludes the cross-origin YouTube player subtree, whose internal markup is owned by YouTube and cannot be remediated here. The harness intercepts only the external `youtube-nocookie.com/embed/*` document with an inert response, while the app-owned iframe URL/title, supported media permissions, and direct fallback remain rendered. Unsupported iframe feature tokens must not produce first-party console warnings. Real playback and one-active-player behavior remain covered by the deployed public-video evidence and are not claimed by this runner test. Status changes use existing live regions; failure must be an alert or named recovery region; every set, cardio, note, skip, and completion control retains a programmatic name. Focus must survive reload at a sensible document landmark, and reduced-motion behavior must not be required for persistence correctness.

## Privacy and security

Only synthetic Alice/Bob identifiers, notes, and measurements enter QA evidence. Route logs and assertions must not print raw request bodies or secret environment values. The runner command retains its explicit environment allowlist and loopback-only listener. Generated screenshots contain only synthetic data and the local-harness banner. Teardown closes only the test scope's in-memory database and clears its fault receipt.

Console collection remains fail-closed for all warnings, errors, and page exceptions. No console message is suppressed for this slice. The exact external embed interception prevents third-party player scripts or telemetry from running and is unit-tested not to match ordinary YouTube, application, or other cross-origin requests.

## Acceptance criteria

- Alice can onboard, open Push, start a persisted session, and reach the production `OwnedWorkoutRunner` in Chromium and WebKit.
- The start request contains program/day/idempotency only; the operation request contains session/base revision/idempotency/payload only; neither contains ownership data.
- The one-shot accepted-then-error set is present exactly once in PGlite, first appears failed/pending locally, and becomes saved after reload through production reconciliation.
- Replaying the captured request returns the same persisted operation without adding a set log.
- Alice can satisfy or skip every exercise, save walker cardio, complete, and reach immutable history with the exact logged values.
- Bob's Alice-session read equals an unknown-session read, remains no-store, and causes no database mutation.
- The runner and history have no serious/critical Axe violations or horizontal overflow in Chromium desktop and WebKit phone.
- Production `pnpm build` and the 41-route production boundary contain no harness route or marker.
- Hosted Firebase cookies/provider behavior and literal disconnection remain unclaimed.

## Automated tests and fail-first evidence

Retain a focused failing test before implementation that expects the fixture to mount `/app/program/[day]`, `/workout/[sessionId]`, and owner-scoped workout handlers rather than the catch-all. A second fail-first browser assertion must expect the first accepted set to survive the deliberate error response and reload exactly once.

Focused tests cover scenario parsing/one-shot consumption, harness CSRF request adaptation, no provider environment regression, foreign/missing equivalence, accepted-then-error response semantics, and production-boundary exclusion. Browser tests cover the complete vertical flow in both configured projects. Verification commands are:

```bash
pnpm exec vitest run tests/unit/authenticated-harness-policy.test.ts tests/integration/workout-api-contract.test.ts tests/integration/workout-repository.test.ts
pnpm test:e2e:authenticated
pnpm verify
pnpm test:e2e:release
```

## Browser evidence required for completion

The newest authenticated QA record must name the exact commit, the two browsers/viewports, session scope, initial `500`, recovered saved set count, duplicate replay result, terminal history values, Bob/missing equivalence, zero serious/critical Axe findings, overflow result, and production-build exclusion. Retain only the newest minimal synthetic screenshots: interrupted runner and completed immutable history. Never label this fixture evidence as Firebase, Neon, hosted Vercel, literal offline, or production persistence proof.
