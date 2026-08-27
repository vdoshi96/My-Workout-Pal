# Authenticated browser harness: runner recovery checkpoint

## Outcome

The credential-free authenticated fixture now proves the production onboarding and persisted workout vertical against isolated in-memory PGlite. At source checkpoint `7c53a2f2ee7efd74233f21af2e6057e0f85e1cac`, a verified synthetic member can create the dumbbell starter, open Push by keyboard, start a real owner-scoped session, survive a server-accepted set followed by an error response, reconcile exactly once after reload, finish the workout, and read the immutable result. A second synthetic owner cannot distinguish Alice's session from an unknown session through either the private API or rendered workout route.

The fixture remains outside `src/app`, uses production repositories, route parsers, runner state, IndexedDB reconciliation, migrations, seed rows, and history presentation, and appears nowhere in the production route manifest. It is not a Firebase emulator and does not claim hosted sessions, provider consent, email delivery, secure production cookies, or literal network disconnection.

## Newest visual evidence

WebKit phone in the explicit accepted-then-error state. The synthetic banner, one failed operation, retained set values, recovery action, and disabled terminal action are visible:

![Synthetic WebKit phone runner showing the interrupted set recovery state](authenticated-runner-interrupted-phone.png)

Chromium desktop after server-confirmed completion. The read-only snapshot shows 25 pounds for 12, 11, and 10 repetitions; five skipped movements; and walker cardio with 20 minutes, one mile, 2 percent incline, and the immutable `Synthetic QA walk` note:

![Synthetic Chromium desktop immutable Push history with sets and cardio](authenticated-runner-history-desktop.png)

These are the only retained authenticated-harness screenshots. Both contain synthetic data and the visible local-harness boundary; no real account, credential, or fitness record appears.

## Fixture and security boundary

- `pnpm test:e2e:authenticated` selects an available unprivileged exact-loopback port, builds the separate fixture with Next.js 16.3.2 Webpack, starts it in production mode, and refuses to reuse another server.
- The child process inherits only an explicit non-provider environment allowlist. It receives no Firebase, Neon, Postgres, Vercel, Google ADC, OIDC, or YouTube credential.
- Synthetic Alice and Bob are selected before navigation by test-only headers injected only into `http://127.0.0.1:<selected-port>` requests. Those headers never reach YouTube or another origin and never appear in application bodies or URLs.
- The fixture adapts only its already double-submitted CSRF token into the production cookie name, then delegates the untouched request to `createWorkoutApi` and `createWorkoutRepository`. It does not copy workout schemas or ownership logic.
- The one-shot `accept-next-runner-then-error` scenario lets the repository commit the first set and its idempotency receipt, then replaces only that successful HTTP response with a bounded `500 no-store`. This proves accepted-then-error reconciliation, not a literal browser disconnect.
- The external `youtube-nocookie.com/embed/*` document is replaced with an inert test response so this persistence run is deterministic and credential-free. The application still renders the reviewed iframe URL, title, supported media permissions, and direct fallback. Real video playback is proven by the separate deployed-video evidence, not this fixture.
- Production source tests reject harness imports or markers under `src`. `pnpm production:check` verifies 41 App Router entries and no fixture route.

## Personally observed flow

1. Expired and revoked contexts stopped at **Sign in required**. Unverified Alice remained read-only and could not create or mutate a program.
2. Verified Alice used focus plus Enter to open Push, then started the production persisted runner with an owner-free program/day/idempotency request.
3. Alice entered 25 pounds and 12 repetitions and activated **Save set** with the keyboard. The repository accepted the operation, while the harness returned the single permitted `500`. The UI visibly reported **Save activity** and **1 failed** without claiming success.
4. Axe scanned that material failure state before reload. The first screenshot was captured only after the synthetic banner, retained values, failure message, and recovery control were visible.
5. Replaying the captured request returned `200` with `status: duplicate`, the same persisted meaning, and `no-store`. A full reload then showed one of the required work sets logged and removed the false local failure.
6. Alice logged the remaining 25-pound sets for 11 and 10 repetitions, completed dumbbell bench press, skipped the other five Push movements, saved walker cardio, and completed the session.
7. The terminal operation navigated only after its `200` confirmation. Immutable history displayed all three sets, the skipped movements, time, distance, incline, and cardio note.
8. Bob's reads of Alice's session and a random UUID returned identical `404 not_found` JSON and Cache-Control. Their rendered route responses also matched in status, `no-store`, and complete Next document after replacing only each caller-supplied session token that Next necessarily echoes in its router payload.
9. The failure collectors were asserted twice: immediately after recovery and again after all remaining work, history evidence, and Bob checks. Alice had exactly the one intentional operations `500`; Bob had exactly two private API and two rendered-route `404`s. No later unexpected response could pass silently.

