# Authenticated browser harness plan

## User outcome

An engineer can reproduce the complete authenticated My Workout Pal journey in real Chromium and WebKit browsers without a Firebase account, production cookie, Neon connection, or test-only production route. The harness renders the production client components against real repository/domain results from an isolated in-memory Postgres-compatible database and identifies two synthetic server-derived viewers. It closes local interaction evidence while leaving hosted Firebase/provider behavior explicitly separate.

## Navigation

The harness is a separate test application under `tests/fixtures/authenticated-app/`; nothing under that fixture is reachable from the production Next.js app or bundled by `pnpm build`. Its route atlas mirrors the private product journey only for test navigation:

1. Select synthetic viewer Alice or Bob through the harness control boundary before the page loads.
2. Alice lands on onboarding, chooses dumbbells or barbell, and creates one owned active starter program.
3. Alice visits program collection, clones and activates a program, edits a revision, creates a custom exercise, and confirms an equipment change.
4. Alice starts or resumes a day, logs sets/cardio, reloads with IndexedDB pending work, retries a failed save, and completes the session.
5. Alice opens immutable history, personal records, progress, and settings.
6. Bob attempts Alice's opaque resources and sees the same missing state as an unknown identifier.
7. Injected expired/revoked viewer state returns the user to the harness sign-in boundary while preserving only the matching offline draft.
8. Deletion UI is exercised through confirmation and cleanup contracts without deleting a Firebase identity.

The harness uses the same labels, routes, component props, request envelopes, repository outputs, and navigation ordering as production. A harness-only route must never be added beneath `src/app`.

## UI states

Every primary surface covers loading, empty, ready, saving, saved, duplicate, slow, offline, server failure, malformed success, stale revision, conflict, expired viewer, revoked viewer, missing resource, foreign resource, interrupted navigation, retry, and terminal completion states. Failure injection is deterministic and one-shot unless a test explicitly requests a persistent failure. The harness visibly labels itself as local QA so screenshots cannot be mistaken for production.

No action reports success before the real production controller/reducer accepts the repository-shaped result. Network interception must return the exact production API envelopes and cache headers. A test fails if a client component accepts malformed success or loses its pending/error state after navigation.

## Domain types and invariants

`HarnessViewer` is created only by the fixture server and is converted through the same `ViewerContext` shape as production. Browser requests never submit an owner UID. Alice and Bob have distinct fixed synthetic Firebase UIDs that exist only in the PGlite fixture. Foreign resource tests submit only route-scoped opaque IDs.

`HarnessScenario` is extended only alongside fail-first behavior. The first slice admits `ready`, `slow-onboard`, `fail-next-save`, `expire-session`, and `revoke-session`; expired and revoked scenarios remove the viewer. Later slices may add `stale-revision`, `malformed-success`, and `offline-after-accept` only when their behavior and tests land. Unknown scenarios fail closed. Scenario state is scoped to one Playwright worker and reset between tests.

The database starts from the real versioned migrations and deterministic starter seed. Repositories remain the final ownership, revision, idempotency, immutability, and canonical-unit boundary. The harness may adapt transport but must not duplicate repository behavior in fixture-only state.

The browser uses the production IndexedDB runner storage with the synthetic viewer UID. Cross-owner, cross-session, corrupt, unsupported-schema, and snapshot-mismatch records must remain rejected.

## Persistence contracts

Each Playwright worker owns one fresh in-memory PGlite instance. Setup applies every real migration and starter seed, then creates only the two synthetic viewer records required by the scenario. No fixture connects to Neon or writes a filesystem database. Browser mutations call fixture route handlers that invoke the production server operations/repositories with the selected server-side viewer.

Fixture API handlers validate the same strict request schemas, CSRF ordering, ownership derivation, body limits, and response envelopes as production where those functions are injectable. If a production App Router handler cannot be invoked without Firebase/Next request globals, the fixture calls the underlying tested HTTP operation rather than copying its rules.

IndexedDB is real browser persistence. Each test clears only its worker/viewer namespace. A deliberate reload or new context retains state only when the acceptance case requires recovery; final teardown clears the database and browser context.

## Authentication and authorization

The harness does not imitate Firebase token verification. It proves downstream authorization by supplying one of two immutable server-derived `ViewerContext` objects at the fixture server boundary. Verified, unverified, expired, and revoked are explicit server states, not client parameters. A browser may select an initial synthetic identity only through an out-of-band Playwright header or worker-scoped server configuration before navigation; application request bodies and URLs never accept a UID.

Alice and Bob each attempt owned program, custom exercise, workout, history, and deletion paths. Bob's requests against Alice identifiers must match an unknown identifier in status, error code, body shape, cache headers, and database effects. The harness must never add an authentication bypass, viewer header, cookie decoder, fixture import, or scenario switch to production source or production build output.

Hosted Firebase registration, Google consent, email delivery, secure-cookie attributes, and real revocation remain separate production evidence gates. The harness must state that it does not prove them.

