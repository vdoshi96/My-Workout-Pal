# Hosted authentication QA plan

## User outcome

A person can create a password account, receive truthful verification guidance, sign in with invalid and valid credentials, recover access without account enumeration, use a verified secure server session, sign out, and be rejected after server-side revocation on the public Vercel deployment. This verification uses two purpose-separated disposable identities on the reserved, non-routable `example.invalid` domain; it never uses a production member, a personal mailbox, or a saved credential.

Google sign-in and Google reauthentication remain a separate interactive provider lane because they require a real Google consent session. The password harness must not claim that those flows passed.

## Navigation

The browser starts at `/sign-in?returnTo=%2Fapp`, exercises Sign in, Register, and Recovery with the application identity without leaving the same-origin application shell, then follows its secure session into `/app`. That unverified identity sees the read-only account banner and disabled onboarding mutation. Because a new member has no program or Settings model yet, an account-shell **Sign out** action remains available before onboarding; it clears only the server viewer's local runner namespace, removes the secure session, signs out the configured Firebase client, and returns to `/sign-in`. The trusted runner then creates the separate action-code identity through Firebase Admin, completes verification and reset codes entirely in memory, and signs that recovered identity in through the public page. `/app` shows a verified account and enabled onboarding action. Revoking that identity's server session and reloading `/app` returns to `/sign-in?returnTo=%2Fapp`.

## UI states

- Loading and busy controls expose `Working…` and disable duplicate submission.
- Invalid credentials show the bounded Firebase error without exposing provider details.
- Registration success explains that the email must be verified before permanent changes.
- Duplicate registration offers sign-in or recovery rather than a false success.
- Recovery uses the same generic success text for known and unknown addresses.
- Unverified sign-in creates a legitimate read-only server session and keeps permanent controls disabled.
- Verified sign-in opens onboarding with permanent controls enabled.
- Sign-out is available before onboarding, reports its pending/failure state, clears the secure session only after owner-scoped local cleanup, signs out the Firebase client when configured, and returns to public authentication.
- Revoked sessions fail closed on the next server-rendered private request.
- Provider, network, cleanup, or assertion failure is recorded as a failed run. The test never converts it into success.

## Domain types and invariants

`HostedAuthQaConfig` contains a normalized HTTPS origin, the one permitted Firebase project ID, and an explicit external-account approval flag. Configuration parsing rejects credentials in URLs, paths, query strings, fragments, HTTP, unknown hosts, missing Admin values, mismatched public/Admin project IDs, and an absent approval value.

Each disposable identity uses a distinct random suffix, the IANA-reserved non-routable `example.invalid` domain, two generated high-entropy passwords, no personal name, and a recognizable QA display marker. The application identity's UID is learned from Firebase Admin after browser registration; the action-code identity's UID is returned by its exact Admin creation. Neither UID is accepted from the application. Exactly two identities belong to one action-code test invocation. Cleanup may delete only those two captured UIDs and runs in `finally`; it never searches for or sweeps unrelated users.

The browser test does not create a Neon profile or program. The only permanent-mutation control is inspected for disabled/enabled state, not submitted. Therefore an interrupted run can leave at most the two named disposable Firebase identities, never workout or program data. The report must state cleanup success or the exact manual credential gate without printing either email, password, UID, token, cookie, or Firebase configuration.

Account-shell sign-out uses the server-derived UID only to select the local IndexedDB namespace. The session DELETE request contains no UID and remains protected by the same-origin double-submit CSRF boundary. A structural parser must confirm the exact `{ authenticated: false }` response before the UI claims completion; malformed success retains the signed-in page and exposes a safe retry message.

## Persistence contracts

Firebase Authentication is the only external persistence touched by this lane. Successful browser registration creates the application password identity. Firebase Admin creates the separate action-code identity, reads its verification state, revokes only that UID's refresh tokens, and finally deletes both captured UIDs. Applying the verification and reset codes changes only the action-code identity. The application session endpoint may create and delete its ordinary secure HTTP-only cookie. No database mutation endpoint is called.

