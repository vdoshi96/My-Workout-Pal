# Hosted authentication QA plan

## User outcome

A person can create a password account, receive truthful verification guidance, sign in with invalid and valid credentials, recover access without account enumeration, use a verified secure server session, sign out, and be rejected after server-side revocation on the public Vercel deployment. This verification uses a generated disposable identity; it never uses a production member, a personal mailbox, or a saved credential.

Google sign-in and Google reauthentication remain a separate interactive provider lane because they require a real Google consent session. The password harness must not claim that those flows passed.

## Navigation

The browser starts at `/sign-in?returnTo=%2Fapp`, exercises Sign in, Register, and Recovery without leaving the same-origin application shell, then follows the secure session into `/app`. An unverified identity sees the read-only account banner and disabled onboarding mutation. After server-side verification and a fresh sign-in, the same route shows a verified account and enabled onboarding action. Settings sign-out returns to `/sign-in`. Revoking the server session and reloading `/app` returns to `/sign-in?returnTo=%2Fapp`.

## UI states

- Loading and busy controls expose `Working…` and disable duplicate submission.
- Invalid credentials show the bounded Firebase error without exposing provider details.
- Registration success explains that the email must be verified before permanent changes.
- Duplicate registration offers sign-in or recovery rather than a false success.
- Recovery uses the same generic success text for known and unknown addresses.
- Unverified sign-in creates a legitimate read-only server session and keeps permanent controls disabled.
- Verified sign-in opens onboarding with permanent controls enabled.
- Sign-out clears the secure session and returns to public authentication.
- Revoked sessions fail closed on the next server-rendered private request.
- Provider, network, cleanup, or assertion failure is recorded as a failed run. The test never converts it into success.

## Domain types and invariants

`HostedAuthQaConfig` contains a normalized HTTPS origin, the one permitted Firebase project ID, and an explicit external-account approval flag. Configuration parsing rejects credentials in URLs, paths, query strings, fragments, HTTP, unknown hosts, missing Admin values, mismatched public/Admin project IDs, and an absent approval value.

The disposable identity uses a random suffix, the reserved `example.com` domain, a generated high-entropy password, no personal name, and a recognizable QA display marker. Its UID is learned from Firebase Admin after registration and is never accepted from the application. At most one identity belongs to one test invocation. Cleanup may delete only that exact captured UID and runs in `finally`; it never searches for or sweeps unrelated users.

The browser test does not create a Neon profile or program. The only permanent-mutation control is inspected for disabled/enabled state, not submitted. Therefore an interrupted run can leave at most one disposable Firebase identity, never workout or program data. The report must state cleanup success or the exact manual credential gate without printing the email, password, UID, token, cookie, or Firebase configuration.

## Persistence contracts

Firebase Authentication is the only external persistence touched by this lane. Successful browser registration creates the disposable password identity. Firebase Admin reads its verification state, changes only `emailVerified` for that exact UID, revokes only that UID's refresh tokens, and finally deletes only that UID. The application session endpoint may create and delete its ordinary secure HTTP-only cookie. No database mutation endpoint is called.

The Playwright evidence directory may retain screenshots of the read-only and verified private shells only when they contain no credential, token, cookie, email, or UID. Traces, videos, storage state, environment dumps, provider payloads, and browser profiles are not retained.

## Authentication and authorization

The app continues to obtain ownership only from the Firebase Admin-verified secure cookie. The harness checks that `mwp_session` is HTTP-only, Secure, SameSite Strict, and scoped to the deployed host without reading or printing its value. It proves an unverified password identity is ineligible for permanent mutation, a verified identity is eligible after a fresh token/session, sign-out removes the cookie, and server-side revocation invalidates the old cookie.

CSRF and cross-user behavior remain covered by the existing integration and repository matrices. This lane does not weaken the same-origin boundary or add a test-only production route. A later two-identity hosted lane must use opaque owned resource IDs and verify missing/foreign response equivalence without accepting a client UID.

## Loading, empty, error, interrupted, and worst-case behavior

