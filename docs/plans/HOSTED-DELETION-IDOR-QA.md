# Hosted deletion and two-user ownership QA plan

## User outcome

Two disposable verified password members can use the public production application without one member reading, mutating, activating, or deleting the other member's resources. Each member can then deliberately delete their own Firebase identity and complete owned Neon graph through **Settings → Session and data → Review permanent deletion**, after password reauthentication and the exact `DELETE` phrase. The flow never touches a real member, personal mailbox, paid setting, global catalog row, or unrelated Firebase/Neon identity.

This lane extends the completed hosted password lifecycle. It does not repeat registration, recovery delivery, or verification-email assertions. Google consent and Google reauthentication remain a separate interactive lane.

## Navigation

1. A server-generated Alice identity and a server-generated Bob identity are created directly in Firebase Admin as verified disposable password users; neither email or UID is printed.
2. Alice signs in through `/sign-in?returnTo=%2Fapp`, onboards the dumbbell starter through the visible keyboard-operable form, creates one private custom exercise through the owner-scoped API, and starts one owned workout session without logging or completing it.
3. Bob signs in in a separate browser context, onboards the barbell starter, and remains the active browser for foreign-versus-missing API and rendered-route comparisons.
4. Bob attempts to read Alice's custom exercise and workout, activate Alice's program, and access Alice's workout route. Each result is compared with a fresh syntactically valid unknown identifier. Bob's own active program and both owners' scoped row summaries remain unchanged.
5. Bob opens a fresh `/app/settings` document, cancels the deletion review once, reopens it, proves a wrong password remains a bounded failure, then reauthenticates with the correct password and deletes only Bob.
6. Alice independently reloads Settings, reauthenticates, and deletes only Alice. Each successful deletion returns to `/?account=deleted`, clears the secure cookie and exact owner IndexedDB namespace, removes the Firebase identity, and leaves no owned database row.

## UI states

- Sign-in: loading, valid password, invalid password, secure session, and bounded return.
- Onboarding: ready, busy, created, malformed or failed response, and retry-stable idempotency.
- Ownership probes: foreign and missing results are equivalent; no success, redirect, owner hint, raw identifier, or cacheable response is accepted.
- Settings hydration: loading, ready matching client identity, dialog open, cancellation, focus return, wrong-password error, corrected password, exact phrase, deleting, completed, and protected-route denial.
- Cleanup: fully completed, identity already absent, resumable deletion job, safely recovered, or failed with a generic manual-cleanup gate. Provider/database errors never become success.

## Domain types and invariants

`HostedDeletionQaIdentity` contains one in-memory reserved-domain email, a generated high-entropy password, and an exact Admin-captured UID. `HostedOwnedResources` contains only opaque program, revision, custom-exercise, and workout IDs captured from structurally parsed application responses. None may enter a shell argument, log line, screenshot, documentation file, trace, or saved browser profile.

The browser never supplies a UID to an application route. Authorization comes only from each context's secure server cookie. Foreign and missing identifiers must have the same status, `Cache-Control`, safe error code/message, and normalized rendered outcome. Any owner hint, resource name, workout value, note, program label, or differing existence signal is a failure.

The deletion request remains exactly `{ confirmation: "DELETE", idempotencyKey }`. The existing client reauthenticates the matching current Firebase user, refreshes the secure server session with a fresh same-UID token, and submits no ownership field. The server requires verified/recent session identity again, deletes owned rows transactionally, deletes the exact Firebase UID afterward, and clears cookies only on confirmed completion.

## Persistence contracts

The lane may create, for each disposable owner, one Firebase identity, profile, preferences row, equipment row, starter program root/revision graph, and one idempotency receipt. Alice additionally owns one custom exercise and one active workout snapshot. Bob additionally owns no foreign resource and receives no reference to Alice through an application response.

Before external work, the runner records aggregate Firebase count and global catalog/template/video counts. For each captured UID it records privacy-safe table counts and hashes only inside process memory. After foreign/missing reads and mutations, the relevant Bob active-program identity and both owners' row counts/hashes must be unchanged. After deletion, every owned table count for that UID must be zero except the minimal completed account-deletion job required by the saga; global rows and the other owner remain unchanged until their own deletion.

Cleanup runs in `finally` for both exact captured UIDs. If the visible flow did not complete, the runner invokes the existing server-only account-deletion service for only the exact generated owner with a fresh cleanup idempotency key; it never sweeps by email prefix or deletes an arbitrary Firebase user. Cleanup is confirmed only when Firebase reports both UIDs absent, no profile/program/workout/custom/preference rows remain for either UID, deletion jobs are terminal, and aggregate Firebase count returns to baseline.

## Authentication, authorization, and CSRF

Both browser contexts establish sessions through the real Firebase client and production `/api/auth/session`. The harness checks `HttpOnly`, `Secure`, `SameSite=Strict`, and path `/` without printing cookie values. All direct mutation probes first obtain the same-origin double-submit CSRF token in that context and submit the exact header; no token is logged.

Bob's context performs every foreign probe. Alice identifiers never enter Bob's UI fields and are used only inside in-memory request construction. The runner compares foreign with random-missing results and verifies no database effect. Alice's context is never reused for Bob, and browser storage state is never exported.