The Playwright evidence directory may retain screenshots of the read-only and verified private shells only when they contain no credential, token, cookie, email, or UID. Traces, videos, storage state, environment dumps, provider payloads, and browser profiles are not retained.

## Authentication and authorization

The app continues to obtain ownership only from the Firebase Admin-verified secure cookie. The harness checks that `mwp_session` is HTTP-only, Secure, SameSite Strict, and scoped to the deployed host without reading or printing its value. It proves an unverified password identity is ineligible for permanent mutation, a verified identity is eligible after a fresh token/session, sign-out removes the cookie, and server-side revocation invalidates the old cookie.

CSRF and cross-user behavior remain covered by the existing integration and repository matrices. This lane does not weaken the same-origin boundary or add a test-only production route. A later two-identity hosted lane must use opaque owned resource IDs and verify missing/foreign response equivalence without accepting a client UID.

## Loading, empty, error, interrupted, and worst-case behavior

The runner validates all configuration before launching a browser. Missing secrets, a non-HTTPS or unknown origin, project mismatch, or absent explicit approval stops before registration. The test records each created UID immediately after Firebase confirms the corresponding registration or Admin creation. Every later operation is inside `try/finally`; cleanup is attempted even after a browser assertion, session, verification, recovery, sign-out, or revocation failure.

First-party console, HTTP, page-error, and request-failure collectors fail closed. The only navigation-metadata exception is a browser-reported `ERR_ABORTED` or `cancelled` GET or HEAD request for the exact `/manifest.webmanifest` path while a full-document authentication transition supersedes the page; API, RSC, script, style, image, mutation, and every other failed request remain fatal. The two deliberate Firebase Identity Toolkit 400 responses are awaited by exact operation and must match the browser's two generic failed-resource console messages.

If cleanup fails, the command exits nonzero and prints only a safe instruction that up to two disposable identities require operator cleanup. It must not print either identity or raw provider error. A killed process between creation and `finally` is the worst path; the run report must inspect aggregate Firebase user count before and after execution and must not claim cleanup without a confirmed `auth/user-not-found` result for every captured UID.

## Mobile, tablet, and desktop behavior

The first hosted password lifecycle runs in desktop Chromium to prove the provider and server boundary with minimal repeated external activity. After that passes, the same already-provisioned verified identity may be exercised read-only on phone, tablet, and WebKit for layout, keyboard, and accessibility evidence. Registration, recovery email dispatch, verification mutation, revocation, and deletion are not repeated merely to obtain viewport screenshots.

## Accessibility

Browser assertions use roles, labels, headings, and visible status text. The run checks keyboard access to all three authentication modes, focus visibility through submission, the read-only verification banner, disabled-state semantics, and no serious or critical Axe violations on sign-in, unverified `/app`, and verified `/app`. Reduced motion and dark mode are checked with the read-only verified shell rather than by recreating identities.

## Privacy and security

No personal account or mailbox is used. Both identities use `example.invalid`, so email cannot be delivered to a third party. Generated credentials live only in process memory and are never supplied as shell arguments, written to `.env`, printed, committed, included in screenshots, or preserved in Playwright traces. Firebase Admin secrets remain in ignored local environment variables. The runner refuses non-production-like HTTP targets and hosts outside the explicit allowlist. Provider errors are mapped to stable safe codes.

The reserved invalid-domain addresses cannot receive verification or recovery messages. This lane proves Firebase accepted the application requests and the UI represented them truthfully; it does not claim inbox delivery. Google consent, personal email delivery, Vercel Spend Management, and paid settings remain out of scope.

## Email action-link continuation

### User outcome and navigation

