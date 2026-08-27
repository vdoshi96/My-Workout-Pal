# Authenticated runner offline, reauthentication, and multi-tab resilience plan

## User outcome

A verified member can keep working when a workout request loses its response, the browser is genuinely offline, the secure session expires or is revoked after the runner has loaded, or another tab edits the same session. Every saved-to-device operation remains owner-scoped and carries one stable idempotency key. The interface distinguishes queued-on-device, syncing, server-confirmed, authentication-blocked, connectivity-blocked, conflict, and terminal states; it never calls a change saved until the server confirms it.

This is a bounded credential-free resilience checkpoint. It exercises production runner components, reducers, client adapters, IndexedDB, workout HTTP mapping, repositories, and immutable PGlite state under fixed synthetic viewers. It does not claim Firebase provider reauthentication, hosted cookies, Neon production writes, Vercel behavior, account deletion, authenticated production media, or Spend Management. Those remain separate release gates.

## Navigation

1. Verified synthetic Alice opens `/app`, resumes a real persisted workout, and reaches `/workout/<session-id>` through the production start/resume boundary.
2. Alice queues a set while the exact first-party operation request is genuinely aborted rather than replaced by fixture metadata. After that transport is restored, Alice reloads the exact session and sees the same operation and idempotency key still queued on this device.
3. Without relying on a browser `online` event, Alice activates **Retry connection**. The preserved operation is submitted once and becomes server-confirmed; another failure returns to the honest offline state.
4. In a separate run, Alice loads the runner while authenticated, queues an operation, and the next production operation request receives the real `session_expired` error envelope from the fixture's production workout API. The visible action opens `/sign-in?returnTo=%2Fworkout%2F<session-id>`.
5. The fixture-only sign-in surface restores the same synthetic Alice viewer and returns to that exact session. A fresh server baseline wins over the stale device-only authentication flag, while the queued operation and its original key survive and sync exactly once.
6. The revoked-session case repeats the same path with the real `session_revoked` code and revoked-specific copy. A foreign synthetic Bob return cannot load Alice's route, IndexedDB key, or queued operation and receives the same missing behavior as an unknown session.
7. Two pages in one browser context open the same Alice session. Distinct offline operations created in each tab are atomically merged in IndexedDB and both survive reload. Divergent operations for the same semantic target are retained as a visible local-tab conflict; neither is guessed or submitted until Alice explicitly chooses one.
8. A server-confirmed operation in one tab cannot be erased by a stale write in the other. A confirmed terminal completion freezes the other tab, reconciles its local state, and routes only after the terminal result is server-confirmed.

The fixture may add a bounded `/sign-in` surface and test-only session-control boundary outside `src/app`. They exist only to select fixed synthetic server viewers for the return journey. Production continues to derive identity from Firebase Admin's secure cookie and never accepts a client UID.

## UI states

- Recovery: checking server plus device record, ready, storage blocked, corrupt/mismatched record, and owner/session denial.
- Connectivity: online, a request failed without a response, browser-declared offline, queued-on-device, retrying connection, still offline, and reconnected/syncing.
- Authentication: valid, expired, revoked, opening sign-in, returned as the same owner, and returned as another owner/missing.
- Multi-tab: synchronized, another tab changed this workout, two distinct operations merged, same-target conflict requiring a choice, chosen operation pending, stale operation superseded, and terminal elsewhere.
- Operation: pending, attempted, offline, authentication-blocked, saved, duplicate-confirmed, transient failure, permanent failure, server conflict, local-tab conflict, and superseded.
- Terminal: completing/abandoning, confirmed complete/abandoned, terminal failure, and terminal confirmed in another tab.

The expired/revoked and offline banners each contain a keyboard-operable recovery action. Conflict copy names the affected set, cardio log, note, exercise decision, or session action without exposing database IDs. A live region announces material state changes. The first recovery control receives focus only when a new blocking state appears, not on every render.

## Domain types and invariants

