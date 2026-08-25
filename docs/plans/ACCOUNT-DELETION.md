# Account Deletion Implementation Plan

## User outcome and navigation

A signed-in member can open **Settings → Session and data → Delete account**, review exactly what will be removed, reauthenticate with the same Firebase provider, type `DELETE`, and start permanent deletion. Cancellation returns to Settings without a write. Success clears the matching offline workout namespace, Firebase client state, secure server session, database-owned fitness data, and Firebase identity, then returns to the public landing page with no claim that deleted data can be recovered.

This flow is unavailable to guests, unverified password accounts, identities with an unsupported provider, or sessions without a recent authentication time. Password users re-enter their password; Google users complete the provider popup. Reauthentication must produce a fresh ID token for the same UID, after which the existing session endpoint replaces the secure cookie before deletion is submitted.

## Interface states and navigation protection

Settings exposes a staged deletion review rather than an immediately active destructive button. The flow has explicit impact-review, phrase-confirmation, provider-reauthentication, refreshing-session, ready, deleting-database, deleting-Firebase, completed, database-failed, Firebase-partial-failure, auth-expired, offline, and retry states. The final button stays disabled until the confirmation phrase is exact and the fresh session is established.

The review is a labeled modal dialog with focus moved to its heading, Escape and Cancel before the destructive request, focus return on cancellation, a visible danger description, and no color-only meaning. Once the server accepts deletion, navigation is blocked until a truthful terminal response arrives. Closing the tab after acceptance is safe because a durable server job records the phase. A duplicate submission resumes or replays the same owner-scoped job rather than deleting another identity.

## Domain types and invariants

The deletion request contains only the exact confirmation phrase and an idempotency key. It never accepts a Firebase UID, email, provider, deletion status, or table list. The server derives UID and provider from the revocation-aware session, requires verified email, and applies the five-minute recent-authentication policy again at action time.

`account_deletion_jobs` is the minimal durable saga record. It retains Firebase UID, status, attempt count, safe phase/error code, requested/updated/completed timestamps, and the idempotency request hash, but no email, name, workout value, note, token, or raw provider error. The job cannot retain a restrictive foreign key to `user_profiles`, because it must survive fitness-data deletion and support Firebase retry. Status transitions are monotonic: pending to running, then completed or failed/blocked; a completed job is terminal. Each retry increments the bounded attempt counter and never reconstructs deleted fitness data.

The confirmation phrase is case-sensitive `DELETE`. Keys are nonblank and bounded to 180 characters. A reused key with different content is a conflict. A request for a completed job returns the completed result. A request for a running job returns an honest in-progress/retry response rather than starting a concurrent deletion.

## Persistence and deletion order

The first database transaction locks the job/owner boundary, creates or resumes the job, marks the profile `deletion_pending` when it still exists, and removes owner rows in explicit foreign-key order:

1. progress-summary source links;
2. personal records, progress summaries, and mutation idempotency rows except the deletion saga record;
3. set logs, cardio logs, exercise outcome states, exercise snapshots, and workout sessions;
4. program cardio prescriptions, prescriptions, sections, days, revisions, and program roots after clearing the active-revision pointer;
5. custom exercise videos, aliases, equipment links, and custom exercises;
6. preferences, equipment profile, and user profile.

Catalog, curated videos, equipment catalog, templates, template revisions, template days/sections/prescriptions/cardio, and every other user's rows remain untouched. All owner-data deletion either commits together or rolls back together. The job is updated to the Firebase phase in the same transaction so a network interruption after commit can resume safely.

The immutable program-revision and workout-history triggers admit one deliberate exception for this transaction. A transaction-local setting contains the server-derived owner UID, and each trigger permits only `DELETE` when the affected row has that exact owner. It does not authorize inserts, updates, another owner's rows, or any request that bypasses the repository transaction.

After database commit, Firebase Admin deletes exactly the server-derived UID. `auth/user-not-found` is idempotent success. On success, a second small transaction marks the durable job completed. On retryable or unknown Firebase failure, the job records only a stable safe code and remains failed/blocked for the same freshly reauthenticated UID to retry. Fitness data is never restored and the UI must say that database data is already gone. Session-cookie clearing occurs on completed deletion; partial Firebase failure preserves only the minimum session needed to retry and denies ordinary account surfaces through the missing/deletion-pending profile boundary.

