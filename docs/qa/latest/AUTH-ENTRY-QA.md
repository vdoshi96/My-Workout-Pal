# Authentication entry QA

## Outcome

Wave 0 account entry is ready for sequential integration from branch `vishal/auth-entry-handoff`. Implementation commit `8dc093a7e419cce57e6b164d42f2c17aaad8e686` is pushed and Vercel marked preview deployment `dpl_FXKyLe5odmXL1WT9PNbxeXuMc4Qc` Ready. This is not a production-deployment or production-release approval.

Public account actions enter through `/app`, unauthenticated visitors reach `/sign-in?returnTo=%2Fapp`, safe private return targets remain exact, and invalid or unsafe targets fall back to `/app`. The authenticated shell visibly identifies the member and keeps Sign out available across phone, tablet, and desktop layouts. Public pages stay identity-neutral and label the public five-day content as a starter example that is not saved.

## Failed-before evidence

- The initial focused return-path, public-entry, and hosted-entry run failed 16 assertions across three files before implementation. The failures covered the old `/` fallback, unsafe non-member return paths, `/sign-in` public actions, missing starter-preview labels, and a hosted runner that skipped the public account entry.
- A separate responsive regression test failed while `.member-identity` was hidden below the desktop breakpoint.
- The first production-browser replay exposed an ambiguous `My workouts` test locator because the landing page also includes `Open my workouts`. The locator and the hosted runner now require the exact shared-chrome label.

## Passed-after evidence

- Full Vitest aggregate: 103 files and 712 tests passed.
- Final focused auth-entry aggregate: five files and 29 tests passed after the exact hosted-entry locator correction.
- Strict TypeScript, scoped ESLint, `git diff --check`, and the Webpack production build passed.
- Documentation build/check verified 42 Markdown/HTML pairs before this QA record replaced the prior evidence; the final parity check includes this record.
- Public production-mode Playwright matrix: 47 passed across Chromium phone/tablet/desktop and WebKit phone, with the maintained WebKit service-worker capability skip.
- Authenticated production-mode fixture: six passed across Chromium and WebKit phone, tablet, and desktop projects. Each project verified the visible display name, verification state, and Sign out control alongside geometry and accessibility checks.

## Real authentication and data integrity

A verified disposable Firebase password identity exercised the branch build through three real sessions:

1. Public `My workouts` → `/app` → `/sign-in?returnTo=%2Fapp` → authenticated `/app`.
2. Supplied `/app/settings` return → authenticated `/app/settings`.
3. External unsafe return target → authenticated `/app` fallback.

The browser verified a visible signed-in identity, `Verified account`, working Sign out, no critical or serious Axe violations, and a host-only `__Host-mwp_session` cookie with HttpOnly, Secure, SameSite Strict, and `/` path metadata. The only first-party mutation requests were three `POST /api/auth/session` and three `DELETE /api/auth/session` operations.

Database counts for the disposable UID were zero before and after the journey in `user_profiles`, `user_preferences`, `user_programs`, and `workout_sessions`. The Firebase QA identity was deleted after verification. No credential, token, cookie value, browser profile, trace, video, or screenshot was retained.

## Hosted Google result

Google authentication was not simulated. The exact branch preview is protected by Vercel Authentication, and the live Firebase authorized-domain list contains only `localhost`, the two Firebase-hosted domains, and `my-workout-pal-chi.vercel.app`. Neither Vercel preview hostname is authorized. Real Google preview testing therefore requires an explicit provider/protection configuration decision; production was not changed or deployed for this iteration.

## Retention

This Markdown file and its same-content generated HTML counterpart are the only retained evidence from the newest completed QA run. Superseded launch-readiness evidence and generated Playwright/build artifacts were removed after replacement verification.