The runner validates all configuration before launching a browser. Missing secrets, a non-HTTPS or unknown origin, project mismatch, or absent explicit approval stops before registration. The test records the created UID immediately after Firebase confirms registration. Every later operation is inside `try/finally`; cleanup is attempted even after a browser assertion, session, verification, recovery, sign-out, or revocation failure.

If cleanup fails, the command exits nonzero and prints only a safe instruction that one disposable identity requires operator cleanup. It must not print the identity or raw provider error. A killed process between registration and `finally` is the worst path; the run report must inspect aggregate Firebase user count before and after execution and must not claim cleanup without a confirmed `auth/user-not-found` result.

## Mobile, tablet, and desktop behavior

The first hosted password lifecycle runs in desktop Chromium to prove the provider and server boundary with minimal repeated external activity. After that passes, the same already-provisioned verified identity may be exercised read-only on phone, tablet, and WebKit for layout, keyboard, and accessibility evidence. Registration, recovery email dispatch, verification mutation, revocation, and deletion are not repeated merely to obtain viewport screenshots.

## Accessibility

Browser assertions use roles, labels, headings, and visible status text. The run checks keyboard access to all three authentication modes, focus visibility through submission, the read-only verification banner, disabled-state semantics, and no serious or critical Axe violations on sign-in, unverified `/app`, and verified `/app`. Reduced motion and dark mode are checked with the read-only verified shell rather than by recreating identities.

## Privacy and security

No personal account or mailbox is used. Generated credentials live only in process memory and are never supplied as shell arguments, written to `.env`, printed, committed, included in screenshots, or preserved in Playwright traces. Firebase Admin secrets remain in ignored local environment variables. The runner refuses non-production-like HTTP targets and hosts outside the explicit allowlist. Provider errors are mapped to stable safe codes.

The reserved example-domain address cannot receive a verification or recovery message. This lane proves Firebase accepted the request and the UI represented it truthfully; it does not claim inbox delivery or verification-link completion. Google consent, personal email delivery, Vercel Spend Management, and paid settings remain out of scope.

## Acceptance criteria

- The runner fails before browser launch without an explicit external-account approval flag.
- Only the public My Workout Pal Vercel origin and Firebase project `my-workout-pal-92819` are accepted.
- Invalid credentials, successful registration, duplicate registration, recovery request, unverified read-only sign-in, verified sign-in, secure-cookie attributes, sign-out, and revocation denial are observed in a real hosted browser.
- Verification is changed only through Firebase Admin for the captured disposable UID, followed by a fresh client sign-in.
- No onboarding, program, workout, preference, or custom-exercise mutation is submitted.
- The disposable Firebase identity is confirmed absent after cleanup, and aggregate user count returns to its pre-run value.
- No credential, token, cookie, UID, email address, environment value, provider payload, trace, video, or browser profile is retained.
- Failures remain failures and identify whether cleanup was confirmed without exposing sensitive details.

## Automated tests

Fail-first unit tests cover configuration acceptance and rejection, exact host and project matching, explicit approval, credential-free URLs, project mismatch, and safe generated-identity shape. The hosted Playwright test is opt-in and excluded from the ordinary public release matrix. Existing unit and integration suites continue to prove CSRF ordering, malformed identity rejection, duplicate/invalid error mapping, unverified mutation denial, expired/revoked session classification, recent-auth deletion gates, and owner isolation.

The reproducible commands are:

```bash
pnpm test:unit -- tests/unit/hosted-auth-qa.test.ts
MWP_HOSTED_AUTH_EXTERNAL_ACCOUNT_APPROVED=1 pnpm test:e2e:hosted-auth
```

The second command loads ignored local Firebase configuration internally. It must not be pasted with a generated email or password.

## Browser evidence required for completion

Retain the command result, public origin, browser engine/viewport, exact deployed Git SHA, pre/post aggregate Firebase counts, secure-cookie attribute assertions, read-only and verified screenshots without identity data, Axe result, console warning/error result, and bounded Vercel error-log query. Record that verification and recovery email delivery were not observed because the address is intentionally non-deliverable. Run production only after the exact release SHA is Ready and never use a real member for account-deletion QA.