## Accessibility, responsive, and browser evidence

- The vertical passes in Chromium desktop at 1,440 by 1,000 CSS pixels and WebKit phone using the iPhone 14 profile.
- Real keyboard activation covers entry to Push and the first runner set save. The fixture also retains the engine-correct skip-link check from onboarding.
- Serious/critical Axe scans cover the day page, ready runner, visible interrupted recovery state, reconciled runner, member program, and immutable history. The third-party iframe subtree is excluded; its app-owned title and fallback remain separately asserted.
- The rest timer's prior 2.39-to-1 coral-on-ink failure now uses the tested high-contrast token. Both browsers complete with clean first-party console, page-error, and exact HTTP collectors.
- The phone and desktop history surfaces have no horizontal overflow. Authenticated program/day links disable speculative App Router prefetch, preventing WebKit abort noise while preserving explicit navigation.

## Retained red-to-green evidence

- The initial focused contract passed five checks and failed two: the new accepted-then-error scenario was unknown and six fixture workout/day/history route files were missing.
- The first browser vertical failed serious contrast on the rest timer. The corrected token passed Axe in both engines.
- The accepted 25-pound set initially conflicted after reload because the client kept a long imperial conversion while Postgres stored three decimal places. Presentation-boundary conversion now canonicalizes kilograms and meters to scale three and pace to an integer; 25 pounds persists and reconciles as 11.34 kilograms.
- The first post-recovery test tried to overwrite set one because the runner intentionally does not auto-advance. The test now selects set two and set three explicitly, preserving the production conflict guard.
- Immutable cardio history initially dropped `note_snapshot`. The repository view and shared history component now preserve and render it, with a PGlite regression.
- Broad Playwright `extraHTTPHeaders` leaked fixture headers to third-party resources and caused CORS noise. Exact-loopback request interception replaced it. The external player document is inert rather than console-filtered.
- Chromium then identified unsupported iframe permission `web-share`; the production player now retains only supported media permissions.
- Exact response assertions exposed six hidden fixture detail-route prefetch `404`s. Both fixture and production authenticated day links now use `prefetch={false}`, with source parity checks.
- Raw rendered 404 bodies differed only because Next echoed each requested session ID. Full-body equivalence now normalizes only that caller-provided token and no other content.
- Final review found Alice's exact-failure assertion occurred before later history work. The same exact-one-500 assertion now runs again immediately before teardown.

## Automated verification

- Focused runner/publication/insights matrix: 5 files and 41 tests pass.
- `pnpm typecheck` and full `pnpm lint`: pass.
- `pnpm test:e2e:authenticated`: fixture build passes; 6 of 6 cases pass across Chromium desktop and WebKit phone.
- `pnpm verify`: strict types and lint pass; Vitest passes 78 files and 524 tests; `db:check` passes Drizzle metadata plus 4 files and 33 assertions; the default seed check validates all 27 exact-two video mappings; PWA and 34-document parity pass; the production Webpack build passes; and the 41-entry production route boundary contains no harness route.
- The first isolated `pnpm test:e2e:release` attempt passed 35 cases, skipped the documented WebKit service-worker case, and failed the eight exercise-detail cases because this credential-free worktree intentionally had no `DATABASE_URL`. The bounded rerun injected only the existing ignored local database URL into that single read-only process without printing or copying it. It passed 43 cases with the same one WebKit capability skip across Chromium phone, tablet, desktop, and WebKit phone. No Firebase, Admin, YouTube, or Vercel value entered the process, and no database write ran.

## Evidence boundary and next lane

This checkpoint proves credential-free downstream authorization, repository-backed persistence, idempotent accepted-then-error recovery, reload reconciliation, terminal history, cardio-note preservation, first-party accessibility, and cross-user hiding. It does not prove literal offline events, tab close, post-load Firebase expiry, multi-tab conflicts, personal-record/progress presentation, hosted Firebase password/Google flows, email delivery, production secure cookies, or Spend Management. Those remain separate, truthfully unclaimed lanes.
