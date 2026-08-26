# Authenticated Firebase and Neon localhost checkpoint

## Scope

This checkpoint verifies a disposable password account through the configured Firebase project and the provisioned Neon database. It covers secure-session creation, first-program onboarding, persisted workout logging, duplicate-submit truth, refresh resume, completion, immutable history, persisted analytics, password reauthentication, account deletion, and provider/database cleanup.

The application ran on localhost. This is live Firebase and Neon evidence, not a claim about the protected Vercel preview or production. No Firebase value was transmitted to Vercel.

That sentence describes the localhost replay boundary. A later explicitly authorized provider checkpoint attached six non-private Firebase config/identity values to Vercel Production, Preview, and Development, and attached `FIREBASE_PRIVATE_KEY` as Hidden/Sensitive to Production and Preview. Vercel rejects sensitive Development values, so the private key remains only in ignored local development storage. No value was printed, committed, or copied into this report.

## Provider state

- Firebase project `my-workout-pal-92819` remains on Spark.
- My Workout Pal Web is registered.
- Email/Password and Google are enabled. Identity Platform and paid authentication features remain off.
- Localhost, Firebase-default domains, and `my-workout-pal-chi.vercel.app` are authorized.
- Ignored `.env.local` contains the seven matching client/Admin values and `DATABASE_URL`. No value appears in Git or this report.
- Firebase Admin `listUsers` succeeded after the ignored private-key value was corrected from double-escaped serialization. The raw downloaded JSON was moved to Trash.

## Personally observed flow

1. Created an ephemeral verified password identity and signed in through the real localhost UI.
2. Observed `200` from `/api/auth/session`. The `mwp_session` cookie was `HttpOnly` and `SameSite=Strict`; `Secure=false` was correct for localhost HTTP.
3. Completed onboarding with the dumbbell profile and observed the persisted five-day program.
4. Opened Push and started a resumable workout session.
5. Logged 25 lb for 12, 11, and 10 repetitions. Repeating a submitted operation produced the honest already-saved state.
6. Opened a fresh browser context and refreshed. The runner resumed with 3 of 15 work items persisted.
7. Completed dumbbell bench press, skipped the remaining exercises, and saved walker cardio with 1,200 seconds, one mile, 2 percent incline, and notes.
8. Completed the workout and reached its immutable history detail.
9. Opened Progress and observed one workout, 825 lb volume, 20 minutes, and one mile derived from stored logs.
10. Reloaded Settings as a full page. Deletion remained blocked because the Firebase client had no `currentUser`, rather than claiming success from the secure cookie alone.
11. Reached Settings through ordinary client navigation, reauthenticated with the same password identity, refreshed the secure session, and deleted the account. `DELETE /api/app/account` returned `200`, and the app returned to a public route.

## Storage and deletion evidence

- Workout inputs crossed the presentation boundary as pounds and miles; persisted calculations retained canonical kilograms and meters. The rendered history and analytics converted them back for the selected presentation units.
- The immutable history snapshot retained every logged set, skipped movement, cardio field, and note after completion.
- Duplicate operation replay returned already-saved truth and did not create a second set.
- Post-deletion Firebase Admin reported zero users.
- Read-only Neon counts reported zero `user_profiles`, `user_programs`, and `workout_sessions`.
- The QA password and raw Admin JSON were removed. No raw UID, credential, private media, or database connection value is retained here.

## Failure and recovery evidence

- Admin authentication initially failed because the ignored private key was double escaped. Correcting only its local serialization made the live Admin query pass.
- A full-page Settings reload deliberately lacked Firebase client identity and blocked deletion. This is the required truthful recovery state, not a false negative from the secure server session.
- Client navigation retained Firebase identity. Reauthentication called Firebase and Secure Token, refreshed `/api/auth/session`, and allowed the server-derived-UID deletion saga to complete.
- Duplicate workout submission and fresh-context resume both preserved confirmed server state.

## Evidence boundary

This run proves one real password-account path with the dumbbell starter. It does not yet prove Google sign-in, email verification/recovery, expired or revoked sessions, cross-user denial, the barbell starter, clone/activate/editor/equipment-change flows, offline interruption, WebKit, Vercel preview, or production authentication.

YouTube remains a separate evidence lane. At the time of this authenticated replay, the private checkpoint had no approved video. Later curation and production checkpoints supersede only that media status: all 27 pairs have full-watch and scoped embed evidence, the validated 54-row manifest is checked in and idempotency-verified in Neon, and two corrected pairs have real Firefox playback on the protected preview. This localhost account replay still does not prove a persisted embed inside an authenticated runner.

## Remaining verification

- Build and test a fresh protected preview with the authorized Firebase environment configuration.
- Replay Google, verification, recovery, expiry, revocation, and cross-user paths with disposable identities.
- Replay both equipment profiles, program collection/editor changes, offline interruption, and immutable-history preservation in Chromium and WebKit.
- Extend the proven representative preview playback to the authenticated runner and unavailable fallback, then repeat it on production.
- Repeat authenticated accessibility, responsive, preview, production, logs, and deletion cleanup checks before release.