- Authentication and connectivity are ephemeral runtime facts. A successfully server-rendered, same-owner resume baseline is authoritative for valid authentication; `navigator.onLine`, an explicit probe, or the current request result is authoritative for connectivity. A stored `expired`, `revoked`, or `offline` flag may explain the previous interruption but must not permanently override a fresh valid baseline.
- `session_expired`, `session_invalid`, `auth_expired`, and the server's actual `session_revoked` code stop submission without consuming or replacing the queued idempotency key. Revocation remains distinguishable in presentation and tests.
- A runner operation is immutable in identity: owner, session, base revision, kind, normalized payload, and idempotency key cannot change. Equal keys require equal semantic payloads. Same-key/different-payload storage is corrupt and fails closed.
- Each operation has a semantic target: one set, one exercise note, cardio, one exercise decision, or the session terminal action. Distinct targets commute and merge. Divergent unresolved operations for one target become an explicit local-tab conflict. The product never chooses a winner from wall-clock time alone.
- A server-confirmed operation outranks a stale unconfirmed copy. A later intentionally queued operation for the same target remains a new pending operation only when it was created from the already-confirmed state; otherwise it conflicts. Confirmed terminal state outranks every mutable local projection and supersedes stale unsent work with truthful terminal copy.
- Operation ordering after a merge is deterministic: original creation time, then idempotency key. Sequence values are normalized locally and remain presentation/sync order only; the server still derives ownership and lifecycle state.
- Raw field tokens that have not been activated with **Save activity** remain tab-local editing state. Multi-tab durability begins when the user queues an immutable operation. Navigation protection continues to guard raw dirty fields.
- Conflict resolution is an explicit reducer action selecting one preserved idempotency key. The selected operation becomes pending with the same key; competing unconfirmed operations become superseded. Cancel leaves every conflicting operation blocked and durable.
- Different Firebase UIDs use different encoded storage keys. No merge, notification, cleanup, or fixture helper can read or write another owner's namespace.

## Persistence contracts

- Runner storage records advance to schema version 2 and add a monotonic storage revision, stable per-tab writer identity, committed timestamp, and the complete validated runner state. Existing schema-one records remain readable and migrate without dropping operations on the next atomic write. The IndexedDB database version is advanced deliberately while preserving the existing object store.
- `RunnerStorage.save` becomes an atomic compare-and-merge operation that returns the committed record/state. IndexedDB performs the existing-record read, validation, pure operation merge, revision increment, and `put` inside one read/write transaction. The in-memory adapter implements the identical contract for domain tests.
- The write result, not the caller's stale input, becomes the active React state. Persistence and remote-sync queues adopt merged state before submitting anything.
- IndexedDB is the correctness mechanism. A same-origin `BroadcastChannel` publishes only an opaque digest of the owner/session storage namespace, revision, and writer identity after commit so other tabs can re-read; it carries no measurements, notes, UID, raw storage key, or operation payload and is never trusted as the state itself. Visibility and focus events also re-read as recovery hints.
- The pure merge validates record, owner, session, snapshot revision/day identity, operation key/payload equality, semantic target, terminal state, and supported schema. Corrupt, cross-owner, cross-session, and future-unsupported records fail closed without overwriting either copy.
- Sign-out and confirmed account deletion still clear only the current owner namespace. The new record metadata contains no provider token, cookie, email, or raw Firebase credential.
- Server persistence remains unchanged: private requests contain no UID, CSRF and viewer policy run server-side, idempotency receipts own duplicate meaning, immutable workout snapshots retain history, and every private response is `no-store`.

## Authentication and authorization

Production pages and APIs continue to trust only the Firebase Admin session cookie. A post-load `401` is processed through the existing structured private-client error, not a test-only response parser. The exact return target is constructed from the already-owned opaque session path and normalized to the same-origin `/workout/<uuid>` route.

The credential-free fixture selects Alice or Bob through its existing loopback-only, runner-injected test boundary. The new sign-in fixture is explicitly labeled synthetic and cannot appear in the production route manifest. It may restore a fixed viewer only for its fixed test scope; it never accepts an arbitrary UID or account claim from an application request body. Browser headers remain exact-loopback first-party only, the child environment stays allowlisted, and Firebase, Google ADC, Neon, Vercel, YouTube, and OIDC variables remain absent.