The purpose-separated action-code identity completes Firebase's email-verification and password-reset action-code semantics independently of the application identity used to observe email-request behavior. The browser still starts on the production `/sign-in?returnTo=%2Fapp` surface, registers the application identity, requests recovery, signs in as unverified, and signs out. The trusted QA process then creates the second identity through Firebase Admin, generates its verification and reset links without dispatching email, extracts each bounded action code in memory, applies it through Firebase's documented Identity Toolkit REST endpoints, and returns to the production sign-in page. The action identity's old password must fail after reset, while its new generated password must create a verified secure application session.

This continuation does not deliver a message, inspect an inbox, add a custom email handler, or use a routable address. The application identity's `sendEmailVerification` and `sendPasswordResetEmail` requests remain request-acceptance evidence; the action identity's Admin-generated links provide the otherwise missing provider action-code evidence. Purpose separation is required because Firebase returned a generic internal error when Admin link generation immediately followed an application email dispatch for the same disposable account; the harness must not reinterpret that provider failure as success.

### UI states and domain invariants

- The browser retains registration, duplicate registration, known and unknown recovery, unverified read-only, sign-out, verified session, secure-cookie, and revocation states.
- Provider action states distinguish verification-link generation, link parsing, code application, verified-user confirmation, reset-link generation, reset-code inspection, reset confirmation, old-password rejection, and recovered-password sign-in.
- Each `HostedAuthQaIdentity` contains two independent high-entropy passwords in process memory, and the two generated identities have distinct addresses. Every recovered password differs from its registration password; none enters output, screenshots, shell arguments, URLs, files, or documentation.
- A parsed action link must use HTTPS, the exact configured Firebase action-handler host and `/__/auth/action` path, the expected `mode`, the configured public API key, and one nonblank `oobCode`. Credentials, fragments, unknown parameters that change action meaning, wrong projects, wrong modes, malformed or repeated scalar values, and unexpected hosts fail closed before a provider write.
- Verification succeeds only when the REST response identifies the generated email and Firebase Admin confirms the captured UID is verified. Reset-code inspection and confirmation must identify the same generated email and `PASSWORD_RESET` request type.
- No raw action link, action code, API key, password, email, UID, provider response, or provider error enters terminal output or retained evidence.

### Persistence, authentication, authorization, and recovery

Firebase Authentication remains the only persistence boundary. The continuation may change `emailVerified` and the password for the exact captured action-code identity. It creates no Neon profile, program, workout, preference, custom exercise, or analytics row. The application still derives ownership only from the secure server session; action-code application grants no application ownership by itself.

Every provider response is parsed structurally before the run advances. A malformed `2xx`, wrong email, wrong request type, expired or replayed code, network failure, or uncertain provider response fails the run. Cleanup deletes only the two exact captured Firebase UIDs in `finally`, confirms both are absent, and verifies the aggregate user count returns to baseline. The runner never retries code application after an uncertain accepted response; it reconciles through Firebase Admin state instead.

### Loading, worst-case, responsive, accessibility, privacy, and security

Provider calls use bounded timeouts and stable non-sensitive stages. The worst path is interruption after one code changes one identity while both identities exist. Exact-UID cleanup remains sufficient because no application data is created. The action-link work adds no viewport-specific UI; the existing 1,440 by 1,000 production browser pass continues to prove the sign-in, unverified, and verified surfaces, keyboard operation, and serious or critical Axe boundary. Phone, tablet, WebKit, reduced-motion, dark-mode, and 200% behavior remain covered by the broader authenticated and public matrices rather than repeated provider mutations.

The official REST endpoints receive only the generated action code and recovered password for the exact action-code account. Those values remain in process memory and are never printed. Fetch failures and provider errors are reduced to stable stages. A failed run deletes screenshots and retains no trace, video, browser profile, action URL, or network payload.

### Acceptance criteria, automated tests, and browser evidence

