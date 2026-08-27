# Authenticated runner resilience QA

## Scope

This record covers the credential-free runner resilience checkpoint on branch `qa/runner-resilience` at exact code-and-test checkpoint `f0d888f09af143ecce2a0f7ef82f11f2e64adb5f`. The branch starts from released `main` commit `b8d4e9f327b67fdf755f338b1d335630159f3089`.

The production-mode fixture uses the production runner components, reducer, IndexedDB adapter, private HTTP mapping, repositories, migrations, and immutable PGlite data. Fixed synthetic Alice and Bob viewers replace Firebase only at the fixture boundary. No Firebase, Neon, Vercel, YouTube, Google Cloud, OIDC, billing, or production state changes occur in these browser runs.

## Verified user journeys

The browser evidence verifies the following journeys:

- A real first-party operation abort leaves one device-queued operation. Reload preserves the original idempotency key, and **Retry connection** submits that same key without waiting for a browser `online` event.
- The production `session_expired` and `session_revoked` `401` envelopes block submission with `Cache-Control: no-store`. The exact-workout reauthentication link preserves the queued key. A fresh same-owner server baseline clears only the stale authentication blocker and syncs once.
- A Bob return can't load Alice's route, merge Alice's IndexedDB namespace, or observe Alice's queued operation. The rendered and API results remain indistinguishable from a missing session.
- Two tabs atomically retain distinct queued operations. Divergent values for the same target remain durable and blocked until the member chooses one original key.
- A server-confirmed operation survives a stale-tab write. A server-confirmed completed or skipped exercise restores its authoritative projection, clears a stale raw note before submission, and supersedes already-queued stale exercise-local operations without deleting saved history.
- A server-confirmed terminal operation freezes the stale tab, reconciles its durable state, and routes it to immutable history.

The visible offline, revoked, conflict, and terminal states pass serious and critical Axe checks. The tests also assert first-party console, page-error, HTTP, and request-failure terminal sets, 44-pixel recovery and conflict targets, and zero horizontal overflow.

## Retained fail-first evidence

The implementation was driven by retained failures for the following defects:

- Stored `expired` and `offline` flags overrode a fresh valid server baseline and stranded a queued operation.
- The real `session_revoked` server code was treated as a retryable network failure.
- Blind IndexedDB `put` calls let one tab erase another tab's operation.
- A failed request had no explicit retry path when the browser never emitted an `online` event.
- The blocked runner had no bounded, keyboard-accessible reauthentication action.
- The first fixture sign-in attempt reused a tab-local CSRF token after navigation instead of obtaining a stable same-origin token.
- Saved operation merge rules let stale exercise-local note state survive a confirmed skip and block terminal completion.
- Primary review found that superseded operations could leave their stale raw draft or note projection in the schema-two record, while a legitimate later note created from an already confirmed exercise decision was also superseded. Three focused assertions failed before the merge restored authoritative terminal and exercise projections and distinguished later decision-aware work; all 30 storage tests then passed.
- The first complete post-review browser matrix expected a superseded note operation after reconciliation had already cleared the stale raw note and disabled its Save action. Both engine cases failed that assertion. The corrected browser contract proves the safer boundary: zero note operation, zero note request, cleared stale input, and disabled Save.
- WebKit speculative Next.js RSC prefetches produced first-party cancellation noise. The collector accepts only the exact same-origin `GET` RSC prefetch signature and keeps every broader cancellation fatal.

No failed browser response, first-party request abort, console error, or page error was reclassified as product success without an exact documented boundary.

## Verification

The following verification applies to the frozen source boundary:

- `pnpm verify` passed on exact code-and-test checkpoint `f0d888f09af143ecce2a0f7ef82f11f2e64adb5f` with this canonical documentation working set: strict TypeScript, full lint, 90 test files and 633 assertions, four database files and 34 migration/bootstrap assertions, all 27 exact-two approved-video mappings, PWA and 34-document parity, the Next.js 16.3.2 Webpack production build, and the 41-route production fixture-exclusion boundary.
- `pnpm test:e2e:authenticated` passed 29 cases with one intentional engine-scoped skip on exact checkpoint `f7cbe85d377c777e51520feec4e9348b508f5bfe` across the complete authenticated project matrix.
- `pnpm test:e2e:release` passed 43 cases with one documented WebKit service-worker skip on exact code-and-test checkpoint `f0d888f09af143ecce2a0f7ef82f11f2e64adb5f`.
- GitHub records production deployment `dpl_7rEUfeHhrUA3ZwSFwPLuQbBTw59m` for exact runtime checkpoint `fdfb01d97b6149f99b0c292930d06450bf910387`. The deployment is Ready with the public, project, and Git-main aliases. A production Chromium-phone replay passed the complete guest discovery journey; the five public/private-gate probes returned `200`, `/app` retained its bounded sign-in return and private no-store policy, and the one-hour error scan returned no entries.
- After the computer restart, `pnpm test:e2e:authenticated -- tests/authenticated-e2e/runner-resilience.spec.ts` passed 12 of 12 cases on screenshot checkpoint `089df2f0790973a63e1800d878d551db6a57ff35` across Chromium desktop and WebKit phone. Test-only checkpoints `295d155` and `089df2f` changed discovery timing and retained screenshots. Primary-review source checkpoint `27d85a9` passed 30 storage tests, scoped lint, and strict TypeScript after its three-test fail-first correction. Checkpoint `f7cbe85` then passed the formerly failing terminal case 2 of 2 and the complete authenticated matrix 29 passed with one intentional WebKit-only incompatible-equipment skip.

Local or synthetic evidence doesn't replace hosted Firebase or production-authenticated proof.

## Browser evidence

### Offline recovery on Chromium desktop

![Offline runner state with a Retry connection action](runner-offline-recovery-desktop.png)

The operation remains on the device until the server confirms the preserved key. The focused capture excludes workout identifiers and values.

### Revoked-session recovery on WebKit phone

![Revoked sign-in state with a Reauthenticate and return action](runner-revoked-reauthentication-phone.png)

The action points to the exact bounded workout return route. The fixture then proves same-owner recovery and foreign-owner denial.

### Local-tab conflict on Chromium desktop

![Two preserved set values that require an explicit member choice](runner-local-tab-conflict-desktop.png)

Both original operations remain local and blocked. The application sends neither value until the member chooses one original idempotency key.

### Terminal reconciliation on WebKit phone

![Synthetic completed workout history after another tab confirmed completion](runner-terminal-reconciliation-phone.png)

The stale phone tab adopts server-confirmed terminal state and opens the immutable workout snapshot. The screenshot carries the visible synthetic-data banner and no provider identity or secret.

## Disk and artifact hygiene

The restart removed a temporary pnpm store under `/private/tmp`, leaving `node_modules` linked to a missing store. One controlled install reused all 633 packages without downloading them and moved the active store boundary to the repository's ignored `.pnpm-store` directory. The active dependency footprint is 840 MB for `node_modules` and 781 MB for the reusable store.

The final post-restart authenticated matrix created 180 MB in the fixture `.next-authenticated` directory and 9.6 MB in `test-results`. The aggregate and public release gates each created a 202 MB root `.next`; the public matrix also created a 552 KB HTML report. After the four exact authenticated-run images were copied into this directory and visually inspected, every generated build, result, trace, and report directory was deleted. Available disk space returned to about 197 GiB after the gates.

For the remaining goal work, run only one production build or browser matrix at a time. Measure the exact task-owned directories and filesystem before and after each large gate. Keep only the active dependency install and the newest tracked QA evidence. Delete `.next`, fixture `.next-authenticated`, `test-results`, and `playwright-report` after each evidence boundary.

## Unproved gates

This checkpoint does not prove the following behavior:

- Hosted password and Google sign-in, provider revocation, or secure production cookie renewal.
- Full-page Firebase client hydration before account deletion.
- Authenticated production video playback and unavailable-first fallback.
- Actual 200% browser zoom.
- Vercel Spend Management notifications or a supported hard spending cap.

These gates remain separate so the synthetic fixture can't be mistaken for provider or production evidence.