Expired and revoked requests return the production `AuthPolicyError` status/code/message shape and `Cache-Control: no-store`. The repository is not called after viewer failure. Bob cannot load Alice's session or storage namespace, and foreign/missing API and rendered-route results remain indistinguishable after normalizing only the caller-supplied path token.

## Loading, empty, error, interrupted, and worst-case behavior

- A real browser offline transition queues locally and produces no HTTP success claim. Reload restores the operation. Explicit retry attempts the same key even if `navigator.onLine` stayed true and no `online` event fired.
- A retry that still throws a network error returns to offline with the operation intact. A later retry, `online`, or visible-page hint may try again; concurrent hints serialize through one persistence/sync queue.
- A valid same-owner server reload clears only stale ephemeral auth/connectivity blockers. It does not clear drafts, operations, conflicts, or device history. A server error or missing/foreign route cannot be treated as successful reauthentication.
- Expired/revoked responses block all later queue submission until a fresh same-owner server baseline loads. Repeated clicks cannot create a second key or duplicate row.
- Two tabs writing at the same moment serialize through the IndexedDB transaction. Distinct targets survive. Same-target divergence blocks both. A payload-hash collision, corrupt record, unsupported schema, or snapshot mismatch stops recovery and preserves the last committed record.
- If another tab confirms an operation while this tab is stale, the confirmed result remains authoritative. If another tab confirms terminal completion/abandonment, this tab stops timers and mutation controls, announces the terminal state, and cannot re-open the session locally.
- BroadcastChannel absence, message loss, duplicated notification, or tab suspension cannot lose data; reload, focus, visibility, and the next write re-read the durable record.
- Storage quota/blocking remains a separate local adapter failure. Network retry never suggests that unavailable local persistence succeeded.

## Mobile, tablet, and desktop behavior

The complete resilience journey runs in Chromium desktop and WebKit phone. Focused geometry assertions reuse the released authenticated phone/tablet/desktop matrix for banners, retry/reauth controls, conflict review, terminal disclosure, fixed navigation clearance, 44-pixel material targets, and zero horizontal overflow. The phone layout keeps the recovery action and affected-target summary above the fixed account navigation. Desktop may place conflict choices side-by-side; phone stacks them without changing reading or tab order.

Reduced motion removes nonessential transitions without delaying state or focus. Dark and forced-color checks remain scoped to engines that support the emulation. This checkpoint does not relabel viewport emulation as actual 200-percent browser zoom; that remains a separate headed/manual release gate.

## Accessibility

- Offline, expired, revoked, conflict, syncing, and terminal-elsewhere states have named landmarks plus polite/assertive live behavior appropriate to urgency.
- **Retry connection**, **Reauthenticate and return**, and conflict choice buttons have target-specific accessible names and at least 44-by-44-pixel hit areas.
- When auth first blocks the runner, focus moves once to the banner heading or primary action; activating reauthentication uses an ordinary same-origin link. Returning places focus at the runner recovery heading before the preserved operation syncs.
- When a local-tab conflict appears, focus moves once to the conflict heading. Choosing or cancelling returns focus to the affected runner control. Keyboard users can inspect both values before selecting one.
- Axe serious/critical scans run while offline, expired, revoked, conflicted, and terminal-in-another-tab states are visible. First-party console, page-error, HTTP failure, and request-failure collectors stay fail closed, with only each deliberately consumed offline/auth response identified by exact path and status/failure reason.

## Privacy and security

Runner notes, loads, distances, idempotency keys, and conflict payloads stay inside owner-scoped IndexedDB or no-store private requests. Broadcast messages carry only an opaque namespace digest plus revision/writer metadata; tests verify they cannot cross owner namespaces. The UI describes targets with human labels and never prints raw Firebase UID, storage keys, operation hashes, cookies, SQL, or provider errors.

QA uses only synthetic Alice/Bob data and retains the fixture banner. Logs and screenshots contain no secrets or private reference media. No provider, migration, seed, deployment, domain, or spend setting is changed in this lane until the independently reviewed source is merged under the established release workflow.