## Loading, empty, error, interrupted, and worst-case states

Configuration parsing fails before Firebase/Neon/browser work unless the exact production origin, matching public/Admin project, required secrets, and explicit two-identity plus destructive-account approval are present. A browser, provider, API, database, assertion, or cleanup failure exits nonzero with only a stable non-sensitive stage and whether cleanup was confirmed.

The worst path is a process interruption after onboarding but before visible deletion. Exact-UID `finally` cleanup uses the already-tested saga/service and verifies the postcondition. A database commit followed by Firebase uncertainty remains a nonterminal deletion job and is retried only for that UID. If cleanup cannot be confirmed, the runner preserves no credentials but reports a manual cleanup gate; it never hides the uncertainty or claims baseline restoration.

The runner limits itself to two identities, two browser contexts, bounded API probes, and one visible deletion per owner. It runs no full public/authenticated matrix concurrently. Root `.next`, fixture `.next-authenticated`, Playwright results/reports, traces, videos, and temporary browser profiles are removed after evidence extraction. Only newest reviewed screenshots remain.

## Phone, tablet, and desktop behavior

The destructive two-user lifecycle runs once in desktop Chromium at `1440×1000` to minimize external mutations. A read-only WebKit phone replay may reuse no deleted identity; therefore phone layout remains covered by the existing production fixture and client-auth hydration evidence unless a separately retained disposable identity is deliberately kept until the phone inspection completes. This lane does not recreate accounts solely for redundant viewport screenshots.

The desktop dialog must fit within both viewport axes, keep its heading and terminal controls reachable, and retain no horizontal overflow. Existing automated phone/tablet/desktop account-deletion component evidence remains authoritative for responsive layout; the hosted run proves provider/persistence behavior.

## Accessibility

Browser actions use labels, roles, headings, focus, and Enter/Escape rather than implementation selectors where a semantic locator exists. The deletion heading receives focus on open; Escape/Cancel closes before deletion and returns focus to the review control; wrong-password and deletion states are live text; the final action remains disabled until both password and exact phrase exist. Axe serious/critical scans run on Bob's foreign-denial state, open deletion review, wrong-password state, and Alice's matching Settings state.

## Privacy and security

No email, password, UID, cookie, CSRF token, opaque owned resource ID, SQL, connection string, provider error, or workout content is printed or retained. Screenshots must show generic account labels only. The runner output contains only engine/viewport, aggregate pre/post counts, fixed probe names/statuses, cleanup confirmation, and pass/fail state.

All provider and database credentials remain in ignored local environment variables. No Vercel environment, Firebase configuration, Neon schema, production migration, catalog seed, deployment alias, billing, spend, or paid setting changes in this lane.

## Acceptance criteria

- Two exact disposable verified password users establish independent secure production sessions.
- Alice's visible dumbbell onboarding and Bob's visible barbell onboarding succeed without exposing identities.
- Bob receives indistinguishable foreign/missing results for Alice's custom exercise, workout API, program activation, and rendered workout route.
- Every foreign mutation has zero effect on Alice, Bob, and global persistence summaries.
- Cancellation performs no deletion and restores focus; wrong password performs no database/Firebase deletion and retains a retryable dialog.
- Correct password plus exact phrase deletes only the current owner, clears the cookie/local namespace, returns public, and denies the former protected route.
- Alice remains intact after Bob deletion; both owners and Firebase identities are absent only after their respective deletion flows.
- Aggregate Firebase count returns to baseline, global catalog/template/video counts remain identical, and only terminal minimal deletion jobs may remain.
- Unexpected console warning/error, page error, first-party HTTP failure, or request failure remains fatal except exact, documented provider 400 and superseded navigation-metadata boundaries.
- No secret, identity, opaque ID, trace, video, storage state, or browser profile is retained.

## Automated tests

Fail-first unit tests cover strict approval/configuration, two unique generated identities, output sanitization, exact-UID cleanup, foreign/missing response comparison, no-store equivalence, and cleanup-result classification. Integration tests continue to cover owner-scoped reads/writes, another-owner preservation, deletion rollback/resume, Firebase partial failure, idempotent completed replay, and global-row preservation.

The supported command will be discoverable and opt-in, for example:

```bash
MWP_HOSTED_DELETION_EXTERNAL_ACCOUNTS_APPROVED=1 pnpm test:e2e:hosted-deletion-idor
```

It must load ignored secrets internally and must not accept an email, password, UID, or resource ID as a command-line argument.

## Browser evidence required for completion

Retain exact production SHA/deployment, engine/viewport, safe Firebase before/after counts, fixed foreign/missing probe outcomes, zero-effect persistence summary, secure-cookie assertions, cancellation/focus/wrong-password evidence, both confirmed deletion outcomes, protected-route denial, Axe results, unexpected console/HTTP/request-failure result, and a bounded Vercel error-log query.

Retain at most two screenshots: Bob's foreign-denial plus deletion-review state, and the post-deletion public confirmation. They must contain no identity or opaque ID. Document that Google consent, real inbox delivery, and paid/spend settings remain unproved.