- Pure tests fail first for the missing action-link parser, then cover exact host/path/key/mode acceptance plus hostile host, credential URL, wrong project key, wrong mode, repeated scalar, missing code, query credential, and fragment rejection.
- Identity tests prove independent high-entropy registration and recovered passwords, reserved non-routable addresses, and pairwise-distinct identities.
- Command policy tests require stable action-code stages, structural response parsing, provider timeouts, exact-identity reconciliation, sanitized errors, and the absence of action-link or code output.
- The hosted production run observes the application's real verification and recovery requests for the application identity, creates the distinct action-code identity, completes its Admin-generated verification code, confirms its captured UID is verified, completes its Admin-generated password reset, rejects its old password, accepts its recovered password, creates the secure session, proves revocation denial, confirms both UIDs absent, and restores Firebase users to the exact baseline.
- The existing three intended first-party session mutations remain the complete application mutation set. The provider action-code calls are classified separately and create no Neon row.
- The QA record states that Firebase email delivery and a real inbox click remain unobserved. It may claim provider action-code completion only after the exact sanitized production result passes.

## Acceptance criteria

- The runner fails before browser launch without an explicit external-account approval flag.
- Only the public My Workout Pal Vercel origin and Firebase project `my-workout-pal-92819` are accepted.
- Invalid credentials, successful registration, duplicate registration, recovery request, unverified read-only sign-in, verified sign-in, secure-cookie attributes, sign-out, and revocation denial are observed in a real hosted browser.
- A member with no profile/program can sign out through the account shell; no onboarding or database mutation is required to reach that action.
- Verification changes only for the captured action-code UID through the bounded Admin-link and REST flow, followed by a fresh client sign-in.
- No onboarding, program, workout, preference, or custom-exercise mutation is submitted.
- Both disposable Firebase identities are confirmed absent after cleanup, and aggregate user count returns to its pre-run value.
- No credential, token, cookie, UID, email address, environment value, provider payload, trace, video, or browser profile is retained.
- Failures remain failures and identify a stable, non-sensitive lifecycle stage plus whether cleanup was confirmed without exposing sensitive details.

## Automated tests

Fail-first unit tests cover configuration acceptance and rejection, exact host and project matching, explicit approval, credential-free URLs, project mismatch, safe generated-identity shape, account-shell sign-out ordering, and malformed-success refusal. The hosted Playwright test is opt-in and excluded from the ordinary public release matrix. Existing unit and integration suites continue to prove CSRF ordering, malformed identity rejection, duplicate/invalid error mapping, unverified mutation denial, expired/revoked session classification, recent-auth deletion gates, and owner isolation.

The reproducible commands are:

```bash
pnpm test:unit -- tests/unit/hosted-auth-qa.test.ts
MWP_HOSTED_AUTH_EXTERNAL_ACCOUNT_APPROVED=1 pnpm test:e2e:hosted-auth
```

The second command loads ignored local Firebase configuration internally. It must not be pasted with a generated email or password.

## Completed password-lifecycle evidence

Exact production runtime `c60814e530c0d367e90661217859671379b31bad` is Ready as `dpl_8afudXf6iSeZVXSCAnhz8JgXYF1D`. The final simplified evidence-source checkpoint `3734cafb135b9cd5d1a0da3e80b93190a1d318a5` passed the opt-in Chromium `1440×1000` lifecycle with three first-party session mutations, secure-cookie confirmation, empty serious/critical Axe results, and Firebase aggregate user count `0` before and `0` after cleanup. The complete maintained runner and evidence are released on `main` at `a6ee66c68d95bb678a9c0ad80f8e9bb956cdf653`, Ready as `dpl_EB3S4VW25KwGasmAgsF6r61t3ExW`, without a later application-runtime change. Recovery and verification requests were accepted but inbox delivery was intentionally not claimed. Google consent, hosted deletion, and hosted two-user authorization remain separate lanes.

## Browser evidence required for completion

Retain the command result, public origin, browser engine/viewport, exact deployed Git SHA, pre/post aggregate Firebase counts, secure-cookie attribute assertions, read-only and verified screenshots without identity data, Axe result, console warning/error result, and bounded Vercel error-log query. Record that verification and recovery email delivery were not observed because the address is intentionally non-deliverable. Run production only after the exact release SHA is Ready and never use a real member for account-deletion QA.
