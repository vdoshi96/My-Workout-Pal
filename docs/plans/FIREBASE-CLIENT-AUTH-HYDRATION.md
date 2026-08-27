# Firebase client-auth hydration plan

## User outcome

A verified member who opens Settings in a fresh tab or reloads the page can use the account-deletion review after Firebase has restored the same browser identity. The page never treats Firebase's temporary pre-hydration `currentUser === null` value as proof that the member is signed out. Deletion remains unavailable when the restored client identity is absent, belongs to a different UID, cannot be initialized within the bounded wait, or no supported Firebase/provider configuration exists.

This slice fixes client readiness and truthful Settings states. It does not weaken recent-authentication, confirmation, CSRF, secure-cookie, account-deletion saga, or server-derived ownership rules, and it does not delete a production member as test evidence.

## Navigation

The member enters **Settings → Session and data** through `/app/settings`, including a direct full-page load. While Firebase initializes, the permanent-deletion control is disabled and the page explains that it is checking the browser sign-in. A matching identity enables **Review permanent deletion**. An absent, mismatched, timed-out, or failed identity keeps deletion disabled and offers the bounded same-origin route `/sign-in?returnTo=%2Fapp%2Fsettings`. Retrying readiness stays on Settings and never submits a deletion.

The existing dialog flow remains impact review, exact `DELETE` phrase, provider-specific reauthentication, secure-session refresh, server deletion, local owner-namespace cleanup, Firebase sign-out, and public return. Cancel closes the dialog and restores normal Settings navigation without a write.

## UI states

- `loading`: Firebase configuration and provider support exist, but initial client auth is not settled. The deletion button is disabled and a polite status says the browser sign-in is being checked.
- `ready`: the settled Firebase client UID exactly matches the server-derived owner UID. The review button is available when the server viewer may permanently mutate.
- `missing`: Firebase settled with no client identity. The page asks the member to sign in again through the bounded Settings return route.
- `mismatch`: Firebase settled with a different UID. The page reports an identity mismatch without exposing either UID and requires sign-in again.
- `unavailable`: Firebase initialization rejected or exceeded its bounded timeout. The page keeps deletion disabled and offers a readiness retry plus the bounded sign-in route.
- `unsupported`: Firebase configuration, mutation eligibility, or the password/Google provider contract is absent. Existing truthful configuration/provider guidance remains visible.
- `reauthenticating`, `refreshing-session`, `deleting`, `completed`, and recoverable failure states remain owned by the existing deletion orchestration.

## Domain types and invariants

`FirebaseClientIdentityState` is a discriminated union containing only `loading`, `ready`, `missing`, `mismatch`, or `unavailable`; it never contains a UID, email, token, cookie, or provider payload. Classification compares the settled Firebase user UID with the server-provided owner UID in memory and returns only the safe state.

The readiness helper waits for Firebase `Auth.authStateReady()` before reading `Auth.currentUser`, applies a bounded timeout, clears its timer on every terminal path, maps provider rejection to `unavailable`, and never logs the raw failure. The component subscribes to later Firebase auth-state changes only after initial readiness so sign-out or account switching immediately disables deletion. Unmounting prevents stale state updates and removes the subscription.

The server-derived owner UID remains the comparison authority and is never accepted from a mutation body. A client match enables only the provider reauthentication UI; the server still re-verifies the fresh ID token, creates the secure HTTP-only session, applies recent-authentication and ownership checks, and derives the deletion target itself.

## Persistence contracts

Client readiness writes no database row, Firebase user field, cookie, local-storage key, IndexedDB record, or service-worker cache entry. It reads only Firebase's already-configured browser persistence through the SDK. Retrying readiness is idempotent and does not change the account.

The account-deletion persistence contract remains unchanged: the same stable deletion idempotency key survives recoverable failures; database-owned data is removed transactionally before Firebase Admin identity deletion; local IndexedDB cleanup occurs only after confirmed completion; and old workout/program history is never rewritten.

## Authentication, authorization, privacy, and security

The server-rendered page first authenticates the revocation-aware HTTP-only session and passes only the minimum viewer fields required by the client. Firebase client state is not authorization. Client identity absence or mismatch fails closed before a destructive request. The sign-in recovery destination is the exact allowlisted same-origin Settings path and cannot be supplied by the Firebase client.

No readiness error exposes Firebase configuration, UID, email, token, cookie, SDK payload, or raw exception. No secrets enter test artifacts. A real browser replay may use only a disposable Firebase identity whose creation and cleanup follow the hosted-auth plan; Google consent remains an explicit interactive provider gate.