## Acceptance criteria

- A schema-one queued operation migrates to schema two and survives exact reload; unknown future schema and corrupt identity fail closed without overwrite.
- Two storage instances concurrently save distinct offline operations for one owner/session, and the next read contains both exactly once.
- Same-target divergent operations remain durable as one visible conflict with no request; explicit selection preserves the chosen original key and supersedes the other.
- A server-confirmed result survives a stale-tab write. Confirmed terminal state freezes and reconciles the other tab.
- `session_expired` and `session_revoked` are both terminal authentication blockers, use the exact production `401 no-store` envelope, preserve the queued key, and expose the exact-session reauthentication link.
- Same-owner return through the synthetic fixture sign-in makes the fresh valid server baseline authoritative and syncs the original key exactly once. Bob cannot load, merge, inspect, or clear Alice's draft.
- Actual offline interception or browser offline context queues without a response; explicit retry succeeds without requiring an `online` event and reuses the key. A failed retry remains honestly offline.
- Broadcast messages are advisory only; dropping them does not change the eventual durable merge result.
- Chromium desktop and WebKit phone complete the offline, expiry, revocation, foreign-owner, two-tab distinct-operation, conflict-choice, stale-write, and terminal reconciliation paths with no unexpected first-party console/request failures, serious/critical Axe violations, or horizontal overflow.
- Production build and route-atlas checks contain no fixture sign-in, harness auth control, synthetic viewer marker, or resilience scenario route.

## Automated tests and retained fail-first evidence

Before implementation, retain focused red tests for:

1. `reconcileWorkoutResumeState` incorrectly retaining stored expired/offline flags over a fresh valid/online server baseline;
2. `session_revoked` being classified as an ordinary retryable failure;
3. the existing blind IndexedDB `put` erasing a distinct operation from another storage instance;
4. no UI action retrying a network failure when no browser `online` event fires;
5. no bounded reauthentication link/action in the visible auth-blocked state; and
6. a two-page browser run losing one offline operation or submitting a same-target conflict.

Pure/unit tests cover schema-one migration, version-two validation, atomic merge, deterministic ordering, same-key payload corruption, distinct targets, same-target conflict, conflict resolution, saved precedence, terminal precedence, owner/session/snapshot isolation, advisory notifications, offline retry, expired/revoked thrown and returned failure shapes, runtime-ephemeral recovery, and exact bounded return URLs. IndexedDB adapter tests prove the read and `put` share one read/write transaction and that `save` returns the committed merge.

Fixture/API tests cover production `AuthPolicyError` mapping for expiry/revocation, no-store headers, viewer-before-repository order, synthetic sign-in scope, environment/header isolation, owner-indistinguishable denial, and production route exclusion. Browser tests use real route abort/context offline state and two simultaneous pages, not fixture-only metadata, for the storage and connectivity claims.

Reproducible gates are:

```bash
pnpm exec vitest run tests/unit/workout-runner.test.ts tests/unit/workout-resume.test.ts tests/unit/runner-storage.test.ts tests/unit/workout-runner-component.test.ts tests/unit/authenticated-harness-policy.test.ts tests/integration/workout-api-contract.test.ts
pnpm typecheck
pnpm lint
pnpm test:e2e:authenticated
pnpm verify
pnpm test:e2e:release
```

## Browser evidence required for completion

The newest authenticated QA record names the exact source commit, retained red failures, two production-mode browser projects/viewports, synthetic scope, session ID only in internal assertions, original idempotency-key equality result, exact expected offline/auth response set, server row/digest before and after duplicate/conflict paths, storage schema/revision result, foreign/missing equivalence, Axe/overflow/target results, and production-route exclusion. Retain only the newest minimal screenshots showing synthetic offline recovery, revoked reauthentication, local-tab conflict, and terminal reconciliation when each materially proves a distinct state.

The report must say explicitly that the fixture proves credential-free client/domain/storage/server behavior with synthetic viewers. Hosted password/Google sign-in, provider revocation, secure production cookie renewal, and real production cross-account behavior remain pending until the separate configured-identity lane passes.