## Authentication, authorization, CSRF, and privacy

The route verifies same-origin double-submit CSRF before work, resolves the revocation-aware secure session before parsing a hostile body or opening the database, asserts verified email and recent authentication, and derives ownership only from the session UID. Firebase client reauthentication is not trusted as authorization; it is useful only because the server subsequently verifies the fresh token and creates a recent secure session.

Wrong-provider, popup-cancelled, password-error, token-expired, revoked-cookie, mismatched-UID, unverified-email, malformed-body, guessed-key, cross-origin, and duplicate requests never remove data. Cross-user identifiers are not accepted. Private responses are dynamic `no-store`, structured logs omit secrets and fitness content, and Firebase Admin credentials remain in local/Vercel environment configuration only.

## Loading, empty, interrupted, and worst-case behavior

An absent job is normal before deletion. Missing owner data with a same-UID failed job means database removal already completed and only Firebase retry is allowed. Missing owner data without a job is a safe not-found conflict, not permission to delete Firebase blindly. A database exception rolls back all owned rows and leaves the existing account usable unless a prior job already restricted it. A process crash after database commit but before Firebase deletion leaves a resumable job. A crash after Firebase success but before completion marking is resolved by treating Firebase `user-not-found` as successful replay.

Offline or client-network failure before server acceptance leaves everything unchanged. Failure after acceptance tells the user the result is unknown and offers same-key retry after reconnection. Slow requests disable duplicate controls but never show success early. Account deletion never runs from a service worker, background sync, GET request, or unverified client-only state.

## Phone, tablet, desktop, accessibility, and motion

On phones the review sheet fits within safe-area insets and scrolls its content while the action footer stays reachable at 200% zoom. Tablet and desktop use a centered bounded dialog. Logical DOM and focus order remain impact, confirmation phrase, reauthentication, final action, Cancel. All fields have labels and described errors; live status is polite until a failure becomes an alert. Keyboard-only completion, screen-reader naming, visible focus, dark mode contrast, and reduced-motion behavior are required. Provider popups have an equivalent error and retry path.

## Acceptance criteria

- A recently reauthenticated verified password or Google member can deliberately delete the same account.
- Every owned database row is removed in one transaction while catalog/template/global rows and another owner's complete graph remain byte-stable.
- Firebase deletion follows database commit, and success clears the secure cookie plus only the matching IndexedDB namespace.
- Database rollback leaves fitness data intact and never calls Firebase deletion.
- Firebase failure leaves fitness data deleted, records a minimal retryable job, restricts ordinary account use, and succeeds safely when retried.
- `auth/user-not-found` completes an interrupted replay without false failure.
- Invalid confirmation, stale auth, wrong provider, mismatched UID, unverified email, CSRF failure, malformed input, idempotency conflict, concurrent request, and cross-user attempts perform no deletion.
- No response, log, job, cache, or documentation artifact contains a token, password, private key, email, workout note, raw SQL error, or another user's identifier.

## Automated tests and browser evidence

Retained failing-first domain tests cover confirmation normalization, recent-auth gates, monotonic saga transitions, safe Firebase error classification, and idempotency hashing. PGlite integration tests use the real migration and seed to prove exact owner-table deletion, another-owner preservation, global-row preservation, rollback, retry after profile removal, completed replay, concurrent running state, and ownership derived from the viewer. Route tests prove CSRF and session verification before body/database/Firebase access, private cache headers, cookie behavior, stable error mapping, and absence of UID input.

Client tests cover password and Google reauthentication, wrong-password/popup-cancel/network errors, same-UID verification, exact phrase, disabled duplicate action, local namespace clearing only after completed deletion, and retained retry UI after partial failure. Browser evidence requires phone/tablet/desktop Chromium and WebKit cancellation, keyboard completion, slow/offline failure, duplicate submit, partial retry, protected-route denial, and post-success public navigation. Live provider deletion is blocked until a disposable configured Firebase test account exists; production-user deletion is never used as QA evidence.