## Loading, empty, error, interrupted, and worst-case behavior

A slow persisted-auth restore shows `loading`, prevents review/deletion, and remains keyboard-readable. A timeout or provider rejection becomes `unavailable`, not `missing`, so the page does not falsely claim sign-out. A settled null user becomes `missing`; a different UID becomes `mismatch`. A later sign-out/account switch revokes the ready UI before submission, while the deletion orchestration checks the current identity again before reauthentication.

Reload, back/forward navigation, tab suspension, Strict Mode effect replay, and component unmount cannot duplicate a deletion or leak a timer/subscription. If the browser becomes offline during initialization, the user sees the safe unavailable state and can retry after reconnecting. If readiness changes after the dialog opens, submission still fails closed on the current-user equality check and performs no server deletion.

Authenticated shell navigation does not issue speculative RSC prefetches while a full-page Settings recovery state is loading. The logo and account navigation still perform ordinary server-rendered navigation after activation. This boundary prevents an unused private `/app` request from becoming a WebKit page error or an undocumented authenticated request during identity recovery.

## Mobile, tablet, desktop, accessibility, and motion

The readiness message sits with the existing account-deletion control and wraps without horizontal overflow at phone, tablet, and desktop widths. Status changes use a polite live region; unavailable/mismatch failures use an alert only when user action is required. The disabled review button remains natively disabled. Recovery and retry controls have visible focus, descriptive names, and at least the project's established touch-target size. Readiness introduces no animation, so reduced-motion behavior is unchanged; dark and forced-color modes retain non-color text meaning.

## Acceptance criteria

- A full-page Settings load waits for Firebase's initial auth state and enables deletion only for the same UID as the server viewer.
- Pre-hydration `currentUser === null` never produces the terminal missing-identity state.
- Missing, mismatched, rejected, and timed-out identity states disable deletion and disclose no identity value.
- The bounded sign-in action returns to `/app/settings`; retry performs only a readiness check.
- A later Firebase sign-out or account switch disables deletion before a destructive request.
- Password and Google reauthentication still require the same UID, a fresh ID token, and a server-confirmed secure session.
- A malformed, duplicate, stale, cross-origin, unverified, expired, revoked, or wrong-owner deletion request remains rejected by the existing server boundaries.
- The authenticated logo and account navigation issue no automatic RSC prefetch during a direct Settings load or reload.
- No new provider/database writes occur merely by loading or retrying Settings.

## Automated tests

Retain a fail-first unit test proving that a delayed readiness promise is awaited before reading the client user. Pure tests cover matching, missing, mismatched, rejected, timed-out, retry, timer cleanup, and a later auth-state change. Deletion orchestration tests continue to prove exact confirmation before client-state access, same-UID enforcement, popup cancellation, password failure, secure-session refresh ordering, stable idempotency, and confirmed-only cleanup.

A component/source test proves the initial Settings render describes Firebase initialization and disables permanent deletion until `ready`; safe recovery copy and the exact bounded return link are present for non-ready terminal states. A source-policy test requires `prefetch={false}` on the authenticated logo and account navigation. Existing route, service, repository, migration, ownership, CSRF, and account-deletion suites remain green. The normal verification commands are strict TypeScript, full lint, focused unit/integration tests, documentation parity, production build, and production-boundary inspection.

## Browser evidence required for completion

Credential-free browser evidence covers the Settings layout and recovery states without a production test bypass under `src/app`. The WebKit replay collects page errors, console warnings and errors, failed first-party responses, and failed first-party requests; the expected terminal sets are empty after a direct Settings load and reload. Credential-backed evidence uses a disposable identity and must prove a genuine full-page `/app/settings` load with delayed Firebase restoration, matching-UID readiness, dialog cancellation/focus return, wrong-password or popup-cancel failure, and no request on absent/mismatched identity. Password and Google identities are checked separately; a Google browser session may require explicit user interaction.

The destructive success replay uses only a disposable approved target, records pre/post aggregate Firebase and Neon ownership counts without identifiers, confirms public navigation and secure-cookie removal, and deletes the disposable identity in `finally` if the application path does not. Phone, tablet, and desktop Chromium/WebKit inspection covers overflow, keyboard, live-region, dark/reduced-motion behavior, and Axe. Hosted preview/production evidence is run only after the exact release SHA is Ready; no personal or production member account is deleted.