## Loading, empty, error, interrupted, and worst-case behavior

The test server exposes bounded deterministic latency and one-shot failure controls before a flow begins. A slow request keeps the control disabled and announces pending status. A 500, malformed success, or dropped response preserves the retry key and never advances the UI. A server-accepted but response-interrupted operation reconciles as saved on reload. Offline IndexedDB work overlays only unresolved targets and does not erase server-confirmed progress.

A stale program publication refuses overwrite and offers reload. Expired or revoked viewer state stops mutation, preserves the same-owner draft, and routes to reauthentication. Foreign identifiers disclose nothing. A late database error rolls back. The worst path combines a confirmed server write, lost response, page close, another-tab save, and stale local replay; recovery must retain both server results and surface only the genuinely conflicting local operation.

## Mobile, tablet, and desktop behavior

Chromium runs phone 390 by 844, tablet 820 by 1,180, and desktop 1,440 by 1,000. WebKit runs at least phone and desktop for private navigation, dialogs, forms, runner persistence, and back/reload behavior. Responsive changes must not alter data or operation ordering. Sticky controls must remain above safe-area navigation, forms must not overflow horizontally, dialogs must remain usable at 200 percent zoom, and every primary action must remain reachable without pointer hover.

## Accessibility

Each primary authenticated surface receives an Axe serious/critical scan in ready and material error states. Keyboard-only evidence covers navigation, onboarding radios, collection actions, editor reorder controls, searchable exercise selection, equipment confirmation, runner sets/cardio, retry, settings, and deletion dialog cancellation/confirmation. Tests assert heading/landmark order, accessible names, described errors, focus movement/restoration, polite versus alert live regions, disabled semantics, chart alternatives, visible focus, reduced motion, dark mode, and forced colors where supported.

## Privacy and security

Synthetic names, UIDs, notes, weights, and history are fixed non-personal fixtures. No Firebase, Neon, Vercel, YouTube, Google ADC, Postgres, or user credential is loaded. The runner passes only an explicit non-provider runtime environment to the build and browser processes. Fixture server logs omit bodies and IDs. Screenshots use only synthetic data. Raw Playwright traces/videos are untracked and removed after the newest completed run unless required to explain a blocker.

The harness directory is excluded from production routes and checked by a source-policy test. Production `next build` must not list harness routes or fixture modules. Cache assertions require `no-store` for every private response. The harness origin binds only to loopback on a dynamically assigned port and shuts down its own process after the run.

## Acceptance criteria

- One command builds/starts the isolated fixture and runs the authenticated matrix without Firebase or Neon environment variables.
- The harness applies real migrations/seed and uses production repositories, domain rules, client controllers, and IndexedDB storage rather than hard-coded success data.
- Production `src/app`, middleware, auth code, and build output contain no harness viewer/scenario switch or test route.
- Both starter profiles onboard and remain complete five-day programs.
- Clone, activate, editor publication, custom exercise, and equipment revision behaviors preserve history and ownership rules.
- Start/resume, duplicate, set/cardio, notes, substitution, completion, offline, interrupted response, retry, reload, and terminal history all reconcile truthfully.
- History, records, and progress derive from the PGlite persisted logs and canonical units.
- Bob cannot read or mutate Alice's resources, and foreign/missing responses are indistinguishable.
- Phone, tablet, desktop, Chromium, WebKit, keyboard, reduced motion, dark mode, and serious/critical Axe gates pass for the scoped matrix.
- The harness proves local product interaction only; hosted Firebase, real cookie, provider, email, Vercel, and production media claims remain open until separately observed.

## Automated tests

Retain a fail-first source-policy/package-script test before the harness command exists. Unit tests cover viewer/scenario parsing, worker isolation, no-UID request envelopes, failure-consumption semantics, and teardown. Integration tests apply real migrations, seed Alice/Bob, and prove fixture handlers delegate to owner-scoped repositories. Playwright tests cover one happy vertical slice first: both-profile onboarding, read-only unverified state, duplicate/failure recovery, and Bob denial. Later slices add collection/editor, runner/recovery, insights/settings/deletion, and responsive/accessibility matrices.

Verification commands are split truthfully:

```bash
pnpm verify
pnpm test:e2e:release
pnpm test:e2e:authenticated
```

`pnpm verify` covers strict types, lint, unit/integration tests, database metadata, exact seed, PWA/docs parity, and production build. Browser commands remain explicit because they start separate servers and retain different evidence boundaries.

## Browser evidence required for completion

The newest QA record names the exact Git commit, fixture architecture, commands, test/browser/viewport counts, failed-then-passed assertion, selected synthetic scenarios, zero serious/critical Axe result, keyboard pass, responsive overflow/target results, IndexedDB recovery observation, PGlite ownership counts, and production-build exclusion check. Retain a minimal screenshot set for onboarding, editor, interrupted runner, history/progress, and deletion review. Never present harness screenshots as hosted Firebase or Vercel evidence.
